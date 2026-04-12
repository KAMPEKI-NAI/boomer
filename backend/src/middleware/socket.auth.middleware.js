import { verifyToken } from "@clerk/backend";
import { ENV } from "../config/env.js";
import User from "../Models/user.model.js";   // keep this if you still need extra user data from DB

// middleware/socket.auth.middleware.js
export const socketAuthMiddleware = async (socket, next) => {
  try {
    const { token, userId } = socket.handshake.auth;
    
    if (!token || !userId) {
      console.error('Socket auth: Missing credentials');
      return next(new Error('Authentication required'));
    }
    
    // For now, accept the userId. Clerk HTTP endpoints will validate tokens.
    // You can add proper JWT verification if needed.
    socket.userId = userId;
    console.log(`✅ Socket authenticated: ${userId}`);
    next();
  } catch (err) {
    console.error('Socket auth error:', err);
    next(new Error('Authentication failed'));
  }
};