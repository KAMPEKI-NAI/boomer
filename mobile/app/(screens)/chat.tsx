import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { useAuth } from "@clerk/expo";
import { API_CONFIG } from "@/config/api.config";

export default function ChatScreen() {
  const { userId, userName, userAvatar } = useLocalSearchParams<{
    userId: string;
    userName: string;
    userAvatar: string;
  }>();

  const { userId: currentUserId, getToken } = useAuth();

  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const sendMessage = async () => {
  if (!newMessage.trim() || !userId || !currentUserId) return;

  setIsSending(true);

  try {
    const token = await getToken();

    const res = await fetch(
      `${API_CONFIG.apiUrl}/messages/send/${userId}`, // ✅ FIXED ROUTE
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: newMessage.trim(), // ✅ FIXED (not receiverId)
        }),
      }
    );

    const data = await res.json();

    console.log("SEND RESPONSE:", data);

    if (!res.ok) {
      throw new Error(data.message || "Failed to send");
    }

    setNewMessage("");

    router.push({
      pathname: "/(tabs)/messages",
      params: {
        newUser: JSON.stringify({
          id: userId,
          name: userName,
          username: userName,
          avatar: userAvatar,
          verified: false,
        }),
      },
    });

  } catch (err) {
    console.error("Send message error:", err);
  } finally {
    setIsSending(false);
  }
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

        <View>
          <Text className="font-semibold text-gray-900">
            {userName}
          </Text>
          <Text className="text-gray-500 text-sm">
            Start a conversation
          </Text>
        </View>
      </View>

      {/* BODY */}
      <View className="flex-1 items-center justify-center px-6">
        <Feather name="message-circle" size={64} color="#D1D5DB" />
        <Text className="text-gray-400 text-lg mt-4 text-center">
          Send your first message
        </Text>
      </View>

      {/* INPUT */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-row items-center px-4 py-3 border-t border-gray-100 bg-white">
          
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-4 py-2 mr-3">
            <TextInput
              className="flex-1 text-base"
              placeholder="Type a message..."
              placeholderTextColor="#657786"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
            />
          </View>

          <TouchableOpacity
            onPress={sendMessage}
            className={`w-10 h-10 rounded-full items-center justify-center ${
              newMessage.trim() && !isSending
                ? "bg-blue-500"
                : "bg-gray-300"
            }`}
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Feather name="send" size={20} color="white" />
            )}
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}