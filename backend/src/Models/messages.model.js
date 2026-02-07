import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: String, // Clerk userId (e.g. user_2abc...)
      required: true,
      index: true,
    },

    receiverId: {
      type: String, // Clerk userId
      required: true,
      index: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },

    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

/* ================= INDEXES (IMPORTANT) ================= */
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ createdAt: -1 });

export default mongoose.model("Message", messageSchema);
