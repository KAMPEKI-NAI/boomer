import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    profilePicture: { type: String, default: "" },
    bannerImage: { type: String, default: "" },
    bio: { type: String, default: "", maxLength: 160 },
    location: { type: String, default: "" },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ========== VIRTUAL FIELD ========== */
userSchema.virtual("name").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

const User = mongoose.model("User", userSchema);

export default User;
