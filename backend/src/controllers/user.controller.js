// models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  clerkId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    default: '',
  },
  firstName: {
    type: String,
    default: '',
  },
  lastName: {
    type: String,
    default: '',
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
  },
  email: {
    type: String,
    default: '',
  },
  profilePicture: {
    type: String,
    default: 'https://via.placeholder.com/150',
  },
  bannerImage: {
    type: String,
    default: '',
  },
  bio: {
    type: String,
    default: '',
  },
  location: {
    type: String,
    default: '',
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, {
  timestamps: true,
});

const User = mongoose.model('User', userSchema);
export default User;