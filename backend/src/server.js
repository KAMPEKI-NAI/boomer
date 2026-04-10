import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import userRoutes from "./routes/user.route.js";
import postRoutes from "./routes/post.route.js";
import commentRoutes from "./routes/comment.route.js";
import notificationRoutes from "./routes/notification.route.js";
import searchRoutes from "./routes/search.route.js";
import messageRoutes from "./routes/messages.route.js";
import webhookRoutes from "./routes/webhook.route.js";

import { ENV } from "./config/env.js";
import connectDB from "./config/db.js";
import { arcjetMiddleware } from "./middleware/arcjet.middleware.js";
import { socketAuthMiddleware } from "./middleware/socket.auth.middleware.js";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// ====================== SOCKET.IO SETUP ======================
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  allowEIO3: true,
});

// Socket authentication middleware
io.use(socketAuthMiddleware);

io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.userId || "unknown"}`);
  
  // Send acknowledgment on successful connection
  socket.emit('connection_ack', { 
    status: 'connected', 
    userId: socket.userId,
    timestamp: new Date().toISOString()
  });

  // Join a conversation room (1-on-1 chat)
  socket.on("joinChat", ({ chatPartnerId }) => {
    if (chatPartnerId && socket.userId) {
      const roomId = [socket.userId, chatPartnerId].sort().join("_");
      socket.join(roomId);
      console.log(`📱 User ${socket.userId} joined room ${roomId}`);
      
      // Notify that user has joined
      socket.to(roomId).emit("userJoined", { userId: socket.userId });
    }
  });

  // Send a real-time message
  socket.on("sendMessage", async ({ conversationId, message, replyTo }, callback) => {
    try {
      // Save message to database using your message routes
      const savedMessage = {
        id: Date.now().toString(),
        conversationId,
        content: message,
        senderId: socket.userId,
        replyTo: replyTo || null,
        timestamp: new Date().toISOString(),
        status: "sent"
      };
      
      // Emit to the specific conversation room
      io.to(conversationId).emit("newMessage", {
        ...savedMessage,
        conversationId
      });
      
      // Acknowledge to sender
      if (callback) {
        callback({ success: true, message: savedMessage });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Typing indicators
  socket.on("typing", ({ conversationId, isTyping }) => {
    socket.to(conversationId).emit("userTyping", {
      userId: socket.userId,
      isTyping,
      conversationId
    });
  });

  // Mark messages as read
  socket.on("markRead", async ({ conversationId, messageId }) => {
    try {
      io.to(conversationId).emit("messagesRead", {
        conversationId,
        userId: socket.userId,
        messageId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  });

  // Leave conversation room
  socket.on("leaveChat", ({ chatPartnerId }) => {
    if (chatPartnerId && socket.userId) {
      const roomId = [socket.userId, chatPartnerId].sort().join("_");
      socket.leave(roomId);
      console.log(`👋 User ${socket.userId} left room ${roomId}`);
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.userId}`);
  });
});

// ====================== MIDDLEWARES ======================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====================== CREATE UPLOADS DIRECTORY ======================
// Use /tmp on Render (writable), or local directory for development
let uploadsDir;
if (process.env.NODE_ENV === 'production') {
  uploadsDir = path.join('/tmp', 'uploads');
} else {
  uploadsDir = path.join(process.cwd(), 'uploads');
}

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`✅ Uploads directory created at: ${uploadsDir}`);
  } catch (error) {
    console.error(`❌ Failed to create uploads directory: ${error.message}`);
    console.log('⚠️ File uploads will not work, but server will continue');
  }
}

// Serve static files from uploads directory if it exists
if (fs.existsSync(uploadsDir)) {
  app.use("/uploads", express.static(uploadsDir));
}

// ====================== ROUTES ======================
// Public routes (no authentication)
app.use("/api/webhooks", webhookRoutes);
app.use("/api/search", searchRoutes);

// Clerk + Arcjet middleware (applies to all routes after this point)
app.use(clerkMiddleware());
app.use(arcjetMiddleware);

// Protected routes (require authentication)
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    message: "Boomer Chat Backend is running ✅",
    timestamp: new Date().toISOString(),
    socketIO: io.engine.clientsCount > 0 ? "active" : "waiting for connections"
  });
});

// Socket.IO health check
app.get("/socket-status", (req, res) => {
  res.json({
    connectedClients: io.engine.clientsCount,
    status: "running",
    timestamp: new Date().toISOString()
  });
});

// Database status check
app.get("/api/db-status", async (req, res) => {
  try {
    const mongoose = await import('mongoose');
    const dbStatus = mongoose.default.connection.readyState;
    const status = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    res.json({ 
      database: status[dbStatus] || 'unknown',
      readyState: dbStatus
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({ 
    error: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

// ====================== START SERVER ======================
const PORT = process.env.PORT || ENV.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    console.log("✅ Database connected successfully");
    
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📁 Uploads directory: ${uploadsDir}`);
      console.log(`🔌 Socket.io ready for connections`);
      console.log(`🌐 Health check: http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  io.close(() => {
    console.log("Socket.IO server closed");
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  });
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  io.close(() => {
    console.log("Socket.IO server closed");
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  });
});

// ✅ IMPORTANT: Default export for Render
export default app;