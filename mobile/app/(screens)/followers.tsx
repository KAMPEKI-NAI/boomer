import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { useAuth } from "@clerk/expo";

interface User {
  id: string;
  name: string;
  username: string;
  profilePicture: string;
  verified: boolean;
  bio?: string;
}

export default function FollowersScreen() {
  const { userId, type } = useLocalSearchParams<{
    userId: string;
    type: string;
  }>();
  const { getToken } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId && type) {
      fetchUsers();
    }
  }, [userId, type]);

  const fetchUsers = async () => {
    try {
      const token = await getToken();
      const response = await fetch(
        `https://boomer-two.vercel.app/api/users/${userId}/${type}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToUserProfile = (userId: string) => {
    router.push({
      pathname: "/(screens)/view-user",
      params: { id: userId }
    });
  };

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity
      className="flex-row items-center p-4 border-b border-gray-100"
      onPress={() => navigateToUserProfile(item.id)}
    >
      <Image
        source={{ uri: item.profilePicture || "https://via.placeholder.com/150" }}
        className="w-12 h-12 rounded-full mr-3"
      />
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="font-semibold text-gray-900">{item.name}</Text>
          {item.verified && (
            <Feather name="check-circle" size={16} color="#1DA1F2" className="ml-1" />
          )}
        </View>
        <Text className="text-gray-500">@{item.username}</Text>
        {item.bio && (
          <Text className="text-gray-400 text-sm mt-1" numberOfLines={1}>
            {item.bio}
          </Text>
        )}
      </View>
      <Feather name="chevron-right" size={20} color="#657786" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#1DA1F2" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Feather name="arrow-left" size={24} color="#1DA1F2" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">
          {type === "followers" ? "Followers" : "Following"}
        </Text>
        <Text className="text-gray-500 ml-2">({users.length})</Text>
      </View>

      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View className="flex-1 items-center justify-center py-20">
            <Feather name="users" size={64} color="#D1D5DB" />
            <Text className="text-gray-400 text-lg mt-4 text-center">
              No {type === "followers" ? "followers" : "following"} yet
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
