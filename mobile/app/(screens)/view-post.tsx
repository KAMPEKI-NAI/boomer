import { View, Text, Image, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { useAuth } from "@clerk/expo";
import { API_CONFIG } from "@/config/api.config";

interface Post {
  id: string;
  text: string;
  image?: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    username: string;
    profilePicture: string;
    verified: boolean;
  };
  likes: number;
  comments: number;
  retweets: number;
  isLiked: boolean;
}

export default function ViewPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id]);

  const fetchPost = async () => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_CONFIG.apiUrl}/posts/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      setPost(data);
    } catch (error) {
      console.error("Error fetching post:", error);
    } finally {
      setLoading(false);
    }
  };

  const likePost = async () => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_CONFIG.apiUrl}/posts/${id}/like`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        setPost(prev => prev ? {
          ...prev,
          isLiked: !prev.isLiked,
          likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1
        } : null);
      }
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#1DA1F2" />
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <Text>Post not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Feather name="arrow-left" size={24} color="#1DA1F2" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Post</Text>
      </View>

      <ScrollView className="flex-1 px-4 py-4">
        <View className="flex-row">
          <TouchableOpacity onPress={() => router.push({
            pathname: "/(screens)/view-user",
            params: { id: post.author.id }
          })}>
            <Image
              source={{ uri: post.author.profilePicture || "https://via.placeholder.com/150" }}
              className="w-12 h-12 rounded-full mr-3"
            />
          </TouchableOpacity>
          
          <View className="flex-1">
            <TouchableOpacity onPress={() => router.push({
              pathname: "/(screens)/view-user",
              params: { id: post.author.id }
            })}>
              <View className="flex-row items-center">
                <Text className="font-bold text-gray-900">{post.author.name}</Text>
                {post.author.verified && (
                  <Feather name="check-circle" size={16} color="#1DA1F2" className="ml-1" />
                )}
                <Text className="text-gray-500 ml-1">@{post.author.username}</Text>
              </View>
            </TouchableOpacity>
            
            <Text className="text-gray-900 mt-2 leading-5">{post.text}</Text>
            
            {post.image && (
              <Image source={{ uri: post.image }} className="w-full h-64 rounded-xl mt-3" resizeMode="cover" />
            )}
            
            <Text className="text-gray-500 text-sm mt-3">
              {new Date(post.createdAt).toLocaleString()}
            </Text>
            
            <View className="flex-row justify-around mt-4 py-3 border-t border-b border-gray-100">
              <TouchableOpacity className="flex-row items-center">
                <Feather name="message-circle" size={20} color="#657786" />
                <Text className="text-gray-500 ml-2">{post.comments}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity className="flex-row items-center">
                <Feather name="repeat" size={20} color="#657786" />
                <Text className="text-gray-500 ml-2">{post.retweets}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity className="flex-row items-center" onPress={likePost}>
                <Feather name="heart" size={20} color={post.isLiked ? "#EF4444" : "#657786"} />
                <Text className={`ml-2 ${post.isLiked ? "text-red-500" : "text-gray-500"}`}>
                  {post.likes}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity className="flex-row items-center">
                <Feather name="share" size={20} color="#657786" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}