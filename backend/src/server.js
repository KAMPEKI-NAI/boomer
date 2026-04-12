// backend/src/server.js
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

  // Join a conversation room
  socket.on("joinConversation", async ({ conversationId }) => {
    if (conversationId && socket.userId) {
      socket.join(conversationId);
      console.log(`📱 User ${socket.userId} joined conversation ${conversationId}`);
    }
  });

  // Send a real-time message
  socket.on("sendMessage", async ({ conversationId, content, replyTo }, callback) => {
    try {
      if (!conversationId || !content || !socket.userId) {
        throw new Error("Missing required fields");
      }
      
      const savedMessage = {
        id: Date.now().toString(),
        conversationId,
        content,
        senderId: socket.userId,
        replyTo: replyTo || null,
        timestamp: new Date().toISOString(),
        status: "sent"
      };
      
      // Emit to the specific conversation room
      io.to(conversationId).emit("newMessage", {
        ...savedMessage,
        fromUser: false,
        conversationId
      });
      
      // Acknowledge to sender
      if (callback) {
        callback({ success: true, message: { ...savedMessage, fromUser: true } });
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
    io.to(conversationId).emit("messagesRead", {
      conversationId,
      userId: socket.userId,
      messageId,
      timestamp: new Date().toISOString()
    });
  });

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.userId}`);
  });
});

// ====================== MIDDLEWARES ======================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Clerk middleware - THIS MUST COME BEFORE YOUR ROUTES
app.use(clerkMiddleware());

// Debug middleware to check auth
app.use((req, res, next) => {
  console.log(`🔐 Auth check for ${req.method} ${req.path}`);
  console.log(`   Authorization header: ${req.headers.authorization ? "Present" : "Missing"}`);
  console.log(`   req.auth.userId: ${req.auth?.userId || "Not set"}`);
  next();
});

// ====================== CREATE UPLOADS DIRECTORY ======================
let uploadsDir;
if (process.env.NODE_ENV === 'production') {
  uploadsDir = path.join('/tmp', 'uploads');
} else {
  uploadsDir = path.join(process.cwd(), 'uploads');
}

if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`✅ Uploads directory created at: ${uploadsDir}`);
  } catch (error) {
    console.error(`❌ Failed to create uploads directory: ${error.message}`);
  }
}

if (fs.existsSync(uploadsDir)) {
  app.use("/uploads", express.static(uploadsDir));
}

// ====================== ROUTES ======================
// Public routes (no authentication)
app.use("/api/webhooks", webhookRoutes);
app.use("/api/search", searchRoutes);

// Arcjet middleware
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

// Test user endpoint
app.get("/api/test-user", async (req, res) => {
  try {
    const User = (await import('./models/User.js')).default;
    const testUser = await User.findOne({});
    res.json({ 
      message: "User model working",
      hasUsers: !!testUser,
      userCount: await User.countDocuments()
    });
  } catch (error) {
    console.error("Test user error:", error);
    res.status(500).json({ error: error.message, stack: error.stack });
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