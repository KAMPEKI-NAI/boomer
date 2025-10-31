import express from "express";
import { getUserProfile, updateProfile } from "../controllers/user.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public routes
router.get("/profile/:username", getUserProfile);

// Protected routes
router.post("/sync", protectRoute, syncUser);
router.post("/me", protectRoute, updateProfile);
router.put("/profile", protectRoute, updateProfile);
router.post("/follow/:targerUserId", protectRoute, followUser);

//Upd

export default router;