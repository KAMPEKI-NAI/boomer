export type MessageType = {
  _id?: string;
  text: string;
  senderId: string;
  receiverId: string;
  createdAt?: string;
};

export type ConversationUser = {
  id: string;
  name: string;
  avatar: string;
};

export type ConversationType = {
  id: string;
  user: ConversationUser;
  lastMessage: string;
};
