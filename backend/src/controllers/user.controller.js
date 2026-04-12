// backend/src/controllers/user.controller.js
import User from '../Models/user.model.js';

// Helper function to get user ID from request
function getUserIdFromRequest(req) {
  if (req.auth?.userId) {
    return req.auth.userId;
  }
  if (req.body?.id) {
    return req.body.id;
  }
  if (req.params?.userId) {
    return req.params.userId;
  }
  return null;
}

// Sync user from Clerk to database
export const syncUser = async (req, res) => {
  try {
    console.log("=== SYNC USER REQUEST ===");
    
    const clerkId = getUserIdFromRequest(req);
    if (!clerkId) {
      return res.status(401).json({ error: "Unauthorized - No user ID" });
    }
    
    const { firstName, lastName, email, username, profilePicture } = req.body;
    
    let user = await User.findOne({ clerkId });
    
    if (user) {
      user = await User.findOneAndUpdate(
        { clerkId },
        {
          name: `${firstName || ''} ${lastName || ''}`.trim(),
          firstName: firstName || user.firstName,
          lastName: lastName || user.lastName,
          email: email || user.email,
          username: username || user.username,
          profilePicture: profilePicture || user.profilePicture,
        },
        { new: true }
      );
      console.log("User updated:", user._id);
    } else {
      user = await User.create({
        clerkId,
        name: `${firstName || ''} ${lastName || ''}`.trim(),
        firstName: firstName || "",
        lastName: lastName || "",
        email: email || "",
        username: username || `user_${Date.now()}`,
        profilePicture: profilePicture || "https://via.placeholder.com/150",
        bio: "",
        location: "",
        followers: [],
        following: [],
      });
      console.log("User created:", user._id);
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error("Sync user error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get current user
export const getCurrentUser = async (req, res) => {
  try {
    const clerkId = getUserIdFromRequest(req);
    if (!clerkId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const user = await User.findOne({ clerkId });
    res.status(200).json({ user: user || null });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get user profile by username
export const getUserProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username })
      .select("-__v")
      .populate("followers", "name username profilePicture verified")
      .populate("following", "name username profilePicture verified");
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId)
      .select("-__v")
      .populate("followers", "name username profilePicture verified")
      .populate("following", "name username profilePicture verified");
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const clerkId = getUserIdFromRequest(req);
    if (!clerkId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const { name, bio, location, username } = req.body;
    
    const user = await User.findOneAndUpdate(
      { clerkId },
      { name, bio, location, username },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Follow a user
export const followUser = async (req, res) => {
  try {
    const clerkId = getUserIdFromRequest(req);
    const { targetUserId } = req.params;
    
    if (!clerkId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const currentUser = await User.findOne({ clerkId });
    if (!currentUser) {
      return res.status(404).json({ error: "Current user not found" });
    }
    
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: "Target user not found" });
    }
    
    const isFollowing = currentUser.following.includes(targetUserId);
    
    if (isFollowing) {
      await User.findByIdAndUpdate(currentUser._id, { $pull: { following: targetUserId } });
      await User.findByIdAndUpdate(targetUserId, { $pull: { followers: currentUser._id } });
      res.status(200).json({ message: "Unfollowed successfully", following: false });
    } else {
      await User.findByIdAndUpdate(currentUser._id, { $push: { following: targetUserId } });
      await User.findByIdAndUpdate(targetUserId, { $push: { followers: currentUser._id } });
      res.status(200).json({ message: "Followed successfully", following: true });
    }
  } catch (error) {
    console.error("Follow user error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get followers
export const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).populate("followers", "name username profilePicture verified bio");
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.status(200).json(user.followers);
  } catch (error) {
    console.error("Get followers error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get following
export const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).populate("following", "name username profilePicture verified bio");
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.status(200).json(user.following);
  } catch (error) {
    console.error("Get following error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Upload profile picture
export const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    const clerkId = getUserIdFromRequest(req);
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    
    const user = await User.findOneAndUpdate(
      { clerkId },
      { profilePicture: fileUrl },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({ success: true, url: fileUrl, message: "Profile picture updated successfully" });
  } catch (error) {
    console.error("Upload profile picture error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Upload banner image
export const uploadBannerImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    const clerkId = getUserIdFromRequest(req);
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    
    const user = await User.findOneAndUpdate(
      { clerkId },
      { bannerImage: fileUrl },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({ success: true, url: fileUrl, message: "Banner image updated successfully" });
  } catch (error) {
    console.error("Upload banner image error:", error);
    res.status(500).json({ error: error.message });
  }
};