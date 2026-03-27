import { Feather } from "@expo/vector-icons";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@clerk/expo";
import io, { Socket } from "socket.io-client";

const API_URL = "https://boomer-k9z3.onrender.com";   // Change to your Render URL later

const MessagesScreen = () => {
  const { userId, getToken, isSignedIn } = useAuth();

  const socketRef = useRef<Socket | null>(null);

  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // ====================== SOCKET SETUP ======================
  useEffect(() => {
    if (!isSignedIn || !userId) return;

    const setupSocket = async () => {
      const token = await getToken();

      socketRef.current = io(API_URL, {
        transports: ["websocket"],
        auth: { token },
        reconnection: true,
      });

      socketRef.current.on("connect", () => {
        console.log("Socket connected");
      });

      socketRef.current.on("newMessage", (message: any) => {
        // Only add if it's for the currently open chat
        const partnerId = selectedConversation?.userId || selectedConversation?._id;

        if (
          message.senderId === partnerId ||
          message.receiverId === partnerId
        ) {
          setMessages((prev) => [...prev, message]);
        }
      });

      // Optional: Listen for online users
      socketRef.current.on("getOnlineUsers", (onlineUsers: string[]) => {
        console.log("Online users:", onlineUsers);
      });
    };

    setupSocket();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [userId, isSignedIn, selectedConversation]);

  // ====================== LOAD CONVERSATIONS ======================
  const loadConversations = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/messages/chats`, {  // Use your /chats route
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("SERVER ERROR:", data);
        throw new Error(data.message || "Request failed");
      }
      setConversations(data);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [getToken, userId]);

  useEffect(() => {
    if (isSignedIn) loadConversations();
  }, [loadConversations, isSignedIn]);

  // ====================== FETCH ALL USERS (for new chat) ======================
  const fetchUsers = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/messages/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // ====================== OPEN CHAT ======================
  const openConversation = async (partner: any) => {
    setSelectedConversation(partner);
    setIsChatOpen(true);
    setMessages([]);

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/messages/${partner.userId || partner._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMessages(data);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  // ====================== SEND MESSAGE ======================
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const messageData = {
      text: newMessage.trim(),
      // image: null, // add later if needed
    };

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/messages/send/${selectedConversation.userId || selectedConversation._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(messageData),
      });

      const savedMessage = await res.json();

      // Optimistically add to UI
      setMessages((prev) => [...prev, savedMessage]);
      setNewMessage("");

      // Refresh conversation list
      loadConversations();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Join room when chat opens (better real-time)
  useEffect(() => {
    if (selectedConversation && socketRef.current) {
      const partnerId = selectedConversation.userId || selectedConversation._id;
      socketRef.current.emit("joinChat", { chatPartnerId: partnerId });
    }
  }, [selectedConversation]);

  if (!isSignedIn) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <Text>Please sign in to view messages</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900">Messages</Text>
        <TouchableOpacity
          onPress={() => {
            fetchUsers();
            setIsUserPickerOpen(true);
          }}
        >
          <Feather name="edit-3" size={26} color="#1DA1F2" />
        </TouchableOpacity>
      </View>

      {/* Conversations List */}
      <ScrollView className="flex-1">
        {loading ? (
          <ActivityIndicator size="large" color="#1DA1F2" className="mt-10" />
        ) : conversations.length === 0 ? (
          <Text className="text-center text-gray-500 mt-10">No conversations yet</Text>
        ) : (
          conversations.map((conv) => (
            <TouchableOpacity
              key={conv._id || conv.userId}
              className="p-4 border-b border-gray-100 flex-row items-center"
              onPress={() => openConversation(conv)}
            >
              <View className="flex-1">
                <Text className="font-semibold text-base">{conv.fullName || conv.username}</Text>
                <Text className="text-gray-500 text-sm mt-0.5" numberOfLines={1}>
                  {conv.lastMessage || "Start chatting"}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* New Chat User Picker Modal */}
      <Modal visible={isUserPickerOpen} animationType="slide">
        <SafeAreaView className="flex-1 bg-white">
          <View className="p-4 border-b flex-row justify-between items-center">
            <Text className="text-xl font-semibold">New Message</Text>
            <TouchableOpacity onPress={() => setIsUserPickerOpen(false)}>
              <Text className="text-blue-500 font-medium">Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            {users.map((user) => (
              <TouchableOpacity
                key={user._id || user.clerkId}
                className="p-4 border-b"
                onPress={() => {
                  setIsUserPickerOpen(false);
                  openConversation(user);
                }}
              >
                <Text className="text-lg">{user.fullName || user.username}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Chat Modal */}
      <Modal visible={isChatOpen} animationType="slide">
        <SafeAreaView className="flex-1 bg-white">
          {/* Chat Header */}
          <View className="flex-row items-center px-4 py-4 border-b">
            <TouchableOpacity onPress={() => setIsChatOpen(false)} className="mr-3">
              <Feather name="arrow-left" size={28} color="#1DA1F2" />
            </TouchableOpacity>
            <Text className="text-xl font-semibold">
              {selectedConversation?.fullName || "Chat"}
            </Text>
          </View>

          {/* Messages */}
          <ScrollView className="flex-1 px-4 py-2">
            {messages.map((msg, index) => (
              <View
                key={msg._id || index}
                className={`mb-3 flex ${msg.senderId === userId ? "items-end" : "items-start"}`}
              >
                <View
                  className={`max-w-[80%] px-4 py-3 rounded-3xl ${
                    msg.senderId === userId
                      ? "bg-blue-600 rounded-br-none"
                      : "bg-gray-200 rounded-bl-none"
                  }`}
                >
                  <Text
                    className={msg.senderId === userId ? "text-white" : "text-black"}
                  >
                    {msg.text}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Input Area */}
          <View className="flex-row items-center p-3 border-t bg-white">
            <TextInput
              className="flex-1 bg-gray-100 rounded-full px-5 py-3 text-base"
              placeholder="Type a message..."
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
            />
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!newMessage.trim()}
              className="ml-3 bg-blue-600 px-6 py-3 rounded-full disabled:opacity-50"
            >
              <Text className="text-white font-semibold">Send</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default MessagesScreen;