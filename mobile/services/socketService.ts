import io, { Socket } from 'socket.io-client';


const SOCKET_URL = "https://boomer-k9z3.onrender.com"

class SocketService {
  private socket: Socket | null = null;
  
  connect(userId: string, token: string) {
    this.socket = io(SOCKET_URL, {
      auth: { token, userId },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    this.socket.on('connect', () => {
      console.log('Socket connected');
    });
    
    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
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
    this.socket?.emit('joinChat', { chatPartnerId });
  }
  
  sendMessage(conversationId: string, message: string, replyTo?: string) {
    return new Promise((resolve, reject) => {
      this.socket?.emit('sendMessage', { conversationId, message, replyTo }, (response: any) => {
        if (response?.success) {
          resolve(response.message);
        } else {
          reject(response?.error || 'Failed to send message');
        }
      });
    });
  }
  
  sendTyping(conversationId: string, isTyping: boolean) {
    this.socket?.emit('typing', { conversationId, isTyping });
  }
  
  markAsRead(conversationId: string, messageId: string) {
    this.socket?.emit('markRead', { conversationId, messageId });
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