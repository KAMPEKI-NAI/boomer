import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useState, useEffect, useRef } from "react";
import { useLocalSearchParams, router, usePathname } from "expo-router";
import { useAuth } from "@clerk/expo";
import { API_CONFIG } from "@/config/api.config";

type Message = {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
};

export default function ChatScreen() {
  const params = useLocalSearchParams();
  const pathname = usePathname();

  const userId = params.userId as string | undefined;
  const userName = (params.userName as string) || "Chat";
  const userAvatar = params.userAvatar as string | undefined;

  const { userId: currentUserId, getToken } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    console.log("📍 Current Path:", pathname);
    console.log("📍 Params Received:", params);
    console.log("📍 Extracted userId:", userId);
  }, [pathname, params]);

  useEffect(() => {
    if (userId && currentUserId) {
      fetchMessages();
    }
  }, [userId]);

  /* ================= FETCH MESSAGES ================= */

  const fetchMessages = async () => {
    try {
      const token = await getToken();

      const res = await fetch(
        `${API_CONFIG.apiUrl}/messages/${userId}`, // ✅ FIXED
        {
          method: "GET", // ✅ FIXED
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      console.log("📥 STATUS:", res.status);
      console.log("📥 DATA:", data);

      if (!res.ok) {
        throw new Error(data.message || "Failed to load messages");
      }

      // ✅ MAP BACKEND → FRONTEND
      const formatted = data.map((msg: any) => ({
        id: msg._id,
        text: msg.content,
        senderId: msg.senderId,
        createdAt: msg.createdAt,
      }));

      setMessages(formatted);
    } catch (error) {
      console.error("❌ Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  };

  /* ================= SEND MESSAGE ================= */

  const sendMessage = async () => {
    if (!newMessage.trim() || !userId || !currentUserId) return;

    const messageText = newMessage.trim(); // ✅ FIXED

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      text: messageText,
      senderId: currentUserId,
      createdAt: new Date().toISOString(),
    };

    // Optimistic UI
    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage("");
    Keyboard.dismiss();

    setIsSending(true);

    try {
      const token = await getToken();

      const res = await fetch(
        `${API_CONFIG.apiUrl}/messages/${userId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: messageText, // ✅ FIXED
          }),
        }
      );

      const data = await res.json();

      console.log("📤 SEND STATUS:", res.status);
      console.log("📤 SEND DATA:", data);

      if (!res.ok) {
        throw new Error(data.message || "Send failed");
      }

      // Replace temp message with real one
      const formatted = {
        id: data._id,
        text: data.content,
        senderId: data.senderId,
        createdAt: data.createdAt,
      };

      setMessages((prev) =>
        prev.map((m) => (m.id === tempMessage.id ? formatted : m))
      );
    } catch (err) {
      console.error("❌ Send failed:", err);

      // Remove failed message
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  /* ================= RENDER ================= */

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.senderId === currentUserId;

    return (
      <View
        className={`max-w-[75%] mb-3 px-4 py-3 rounded-2xl ${
          isMine
            ? "bg-blue-500 self-end rounded-br-none"
            : "bg-gray-200 self-start rounded-bl-none"
        }`}
      >
        <Text className={isMine ? "text-white" : "text-gray-900"}>
          {item.text}
        </Text>

        <Text
          className={`text-[10px] mt-1 ${
            isMine ? "text-blue-100" : "text-gray-500"
          }`}
        >
          {new Date(item.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* HEADER */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Feather name="arrow-left" size={24} color="#1DA1F2" />
        </TouchableOpacity>

        <Image
          source={{ uri: userAvatar || "https://via.placeholder.com/150" }}
          className="w-10 h-10 rounded-full mr-3"
        />

        <View className="flex-1">
          <Text className="font-semibold text-lg text-gray-900">
            {userName}
          </Text>
          <Text className="text-xs text-gray-500">Active now</Text>
        </View>
      </View>

      {/* MESSAGES */}
      <View className="flex-1 bg-gray-50">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#1DA1F2" />
          </View>
        ) : messages.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Feather name="message-circle" size={80} color="#E5E7EB" />
            <Text className="text-gray-400 text-center mt-6 text-lg">
              No messages yet.{"\n"}Send a message to start chatting!
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* INPUT */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 30}
      >
        <View className="flex-row items-center px-4 py-4 border-t border-gray-100 bg-white">
          <View className="flex-1 bg-gray-100 rounded-3xl px-5 py-2 mr-3">
            <TextInput
              className="flex-1 text-base py-2 max-h-32"
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
            />
          </View>

          <TouchableOpacity
            onPress={sendMessage}
            disabled={isSending || !newMessage.trim() || !userId}
            className={`w-11 h-11 rounded-full items-center justify-center ${
              !newMessage.trim() || !userId
                ? "bg-gray-300"
                : "bg-blue-500"
            }`}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Feather name="send" size={22} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}