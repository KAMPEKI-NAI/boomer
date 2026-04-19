import { getAuth } from "@clerk/express";
import User from "../Models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    const auth = getAuth(req);

    if (!auth.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findOne({ clerkId: auth.userId });

    console.log("🔍 Clerk ID:", auth.userId);
    console.log("✅ FOUND USER:", user?._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Server error" });
  }
};