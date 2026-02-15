import express from "express";
import { searchUsers } from "../controllers/user.controller.js";
import { getAllUsers } from "../controllers/user.controller.js";
import {
  followUser,
  getCurrentUser,
  getUserProfile,
  syncUser,
  updateProfile,
} from "../controllers/user.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// public route
router.get("/profile/:username", getUserProfile);

router.get("/search", searchUsers);

router.get("/", getAllUsers);

// protected routes
router.post("/sync", protectRoute, syncUser);
router.get("/me", protectRoute, getCurrentUser);
router.put("/profile", protectRoute, updateProfile);
router.post("/follow/:targetUserId", protectRoute, followUser);


export default router;
