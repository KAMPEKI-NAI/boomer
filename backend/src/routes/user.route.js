import express from "express";
import multer from "multer";
import path from "path";
import {
  followUser,
  getCurrentUser,
  getUserProfile,
  syncUser,
  updateProfile,
  getUserById,
  getFollowers,
  getFollowing,
  uploadProfilePicture,
  uploadBannerImage,
} from "../controllers/user.controller.js";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.NODE_ENV === 'production' 
      ? '/tmp/uploads' 
      : 'uploads';
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter,
});

// Public routes
router.get("/profile/:username", getUserProfile);
router.get("/by-id/:userId", getUserById);
router.get("/:userId/followers", getFollowers);
router.get("/:userId/following", getFollowing);

// Protected routes
router.post("/sync", syncUser);
router.get("/me", getCurrentUser);
router.put("/profile", updateProfile);
router.post("/follow/:targetUserId", followUser);

// Profile picture upload routes
router.post("/profile-picture", upload.single("file"), uploadProfilePicture);
router.post("/banner-image", upload.single("file"), uploadBannerImage);

export default router;