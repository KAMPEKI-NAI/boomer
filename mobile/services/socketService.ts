// services/socketService.ts
import io, { Socket } from 'socket.io-client';
import { API_CONFIG } from '@/config/api.config';

class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private tokenRefreshInterval: ReturnType<typeof setTimeout> | null = null; // ✅ Fixed: Use ReturnType<typeof setTimeout>

  async connect(userId: string, getToken: () => Promise<string | null>) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    this.userId = userId;
    const token = await getToken();
    
    if (!token) {
      console.error('No token available for socket connection');
      return null;
    }

    console.log('Connecting to socket:', API_CONFIG.socketUrl);
    
    this.socket = io(API_CONFIG.socketUrl, {
      auth: { token, userId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
    
    this.socket.on('connect', () => {
      console.log('Socket connected successfully');
      this.startTokenRefresh(getToken);
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.stopTokenRefresh();
    });
    
    // Handle token refresh response
    this.socket.on('tokenRefreshed', (data) => {
      if (data.success) {
        console.log('Token refreshed successfully');
      } else {
        console.error('Token refresh failed:', data.error);
      }
    });
    
    return this.socket;
  }

  private startTokenRefresh(getToken: () => Promise<string | null>) {
    // Refresh token every 10 minutes (before 15 min expiry)
    this.tokenRefreshInterval = setInterval(async () => {
      if (this.socket?.connected) {
        const newToken = await getToken();
        if (newToken) {
          this.socket.emit('refreshToken', { token: newToken });
          console.log('Token refresh requested for socket');
        }
      }
    }, 10 * 60 * 1000); // 10 minutes
  }

  private stopTokenRefresh() {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }
  }

  disconnect() {
    this.stopTokenRefresh();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  joinChat(chatPartnerId: string) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot join chat');
      return;
    }
    this.socket.emit('joinChat', { chatPartnerId });
  }
  
  sendMessage(conversationId: string, message: string, replyTo?: string) {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }
      
      this.socket.emit('sendMessage', { conversationId, message, replyTo }, (response: any) => {
        if (response?.success) {
          resolve(response.message);
        } else {
          reject(response?.error || 'Failed to send message');
        }
      });
    });
  }
  
  sendTyping(conversationId: string, isTyping: boolean) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing', { conversationId, isTyping });
  }
  
  markAsRead(conversationId: string, messageId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('markRead', { conversationId, messageId });
  }
  
  onNewMessage(callback: (message: any) => void) {
    this.socket?.on('newMessage', callback);
  }
  
  onUserTyping(callback: (data: { userId: string; isTyping: boolean }) => void) {
    this.socket?.on('userTyping', callback);
  }
  
  onMessagesRead(callback: (data: { conversationId: string; userId: string; messageId: string }) => void) {
    this.socket?.on('messagesRead', callback);
  }
  
  removeListener(event: string) {
    this.socket?.off(event);
  }
}

export const socketService = new SocketService();