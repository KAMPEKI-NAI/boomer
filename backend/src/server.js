import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import messageRoutes from "./routes/messages.route.js";
import Message from "./Models/messages.model.js";

dotenv.config();
connectDB();

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());

/* ================= ROUTES ================= */
app.use("/api/messages", messageRoutes);

/* ================= HTTP + SOCKET SERVER ================= */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // later restrict this
  },
});

/* ================= SOCKET AUTH (JWT) ================= */
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error("Unauthorized"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId; // attach userId to socket
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

/* ================= SOCKET EVENTS ================= */
io.on("connection", (socket) => {
  console.log("User connected:", socket.userId);

  // Join private room
  socket.join(socket.userId);

  socket.on("sendMessage", async ({ receiverId, text }) => {
    if (!receiverId || !text) return;

    // Save message to DB
    const message = await Message.create({
      senderId: socket.userId,
      receiverId,
      text,
    });

    // Send to receiver
    io.to(receiverId).emit("newMessage", message);

    // Send back to sender (for sync)
    io.to(socket.userId).emit("newMessage", message);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.userId);
  });
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
