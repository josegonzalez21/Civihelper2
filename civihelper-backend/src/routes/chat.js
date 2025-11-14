// src/routes/chat.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

/**
 * GET /api/chat/conversations
 * Obtener todas las conversaciones del usuario
 */
router.get("/conversations", async (req, res) => {
  try {
    const userId = req.user.sub; // ✅ Usando 'sub' de tu middleware

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { clientId: userId },
          { providerId: userId },
        ],
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            avatarKey: true,
            avatarUrl: true,
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
            avatarKey: true,
            avatarUrl: true,
          },
        },
        service: {
          select: {
            id: true,
            title: true,
            coverUrl: true,
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                senderId: { not: userId },
                readAt: null,
              },
            },
          },
        },
      },
      orderBy: {
        lastMessageAt: "desc",
      },
    });

    // Formatear respuesta
    const formatted = conversations.map(conv => {
      const isClient = conv.clientId === userId;
      const otherUser = isClient ? conv.provider : conv.client;
      
      return {
        id: conv.id,
        otherUser,
        service: conv.service,
        lastMessageAt: conv.lastMessageAt,
        lastMessageText: conv.lastMessageText,
        unreadCount: conv._count.messages,
        createdAt: conv.createdAt,
      };
    });

    res.json({ conversations: formatted });
  } catch (error) {
    console.error("[GET /api/chat/conversations]:", error);
    res.status(500).json({ message: "Error obteniendo conversaciones" });
  }
});

/**
 * POST /api/chat/conversations
 * Crear o obtener conversación con un proveedor
 */
router.post("/conversations", async (req, res) => {
  try {
    const userId = req.user.sub; // ✅ Usando 'sub'
    const { providerId, serviceId } = req.body;

    if (!providerId) {
      return res.status(400).json({ message: "providerId es requerido" });
    }

    // Verificar que el proveedor existe
    const provider = await prisma.user.findUnique({
      where: { id: providerId },
      select: { id: true, name: true, role: true, avatarKey: true, avatarUrl: true },
    });

    if (!provider) {
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }

    // Determinar quién es cliente y quién es proveedor
    const isUserProvider = req.user.role === "PROVIDER";
    const clientId = isUserProvider ? providerId : userId;
    const actualProviderId = isUserProvider ? userId : providerId;

    // Buscar o crear conversación
    let conversation = await prisma.conversation.findFirst({
      where: {
        clientId,
        providerId: actualProviderId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            avatarKey: true,
            avatarUrl: true,
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
            avatarKey: true,
            avatarUrl: true,
          },
        },
        service: {
          select: {
            id: true,
            title: true,
            coverUrl: true,
          },
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          clientId,
          providerId: actualProviderId,
          serviceId,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              avatarKey: true,
              avatarUrl: true,
            },
          },
          provider: {
            select: {
              id: true,
              name: true,
              avatarKey: true,
              avatarUrl: true,
            },
          },
          service: {
            select: {
              id: true,
              title: true,
              coverUrl: true,
            },
          },
        },
      });
    }

    // Formatear respuesta
    const isClient = conversation.clientId === userId;
    const otherUser = isClient ? conversation.provider : conversation.client;

    res.json({
      conversation: {
        id: conversation.id,
        otherUser,
        service: conversation.service,
        lastMessageAt: conversation.lastMessageAt,
        lastMessageText: conversation.lastMessageText,
        createdAt: conversation.createdAt,
      },
    });
  } catch (error) {
    console.error("[POST /api/chat/conversations]:", error);
    res.status(500).json({ message: "Error creando conversación" });
  }
});

/**
 * GET /api/chat/conversations/:id/messages
 * Obtener mensajes de una conversación
 */
router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const userId = req.user.sub; // ✅ Usando 'sub'
    const { id: conversationId } = req.params;
    const { limit = 50, before } = req.query;

    // Verificar que el usuario es parte de la conversación
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { clientId: userId },
          { providerId: userId },
        ],
      },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversación no encontrada" });
    }

    // Obtener mensajes
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        ...(before && {
          createdAt: {
            lt: new Date(before),
          },
        }),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarKey: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: parseInt(limit),
    });

    // Marcar como leídos los mensajes no leídos
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    res.json({
      messages: messages.reverse(), // Invertir para orden cronológico
      hasMore: messages.length === parseInt(limit),
    });
  } catch (error) {
    console.error("[GET /api/chat/conversations/:id/messages]:", error);
    res.status(500).json({ message: "Error obteniendo mensajes" });
  }
});

/**
 * POST /api/chat/conversations/:id/read
 * Marcar mensajes como leídos
 */
router.post("/conversations/:id/read", async (req, res) => {
  try {
    const userId = req.user.sub; // ✅ Usando 'sub'
    const { id: conversationId } = req.params;

    // Verificar que el usuario es parte de la conversación
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { clientId: userId },
          { providerId: userId },
        ],
      },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversación no encontrada" });
    }

    // Marcar mensajes como leídos
    const result = await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    res.json({ updated: result.count });
  } catch (error) {
    console.error("[POST /api/chat/conversations/:id/read]:", error);
    res.status(500).json({ message: "Error marcando mensajes como leídos" });
  }
});

/**
 * DELETE /api/chat/conversations/:id
 * Eliminar una conversación
 */
router.delete("/conversations/:id", async (req, res) => {
  try {
    const userId = req.user.sub; // ✅ Usando 'sub'
    const { id: conversationId } = req.params;

    // Verificar que el usuario es parte de la conversación
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { clientId: userId },
          { providerId: userId },
        ],
      },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversación no encontrada" });
    }

    // Eliminar conversación (cascade eliminará los mensajes)
    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    res.json({ message: "Conversación eliminada" });
  } catch (error) {
    console.error("[DELETE /api/chat/conversations/:id]:", error);
    res.status(500).json({ message: "Error eliminando conversación" });
  }
});

export default router;