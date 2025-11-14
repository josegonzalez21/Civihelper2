// src/services/socketService.js
import { io } from "socket.io-client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const STORAGE_KEY = "civihelper_token";

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  /**
   * Obtener token desde SecureStore o localStorage
   */
  async getToken() {
    try {
      if (Platform.OS === "web" && typeof localStorage !== "undefined") {
        return localStorage.getItem(STORAGE_KEY);
      } else {
        return await SecureStore.getItemAsync(STORAGE_KEY);
      }
    } catch (error) {
      console.error("[Socket] Error obteniendo token:", error);
      return null;
    }
  }

  /**
   * Conectar al servidor Socket.io
   */
  async connect() {
    if (this.socket?.connected) {
      console.log("[Socket] Ya está conectado");
      return this.socket;
    }

    try {
      // Obtener token desde SecureStore
      const token = await this.getToken();
      
      if (!token) {
        console.warn("[Socket] No hay token disponible");
        throw new Error("No hay token disponible");
      }

      console.log("[Socket] Token encontrado, longitud:", token.length);

      // Importar configuración de forma segura
      let API_URL = 'http://192.168.1.4:4000';
      try {
        const ENV = require("../config/env").default;
        API_URL = ENV?.apiUrl || API_URL;
      } catch (error) {
        console.warn('[Socket] Usando URL por defecto');
      }
      
      console.log('[Socket] Conectando a:', API_URL);
      
      this.socket = io(API_URL, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.setupEventHandlers();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timeout conectando a Socket.io"));
        }, 10000);

        this.socket.on("connect", () => {
          clearTimeout(timeout);
          console.log("[Socket] Conectado:", this.socket.id);
          resolve(this.socket);
        });

        this.socket.on("connect_error", (error) => {
          clearTimeout(timeout);
          console.error("[Socket] Error de conexión:", error.message);
          reject(error);
        });
      });
    } catch (error) {
      console.error("[Socket] Error al conectar:", error);
      throw error;
    }
  }

  /**
   * Configurar manejadores de eventos
   */
  setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on("disconnect", (reason) => {
      console.log("[Socket] Desconectado:", reason);
    });

    this.socket.on("reconnect", (attemptNumber) => {
      console.log("[Socket] Reconectado después de", attemptNumber, "intentos");
    });

    this.socket.on("reconnect_error", (error) => {
      console.error("[Socket] Error de reconexión:", error.message);
    });

    // Evento de nuevo mensaje
    this.socket.on("chat:newMessage", (message) => {
      this.emit("chat:newMessage", message);
    });

    // Evento de notificación
    this.socket.on("chat:notification", (data) => {
      this.emit("chat:notification", data);
    });

    // Usuario escribiendo
    this.socket.on("chat:userTyping", (data) => {
      this.emit("chat:userTyping", data);
    });
  }

  /**
   * Desconectar socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
      console.log("[Socket] Desconectado manualmente");
    }
  }

  /**
   * Unirse a una conversación
   */
  joinConversation(conversationId) {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        return reject(new Error("Socket no conectado"));
      }

      this.socket.emit("chat:join", { conversationId }, (response) => {
        if (response.success) {
          console.log("[Socket] Unido a conversación:", conversationId);
          resolve(response);
        } else {
          console.error("[Socket] Error uniéndose:", response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Salir de una conversación
   */
  leaveConversation(conversationId) {
    if (this.socket?.connected) {
      this.socket.emit("chat:leave", { conversationId });
      console.log("[Socket] Salido de conversación:", conversationId);
    }
  }

  /**
   * Enviar mensaje
   */
  sendMessage(conversationId, content, type = "TEXT", mediaUrl = null) {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        return reject(new Error("Socket no conectado"));
      }

      this.socket.emit(
        "chat:sendMessage",
        { conversationId, content, type, mediaUrl },
        (response) => {
          if (response.success) {
            resolve(response.message);
          } else {
            reject(new Error(response.error));
          }
        }
      );
    });
  }

  /**
   * Notificar que el usuario está escribiendo
   */
  sendTypingStatus(conversationId, isTyping) {
    if (this.socket?.connected) {
      this.socket.emit("chat:typing", { conversationId, isTyping });
    }
  }

  /**
   * Suscribirse a un evento
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Retornar función para desuscribirse
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Emitir evento a los listeners
   */
  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[Socket] Error en listener de ${event}:`, error);
        }
      });
    }
  }

  /**
   * Verificar si está conectado
   */
  isConnected() {
    return this.socket?.connected || false;
  }
}

// Exportar instancia única
export default new SocketService();