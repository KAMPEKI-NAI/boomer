import Message from "../models/Message";
import { getAuth } from "../utils/getAuth";

export const sendMessage = async (req, res) => {
  const { userId } = getAuth(req);
  const { receiverId, text } = req.body;

  const message = await Message.create({
    senderId: userId,
    receiverId,
    text,
  });

  res.status(201).json(message);
};

export const getMessages = async (req, res) => {
  const { userId } = getAuth(req);
  const { receiverId } = req.params;

  const messages = await Message.find({
    $or: [
      { senderId: userId, receiverId },
      { senderId: receiverId, receiverId: userId },
    ],
  }).sort({ createdAt: 1 });

  res.json(messages);
};
