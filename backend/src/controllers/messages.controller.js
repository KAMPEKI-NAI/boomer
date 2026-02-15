import Message from "../Models/messages.model.js";
import { getAuth } from "@clerk/express";

/**
 * Send a message
 * POST /api/messages
 */
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

/**
 * Get conversation between logged-in user & another user
 * GET /api/messages/:otherUserId
 */
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

/**
 * Delete a message (only sender can delete)
 * DELETE /api/messages/:messageId
 */

export const getAllConversations = async (req, res) => {
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Find all messages where user is sender or receiver
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    }).sort({ createdAt: -1 });

    // Group by other user
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
