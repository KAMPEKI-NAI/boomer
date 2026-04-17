import cloudinary from "../config/cloudinary.js";
import { io } from "../lib/socket.js";        // we only need io, not getReceiverSocketId anymore
import Message from "../Models/messages.model.js";
import User from "../Models/user.model.js";

export const getAllContacts = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getAllContacts:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMessagesByUserId = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: userToChatId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });   // good to sort messages by time

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessagesByUserId:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    console.log("📥 BODY:", req.body);
    console.log("📥 PARAMS:", req.params);
    console.log("👤 USER:", req.user);

    const { content, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user?._id;

    if (!senderId) {
      console.log("❌ NO USER ID");
      return res.status(401).json({ message: "Unauthorized - no user" });
    }

    if (!content && !image) {
      console.log("❌ NO CONTENT");
      return res.status(400).json({ message: "Content required" });
    }

    const conversationId = [senderId.toString(), receiverId].sort().join("_");

    const newMessage = await Message.create({
      conversationId,
      senderId,
      receiverId,
      content,
    });

    console.log("✅ MESSAGE CREATED:", newMessage);

    io.to(conversationId).emit("newMessage", newMessage);

    res.status(201).json(newMessage);

  } catch (error) {
    console.error("❌ SEND ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getChatPartners = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    const messages = await Message.find({
      $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
    });

    const chatPartnerIds = [
      ...new Set(
        messages.map((msg) =>
          msg.senderId.toString() === loggedInUserId.toString()
            ? msg.receiverId.toString()
            : msg.senderId.toString()
        )
      ),
    ];

    const chatPartners = await User.find({ _id: { $in: chatPartnerIds } })
      .select("-password")
      .lean();   // slightly faster

    res.status(200).json(chatPartners);
  } catch (error) {
    console.error("Error in getChatPartners:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};