import { View, Text, Image, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { useAuth } from "@clerk/expo";

interface UserProfile {
  id: string;
  name: string;
  username: string;
  profilePicture: string;
  bannerImage?: string;
  bio: string;
  followers: number;
  following: number;
  posts: number;
  verified: boolean;
  location?: string;
  createdAt: string;
}

export default function ViewUserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchUserProfile();
    }
  }, [id]);

  const fetchUserProfile = async () => {
    try {
      const token = await getToken();
      const response = await fetch(
        `https://boomer-two.vercel.app/api/users/by-id/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      setUser(data);
      setIsFollowing(data.isFollowing || false);
    } catch (error) {
      console.error("Error fetching user:", error);
    } finally {
      setLoading(false);
    }
  };

  const followUser = async () => {
    try {
      const token = await getToken();
      const response = await fetch(
        `https://boomer-two.vercel.app/api/users/follow/${id}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        setIsFollowing(!isFollowing);
        setUser(prev => prev ? {
          ...prev,
          followers: isFollowing ? prev.followers - 1 : prev.followers + 1
        } : null);
      }
    } catch (error) {
      console.error("Error following user:", error);
    }
  };

  const startConversation = () => {
    if (!user) return;
    router.push({
      pathname: "/(screens)/chat",
      params: { 
        userId: user.id,
        userName: user.name,
        userAvatar: user.profilePicture
      }
    });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#1DA1F2" />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <Text>User not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Feather name="arrow-left" size={24} color="#1DA1F2" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">{user.name}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Image
          source={{ uri: user.bannerImage || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop" }}
          className="w-full h-48"
          resizeMode="cover"
        />

        <View className="px-4 pb-4">
          <View className="flex-row justify-between items-end -mt-16 mb-4">
            <Image
              source={{ uri: user.profilePicture || "https://via.placeholder.com/150" }}
              className="w-32 h-32 rounded-full border-4 border-white"
            />
            <View className="flex-row gap-2">
              <TouchableOpacity
                className={`border px-6 py-2 rounded-full ${isFollowing ? 'border-gray-300' : 'border-blue-500 bg-blue-500'}`}
                onPress={followUser}
              >
                <Text className={`font-semibold ${isFollowing ? 'text-gray-900' : 'text-white'}`}>
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="border border-blue-500 px-6 py-2 rounded-full flex-row items-center"
                onPress={startConversation}
              >
                <Feather name="message-circle" size={16} color="#1DA1F2" />
                <Text className="font-semibold text-blue-500 ml-1">Message</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="mb-4">
            <View className="flex-row items-center mb-1">
              <Text className="text-xl font-bold text-gray-900 mr-1">{user.name}</Text>
              {user.verified && <Feather name="check-circle" size={20} color="#1DA1F2" />}
            </View>
            <Text className="text-gray-500 mb-2">@{user.username}</Text>
            <Text className="text-gray-900 mb-3">{user.bio}</Text>

            {user.location && (
              <View className="flex-row items-center mb-2">
                <Feather name="map-pin" size={16} color="#657786" />
                <Text className="text-gray-500 ml-2">{user.location}</Text>
              </View>
            )}

            <View className="flex-row items-center mb-3">
              <Feather name="calendar" size={16} color="#657786" />
              <Text className="text-gray-500 ml-2">
                Joined {new Date(user.createdAt).toLocaleDateString()}
              </Text>
            </View>

            <View className="flex-row gap-6">
              <TouchableOpacity>
                <Text className="text-gray-900">
                  <Text className="font-bold">{user.posts}</Text> <Text className="text-gray-500">Posts</Text>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text className="text-gray-900">
                  <Text className="font-bold">{user.followers}</Text> <Text className="text-gray-500">Followers</Text>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text className="text-gray-900">
                  <Text className="font-bold">{user.following}</Text> <Text className="text-gray-500">Following</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
