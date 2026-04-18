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

    const conversationId = [myId.toString(), userToChatId.toString()]
      .sort()
      .join("_");

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 });
      
    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessagesByUserId:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { content, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;   // Clerk userId (make sure it's attached correctly)

    if (!content && !image) {
      return res.status(400).json({ message: "Text or image is required." });
    }

    if (senderId.toString() === receiverId) {
      return res.status(400).json({ message: "Cannot send message to yourself." });
    }

    // Check if receiver exists
    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({ message: "Receiver not found." });
    }

    let imageUrl = null;

    // Upload image to Cloudinary if provided
    if (image) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(image, {
          folder: "chat_images",        // optional: organize images in Cloudinary
        });
        imageUrl = uploadResponse.secure_url;
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(500).json({ message: "Image upload failed" });
      }
    }

    const conversationId = [senderId.toString(), receiverId.toString()]
  .sort()
  .join("_");

    const newMessage = new Message({
      conversationId,
      senderId,
      receiverId,
      content: content || "",
    });
    await newMessage.save();

    // Emit to both users using room (more reliable than single socket)
    const roomId = [senderId.toString(), receiverId.toString()].sort().join("_");
    io.to(roomId).emit("newMessage", newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ error: "Internal server error" });
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