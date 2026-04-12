// hooks/useProfile.ts
import { useState } from "react";
import { useAuth } from "@clerk/expo";
import { useCurrentUser } from "./useCurrentUser";

const API_URL = 'https://boomer-k9z3.onrender.com/api';

export const useProfile = () => {
  const { getToken } = useAuth();
  const { currentUser, refetch: refetchUser } = useCurrentUser();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    location: "",
    username: "",
  });

  const openEditModal = () => {
    setFormData({
      name: currentUser?.name || "",
      bio: currentUser?.bio || "",
      location: currentUser?.location || "",
      username: currentUser?.username || "",
    });
    setIsEditModalVisible(true);
  };

  const closeEditModal = () => {
    setIsEditModalVisible(false);
  };

  const updateFormField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const saveProfile = async () => {
    setIsUpdating(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("No authentication token available");
      }
      
      const response = await fetch(`${API_URL}/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error(`Update failed: ${response.status}`);
      }
      
      await refetchUser();
      closeEditModal();
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const refetch = () => {
    refetchUser();
  };

  return {
    isEditModalVisible,
    openEditModal,
    closeEditModal,
    formData,
    saveProfile,
    updateFormField,
    isUpdating,
    refetch,
  };
};