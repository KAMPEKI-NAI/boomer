// backend/src/models/Message.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    index: true,
  },
  senderId: {
    type: String,
    required: true,
  },
  receiverId: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  replyTo: {
    type: String,
    default: null,
  },
  read: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
    default: null,
  },
  deleted: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes for faster queries
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;