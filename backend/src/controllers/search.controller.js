import User from "../Models/user.model.js";
import Post from "../Models/post.model.js";

export const search = async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim() === "") {
    return res.status(400).json({ message: "Search query is required" });
  }

  try {
    // 🔍 USERS SEARCH (Atlas Search)
    const users = await User.aggregate([
      {
        $search: {
          index: "G-index",
          compound: {
            should: [
              {
                autocomplete: {
                  query: q,
                  path: ["firstName", "lastName", "username"],
                  fuzzy: { maxEdits: 2 }
                }
              },
              {
                text: {
                  query: q,
                  path: [
                    "firstName_text",
                    "lastName_text",
                    "username_text",
                    "email",
                    "bio",
                    "location"
                  ]
                }
              }
            ],
            minimumShouldMatch: 1
          }
        }
      },
      { $limit: 10 },
      {
        $project: {
          password: 0,
          __v: 0
        }
      }
    ]);

    // 📝 POSTS SEARCH (keep regex OR upgrade later)
    const regex = new RegExp(q, "i");

    const posts = await Post.find({
      text: regex
    })
      .limit(20)
      .populate("author", "firstName lastName username profilePicture");

    res.status(200).json({ users, posts });

  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Search error" });
  }
};
