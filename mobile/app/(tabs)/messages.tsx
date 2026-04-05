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

// Types
// Types
type MessageStatus = "sending" | "sent" | "delivered" | "read" | "error";

interface Message {
  id: string;
  text: string;
  time: string;
  fromUser: boolean;
  status?: MessageStatus;
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
 };
  

// Sample data - replace with your actual API call
const fetchConversations = async (userId: string): Promise<Conversation[]> => {
  // Replace with your actual API endpoint
  // const response = await fetch(`https://your-backend.com/api/conversations?userId=${userId}`);
  // return response.json();
  
  // Sample data for now
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
        { id: "3", text: "Doing great! Want to grab coffee?", time: "2:32 PM", fromUser: false },
      ],
    },
    {
      id: "2",
      user: {
        id: "user2",
        name: "Jane Smith",
        username: "janesmith",
        avatar: "https://randomuser.me/api/portraits/women/1.jpg",
        verified: false,
      },
      lastMessage: "See you tomorrow!",
      time: "1h ago",
      unreadCount: 0,
      messages: [
        { id: "1", text: "See you tomorrow!", time: "1:00 PM", fromUser: false },
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
  const [typingTimeout, setTypingTimeout] = useState<number | null>(null); // ✅ Fixed here
  
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  
  
  // Initialize socket connection
  useEffect(() => {
    if (!isSignedIn || !userId) return;
    
    const initSocket = async () => {
      try {
        const token = await getToken();
        if (token) {
          socketService.connect(userId, token);
          setIsConnected(true);
          console.log("Socket connected successfully");
        }
      } catch (error) {
        console.error("Failed to connect socket:", error);
      }
    };
    
    initSocket();
    
    return () => {
      socketService.disconnect();
      setIsConnected(false);
    };
  }, [isSignedIn, userId]);

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, [userId]);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const conversations = await fetchConversations(userId || "");
      setConversationsList(conversations);
      setFilteredConversations(conversations);
    } catch (error) {
      console.error("Error loading conversations:", error);
      Alert.alert("Error", "Failed to load conversations");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter conversations based on search
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

  // Listen for real-time messages when chat is open
  useEffect(() => {
    if (!selectedConversation || !isConnected) return;

    // Join the chat room
    socketService.joinChat(selectedConversation.user.id);

    // Listen for new messages
    const handleNewMessage = (message: any) => {
      if (message.conversationId === selectedConversation.id) {
        // Add new message to the conversation
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
        
        // Update in conversations list
        setConversationsList(prev =>
          prev.map(conv =>
            conv.id === selectedConversation.id
              ? { ...conv, lastMessage: newMsg.text, time: "now", unreadCount: conv.unreadCount + (newMsg.fromUser ? 0 : 1) }
              : conv
          )
        );
        
        // Scroll to bottom
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      }
    };

    // Listen for typing indicators
    const handleUserTyping = (data: { userId: string; isTyping: boolean }) => {
      if (data.userId === selectedConversation.user.id) {
        setIsOtherTyping(data.isTyping);
      }
    };

    // Listen for read receipts
    const handleMessagesRead = (data: { conversationId: string; userId: string; messageId: string }) => {
      if (data.conversationId === selectedConversation.id && data.userId !== userId) {
        // Update message statuses to "read"
        setSelectedConversation(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map(msg =>
              msg.fromUser ? { ...msg, status: "read" } : msg
            ),
          };
        });
      }
    };

    socketService.onNewMessage(handleNewMessage);
    socketService.onUserTyping(handleUserTyping);
    socketService.onMessagesRead(handleMessagesRead);

    return () => {
      socketService.removeListener('newMessage');
      socketService.removeListener('userTyping');
      socketService.removeListener('messagesRead');
    };
  }, [selectedConversation, isConnected, userId]);

  const deleteConversation = (conversationId: string) => {
    Alert.alert(
      "Delete Conversation",
      "Are you sure you want to delete this conversation?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Replace with your actual API call
              // await fetch(`https://your-backend.com/api/conversations/${conversationId}`, { method: 'DELETE' });
              setConversationsList((prev) => prev.filter((conv) => conv.id !== conversationId));
              Alert.alert("Success", "Conversation deleted");
            } catch (error) {
              Alert.alert("Error", "Failed to delete conversation");
            }
          },
        },
      ]
    );
  };

  const openConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setIsChatOpen(true);
  };

  const closeChatModal = () => {
    setIsChatOpen(false);
    setSelectedConversation(null);
    setNewMessage("");
    setIsOtherTyping(false);
  };

  const handleTyping = (text: string) => {
    setNewMessage(text);
    
    // Send typing indicator
    if (selectedConversation && isConnected) {
      socketService.sendTyping(selectedConversation.id, text.length > 0);
      
      // Clear previous timeout
      if (typingTimeout) clearTimeout(typingTimeout);
      
      // Set timeout to stop typing indicator after 2 seconds of no typing
      const newTimeout = setTimeout(() => {
        if (selectedConversation) {
          socketService.sendTyping(selectedConversation.id, false);
        }
      }, 2000);
      setTypingTimeout(newTimeout);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !isConnected || isSending) return;
    
    setIsSending(true);
    
    // Create optimistic message
    const optimisticMessage: Message = {
      id: Date.now().toString(),
      text: newMessage.trim(),
      time: "now",
      fromUser: true,
      status: "sending",
    };
    
    // Optimistically update UI
    setSelectedConversation(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: [...prev.messages, optimisticMessage],
        lastMessage: newMessage.trim(),
        time: "now",
      };
    });
    
    setNewMessage("");
    
    // Scroll to bottom
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    
    try {
      // Send via socket
      await socketService.sendMessage(selectedConversation.id, newMessage.trim());
      
      // Update message status to "sent"
      setSelectedConversation(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map(msg =>
            msg.id === optimisticMessage.id ? { ...msg, status: "sent" } : msg
          ),
        };
      });
      
      // Update in conversations list
      setConversationsList(prev =>
        prev.map(conv =>
          conv.id === selectedConversation.id
            ? { ...conv, lastMessage: newMessage.trim(), time: "now" }
            : conv
        )
      );
    } catch (error) {
      console.error("Failed to send message:", error);
      
      // Update message status to "error"
      setSelectedConversation(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map(msg =>
            msg.id === optimisticMessage.id ? { ...msg, status: "error" } : msg
          ),
        };
      });
      
      Alert.alert("Error", "Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
      
      // Stop typing indicator
      if (selectedConversation) {
        socketService.sendTyping(selectedConversation.id, false);
      }
      if (typingTimeout) clearTimeout(typingTimeout);
    }
  };

  const retrySendMessage = async (messageId: string, messageText: string) => {
    if (!selectedConversation || !isConnected) return;
    
    try {
      await socketService.sendMessage(selectedConversation.id, messageText);
      
      setSelectedConversation(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map(msg =>
            msg.id === messageId ? { ...msg, status: "sent" } : msg
          ),
        };
      });
    } catch (error) {
      Alert.alert("Error", "Failed to resend message");
    }
  };

  const ConversationItem = ({ conversation }: { conversation: Conversation }) => (
    <TouchableOpacity
      className="flex-row items-center p-4 border-b border-gray-50 active:bg-gray-50"
      onPress={() => openConversation(conversation)}
      onLongPress={() => deleteConversation(conversation.id)}
    >
      <Image
        source={{ uri: conversation.user.avatar }}
        className="size-12 rounded-full mr-3"
      />

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
          {message.fromUser && message.status && (
            <>
              {message.status === "sending" && (
                <ActivityIndicator size="small" color="#9CA3AF" className="ml-1" />
              )}
              {message.status === "sent" && (
                <Feather name="check" size={12} color="#9CA3AF" className="ml-1" />
              )}
              {message.status === "delivered" && (
                <Feather name="check-circle" size={12} color="#9CA3AF" className="ml-1" />
              )}
              {message.status === "read" && (
                <Feather name="check-circle" size={12} color="#1DA1F2" className="ml-1" />
              )}
              {message.status === "error" && (
                <TouchableOpacity onPress={() => retrySendMessage(message.id, message.text)}>
                  <Feather name="alert-circle" size={12} color="#EF4444" className="ml-1" />
                </TouchableOpacity>
              )}
            </>
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
      {/* HEADER */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Messages</Text>
        <TouchableOpacity onPress={() => {/* Navigate to new message screen */}}>
          <Feather name="edit" size={24} color="#1DA1F2" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
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

      {/* Connection Status */}
      {!isConnected && (
        <View className="bg-yellow-50 py-2 px-4">
          <Text className="text-yellow-600 text-xs text-center">
            Connecting to chat server...
          </Text>
        </View>
      )}

      {/* CONVERSATIONS LIST */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        {filteredConversations.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Feather name="message-circle" size={64} color="#D1D5DB" />
            <Text className="text-gray-400 text-lg mt-4 text-center">
              {searchText.length > 0 ? "No conversations found" : "No messages yet"}
            </Text>
            <Text className="text-gray-400 text-sm mt-2 text-center">
              {searchText.length > 0 
                ? "Try searching for someone else" 
                : "Start a conversation with someone"}
            </Text>
          </View>
        ) : (
          filteredConversations.map((conversation) => (
            <ConversationItem key={conversation.id} conversation={conversation} />
          ))
        )}
      </ScrollView>

      {/* Quick Actions */}
      <View className="px-4 py-2 border-t border-gray-100 bg-gray-50">
        <Text className="text-xs text-gray-500 text-center">
          Tap to open • Long press to delete
        </Text>
      </View>

      {/* CHAT MODAL */}
      <Modal visible={isChatOpen} animationType="slide" presentationStyle="pageSheet">
        {selectedConversation && (
          <SafeAreaView className="flex-1 bg-white">
            {/* Chat Header */}
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
              <TouchableOpacity>
                <Feather name="more-horizontal" size={24} color="#1DA1F2" />
              </TouchableOpacity>
            </View>

            {/* Chat Messages Area */}
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
                <View className="mb-4">
                  <Text className="text-center text-gray-400 text-sm mb-4">
                    This is the beginning of your conversation with {selectedConversation.user.name}
                  </Text>

                  {/* Conversation Messages */}
                  {selectedConversation.messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                </View>
              </ScrollView>

              {/* Message Input */}
              <View className="flex-row items-end px-4 py-3 border-t border-gray-100 bg-white">
                <TouchableOpacity className="mr-2 mb-2">
                  <Feather name="paperclip" size={24} color="#657786" />
                </TouchableOpacity>
                
                <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-4 py-2 mr-3">
                  <TextInput
                    ref={inputRef}
                    className="flex-1 text-base max-h-24"
                    placeholder="Start a message..."
                    placeholderTextColor="#657786"
                    value={newMessage}
                    onChangeText={handleTyping}
                    multiline
                    editable={isConnected}
                  />
                </View>
                
                <TouchableOpacity
                  onPress={sendMessage}
                  className={`size-10 rounded-full items-center justify-center mb-1 ${
                    newMessage.trim() && isConnected && !isSending
                      ? "bg-blue-500"
                      : "bg-gray-300"
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