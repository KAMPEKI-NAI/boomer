import { Server } from "socket.io";
import http from "http";
import express from "express";
import { ENV } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ENV.CLIENT_URL,   // e.g. your Expo web URL or "*" for dev
    credentials: true,
  },
});

io.use(socketAuthMiddleware);

const userSocketMap = {}; // { userId: socketId }

export const getReceiverSocketId = (userId) => userSocketMap[userId];

io.on("connection", (socket) => {
  const userId = socket.userId;
  console.log(`User connected: ${userId}`);

  userSocketMap[userId] = socket.id;
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Join a private room for 1-on-1 chat (better than single socket emit)
  socket.on("joinChat", ({ chatPartnerId }) => {
    const roomId = [userId, chatPartnerId].sort().join("_"); // consistent room name
    socket.join(roomId);
    console.log(`${userId} joined room ${roomId}`);
  });

  // Listen for new message from client (optional - you can keep REST + emit)
  socket.on("sendMessage", async (messageData) => {
    // You can move sending logic here if you prefer pure socket
    // For now, we'll keep your REST endpoint and just emit
  });

  socket.on("typing", ({ receiverId }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userTyping", { senderId: userId });
    }
  });

  socket.on("stopTyping", ({ receiverId }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userStoppedTyping", { senderId: userId });
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${userId}`);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };