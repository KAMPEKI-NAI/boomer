// services/socketService.ts
import io, { Socket } from 'socket.io-client';
import { API_CONFIG } from '@/config/api.config';

class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private connectionPromise: Promise<boolean> | null = null;

  async connect(userId: string, getToken: () => Promise<string | null>): Promise<boolean> {
    if (this.socket?.connected) return true;
    if (this.connectionPromise) return this.connectionPromise;

    this.connectionPromise = new Promise(async (resolve) => {
      try {
        this.userId = userId;

        try {
        await fetch(API_CONFIG.socketUrl);
      } catch (e) {
        console.log("Wake-up request failed (can ignore)");
      }
        const token = await getToken();
        if (!token) {
          console.error('No token');
          this.connectionPromise = null;
          resolve(false);
          return;
        }

        this.socket = io(API_CONFIG.socketUrl, {
          auth: { token, userId },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 20000,
        });

        this.socket.on('connect', () => {
          console.log('Socket connected');
          this.connectionPromise = null;
          resolve(true);
        });

        this.socket.on('connect_error', (err) => {
          console.error('Socket error:', err.message);
          this.connectionPromise = null;
          resolve(false);
        });

        setTimeout(() => {
          if (this.connectionPromise) {
            this.connectionPromise = null;
            resolve(false);
          }
        }, 20000);
      } catch (err) {
        this.connectionPromise = null;
        resolve(false);
      }
    });
    return this.connectionPromise;
  }

  async ensureConnected(userId: string, getToken: () => Promise<string | null>): Promise<boolean> {
    if (this.socket?.connected) return true;
    return this.connect(userId, getToken);
  }

  async joinConversation(conversationId: string, userId: string, getToken: () => Promise<string | null>) {
    const ok = await this.ensureConnected(userId, getToken);
    if (!ok) {
      console.warn('Cannot join: socket not connected');
      return false;
    }
    this.socket?.emit('joinConversation', { conversationId });
    return true;
  }

  async sendMessage(conversationId: string, content: string, userId: string, getToken: () => Promise<string | null>) {
    const ok = await this.ensureConnected(userId, getToken);
    if (!ok) throw new Error('Socket not connected');
    return new Promise((resolve, reject) => {
      this.socket?.emit('sendMessage', { conversationId, content }, (response: any) => {
        if (response?.success) resolve(response.message);
        else reject(response?.error || 'Send failed');
      });
    });
  }

  sendTyping(conversationId: string, isTyping: boolean) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing', { conversationId, isTyping });
  }

  onNewMessage(callback: (msg: any) => void) {
    this.socket?.on('newMessage', callback);
  }

  onUserTyping(callback: (data: any) => void) {
    this.socket?.on('userTyping', callback);
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