import express from "express";
import {
  sendMessage,
  getConversation,
  deleteMessage,
} from "../controllers/messages.controller.js";

const router = express.Router();

router.post("/", sendMessage);
router.get("/:otherUserId", getConversation);
router.delete("/:messageId", deleteMessage);

export default router;
