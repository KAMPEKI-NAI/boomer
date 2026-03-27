// routes/webhook.route.js
import express from "express";
import { Webhook } from "svix";
import User from "../Models/user.model.js";

const router = express.Router();

router.post("/clerk", async (req, res) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SIGNING_SECRET");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  const svix = new Webhook(WEBHOOK_SECRET);
  let evt;

  try {
    // Verify the webhook signature
    evt = svix.verify(JSON.stringify(req.body), {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    });
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return res.status(400).json({ error: "Invalid signature" });
  }

  const { type, data } = evt;

  try {
    if (type === "user.created" || type === "user.updated") {
      const userData = {
        clerkId: data.id,
        email: data.email_addresses?.[0]?.email_address || "",
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        username: data.username || data.email_addresses?.[0]?.email_address?.split("@")[0] || "",
        profilePicture: data.image_url || "",
      };

      await User.findOneAndUpdate(
        { clerkId: userData.clerkId },
        userData,
        { upsert: true, new: true }
      );

      console.log(`User ${userData.clerkId} synced successfully`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ error: "Failed to process webhook" });
  }
});

export default router;