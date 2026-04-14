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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@clerk/expo";
import { socketService } from "@/services/socketService";
import { API_CONFIG } from "@/config/api.config";

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

// Mock data - replace with your API call
const fetchConversations = async (userId: string): Promise<Conversation[]> => {
  return [
    {
      id: "1",
      user: {
        id: "user1",
        name: "John Doe",
        username: "johndoe",
        avatar: "https://randomuser.me/api/portraits/men/1.jpg",
        verified: true,
      },
      lastMessage: "Hey, how are you?",
      time: "2m ago",
      unreadCount: 2,
      messages: [
        { id: "1", text: "Hey, how are you?", time: "2:30 PM", fromUser: false },
        { id: "2", text: "I'm good, thanks! How about you?", time: "2:31 PM", fromUser: true },
      ],
    },
  ];
};

const MessagesScreen = () => {
  const insets = useSafeAreaInsets();
  const { userId, getToken, isSignedIn } = useAuth();
  const [searchText, setSearchText] = useState("");
  const [conversationsList, setConversationsList] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isJoiningRef = useRef(false);

  useEffect(() => {
    loadConversations();
    initSocket();
  }, []);

  const initSocket = async () => {
    if (userId && isSignedIn) {
      const token = await getToken();
      if (token) {
        const connected = await socketService.connect(userId, getToken);
        setIsConnected(connected);
      }
    }
  };

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const conversations = await fetchConversations(userId || "");
      setConversationsList(conversations);
      setFilteredConversations(conversations);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

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

  useEffect(() => {
    if (!selectedConversation || !userId || !isConnected) return;

    const roomId = [userId, selectedConversation.user.id].sort().join("_");
    socketService.joinConversation(roomId, userId, getToken);

    const handleNewMessage = (message: any) => {
      const roomId = [userId, selectedConversation.user.id].sort().join("_");

      if (message.conversationId === roomId) {
        const newMsg: Message = {
          id: message.id || Date.now().toString(),
          text: message.content,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
        
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      }
    };

    const handleUserTyping = (data: { userId: string; isTyping: boolean }) => {
      if (data.userId === selectedConversation.user.id) {
        setIsOtherTyping(data.isTyping);
      }
    };

    socketService.onNewMessage(handleNewMessage);
    socketService.onUserTyping(handleUserTyping);

    return () => {
      socketService.removeListener('newMessage');
      socketService.removeListener('userTyping');
    };
  }, [selectedConversation, isConnected, userId]);

  const deleteConversation = (conversationId: string) => {
    Alert.alert("Delete Conversation", "Are you sure you want to delete this conversation?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setConversationsList((prev) => prev.filter((conv) => conv.id !== conversationId));
        },
      },
    ]);
  };

  const openConversation = async (conversation: Conversation) => {
    if (!userId || !getToken) return;
    
    const connected = await socketService.ensureConnected(userId, getToken);
    if (!connected) {
      Alert.alert('Connection Error', 'Unable to connect to chat server');
      return;
    }
    
    setSelectedConversation(conversation);
    setIsChatOpen(true);
    
    const roomId = [userId, conversation.user.id].sort().join("_");
    socketService.joinConversation(roomId, userId, getToken);
  };

  const closeChatModal = () => {
    setIsChatOpen(false);
    setSelectedConversation(null);
    setNewMessage("");
    setIsOtherTyping(false);
  };

  const handleTyping = (text: string) => {
    setNewMessage(text);
    
    if (selectedConversation && isConnected) {
      const roomId = [userId, selectedConversation.user.id].sort().join("_");

      socketService.sendTyping(roomId, text.length > 0);
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (selectedConversation) {
          socketService.sendTyping(selectedConversation.id, false);
        }
      }, 2000);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !userId || !getToken || !isConnected || isSending) return;
    
    setIsSending(true);
    const content = newMessage.trim();
    setNewMessage('');
    
    const tempId = Date.now().toString();
    
    setSelectedConversation(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: [...prev.messages, {
          id: tempId,
          text: content,
          time: "now",
          fromUser: true,
          status: "sending",
        }],
        lastMessage: content,
        time: "now",
      };
    });
    
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    
    try {
      await socketService.sendMessage(selectedConversation.id, content, userId, getToken);
      
      setSelectedConversation(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map(msg =>
            msg.id === tempId ? { ...msg, status: "sent" } : msg
          ),
        };
      });
      
      setConversationsList(prev =>
        prev.map(conv =>
          conv.id === selectedConversation.id
            ? { ...conv, lastMessage: content, time: "now" }
            : conv
        )
      );
    } catch (error) {
      console.error("Failed to send message:", error);
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
      if (selectedConversation) {
        const roomId = [userId, selectedConversation.user.id].sort().join("_");

        socketService.sendTyping(roomId, false);
      }
    }
  };

  const ConversationItem = ({ conversation }: { conversation: Conversation }) => (
    <TouchableOpacity
      className="flex-row items-center p-4 border-b border-gray-50 active:bg-gray-50"
      onPress={() => openConversation(conversation)}
      onLongPress={() => deleteConversation(conversation.id)}
    >
      <Image source={{ uri: conversation.user.avatar }} className="size-12 rounded-full mr-3" />
      <View className="flex-1">
        <View className="flex-row items-center justify-between mb-1">
          <View className="flex-row items-center gap-1 flex-1">
            <Text className="font-semibold text-gray-900" numberOfLines={1}>
              {conversation.user.name}
            </Text>
            {conversation.user.verified && (
              <Feather name="check-circle" size={16} color="#1DA1F2" />
            )}
            <Text className="text-gray-500 text-sm" numberOfLines={1}>
              @{conversation.user.username}
            </Text>
          </View>
          <Text className="text-gray-500 text-sm ml-2">{conversation.time}</Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-gray-500 flex-1" numberOfLines={1}>
            {conversation.lastMessage}
          </Text>
          {conversation.unreadCount > 0 && (
            <View className="bg-blue-500 rounded-full min-w-[20px] h-5 items-center justify-center px-1 ml-2">
              <Text className="text-white text-xs font-bold">{conversation.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const MessageBubble = ({ message }: { message: Message }) => (
    <View className={`flex-row mb-3 ${message.fromUser ? "justify-end" : ""}`}>
      {!message.fromUser && (
        <Image
          source={{ uri: selectedConversation?.user.avatar }}
          className="size-8 rounded-full mr-2"
        />
      )}
      <View className={`flex-1 ${message.fromUser ? "items-end" : ""}`}>
        <View
          className={`rounded-2xl px-4 py-3 max-w-[80%] ${
            message.fromUser ? "bg-blue-500" : "bg-gray-100"
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
            <Feather name="alert-circle" size={12} color="#EF4444" className="ml-1" />
          )}
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#1DA1F2" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Messages</Text>
        <TouchableOpacity>
          <Feather name="edit" size={24} color="#1DA1F2" />
        </TouchableOpacity>
      </View>

      <View className="px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-3">
          <Feather name="search" size={20} color="#657786" />
          <TextInput
            placeholder="Search for people and groups"
            className="flex-1 ml-3 text-base"
            placeholderTextColor="#657786"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Feather name="x" size={20} color="#657786" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!isConnected && (
        <View className="bg-yellow-50 py-2 px-4">
          <Text className="text-yellow-600 text-xs text-center">Connecting to chat server...</Text>
        </View>
      )}

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {filteredConversations.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Feather name="message-circle" size={64} color="#D1D5DB" />
            <Text className="text-gray-400 text-lg mt-4 text-center">
              {searchText.length > 0 ? "No conversations found" : "No messages yet"}
            </Text>
          </View>
        ) : (
          filteredConversations.map((conversation) => (
            <ConversationItem key={conversation.id} conversation={conversation} />
          ))
        )}
      </ScrollView>

      <View className="px-4 py-2 border-t border-gray-100 bg-gray-50">
        <Text className="text-xs text-gray-500 text-center">Tap to open • Long press to delete</Text>
      </View>

      <Modal visible={isChatOpen} animationType="slide" presentationStyle="pageSheet">
        {selectedConversation && (
          <SafeAreaView className="flex-1 bg-white">
            <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
              <TouchableOpacity onPress={closeChatModal} className="mr-3">
                <Feather name="arrow-left" size={24} color="#1DA1F2" />
              </TouchableOpacity>
              <Image
                source={{ uri: selectedConversation.user.avatar }}
                className="size-10 rounded-full mr-3"
              />
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="font-semibold text-gray-900 mr-1">
                    {selectedConversation.user.name}
                  </Text>
                  {selectedConversation.user.verified && (
                    <Feather name="check-circle" size={16} color="#1DA1F2" />
                  )}
                </View>
                <Text className="text-gray-500 text-sm">
                  @{selectedConversation.user.username}
                  {isOtherTyping && " • typing..."}
                </Text>
              </View>
            </View>

            <KeyboardAvoidingView 
              className="flex-1" 
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
              <ScrollView
                ref={scrollViewRef}
                className="flex-1 px-4 py-4"
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              >
                {selectedConversation.messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
              </ScrollView>

              <View className="flex-row items-center px-4 py-3 border-t border-gray-100 bg-white">
                <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-4 py-2 mr-3">
                  <TextInput
                    className="flex-1 text-base max-h-24"
                    placeholder="Type a message..."
                    placeholderTextColor="#657786"
                    value={newMessage}
                    onChangeText={handleTyping}
                    multiline
                    editable={isConnected}
                  />
                </View>
                
                <TouchableOpacity
                  onPress={sendMessage}
                  className={`size-10 rounded-full items-center justify-center ${
                    newMessage.trim() && isConnected && !isSending ? "bg-blue-500" : "bg-gray-300"
                  }`}
                  disabled={!newMessage.trim() || !isConnected || isSending}
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