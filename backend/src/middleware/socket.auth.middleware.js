import { verifyToken } from "@clerk/backend";
import { ENV } from "../lib/env.js";
import User from "../models/User.js";   // keep this if you still need extra user data from DB

export const socketAuthMiddleware = async (socket, next) => {
  try {
    // Get token from client (recommended way)
    let token = socket.handshake.auth?.token;

    // Fallback: check Authorization header (Bearer token)
    if (!token) {
      token = socket.handshake.headers.authorization?.replace("Bearer ", "");
    }

    if (!token) {
      console.log("Socket connection rejected: No token provided");
      return next(new Error("Unauthorized - No Token Provided"));
    }

    // Verify the Clerk token
    const verified = await verifyToken(token, {
      secretKey: ENV.CLERK_SECRET_KEY,   // ← Must be in your .env
    });

    const userId = verified.sub;   // Clerk user ID (this is the important one)

    if (!userId) {
      return next(new Error("Unauthorized - Invalid Token"));
    }

    // Optional: Fetch your local User document if you store extra data
    let user = await User.findOne({ clerkId: userId }).select("-password"); 
    // Note: If you haven't added clerkId to your User model yet, do that first.

    if (!user) {
      // You can create the user on-the-fly here if needed, or just use Clerk data
      console.log(`User ${userId} not found in local DB`);
      user = { fullName: verified.fullName || "Unknown", _id: userId };
    }

    // Attach to socket (this is what your other code expects)
    socket.user = user;
    socket.userId = userId;           // Use Clerk's userId
    socket.clerkUserId = userId;

    console.log(`Socket authenticated for user: ${user.fullName || userId} (${userId})`);

    next();
  } catch (error) {
    console.log("Error in socket authentication:", error.message);
    next(new Error("Unauthorized - Authentication failed"));
  }
};