import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { verifyAccessToken } from "../utils/jwt";
import { userRepository } from "../repositories/userRepository";
import { setIo } from "./ioInstance";
import { rooms } from "./rooms";
import { emitPresenceUpdate } from "./emitter";
import { projectService } from "../services/projectService";
import { AuthenticatedUser } from "../types";
import { env } from "../config/env";

interface AuthedSocket extends Socket {
  data: { user: AuthenticatedUser };
}

// userId -> count of active socket connections (handles multiple
// tabs/devices: the user only goes "offline" once the LAST socket closes).
const onlineCounts = new Map<string, number>();

function markOnline(userId: string) {
  const next = (onlineCounts.get(userId) ?? 0) + 1;
  onlineCounts.set(userId, next);
  if (next === 1) emitPresenceUpdate(Array.from(onlineCounts.keys()));
}

function markOffline(userId: string) {
  const next = (onlineCounts.get(userId) ?? 1) - 1;
  if (next <= 0) {
    onlineCounts.delete(userId);
    emitPresenceUpdate(Array.from(onlineCounts.keys()));
  } else {
    onlineCounts.set(userId, next);
  }
}

export function initWebsocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
  });
  setIo(io);

  // Socket auth: identical trust model to HTTP — the client sends its
  // short-lived access token, the server derives userId/role from the
  // verified JWT. Client-claimed userId/role are never trusted.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("Missing access token"));
      const payload = verifyAccessToken(token);
      const user = await userRepository.findById(payload.sub);
      if (!user) return next(new Error("User no longer exists"));
      (socket as AuthedSocket).data.user = {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
      };
      next();
    } catch {
      next(new Error("Invalid or expired access token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const { user } = (socket as AuthedSocket).data;

    socket.join(rooms.user(user.id));
    socket.join(rooms.presence);
    if (user.role === "ADMIN") socket.join(rooms.globalActivity);

    markOnline(user.id);
    socket.emit("presence:update", { onlineUserIds: Array.from(onlineCounts.keys()) });

    // Clients ask to join a project room; the server re-verifies access
    // using the exact same scoping rule as the REST API before allowing it.
    // A PM/developer cannot subscribe their way into another team's project.
    socket.on("project:join", async (projectId: string, ack?: (ok: boolean) => void) => {
      const allowed = await projectService.userCanAccessProject(projectId, user);
      if (allowed) socket.join(rooms.project(projectId));
      ack?.(allowed);
    });

    socket.on("project:leave", (projectId: string) => {
      socket.leave(rooms.project(projectId));
    });

    socket.on("disconnect", () => {
      markOffline(user.id);
    });
  });

  return io;
}
