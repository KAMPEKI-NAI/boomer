// services/socketService.ts
import io, { Socket } from 'socket.io-client';

// Use your Render backend URL
const SOCKET_URL = 'https://your-render-backend.onrender.com'; // Replace with your actual Render URL

class SocketService {
  private socket: Socket | null = null;
  
  connect(userId: string, token: string) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token, userId },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });
    
    this.socket.on('connect', () => {
      console.log('Socket connected successfully');
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
    
    return this.socket;
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  joinChat(chatPartnerId: string) {
    if (!this.socket) return;
    this.socket.emit('joinChat', { chatPartnerId });
  }
  
  sendMessage(conversationId: string, message: string, replyTo?: string) {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
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
    if (!this.socket) return;
    this.socket.emit('typing', { conversationId, isTyping });
  }
  
  markAsRead(conversationId: string, messageId: string) {
    if (!this.socket) return;
    this.socket.emit('markRead', { conversationId, messageId });
  }
  
  onNewMessage(callback: (message: any) => void) {
    if (!this.socket) return;
    this.socket.on('newMessage', callback);
  }
  
  onUserTyping(callback: (data: { userId: string; isTyping: boolean }) => void) {
    if (!this.socket) return;
    this.socket.on('userTyping', callback);
  }
  
  onMessagesRead(callback: (data: { conversationId: string; userId: string; messageId: string }) => void) {
    if (!this.socket) return;
    this.socket.on('messagesRead', callback);
  }
  
  removeListener(event: string) {
    if (!this.socket) return;
    this.socket.off(event);
  }
}

export const socketService = new SocketService();