// backend/src/models/Conversation.js
import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: String,
    required: true,
  }],
  lastMessage: {
    type: String,
    default: '',
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {},
  },
}, {
  timestamps: true,
});

// Ensure participants are unique per conversation
conversationSchema.index({ participants: 1 }, { unique: true });

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;