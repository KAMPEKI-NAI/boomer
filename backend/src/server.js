import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";

import userRoutes from "./routes/user.route.js";
import postRoutes from "./routes/post.route.js";
import commentRoutes from "./routes/comment.route.js";
import notificationRoutes from "./routes/notification.route.js";
import searchRoutes from "./routes/search.route.js";
import messageRoutes from "./routes/messages.route.js"; // ✅ ADD THIS

import { ENV } from "./config/env.js";
import connectDB from "./config/db.js";   
import { arcjetMiddleware } from "./middleware/arcjet.middleware.js";

const app = express();

// ─── Global Middlewares ─────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Public Routes (no auth required) ───────────────
app.use("/api/search", searchRoutes);

// ─── Auth & Security Middlewares ────────────────────
app.use(clerkMiddleware());
app.use(arcjetMiddleware);

// ─── Protected Routes ───────────────────────────────
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes); // ✅ ADD THIS

// ─── Health Check ───────────────────────────────────
app.get("/", (req, res) => {
  res.send("Hello from server");
});

// ─── Error Handling Middleware ──────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: err.message || "Internal server error",
  });
});

// ─── Start Server ───────────────────────────────────
const startServer = async () => {
  try {
    await connectDB();

    if (ENV.NODE_ENV !== "production") {
      app.listen(ENV.PORT, () => {
        console.log(`Server is running on PORT: ${ENV.PORT}`);
      });
    }
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();

// Export for Vercel
export default app;
