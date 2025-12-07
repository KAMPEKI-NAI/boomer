import { Feather } from "@expo/vector-icons";
import { View, TextInput, ScrollView, Text, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// --- TypeScript Interfaces (Adjust these to match your actual DB structure) ---

interface User {
    id: string;
    name: string;
    username: string;
    profile_image_url: string; // Ensure this is a full URL (e.g., https://...)
}

interface PostData {
    id: string;
    text: string;
    created_at: string;
    author_id: string; 
}

interface SearchResultItem {
    type: 'user' | 'post'; 
    data: User | PostData;
    userData?: User; // Optional: include user data if it's a post result (populated from DB)
}

// --- Define functions to interact with your backend/database (PLACEHOLDERS) ---

/**
 * !!! IMPORTANT: REPLACE THIS FUNCTION WITH YOUR ACTUAL DATABASE/API CALL !!!
 * This function needs to be implemented by you to fetch data from your existing database.
 * 
 * Your backend logic needs to be updated to support fuzzy/related searches 
 * and return results for both users (by username/name) and posts (by content).
 */
const fetchSearchResultsFromDB = async (query: string): Promise<SearchResultItem[]> => {
    console.log(`Searching database for: ${query}`);
    
    // Example placeholder for a real API call:
    /*
    try {
        // Assume you have an API endpoint like '/api/search?q='
        // This API should return data structured with 'users' and 'posts' arrays
        const response = await fetch(`YOUR_API_ENDPOINT/search?q=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json(); // Data should contain { users: [...], posts: [...] }

        const combinedResults: SearchResultItem[] = [];

        // Format User results (searching usernames/names)
        data.users.forEach((user: User) => {
            combinedResults.push({ type: 'user', data: user });
        });

        // Format Post results (searching post content) and link user data
        data.posts.forEach((post: any) => {
             // 'post.author' must be populated by your backend query
            combinedResults.push({ type: 'post', data: post, userData: post.author });
        });

        return combinedResults;

    } catch (error) {
        console.error("API search failed:", error);
        return [];
    }
    */

    // Returning an empty array as a default placeholder until you implement your logic
    return [];
};


const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false); // Tracks if a search attempt was made

  useEffect(() => {
    loadRecentSearches();
  }, []);
  
  const loadRecentSearches = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem("recentSearches");
      setRecentSearches(jsonValue ? JSON.parse(jsonValue) : []);
    } catch (error) {
      console.error("Error loading recent searches:", error);
    }
  };

  const saveRecentSearch = async (query: string) => {
    try {
      const updated = [query, ...recentSearches.filter((q) => q !== query)].slice(0, 10);
      setRecentSearches(updated);
      await AsyncStorage.setItem("recentSearches", JSON.stringify(updated));
    } catch (error) {
      console.error("Error saving recent search:", error);
    }
  };

  const deleteRecentSearch = async (queryToDelete: string) => {
    try {
        const updated = recentSearches.filter(query => query !== queryToDelete);
        setRecentSearches(updated);
        await AsyncStorage.setItem("recentSearches", JSON.stringify(updated));
    } catch (error) {
        console.error("Error deleting recent search:", error);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setHasSearched(false); // Reset search status when clearing input
  };
  
  const handleSubmit = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    saveRecentSearch(query);
    setIsLoading(true);
    setHasSearched(true); // Mark that a search was attempted/is running

    // Use your actual database function here
    const results = await fetchSearchResultsFromDB(query);
    
    setSearchResults(results);
    setIsLoading(false);
  };

  // --- Components defined inside scope ---

  interface TopicItemProps {
    item: { topic: string }; 
    onPress: () => void;
    onDelete: () => void; // Added delete handler prop
  }

  const TopicItem: React.FC<TopicItemProps> = ({ item, onPress, onDelete }) => (
    <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
        <TouchableOpacity onPress={onPress} className="flex-1">
            <Text className="font-bold text-gray-900 text-lg">{item.topic}</Text>
        </TouchableOpacity>
        {/* The "x" in a circle button for individual deletion */}
        <TouchableOpacity onPress={onDelete} className="p-1 ml-4">
            <Feather name="x-circle" size={18} color="#94a3b8" />
        </TouchableOpacity>
    </View>
  );

  interface TweetItemProps {
    item: SearchResultItem;
  }

  const TweetItem: React.FC<TweetItemProps> = ({ item }) => {
    // Safely determine user and post data based on item type
    const user: User | undefined = item.type === 'user' ? (item.data as User) : item.userData;
    const post: PostData | undefined = item.type === 'post' ? (item.data as PostData) : undefined;

    // Ensure we have data to display
    if (!user && !post) return null;

    return (
        <View className="flex-row py-3 border-b border-gray-100 px-4">
            <Image
                // Use a placeholder if user image is missing
                source={{ uri: user?.profile_image_url || 'via.placeholder.com' }}
                className="w-12 h-12 rounded-full"
            />
            <View className="ml-3 flex-1">
                <View className="flex-row items-center">
                    <Text className="font-bold text-gray-900">{user?.name}</Text>
                    <Text className="ml-1 text-gray-500">@{user?.username}</Text>
                </View>
                {post && <Text className="text-gray-900">{post.text}</Text>}
                {post && <Text className="text-gray-500 text-sm mt-1">{new Date(post.created_at).toLocaleString()}</Text>}
                {item.type === 'user' && <Text className="text-blue-500 text-sm mt-1">User Result</Text>}
            </View>
        </View>
    );
  };


  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* HEADER */}
      <View className="px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-3">
          <Feather name="search" size={20} color="#657786" />
          <TextInput
            placeholder="Search users and posts..."
            className="flex-1 ml-3 text-base"
            placeholderTextColor="#657786"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSubmit}
          />
          {searchQuery && (
            <TouchableOpacity onPress={clearSearch} className="ml-2">
              <Feather name="x" size={20} color="#657786" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className="flex-1">
        {isLoading ? (
            <Text className="p-4 text-center">Searching...</Text>
        ) : searchResults.length > 0 ? (
          <View className="p-4">
            {/* Added HTML entity for quotes to satisfy ESLint rule */}
            <Text className="text-xl font-bold text-gray-900 mb-4">
              Results for &quot;{searchQuery}&quot;
            </Text>
            {searchResults.map((item, index) => (
              <TweetItem key={index} item={item} />
            ))}
          </View>
        ) : (
          <View className="p-4">
            {/* Show 'No results' message if a search happened but returned nothing */}
            {hasSearched && (
                <Text className="text-gray-500 text-center mt-4">
                    No related results found for &quot;{searchQuery}&quot;.
                </Text>
            )}

            {recentSearches.length > 0 && !hasSearched && (
              <>
                <Text className="text-xl font-bold text-gray-900 mb-4">Recent searches</Text>
                {recentSearches.map((search, index) => (
                  <TopicItem
                    key={index}
                    item={{ topic: search }}
                    onPress={() => {
                      setSearchQuery(search);
                      handleSubmit();
                    }}
                    onDelete={() => deleteRecentSearch(search)}
                  />
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SearchScreen;
