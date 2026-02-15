import { Feather } from "@expo/vector-icons";
import { useState, useEffect,useCallback } from "react";
// import { io, Socket } from "socket.io-client";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";


const API_URL = "http://192.168.0.111:3000";

const MessagesScreen = () => {
  const { userId, getToken } = useAuth();
  // const socketRef = useRef<Socket | null>(null);

  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);

  /* ================= SOCKET ================= */
  // useEffect(() => {
  //   if (!userId) return;

  //   const setupSocket = async () => {
  //     const token = await getToken();

  //     socketRef.current = io(API_URL, {
  //       transports: ["websocket"],
  //       auth: { token },
  //     });

  //     socketRef.current.on("newMessage", (message: any) => {
  //       setMessages((prev) => [...prev, message]);
  //     });
  //   };

  //   setupSocket();

  //   return () => {
  //     socketRef.current?.disconnect();
  //   };

  //   fetchUsers();
  // }, [userId]);

  /* ================= LOAD CONVERSATIONS ================= */
  const loadConversations = useCallback(async () => {
  if (!userId) return;

  const token = await getToken();

  const res = await fetch(`${API_URL}/api/messages/conversations`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  setConversations(data);
}, [getToken, userId]);

  useEffect(() => {
  loadConversations();
}, [loadConversations]);



  /* ================= LOAD USERS ================= */
  const fetchUsers = async () => {
    const token = await getToken();
    const res = await fetch(`${API_URL}/api/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    setUsers(data);
  };

  /* ================= OPEN CHAT ================= */
  const openConversation = async (conversation: any) => {
    setSelectedConversation(conversation);
    setIsChatOpen(true);

    const token = await getToken();
    const res = await fetch(
      `${API_URL}/api/messages/${conversation.userId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await res.json();
    setMessages(data);
  };

  /* ================= SEND MESSAGE ================= */
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const token = await getToken();

    const res = await fetch(`${API_URL}/api/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        receiverId: selectedConversation.userId,
        text: newMessage,
      }),
    });

    const data = await res.json();
    setMessages((prev) => [...prev, data]);
    setNewMessage("");
    loadConversations();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* HEADER */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b">
        <Text className="text-xl font-bold">Messages</Text>

        <TouchableOpacity
          onPress={() => {
            fetchUsers();
            setIsUserPickerOpen(true);
          }}
        >
          <Feather name="edit" size={24} color="#1DA1F2" />
        </TouchableOpacity>
      </View>

      {/* CONVERSATIONS */}
      <ScrollView>
        {conversations.map((conv, index) => (
          <TouchableOpacity
            key={index}
            className="p-4 border-b"
            onPress={() => openConversation(conv)}
          >
            <Text className="font-semibold">{conv.userId}</Text>
            <Text className="text-gray-500">{conv.lastMessage}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* USER PICKER */}
      <Modal visible={isUserPickerOpen} animationType="slide">
        <SafeAreaView className="flex-1 bg-white">
          <ScrollView>
            {users.map((user) => (
              <TouchableOpacity
                key={user.clerkId}
                className="p-4 border-b"
                onPress={() => {
                  setIsUserPickerOpen(false);
                  openConversation({
                    userId: user.clerkId,
                  });
                }}
              >
                <Text>{user.username}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* CHAT MODAL */}
      <Modal visible={isChatOpen} animationType="slide">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center px-4 py-3 border-b">
            <TouchableOpacity onPress={() => setIsChatOpen(false)}>
              <Feather name="arrow-left" size={24} color="#1DA1F2" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4 py-4">
            {messages.map((msg, index) => (
              <View
                key={index}
                className={`mb-3 ${
                  msg.senderId === userId
                    ? "items-end"
                    : "items-start"
                }`}
              >
                <View
                  className={`px-4 py-3 rounded-2xl ${
                    msg.senderId === userId
                      ? "bg-blue-500"
                      : "bg-gray-200"
                  }`}
                >
                  <Text
                    className={
                      msg.senderId === userId
                        ? "text-white"
                        : "text-black"
                    }
                  >
                    {msg.text}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View className="flex-row px-4 py-3 border-t">
            <TextInput
              className="flex-1 bg-gray-100 rounded-full px-4"
              placeholder="Start a message..."
              value={newMessage}
              onChangeText={setNewMessage}
            />
            <TouchableOpacity
              onPress={sendMessage}
              className="ml-2 bg-blue-500 px-4 py-2 rounded-full"
            >
              <Text className="text-white">Send</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default MessagesScreen;
