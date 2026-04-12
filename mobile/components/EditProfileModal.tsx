// components/EditProfileModal.tsx
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";

interface EditProfileModalProps {
  isVisible: boolean;
  onClose: () => void;
  formData: {
    name: string;
    bio: string;
    location: string;
    username: string;
  };
  saveProfile: () => void;
  updateFormField: (field: string, value: string) => void;
  isUpdating: boolean;
}

const EditProfileModal = ({
  isVisible,
  onClose,
  formData,
  saveProfile,
  updateFormField,
  isUpdating,
}: EditProfileModalProps) => {
  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={24} color="#1DA1F2" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold">Edit Profile</Text>
          <TouchableOpacity onPress={saveProfile} disabled={isUpdating}>
            {isUpdating ? (
              <ActivityIndicator size="small" color="#1DA1F2" />
            ) : (
              <Text className="text-blue-500 font-semibold">Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View className="p-4 space-y-4">
          <View>
            <Text className="text-gray-500 mb-1">Name</Text>
            <TextInput
              className="border border-gray-200 rounded-lg px-4 py-3 text-gray-900"
              value={formData.name}
              onChangeText={(text) => updateFormField("name", text)}
              placeholder="Your name"
            />
          </View>

          <View>
            <Text className="text-gray-500 mb-1">Username</Text>
            <TextInput
              className="border border-gray-200 rounded-lg px-4 py-3 text-gray-900"
              value={formData.username}
              onChangeText={(text) => updateFormField("username", text)}
              placeholder="Username"
              autoCapitalize="none"
            />
          </View>

          <View>
            <Text className="text-gray-500 mb-1">Bio</Text>
            <TextInput
              className="border border-gray-200 rounded-lg px-4 py-3 text-gray-900"
              value={formData.bio}
              onChangeText={(text) => updateFormField("bio", text)}
              placeholder="Your bio"
              multiline
              numberOfLines={3}
            />
          </View>

          <View>
            <Text className="text-gray-500 mb-1">Location</Text>
            <TextInput
              className="border border-gray-200 rounded-lg px-4 py-3 text-gray-900"
              value={formData.location}
              onChangeText={(text) => updateFormField("location", text)}
              placeholder="Your location"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default EditProfileModal;