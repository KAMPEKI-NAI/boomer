import { Feather } from "@expo/vector-icons";
import {
  View,
  TextInput,
  ScrollView,
  Text,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* =======================
   TYPES
======================= */

interface User {
  id: string;
  name: string;
  username: string;
  profile_image_url: string;
}

interface PostData {
  id: string;
  text: string;
  created_at: string;
  author: User;
}

interface SearchResultItem {
  type: "user" | "post";
  data: User | PostData;
}

/* =======================
   API CALL
======================= */

const fetchSearchResultsFromDB = async (
  query: string
): Promise<SearchResultItem[]> => {
  try {
    const res = await fetch(
      `https://YOUR_BACKEND_URL/api/search?q=${encodeURIComponent(query)}`
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

/* =======================
   COMPONENT
======================= */

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    const stored = await AsyncStorage.getItem("recentSearches");
    setRecentSearches(stored ? JSON.parse(stored) : []);
  };

  const saveRecentSearch = async (query: string) => {
    const updated = [
      query,
      ...recentSearches.filter((q) => q !== query),
    ].slice(0, 10);

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

  const handleSubmit = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    setIsLoading(true);
    setHasSearched(true);
    saveRecentSearch(query);

    const results = await fetchSearchResultsFromDB(query);
    setSearchResults(results);

    setIsLoading(false);
  };

  /* =======================
     UI ITEMS
  ======================= */

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
      <View className="flex-row py-3 border-b border-gray-100 px-4">
        <Image
          source={{
            uri:
              user.profile_image_url ||
              "https://via.placeholder.com/150",
          }}
          className="w-12 h-12 rounded-full"
        />

        <View className="ml-3 flex-1">
          <View className="flex-row items-center">
            <Text className="font-bold text-gray-900">{user.name}</Text>
            <Text className="ml-1 text-gray-500">@{user.username}</Text>
          </View>

          {post && (
            <>
              <Text className="text-gray-900 mt-1">{post.text}</Text>
              <Text className="text-gray-500 text-sm mt-1">
                {new Date(post.created_at).toLocaleString()}
              </Text>
            </>
          )}

          {isUser && (
            <Text className="text-blue-500 text-sm mt-1">
              User result
            </Text>
          )}
        </View>
      </View>
    );
  };

  /* =======================
     RENDER
  ======================= */

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Search Bar */}
      <View className="px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-3">
          <Feather name="search" size={20} color="#657786" />
          <TextInput
            placeholder="Search users and posts..."
            className="flex-1 ml-3 text-base"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSubmit}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Feather name="x" size={20} color="#657786" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView>
        {isLoading && (
          <Text className="p-4 text-center">Searching...</Text>
        )}

        {!isLoading && searchResults.length > 0 && (
          <View className="p-4">
            <Text className="text-xl font-bold mb-4">
              Results for &quot;{searchQuery}&quot;
            </Text>

            {searchResults.map((item) => (
              <ResultItem
                key={item.type === "user"
                  ? (item.data as User).id
                  : (item.data as PostData).id}
                item={item}
              />
            ))}
          </View>
        )}

        {!isLoading && hasSearched && searchResults.length === 0 && (
          <Text className="text-center text-gray-500 mt-6">
            No results found for &quot;{searchQuery}&quot;
          </Text>
        )}

        {!hasSearched && recentSearches.length > 0 && (
          <View className="p-4">
            <Text className="text-xl font-bold mb-4">
              Recent searches
            </Text>

            {recentSearches.map((item) => (
              <TopicItem
                key={item}
                text={item}
                onPress={() => {
                  setSearchQuery(item);
                  handleSubmit();
                }}
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
