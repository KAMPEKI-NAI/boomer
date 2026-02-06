import { CONVERSATIONS, ConversationType, MessageType } from "@/data/conversations";
import { Feather } from "@expo/vector-icons";
import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import {
  View,
  Text,
  Alert,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";

/* 🔴 CHANGE THIS TO YOUR LOCAL IP */
const SOCKET_URL = "http://192.168.0.111:3000";

const MessagesScreen = () => {
  // ✅ Clerk auth
  const { userId, getToken } = useAuth();

  const socketRef = useRef<Socket | null>(null);

  const [searchText, setSearchText] = useState("");
  const [conversationsList, setConversationsList] = useState(CONVERSATIONS);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationType | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<MessageType[]>([]);

  /* ================= SOCKET CONNECTION ================= */
  useEffect(() => {
    if (!userId) return; // wait until Clerk provides userId

    const setupSocket = async () => {
      const token = await getToken();

      socketRef.current = io(SOCKET_URL, {
        transports: ["websocket"],
        auth: { token }, // send Clerk token to backend
      });

      socketRef.current.on("connect", () => {
        console.log("Socket connected:", socketRef.current?.id);
      });

      socketRef.current.on("newMessage", (message: MessageType) => {
        setMessages((prev) => [...prev, message]);
      });
    };

    setupSocket();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [userId, getToken]); // ✅ include getToken to fix warning

  /* ================= CONVERSATION HANDLERS ================= */
  const openConversation = async (conversation: ConversationType) => {
    setSelectedConversation(conversation);
    setIsChatOpen(true);

    try {
      const token = await getToken();
      const res = await fetch(
        `${SOCKET_URL}/api/messages/${conversation.user.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.log("Failed to load messages", err);
    }
  };

  const closeChatModal = () => {
    setIsChatOpen(false);
    setSelectedConversation(null);
    setMessages([]);
    setNewMessage("");
  };

  const deleteConversation = (conversationId: number) => {
    Alert.alert("Delete Conversation", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setConversationsList((prev) =>
            prev.filter((conv) => conv.id !== conversationId)
          );
        },
      },
    ]);
  };

  /* ================= SEND MESSAGE ================= */
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !userId) return;

    const messageData: MessageType = {
      id: Date.now(), // temporary local id
      text: newMessage,
      fromUser: true,
      timestamp: new Date(),
      time: "now",
    };

    socketRef.current?.emit("sendMessage", {
      ...messageData,
      receiverId: selectedConversation.user.id,
      senderId: userId,
    });

    setMessages((prev) => [...prev, messageData]);
    setNewMessage("");
  };

  /* ================= UI ================= */
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* HEADER */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Messages</Text>
        <TouchableOpacity>
          <Feather name="edit" size={24} color="#1DA1F2" />
        </TouchableOpacity>
      </View>

      {/* SEARCH */}
      <View className="px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-3">
          <Feather name="search" size={20} color="#657786" />
          <TextInput
            placeholder="Search"
            className="flex-1 ml-3 text-base"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* CONVERSATIONS */}
      <ScrollView className="flex-1">
        {conversationsList.map((conversation) => (
          <TouchableOpacity
            key={conversation.id}
            className="flex-row items-center p-4 border-b border-gray-50"
            onPress={() => openConversation(conversation)}
            onLongPress={() => deleteConversation(conversation.id)}
          >
            <Image
              source={{ uri: conversation.user.avatar }}
              className="size-12 rounded-full mr-3"
            />
            <View className="flex-1">
              <Text className="font-semibold">{conversation.user.name}</Text>
              <Text className="text-gray-500" numberOfLines={1}>
                {conversation.lastMessage}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* CHAT MODAL */}
      <Modal visible={isChatOpen} animationType="slide">
        {selectedConversation && (
          <SafeAreaView className="flex-1">
            {/* HEADER */}
            <View className="flex-row items-center px-4 py-3 border-b">
              <TouchableOpacity onPress={closeChatModal}>
                <Feather name="arrow-left" size={24} color="#1DA1F2" />
              </TouchableOpacity>
              <Text className="ml-4 font-semibold">
                {selectedConversation.user.name}
              </Text>
            </View>

            {/* MESSAGES */}
            <ScrollView className="flex-1 px-4 py-4">
              {messages.map((message) => (
                <View
                  key={message.id}
                  className={`mb-3 ${
                    message.fromUser ? "items-end" : "items-start"
                  }`}
                >
                  <View
                    className={`px-4 py-3 rounded-2xl max-w-xs ${
                      message.fromUser ? "bg-blue-500" : "bg-gray-100"
                    }`}
                  >
                    <Text
                      className={message.fromUser ? "text-white" : "text-black"}
                    >
                      {message.text}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* INPUT */}
            <View className="flex-row px-4 py-3 border-t">
              <TextInput
                className="flex-1 bg-gray-100 rounded-full px-4"
                placeholder="Start a message..."
                value={newMessage}
                onChangeText={setNewMessage}
              />
              <TouchableOpacity
                onPress={sendMessage}
                className="ml-2 bg-blue-500 size-10 rounded-full items-center justify-center"
              >
                <Feather name="send" size={18} color="white" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
};

export default MessagesScreen;
