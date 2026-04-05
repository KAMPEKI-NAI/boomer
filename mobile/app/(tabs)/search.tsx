import { Feather } from "@expo/vector-icons";
import {
  View,
  TextInput,
  ScrollView,
  Text,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useAuth } from "@clerk/expo";

/* ===================== TYPES ===================== */

interface User {
  id: string;
  name: string;
  username: string;
  profilePicture: string;
  verified?: boolean;
  bio?: string;
}

interface PostData {
  id: string;
  text: string;
  createdAt: string;
  author: User;
}

interface SearchResultItem {
  type: "user" | "post";
  data: User | PostData;
}

/* ===================== API CALL ===================== */

const fetchSearchResultsFromDB = async (
  query: string,
  token?: string | null
): Promise<SearchResultItem[]> => {
  try {
    const headers: any = {
      "Content-Type": "application/json",
    };
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(
      `https://boomer-two.vercel.app/api/search?q=${encodeURIComponent(
        query
      )}`,
      { headers }
    );

    if (!res.ok) throw new Error("Search failed");

    const data = await res.json();

    const results: SearchResultItem[] = [];

    data.users?.forEach((user: User) => {
      results.push({ type: "user", data: user });
    });

    data.posts?.forEach((post: PostData) => {
      results.push({ type: "post", data: post });
    });

    return results;
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
};

/* ===================== COMPONENT ===================== */

const SearchScreen = () => {
  const { getToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    const stored = await AsyncStorage.getItem("recentSearches");
    setRecentSearches(stored ? JSON.parse(stored) : []);
  };

  const saveRecentSearch = async (query: string) => {
    const updated = [query, ...recentSearches.filter((q) => q !== query)].slice(
      0,
      10
    );
    setRecentSearches(updated);
    await AsyncStorage.setItem("recentSearches", JSON.stringify(updated));
  };

  const deleteRecentSearch = async (query: string) => {
    const updated = recentSearches.filter((q) => q !== query);
    setRecentSearches(updated);
    await AsyncStorage.setItem("recentSearches", JSON.stringify(updated));
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setHasSearched(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (!query.trim()) return;

      setIsLoading(true);
      setHasSearched(true);

      saveRecentSearch(query);

      const token = await getToken();
      const results = await fetchSearchResultsFromDB(query, token);
      setSearchResults(results);

      setIsLoading(false);
    }, 400);
  };

  const startConversation = async (userId: string, userName: string, userAvatar: string) => {
    router.push({
      pathname: "/(screens)/chat",
      params: { 
        userId: userId,
        userName: userName,
        userAvatar: userAvatar 
      }
    });
  };

  const TopicItem = ({
    text,
    onPress,
    onDelete,
  }: {
    text: string;
    onPress: () => void;
    onDelete: () => void;
  }) => (
    <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
      <TouchableOpacity onPress={onPress} className="flex-1">
        <Text className="font-bold text-gray-900 text-lg">{text}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDelete}>
        <Feather name="x-circle" size={18} color="#94a3b8" />
      </TouchableOpacity>
    </View>
  );

  const ResultItem = ({ item }: { item: SearchResultItem }) => {
    const isUser = item.type === "user";
    const user = isUser ? (item.data as User) : (item.data as PostData).author;
    const post = !isUser ? (item.data as PostData) : null;

    return (
      <TouchableOpacity 
        className="flex-row py-3 border-b border-gray-100 px-4"
        onPress={() => {
          if (isUser) {
            router.push({
              pathname: "/(screens)/view-user",
              params: { id: user.id }
            });
          } else if (post) {
            router.push({
              pathname: "/(screens)/view-post",
              params: { id: post.id }
            });
          }
        }}
        activeOpacity={0.7}
      >
        <Image
          source={{
            uri: user.profilePicture || "https://via.placeholder.com/150",
          }}
          className="w-12 h-12 rounded-full"
        />

        <View className="ml-3 flex-1">
          <View className="flex-row items-center flex-wrap">
            <Text className="font-bold text-gray-900">{user.name}</Text>
            {user.verified && (
              <Feather name="check-circle" size={16} color="#1DA1F2" className="ml-1" />
            )}
            <Text className="ml-1 text-gray-500">@{user.username}</Text>
          </View>

          {post && (
            <>
              <Text className="text-gray-900 mt-1" numberOfLines={2}>
                {post.text}
              </Text>
              <Text className="text-gray-500 text-sm mt-1">
                {new Date(post.createdAt).toLocaleString()}
              </Text>
            </>
          )}

          {isUser && (
            <View className="flex-row mt-2">
              <TouchableOpacity 
                className="bg-blue-500 px-3 py-1 rounded-full mr-2"
                onPress={() => router.push({
                  pathname: "/(tabs)/view-user",
                  params: { id: user.id }
                })}
              >
                <Text className="text-white text-xs">View Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className="border border-blue-500 px-3 py-1 rounded-full"
                onPress={() => startConversation(user.id, user.name, user.profilePicture)}
              >
                <Text className="text-blue-500 text-xs">Message</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-3">
          <Feather name="search" size={20} color="#657786" />
          <TextInput
            placeholder="Search users and posts..."
            className="flex-1 ml-3 text-base"
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Feather name="x" size={20} color="#657786" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {isLoading && (
          <View className="p-4">
            <Text className="text-center text-gray-500">Searching...</Text>
          </View>
        )}

        {!isLoading && searchResults.length > 0 && (
          <View className="p-4">
            <Text className="text-xl font-bold mb-4">
              {`Results for "${searchQuery}"`}
            </Text>

            {searchResults.map((item, index) => (
              <ResultItem
                key={
                  item.type === "user"
                    ? `user-${(item.data as User).id}-${index}`
                    : `post-${(item.data as PostData).id}-${index}`
                }
                item={item}
              />
            ))}
          </View>
        )}

        {!isLoading && hasSearched && searchResults.length === 0 && (
          <View className="items-center justify-center py-20">
            <Feather name="search" size={64} color="#D1D5DB" />
            <Text className="text-center text-gray-500 mt-4">
              {`No results for "${searchQuery}"`}
            </Text>
            <Text className="text-center text-gray-400 text-sm mt-2">
              Try searching for something else
            </Text>
          </View>
        )}

        {!hasSearched && recentSearches.length > 0 && (
          <View className="p-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold">Recent searches</Text>
              <TouchableOpacity onPress={() => {
                AsyncStorage.removeItem("recentSearches");
                setRecentSearches([]);
              }}>
                <Text className="text-blue-500">Clear all</Text>
              </TouchableOpacity>
            </View>

            {recentSearches.map((item, index) => (
              <TopicItem
                key={`recent-${item}-${index}`}
                text={item}
                onPress={() => handleSearch(item)}
                onDelete={() => deleteRecentSearch(item)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SearchScreen;