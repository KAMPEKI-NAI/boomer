import EditProfileModal from "@/components/EditProfileModal";
import PostsList from "@/components/PostsList";
import SignOutButton from "@/components/SignOutButton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePosts } from "@/hooks/usePosts";
import { useProfile } from "@/hooks/useProfile";
import { Feather } from "@expo/vector-icons";
import { format } from "date-fns";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from 'expo-image-picker';
import { useState } from "react";
import { useAuth } from "@clerk/expo";
import { router } from "expo-router";

const ProfileScreens = () => {
  const { currentUser, isLoading, refetch: refetchUser } = useCurrentUser();
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [uploading, setUploading] = useState(false);

  const {
    posts: userPosts,
    refetch: refetchPosts,
    isLoading: isRefetching,
  } = usePosts(currentUser?.username);

  const {
    isEditModalVisible,
    openEditModal,
    closeEditModal,
    formData,
    saveProfile,
    updateFormField,
    isUpdating,
    refetch: refetchProfile,
  } = useProfile();

  const handleProfilePictureUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setUploading(true);
      try {
        const token = await getToken();
        const formData = new FormData();
        
        // @ts-ignore
        formData.append('file', {
          uri: result.assets[0].uri,
          name: 'profile.jpg',
          type: 'image/jpeg',
        });

        const response = await fetch('https://boomer-k9z3.onrender.com/api/users/profile-picture', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (response.ok) {
          await refetchUser();
          await refetchProfile();
          Alert.alert('Success', 'Profile picture updated!');
        } else {
          throw new Error('Upload failed');
        }
      } catch (error) {
        console.error('Upload error:', error);
        Alert.alert('Error', 'Failed to upload profile picture');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleBannerUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setUploading(true);
      try {
        const token = await getToken();
        const formData = new FormData();
        
        // @ts-ignore
        formData.append('file', {
          uri: result.assets[0].uri,
          name: 'banner.jpg',
          type: 'image/jpeg',
        });

        const response = await fetch('https://boomer-k9z3.onrender.com/api/users/banner-image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (response.ok) {
          await refetchUser();
          await refetchProfile();
          Alert.alert('Success', 'Banner image updated!');
        } else {
          throw new Error('Upload failed');
        }
      } catch (error) {
        console.error('Upload error:', error);
        Alert.alert('Error', 'Failed to upload banner image');
      } finally {
        setUploading(false);
      }
    }
  };

  const navigateToFollowers = () => {
    router.push({
      pathname: "/(screens)/followers",
      params: { userId: currentUser?.id, type: 'followers' }
    });
  };

  const navigateToFollowing = () => {
    router.push({
      pathname: "/(screens)/followers",
      params: { userId: currentUser?.id, type: 'following' }
    });
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#1DA1F2" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <View>
          <Text className="text-xl font-bold text-gray-900">
            {currentUser?.firstName} {currentUser?.lastName}
          </Text>
          <Text className="text-gray-500 text-sm">{userPosts?.length || 0} Posts</Text>
        </View>
        <SignOutButton />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetchProfile();
              refetchPosts();
              refetchUser();
            }}
            tintColor="#1DA1F2"
          />
        }
      >
        <TouchableOpacity onPress={handleBannerUpload} activeOpacity={0.8}>
          <View className="relative">
            <Image
              source={{
                uri:
                  currentUser?.bannerImage ||
                  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop",
              }}
              className="w-full h-48"
              resizeMode="cover"
            />
            {uploading ? (
              <View className="absolute inset-0 bg-black/50 items-center justify-center">
                <ActivityIndicator size="large" color="white" />
              </View>
            ) : (
              <View className="absolute bottom-2 right-2 bg-black/50 rounded-full p-2">
                <Feather name="camera" size={20} color="white" />
              </View>
            )}
          </View>
        </TouchableOpacity>

        <View className="px-4 pb-4 border-b border-gray-100">
          <View className="flex-row justify-between items-end -mt-16 mb-4">
            <TouchableOpacity onPress={handleProfilePictureUpload}>
              <View className="relative">
                <Image
                  source={{ uri: currentUser?.profilePicture || "https://via.placeholder.com/150" }}
                  className="w-32 h-32 rounded-full border-4 border-white"
                />
                <View className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-2 border-2 border-white">
                  <Feather name="camera" size={16} color="white" />
                </View>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              className="border border-gray-300 px-6 py-2 rounded-full"
              onPress={openEditModal}
            >
              <Text className="font-semibold text-gray-900">Edit profile</Text>
            </TouchableOpacity>
          </View>

          <View className="mb-4">
            <View className="flex-row items-center mb-1">
              <Text className="text-xl font-bold text-gray-900 mr-1">
                {currentUser?.firstName} {currentUser?.lastName}
              </Text>
              <Feather name="check-circle" size={20} color="#1DA1F2" />
            </View>
            <Text className="text-gray-500 mb-2">@{currentUser?.username}</Text>
            <Text className="text-gray-900 mb-3">{currentUser?.bio}</Text>

            <View className="flex-row items-center mb-2">
              <Feather name="map-pin" size={16} color="#657786" />
              <Text className="text-gray-500 ml-2">{currentUser?.location}</Text>
            </View>

            <View className="flex-row items-center mb-3">
              <Feather name="calendar" size={16} color="#657786" />
              <Text className="text-gray-500 ml-2">
                Joined {format(new Date(currentUser?.createdAt), "MMMM yyyy")}
              </Text>
            </View>

            <View className="flex-row">
              <TouchableOpacity className="mr-6" onPress={navigateToFollowing}>
                <Text className="text-gray-900">
                  <Text className="font-bold">{currentUser?.following?.length || 0}</Text>
                  <Text className="text-gray-500"> Following</Text>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={navigateToFollowers}>
                <Text className="text-gray-900">
                  <Text className="font-bold">{currentUser?.followers?.length || 0}</Text>
                  <Text className="text-gray-500"> Followers</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <PostsList username={currentUser?.username} />
      </ScrollView>

      <EditProfileModal
        isVisible={isEditModalVisible}
        onClose={closeEditModal}
        formData={formData}
        saveProfile={saveProfile}
        updateFormField={updateFormField}
        isUpdating={isUpdating}
      />
    </SafeAreaView>
  );
};

export default ProfileScreens;