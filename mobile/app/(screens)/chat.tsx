import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useState, useEffect, useRef } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { useAuth } from "@clerk/expo";

type MessageStatus = "sending" | "sent" | "delivered" | "read" | "error";

interface Message {
  id: string;
  text: string;
  time: string;
  fromUser: boolean;
  status?: MessageStatus;
}

export default function ChatScreen() {
  const { userId, userName, userAvatar } = useLocalSearchParams<{
    userId: string;
    userName: string;
    userAvatar: string;
  }>();
  
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (userId) {
      fetchMessages();
    }
  }, [userId]);

  const fetchMessages = async () => {
    try {
      const token = await getToken();
      const response = await fetch(
        `https://boomer-two.vercel.app/api/messages?userId=${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    
    const optimisticMessage: Message = {
      id: Date.now().toString(),
      text: newMessage.trim(),
      time: "Just now",
      fromUser: true,
      status: "sending",
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage("");
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const token = await getToken();
      const response = await fetch(`https://boomer-two.vercel.app/api/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiverId: userId,
          content: optimisticMessage.text,
        }),
      });

      if (response.ok) {
        const savedMessage = await response.json();
        setMessages(prev =>
          prev.map(msg =>
            msg.id === optimisticMessage.id
              ? { ...msg, id: savedMessage.id, status: "sent" }
              : msg
          )
        );
      } else {
        throw new Error("Failed to send");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === optimisticMessage.id ? { ...msg, status: "error" } : msg
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  const retrySendMessage = async (messageId: string, messageText: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, status: "sending" } : msg
      )
    );

    try {
      const token = await getToken();
      const response = await fetch(`https://boomer-two.vercel.app/api/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiverId: userId,
          content: messageText,
        }),
      });

      if (response.ok) {
        const savedMessage = await response.json();
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId
              ? { ...msg, id: savedMessage.id, status: "sent" }
              : msg
          )
        );
      } else {
        throw new Error("Failed to send");
      }
    } catch (error) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, status: "error" } : msg
        )
      );
    }
  };

  const MessageBubble = ({ message }: { message: Message }) => {
    const isError = message.status === "error";
    
    return (
      <View className={`flex-row mb-3 ${message.fromUser ? "justify-end" : ""}`}>
        {!message.fromUser && (
          <Image
            source={{ uri: userAvatar || "https://via.placeholder.com/150" }}
            className="w-8 h-8 rounded-full mr-2"
          />
        )}
        <View className={`flex-1 ${message.fromUser ? "items-end" : ""}`}>
          <View
            className={`rounded-2xl px-4 py-3 max-w-[80%] ${
              message.fromUser 
                ? isError ? "bg-red-500" : "bg-blue-500"
                : "bg-gray-100"
            }`}
          >
            <Text className={message.fromUser ? "text-white" : "text-gray-900"}>
              {message.text}
            </Text>
          </View>
          <View className="flex-row items-center mt-1">
            <Text className="text-xs text-gray-400">{message.time}</Text>
            {message.fromUser && message.status === "sending" && (
              <ActivityIndicator size="small" color="#9CA3AF" className="ml-1" />
            )}
            {message.fromUser && message.status === "sent" && (
              <Feather name="check" size={12} color="#9CA3AF" className="ml-1" />
            )}
            {message.fromUser && message.status === "error" && (
              <TouchableOpacity onPress={() => retrySendMessage(message.id, message.text)}>
                <Feather name="alert-circle" size={12} color="#EF4444" className="ml-1" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#1DA1F2" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Feather name="arrow-left" size={24} color="#1DA1F2" />
        </TouchableOpacity>
        <Image
          source={{ uri: userAvatar || "https://via.placeholder.com/150" }}
          className="w-10 h-10 rounded-full mr-3"
        />
        <View className="flex-1">
          <Text className="font-semibold text-gray-900">{userName}</Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4 py-4"
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <Feather name="message-circle" size={64} color="#D1D5DB" />
            <Text className="text-gray-400 text-lg mt-4 text-center">
              No messages yet
            </Text>
            <Text className="text-gray-400 text-sm mt-2 text-center">
              Send a message to start the conversation
            </Text>
          </View>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
      </ScrollView>

      {/* Input */}
      <View className="flex-row items-center px-4 py-3 border-t border-gray-100">
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
            newMessage.trim() && !isSending ? "bg-blue-500" : "bg-gray-300"
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
    </SafeAreaView>
  );
}
