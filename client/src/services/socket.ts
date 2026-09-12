import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../store/authStore";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000";

// A dedicated, singleton socket service: connect/disconnect/subscribe are
// explicit calls rather than something every component re-creates.
class SocketService {
  private socket: Socket | null = null;

  connect() {
    const token = useAuthStore.getState().accessToken;
    if (!token) return null;
    if (this.socket?.connected) return this.socket;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      withCredentials: true,
      reconnection: true,
    });
    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  get instance() {
    return this.socket;
  }

  joinProject(projectId: string) {
    return new Promise<boolean>((resolve) => {
      this.socket?.emit("project:join", projectId, (ok: boolean) => resolve(!!ok));
    });
  }

  leaveProject(projectId: string) {
    this.socket?.emit("project:leave", projectId);
  }
}

export const socketService = new SocketService();
