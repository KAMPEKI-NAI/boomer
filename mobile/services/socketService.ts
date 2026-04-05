// services/socketService.ts
import io, { Socket } from 'socket.io-client';

// IMPORTANT: Use your actual Render backend URL
// Replace with your actual Render URL from the logs
const SOCKET_URL = 'https://boomer-k9z3.onrender.com'; // ← CHANGE THIS to your actual URL

class SocketService {
  private socket: Socket | null = null;
  
  connect(userId: string, token: string) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    console.log('Connecting to socket:', SOCKET_URL);
    
    this.socket = io(SOCKET_URL, {
      auth: { token, userId },
      transports: ['websocket', 'polling'], // Use polling as fallback
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true,
    });
    
    this.socket.on('connect', () => {
      console.log('Socket connected successfully');
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });
    
    this.socket.on('connect_timeout', () => {
      console.error('Socket connection timeout');
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
    
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
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