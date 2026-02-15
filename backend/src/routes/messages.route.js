import express from "express";
import {
  sendMessage,
  getAllConversations,
  deleteMessage,
} from "../controllers/messages.controller.js";

const router = express.Router();

router.post("/", sendMessage);

// Chat screen
router.get("/:otherUserId", getConversation);

// Friends list screen
router.get("/conversations/:userId", getAllConversations);

router.delete("/:messageId", deleteMessage);

export default router;
