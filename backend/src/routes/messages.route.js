import express from "express";
import jwt from "jsonwebtoken";
import Message from "../Models/messages.model.js";

const router = express.Router();

/* ================= AUTH MIDDLEWARE ================= */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

/* ================= GET CONVERSATION ================= */
// GET /api/messages/:userId
router.get("/:userId", authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.userId;

  try {
    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: userId },
        { senderId: userId, receiverId: currentUserId },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

/* ================= SEND MESSAGE ================= */
// POST /api/messages
router.post("/", authMiddleware, async (req, res) => {
  const { receiverId, text } = req.body;

  if (!receiverId || !text) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    const message = await Message.create({
      senderId: req.userId,
      receiverId,
      text,
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: "Failed to send message" });
  }
});

export default router;
