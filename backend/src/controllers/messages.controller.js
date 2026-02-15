// controllers/messages.controller.js
import Message from "../Models/messages.model.js";
import User from "../Models/user.model.js"; // Import User model
import { getAuth } from "@clerk/express";

// Send a message
export const sendMessage = async (req, res) => {
  const { userId } = getAuth(req);
  const { receiverId, text } = req.body;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!receiverId || !text) {
    return res.status(400).json({ error: "receiverId and text are required" });
  }

  const message = await Message.create({
    senderId: userId,
    receiverId,
    text,
  });

  res.status(201).json(message);
};

// Get conversation between logged-in user & another user
export const getConversation = async (req, res) => {
  const { userId } = getAuth(req);
  const { otherUserId } = req.params;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const messages = await Message.find({
    $or: [
      { senderId: userId, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: userId },
    ],
  }).sort({ createdAt: 1 });

  res.json(messages);
};

// Get all conversations
export const getAllConversations = async (req, res) => {
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    }).sort({ createdAt: -1 });

    const conversationsMap = new Map();

    messages.forEach((message) => {
      const otherUser =
        message.senderId === userId
          ? message.receiverId
          : message.senderId;

      if (!conversationsMap.has(otherUser)) {
        conversationsMap.set(otherUser, {
          userId: otherUser,
          lastMessage: message.text,
          lastMessageDate: message.createdAt,
        });
      }
    });

    const conversations = Array.from(conversationsMap.values());
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// Search users
export const searchUsers = async (req, res) => {
  const { query } = req.query;

  try {
    const users = await User.find({
      name: { $regex: query, $options: "i" },
    }).limit(10);

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// Delete a message
export const deleteMessage = async (req, res) => {
  const { userId } = getAuth(req);
  const { messageId } = req.params;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const message = await Message.findById(messageId);

  if (!message) {
    return res.status(404).json({ error: "Message not found" });
  }

  if (message.senderId !== userId) {
    return res.status(403).json({ error: "Not allowed" });
  }

  await message.deleteOne();
  res.json({ success: true });
};