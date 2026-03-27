import express from "express";
import {
  getAllContacts,
  getChatPartners,
  getMessagesByUserId,
  sendMessage,
} from "../controllers/messages.controller.js";

import { protectRoute } from "../middleware/auth.middleware.js";
// import { arcjetMiddleware } from "../middleware/arcjet.middleware.js";   // ← Temporarily disabled

const router = express.Router();

// Only use authentication (Clerk). Skip Arcjet for now to stop "Bot access denied"
router.use(protectRoute);

router.get("/contacts", getAllContacts);
router.get("/chats", getChatPartners);
router.get("/:id", getMessagesByUserId);
router.post("/send/:id", sendMessage);

export default router;