import asyncHandler from "express-async-handler";
import Post from "../Models/post.model.js";
import User from "../Models/user.model.js";
import { getAuth } from "@clerk/express";
import cloudinary from "../config/cloudinary.js";

import Notification from "../Models/notification.model.js";
import Comment from "../Models/comment.model.js";

export const getPosts = asyncHandler(async (req, res) => {
  const posts = await Post.find()
    .sort({ createdAt: -1 })
    .populate("user", "username firstName lastName profilePicture")
    .populate({
      path: "comments",
      populate: {
        path: "user",
        select: "username firstName lastName profilePicture",
      },
    });

  res.status(200).json({ posts });
});

export const getPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const post = await Post.findById(postId)
    .populate("user", "username firstName lastName profilePicture")
    .populate({
      path: "comments",
      populate: {
        path: "user",
        select: "username firstName lastName profilePicture",
      },
    });

  if (!post) return res.status(404).json({ error: "Post not found" });

  res.status(200).json({ post });
});

export const getUserPosts = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const user = await User.findOne({ username });
  if (!user) return res.status(404).json({ error: "User not found" });

  const posts = await Post.find({ user: user._id })
    .sort({ createdAt: -1 })
    .populate("user", "username firstName lastName profilePicture")
    .populate({
      path: "comments",
      populate: {
        path: "user",
        select: "username firstName lastName profilePicture",
      },
    });

  res.status(200).json({ posts });
});

export const createPost = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  const { content } = req.body;
  const imageFile = req.file;

  if (!content && !imageFile) {
    return res.status(400).json({ error: "Post must contain either text or image" });
  }

  const user = await User.findOne({ clerkId: userId });
  if (!user) return res.status(404).json({ error: "User not found" });

  let imageUrl = "";

  // upload image to Cloudinary if provided
  if (imageFile) {
    try {
      // convert buffer to base64 for cloudinary
      const base64Image = `data:${imageFile.mimetype};base64,${imageFile.buffer.toString(
        "base64"
      )}`;

      const uploadResponse = await cloudinary.uploader.upload(base64Image, {
        folder: "social_media_posts",
        resource_type: "image",
        transformation: [
          { width: 800, height: 600, crop: "limit" },
          { quality: "auto" },
          { format: "auto" },
        ],
      });
      imageUrl = uploadResponse.secure_url;
    } catch (uploadError) {
      console.error("Cloudinary upload error:", uploadError);
      return res.status(400).json({ error: "Failed to upload image" });
    }
  }

  const post = await Post.create({
    user: user._id,
    content: content || "",
    image: imageUrl,
  });

  res.status(201).json({ post });
});

export const likePost = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  const { postId } = req.params;

  const user = await User.findOne({ clerkId: userId });
  const post = await Post.findById(postId);

  if (!user || !post) return res.status(404).json({ error: "User or post not found" });

  const isLiked = post.likes.includes(user._id);

  if (isLiked) {
    // unlike
    await Post.findByIdAndUpdate(postId, {
      $pull: { likes: user._id },
    });
  } else {
    // like
    await Post.findByIdAndUpdate(postId, {
      $push: { likes: user._id },
    });

    // create notification if not liking own post
    if (post.user.toString() !== user._id.toString()) {
      await Notification.create({
        from: user._id,
        to: post.user,
        type: "like",
        post: postId,
      });
    }
  }

  res.status(200).json({
    message: isLiked ? "Post unliked successfully" : "Post liked successfully",
  });
});

export const deletePost = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  const { postId } = req.params;

  const user = await User.findOne({ clerkId: userId });
  const post = await Post.findById(postId);

  if (!user || !post) return res.status(404).json({ error: "User or post not found" });

  if (post.user.toString() !== user._id.toString()) {
    return res.status(403).json({ error: "You can only delete your own posts" });
  }

  // delete all comments on this post
  await Comment.deleteMany({ post: postId });

  // delete the post
  await Post.findByIdAndDelete(postId);

  res.status(200).json({ message: "Post deleted successfully" });
});

export const searchPosts = async (req, res) => {
  try {
    const query = req.query.q || "";

    if (!query.trim()) {
      return res.json([]);
    }

    const results = await Post.aggregate([
      {
        $search: {
          index: "post-search",
          compound: {
            should: [
              // Autocomplete on post text
              {
                autocomplete: {
                  query,
                  path: "text",
                  fuzzy: {
                    maxEdits: 1,
                    prefixLength: 0
                  }
                }
              },

              // Tag search (#Nigeria, #Tech)
              {
                text: {
                  query,
                  path: "tags"
                }
              },

              // Search inside author's username
              {
                autocomplete: {
                  query,
                  path: "authorUsername",
                  fuzzy: {
                    maxEdits: 1,
                    prefixLength: 0
                  }
                }
              }
            ]
          }
        }
      },
      { $limit: 25 },
      {
        $project: {
          text: 1,
          tags: 1,
          authorUsername: 1,
          createdAt: 1
        }
      }
    ]);

    return res.json(results);
  } catch (error) {
    console.error("Post search error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
