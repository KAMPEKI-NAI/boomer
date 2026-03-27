import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";

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

const app = express();
const server = http.createServer(app);

// ====================== SOCKET.IO SETUP ======================
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.use(socketAuthMiddleware);

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.userId || "unknown"}`);

  socket.on("joinChat", ({ chatPartnerId }) => {
    if (chatPartnerId && socket.userId) {
      const roomId = [socket.userId, chatPartnerId].sort().join("_");
      socket.join(roomId);
      console.log(`User ${socket.userId} joined room ${roomId}`);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.userId}`);
  });
});

// ====================== MIDDLEWARES ======================
app.use(cors());
app.use(express.json());

// Public routes
app.use("/api/search", searchRoutes);

// Clerk + Arcjet
app.use(clerkMiddleware());
app.use(arcjetMiddleware);

// Protected routes
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);

// Webhook route (important: NO clerkMiddleware or protectRoute)
app.use("/api/webhooks", webhookRoutes);

// Health check
app.get("/", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    message: "Boomer Chat Backend is running ✅" 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

// ====================== START SERVER ======================
const PORT = process.env.PORT || ENV.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`Socket.io ready for connections`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

// ✅ IMPORTANT: Default export for Render
export default app;