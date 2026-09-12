import { Server } from "socket.io";

// Holds the single Socket.IO server instance so services (which must not
// import the websocket bootstrap file directly, to avoid circular imports)
// can emit events through a thin, well-typed interface.
let io: Server | null = null;

export function setIo(instance: Server) {
  io = instance;
}

export function getIo(): Server {
  if (!io) throw new Error("Socket.IO server has not been initialized yet");
  return io;
}
