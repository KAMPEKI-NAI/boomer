import { Feather } from "@expo/vector-icons";
import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Alert,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@clerk/expo";
import { socketService } from "@/services/socketService";

interface Message {
  id: string;
  text: string;
  time: string;
  fromUser: boolean;
  status?: "sending" | "sent" | "delivered" | "read" | "error";
}

interface Conversation {
  id: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    verified: boolean;
  };
  lastMessage: string;
  time: string;
  unreadCount: number;
  messages: Message[];
}

const MessagesScreen = () => {
  const { userId, getToken, isSignedIn } = useAuth();

  const [searchText, setSearchText] = useState("");
  const [conversationsList, setConversationsList] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 🔌 INIT SOCKET
  useEffect(() => {
    const initSocket = async () => {
      if (userId && isSignedIn) {
        const connected = await socketService.connect(userId, getToken);
        setIsConnected(connected);
      }
    };
    initSocket();
  }, [userId, isSignedIn, getToken]);

  // 🔍 FILTER SEARCH
  useEffect(() => {
    if (searchText.trim() === "") {
      setFilteredConversations(conversationsList);
    } else {
      const filtered = conversationsList.filter(conv =>
        conv.user.name.toLowerCase().includes(searchText.toLowerCase()) ||
        conv.user.username.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  }, [searchText, conversationsList]);

  // 🔌 SOCKET LISTENERS
  useEffect(() => {
    if (!selectedConversation || !userId || !isConnected) return;

    const roomId = [userId, selectedConversation.user.id].sort().join("_");
    
    socketService.joinConversation(roomId);

    const handleNewMessage = (message: any) => {
      if (message.conversationId !== roomId) return;

      const newMsg: Message = {
        id: message.id || Date.now().toString(),
        text: message.content,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        fromUser: message.senderId === userId,
        status: "delivered",
      };

      setSelectedConversation(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...prev.messages, newMsg],
          lastMessage: newMsg.text,
          time: "now",
        };
      });

      // Update conversation list
      setConversationsList(prev => {
        const exists = prev.find(c => c.id === roomId);
        if (exists) {
          return prev.map(c =>
            c.id === roomId
              ? { ...c, lastMessage: newMsg.text, time: "now" }
              : c
          );
        }
        return prev;
      });

      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    };

    const handleTyping = (data: any) => {
      if (data.userId === selectedConversation.user.id) {
        setIsOtherTyping(data.isTyping);
      }
    };

    socketService.onNewMessage(handleNewMessage);
    socketService.onUserTyping(handleTyping);

    return () => {
      socketService.removeListener("newMessage");
      socketService.removeListener("userTyping");
    };
  }, [selectedConversation, isConnected, userId]);

  // 💬 OPEN CHAT
  const openConversation = async (conversation: Conversation) => {
    if (!userId) return;

    const connected = await socketService.ensureConnected(userId, getToken);
    if (!connected) {
      Alert.alert("Connection Error", "Unable to connect");
      return;
    }

    setSelectedConversation(conversation);
    setIsChatOpen(true);
  };

  // ✍️ TYPING
  const handleTyping = (text: string) => {
    setNewMessage(text);

    if (!selectedConversation || !userId) return;

    const roomId = [userId, selectedConversation.user.id].sort().join("_");

    socketService.sendTyping(roomId, text.length > 0);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketService.sendTyping(roomId, false);
    }, 2000);
  };

  // 🚀 SEND MESSAGE
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !userId || isSending) return;

    const roomId = [userId, selectedConversation.user.id].sort().join("_");

    setIsSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    const tempId = Date.now().toString();

    const tempMessage: Message = {
      id: tempId,
      text: content,
      time: "now",
      fromUser: true,
      status: "sending",
    };

    setSelectedConversation(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: [...prev.messages, tempMessage],
        lastMessage: content,
        time: "now",
      };
    });

    try {
      await socketService.sendMessage(roomId, content);

      setSelectedConversation(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map(msg =>
            msg.id === tempId ? { ...msg, status: "sent" } : msg
          ),
        };
      });

      // ✅ ADD / UPDATE CONVERSATION LIST
      setConversationsList(prev => {
        const exists = prev.find(c => c.id === roomId);

        if (exists) {
          return prev.map(c =>
            c.id === roomId
              ? { ...c, lastMessage: content, time: "now" }
              : c
          );
        }

        return [
          {
            id: roomId,
            user: selectedConversation.user,
            lastMessage: content,
            time: "now",
            unreadCount: 0,
            messages: [tempMessage],
          },
          ...prev,
        ];
      });

    } catch (error) {
      setSelectedConversation(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map(msg =>
            msg.id === tempId ? { ...msg, status: "error" } : msg
          ),
        };
      });
      Alert.alert("Error", "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  // ================= UI =================

  const ConversationItem = ({ conversation }: { conversation: Conversation }) => (
    <TouchableOpacity
      className="flex-row items-center p-4 border-b border-gray-50 active:bg-gray-50"
      onPress={() => openConversation(conversation)}
    >
      <Image source={{ uri: conversation.user.avatar }} className="size-12 rounded-full mr-3" />
      <View className="flex-1">
        <View className="flex-row justify-between">
          <Text className="font-semibold">{conversation.user.name}</Text>
          <Text className="text-gray-400 text-xs">{conversation.time}</Text>
        </View>
        <Text className="text-gray-500 text-sm">{conversation.lastMessage}</Text>
      </View>
      {conversation.unreadCount > 0 && (
        <View className="bg-blue-500 rounded-full min-w-[20px] h-5 items-center justify-center px-1">
          <Text className="text-white text-xs">{conversation.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const MessageBubble = ({ message }: { message: Message }) => (
    <View className={`flex-row mb-3 ${message.fromUser ? "justify-end" : ""}`}>
      <View className={`rounded-2xl px-4 py-3 max-w-[80%] ${message.fromUser ? "bg-blue-500" : "bg-gray-100"}`}>
        <Text className={message.fromUser ? "text-white" : "text-gray-900"}>
          {message.text}
        </Text>
        {message.status === "sending" && (
          <ActivityIndicator size="small" color="#ffffff" style={{ marginLeft: 5 }} />
        )}
        {message.status === "error" && (
          <Feather name="alert-circle" size={12} color="red" />
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">

      {/* HEADER */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Messages</Text>
        <Feather name="edit" size={24} color="#1DA1F2" />
      </View>

      {/* SEARCH BAR */}
      <View className="px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-3">
          <Feather name="search" size={20} color="#657786" />
          <TextInput
            placeholder="Search"
            className="flex-1 ml-3"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* LIST */}
      <ScrollView>
        {filteredConversations.length > 0 ? (
          filteredConversations.map(conv => (
            <ConversationItem key={conv.id} conversation={conv} />
          ))
        ) : (
          <View className="flex-1 items-center justify-center py-10">
            <Text className="text-gray-500">No conversations yet</Text>
          </View>
        )}
      </ScrollView>

      {/* CHAT MODAL */}
      <Modal visible={isChatOpen} animationType="slide" onRequestClose={() => setIsChatOpen(false)}>
        {selectedConversation && (
          <SafeAreaView className="flex-1 bg-white">
            {/* Chat Header */}
            <View className="flex-row items-center p-4 border-b border-gray-100">
              <TouchableOpacity onPress={() => setIsChatOpen(false)} className="mr-4">
                <Feather name="arrow-left" size={24} color="#1DA1F2" />
              </TouchableOpacity>
              <Image source={{ uri: selectedConversation.user.avatar }} className="size-10 rounded-full mr-3" />
              <View>
                <Text className="font-semibold text-lg">{selectedConversation.user.name}</Text>
                {isOtherTyping && (
                  <Text className="text-xs text-blue-500">Typing...</Text>
                )}
              </View>
            </View>

            {/* Messages */}
            <ScrollView 
              ref={scrollViewRef}
              className="flex-1 p-4"
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {selectedConversation.messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </ScrollView>

            {/* Input Area */}
            <KeyboardAvoidingView 
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
              <View className="flex-row p-3 border-t border-gray-100 items-end">
                <TextInput
                  className="flex-1 bg-gray-100 rounded-full px-4 py-2 max-h-24"
                  value={newMessage}
                  onChangeText={handleTyping}
                  placeholder="Type a message..."
                  multiline
                  editable={!isSending}
                />
                <TouchableOpacity 
                  onPress={sendMessage} 
                  className="ml-2 bg-blue-500 rounded-full p-2"
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
        )}
      </Modal>
    </SafeAreaView>
  );
};

export default MessagesScreen;