// src/lib/socket.js
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma.js";

let io = null;

/**
 * Middleware de autenticación para Socket.io
 */
const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    
    if (!token) {
      return next(new Error("No token provided"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Tu middleware usa 'sub' en lugar de 'userId'
    const userId = decoded.sub || decoded.userId;
    
    if (!userId) {
      return next(new Error("Invalid token payload"));
    }
    
    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true, blocked: true },
    });

    if (!user || user.blocked) {
      return next(new Error("User not found or blocked"));
    }

    socket.userId = user.id;
    socket.userName = user.name;
    socket.userRole = user.role;
    
    next();
  } catch (error) {
    console.error("[Socket Auth Error]:", error.message);
    next(new Error("Authentication failed"));
  }
};

/**
 * Inicializa Socket.io con el servidor HTTP
 */
export function initializeSocket(httpServer) {
  if (io) {
    console.log("[Socket.io] Ya está inicializado");
    return io;
  }

  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(",") || "*",
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Middleware de autenticación
  io.use(socketAuthMiddleware);

  // Evento de conexión
  io.on("connection", (socket) => {
    console.log(`[Socket.io] Usuario conectado: ${socket.userName} (${socket.userId})`);

    // Usuario se une a su room personal
    socket.join(`user:${socket.userId}`);

    // Obtener conversaciones del usuario
    socket.on("chat:getConversations", async (callback) => {
      try {
        const conversations = await prisma.conversation.findMany({
          where: {
            OR: [
              { clientId: socket.userId },
              { providerId: socket.userId },
            ],
          },
          include: {
            client: {
              select: {
                id: true,
                name: true,
                avatarKey: true,
              },
            },
            provider: {
              select: {
                id: true,
                name: true,
                avatarKey: true,
              },
            },
            service: {
              select: {
                id: true,
                title: true,
              },
            },
            messages: {
              take: 1,
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: { lastMessageAt: "desc" },
        });

        callback({ success: true, conversations });
      } catch (error) {
        console.error("[Socket] Error obteniendo conversaciones:", error);
        callback({ success: false, error: error.message });
      }
    });

    // Usuario se une a una conversación
    socket.on("chat:join", async ({ conversationId }, callback) => {
      try {
        const conversation = await prisma.conversation.findFirst({
          where: {
            id: conversationId,
            OR: [
              { clientId: socket.userId },
              { providerId: socket.userId },
            ],
          },
        });

        if (!conversation) {
          return callback({ success: false, error: "Conversación no encontrada" });
        }

        socket.join(`conversation:${conversationId}`);
        console.log(`[Socket.io] ${socket.userName} se unió a conversación ${conversationId}`);

        // Marcar mensajes como leídos
        await prisma.message.updateMany({
          where: {
            conversationId,
            senderId: { not: socket.userId },
            readAt: null,
          },
          data: { readAt: new Date() },
        });

        callback({ success: true });
      } catch (error) {
        console.error("[Socket] Error uniéndose a conversación:", error);
        callback({ success: false, error: error.message });
      }
    });

    // Usuario sale de una conversación
    socket.on("chat:leave", ({ conversationId }) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`[Socket.io] ${socket.userName} salió de conversación ${conversationId}`);
    });

    // Enviar mensaje
    socket.on("chat:sendMessage", async (data, callback) => {
      try {
        const { conversationId, content, type = "TEXT", mediaUrl } = data;

        // Verificar que el usuario es parte de la conversación
        const conversation = await prisma.conversation.findFirst({
          where: {
            id: conversationId,
            OR: [
              { clientId: socket.userId },
              { providerId: socket.userId },
            ],
          },
          include: {
            client: { select: { id: true, name: true, avatarKey: true } },
            provider: { select: { id: true, name: true, avatarKey: true } },
          },
        });

        if (!conversation) {
          return callback({ success: false, error: "Conversación no encontrada" });
        }

        // Crear mensaje
        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: socket.userId,
            content,
            type,
            mediaUrl,
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatarKey: true,
              },
            },
          },
        });

        // Actualizar última actividad de la conversación
        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            lastMessageAt: message.createdAt,
            lastMessageText: content.substring(0, 100),
          },
        });

        // Emitir el mensaje a todos en la conversación
        io.to(`conversation:${conversationId}`).emit("chat:newMessage", message);

        // Notificar al otro usuario si no está en la conversación
        const recipientId = socket.userId === conversation.clientId 
          ? conversation.providerId 
          : conversation.clientId;
        
        io.to(`user:${recipientId}`).emit("chat:notification", {
          conversationId,
          message,
          sender: conversation.clientId === socket.userId ? conversation.client : conversation.provider,
        });

        callback({ success: true, message });
      } catch (error) {
        console.error("[Socket] Error enviando mensaje:", error);
        callback({ success: false, error: error.message });
      }
    });

    // Usuario está escribiendo
    socket.on("chat:typing", ({ conversationId, isTyping }) => {
      socket.to(`conversation:${conversationId}`).emit("chat:userTyping", {
        userId: socket.userId,
        userName: socket.userName,
        isTyping,
      });
    });

    // Desconexión
    socket.on("disconnect", () => {
      console.log(`[Socket.io] Usuario desconectado: ${socket.userName} (${socket.userId})`);
    });
  });

  console.log("[Socket.io] Inicializado correctamente");
  return io;
}

/**
 * Obtener instancia de Socket.io
 */
export function getIO() {
  if (!io) {
    throw new Error("Socket.io no ha sido inicializado");
  }
  return io;
}

/**
 * Cerrar Socket.io
 */
export async function closeSocket() {
  if (io) {
    await io.close();
    io = null;
    console.log("[Socket.io] Cerrado");
  }
}