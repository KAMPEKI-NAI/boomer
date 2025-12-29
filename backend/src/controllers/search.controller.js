import User from "../Models/user.model.js";
import Post from "../Models/post.model.js";

export const search = async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ message: "Search query is required" });
  }

  const regex = new RegExp(q, "i");

  try {
    const users = await User.find({
      $or: [{ name: regex }, { username: regex }],
    }).limit(10);

    const posts = await Post.find({
      text: regex,
    })
      .limit(20)
      .populate("author", "name username profile_image_url");

    res.status(200).json({ users, posts });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Search error" });
  }
};
