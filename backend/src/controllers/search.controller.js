import User from "../Models/user.model.js";
import Post from "../Models/post.model.js";

export const search = async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim() === "") {
    return res.status(400).json({ message: "Search query is required" });
  }

  try {
    // Run both search operations in parallel
    const [users, posts] = await Promise.all([
      // 1. Optimized User Search (using G-index)
      User.aggregate([
          {
            $search: {
              index: "G-index",
              autocomplete: {
                query: q, // ✅ use the variable, NOT "q"
                path: "firstName",
                fuzzy: {
                  maxEdits: 2,
                  prefixLength: 0,
                  maxExpansions: 50
                }
              }
            }
          },
          { $limit: 10 },
          {
            $project: {
              password: 0,
              __v: 0,
              score: { $meta: "searchScore" }
            }
          }
        ]),


      // 2. New Post Search (using post-search-index)
      Post.aggregate([
        {
          $search: {
            index: "post-search-index",
            text: {
              query: q,
              path: ["title", "text"], // Searching both title and body
              fuzzy: { maxEdits: 1 }
            }
          }
        },
        { $limit: 20 },
        {
          $lookup: { // Manual populate in aggregation
            from: "users",
            localField: "author",
            foreignField: "_id",
            as: "author"
          }
        },
        { $unwind: "$author" },
        {
          $project: {
            text: 1,
            title: 1,
            createdAt: 1,
            "author.firstName": 1,
            "author.lastName": 1,
            "author.username": 1,
            "author.profilePicture": 1,
            score: { $meta: "searchScore" }
          }
        }
      ])
    ]);

    res.status(200).json({ users, posts });

  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Internal server search error" });
  }
};
