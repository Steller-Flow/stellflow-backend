import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import type { AuthPayload } from "../middleware/auth.js";

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.origin,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use((socket, next) => {
    const token =
      (socket.handshake.auth.token as string) ??
      (socket.handshake.headers.authorization?.startsWith("Bearer ")
        ? socket.handshake.headers.authorization.split(" ")[1]
        : null);

    if (!token) {
      next(new Error("Authentication required"));
      return;
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as unknown as AuthPayload;
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as AuthPayload;
    console.log(`User connected: ${user.userId}`);

    socket.join(`user:${user.userId}`);

    socket.on("join:escrow", (escrowId: string) => {
      socket.join(`escrow:${escrowId}`);
      console.log(`User ${user.userId} joined escrow room: ${escrowId}`);
    });

    socket.on("leave:escrow", (escrowId: string) => {
      socket.leave(`escrow:${escrowId}`);
      console.log(`User ${user.userId} left escrow room: ${escrowId}`);
    });

    socket.on("disconnect", (reason) => {
      console.log(`User disconnected: ${user.userId}, reason: ${reason}`);
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}

export function broadcastToUser(userId: string, event: string, data: unknown): void {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function broadcastToEscrow(escrowId: string, event: string, data: unknown): void {
  if (io) {
    io.to(`escrow:${escrowId}`).emit(event, data);
  }
}

export function closeSocket(): void {
  if (io) {
    io.close();
    io = null;
  }
}
