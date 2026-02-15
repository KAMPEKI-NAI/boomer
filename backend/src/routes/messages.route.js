// routes/messages.routes.js
import express from "express";
import {
  sendMessage,
  getConversation,
  getAllConversations,
  searchUsers,
  deleteMessage,
} from "../controllers/messages.controller.js";

const router = express.Router();

router.post("/", sendMessage);
router.get("/:otherUserId", getConversation);
router.get("/conversations/:userId", getAllConversations);
router.get("/search", searchUsers); // New search route
router.delete("/:messageId", deleteMessage);

export default router;