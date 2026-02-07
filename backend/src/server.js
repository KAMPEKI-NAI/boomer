import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import messageRoutes from "./routes/message.routes.js";
import Message from "./models/Message.js";

dotenv.config();
connectDB();

const app = express();

/* ============ MIDDLEWARE ============ */
app.use(cors());
app.use(express.json());

/* ============ TEST ROUTE ============ */
app.get("/", (req, res) => {
  res.send("Socket server running 🚀");
});

/* ============ ROUTES ============ */
app.use("/api/messages", messageRoutes);

/* ============ HTTP + SOCKET ============ */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // tighten later
  },
});

/* ============ SOCKET AUTH ============ */
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) return next(new Error("Unauthorized"));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.sub || decoded.userId;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

/* ============ SOCKET EVENTS ============ */
io.on("connection", (socket) => {
  console.log("User connected:", socket.userId);

  socket.join(socket.userId);

  socket.on("sendMessage", async ({ receiverId, text }) => {
    if (!receiverId || !text) return;

    const message = await Message.create({
      senderId: socket.userId,
      receiverId,
      text,
    });

    io.to(receiverId).emit("newMessage", message);
    io.to(socket.userId).emit("newMessage", message);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.userId);
  });
});

/* ============ START ============ */
const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
