// services/socketService.ts

import io, { Socket } from "socket.io-client";
import { API_CONFIG } from "@/config/api.config";

class SocketService {
  private socket: Socket | null = null;
  private connectionPromise: Promise<boolean> | null = null;

  async connect(userId: string, getToken: () => Promise<string | null>): Promise<boolean> {
    if (this.socket?.connected) return true;
    if (this.connectionPromise) return this.connectionPromise;

    this.connectionPromise = new Promise(async (resolve) => {
      try {
        console.log("🔌 Waking up server...");

        // 🔥 Wake up Render server first
        await fetch(API_CONFIG.socketUrl);

        console.log("🚀 Connecting socket...");

        const token = await getToken();

        if (!token) {
          console.error("❌ No token");
          this.connectionPromise = null;
          resolve(false);
          return;
        }

        this.socket = io(API_CONFIG.socketUrl, {
          auth: { token, userId },

          // ✅ IMPORTANT FIXES
          transports: ["websocket", "polling"], // fallback support
          timeout: 20000, // increased timeout
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
        });

        this.socket.on("connect", () => {
          console.log("✅ Socket connected");
          this.connectionPromise = null;
          resolve(true);
        });

        this.socket.on("connect_error", (err) => {
          console.error("❌ Socket error:", err.message);
        });

        this.socket.on("disconnect", (reason) => {
          console.log("⚠️ Socket disconnected:", reason);
        });

        // ⛑️ Fallback timeout safety
        setTimeout(() => {
          if (this.connectionPromise) {
            console.warn("⚠️ Socket connection timeout fallback");
            this.connectionPromise = null;
            resolve(false);
          }
        }, 20000);

      } catch (err) {
        console.error("❌ Socket connect failed:", err);
        this.connectionPromise = null;
        resolve(false);
      }
    });

    return this.connectionPromise;
  }

  async ensureConnected(userId: string, getToken: () => Promise<string | null>) {
    if (this.socket?.connected) return true;
    return this.connect(userId, getToken);
  }

  joinConversation(roomId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit("joinConversation", { conversationId: roomId });
  }

  sendMessage(roomId: string, content: string) {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject("Socket not connected");
        return;
      }

      this.socket.emit(
        "sendMessage",
        { conversationId: roomId, content },
        (response: any) => {
          if (response?.success) resolve(response.message);
          else reject(response?.error || "Send failed");
        }
      );
    });
  }

  sendTyping(roomId: string, isTyping: boolean) {
    if (!this.socket?.connected) return;
    this.socket.emit("typing", { conversationId: roomId, isTyping });
  }

  onNewMessage(callback: (msg: any) => void) {
    this.socket?.on("newMessage", callback);
  }

  onUserTyping(callback: (data: any) => void) {
    this.socket?.on("userTyping", callback);
  }

  removeListener(event: string) {
    this.socket?.off(event);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.connectionPromise = null;
  }
}

export const socketService = new SocketService();