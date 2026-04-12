// services/userService.ts
import { useAuth, useUser } from "@clerk/expo";
import { API_CONFIG } from "@/config/api.config";

export const useUserService = () => {
  const { getToken, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  
  const getCurrentUser = async () => {
    try {
      const token = await getToken();
      if (!token) {
        return createUserFromClerk();
      }
      
      const response = await fetch(`${API_CONFIG.apiUrl}/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        return createUserFromClerk();
      }
      
      const data = await response.json();
      return data.user || data;
    } catch (error) {
      console.error('Error fetching user:', error);
      return createUserFromClerk();
    }
  };
  
  const syncUser = async () => {
    try {
      const token = await getToken();
      if (!token || !clerkUser) {
        return createUserFromClerk();
      }
      
      const username = clerkUser.username || `${clerkUser.firstName?.toLowerCase() || "user"}${Math.floor(Math.random() * 1000)}`;
      
      const requestBody = {
        id: clerkUser.id,
        firstName: clerkUser.firstName || "",
        lastName: clerkUser.lastName || "",
        email: clerkUser.emailAddresses?.[0]?.emailAddress || "",
        username: username,
        profilePicture: clerkUser.imageUrl || "https://via.placeholder.com/150",
      };
      
      const response = await fetch(`${API_CONFIG.apiUrl}/users/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        return createUserFromClerk();
      }
      
      return await response.json();
    } catch (error) {
      console.error('Sync user error:', error);
      return createUserFromClerk();
    }
  };
  
  const createUserFromClerk = () => {
    const username = clerkUser?.username || `${clerkUser?.firstName?.toLowerCase() || "user"}${Math.floor(Math.random() * 1000)}`;
    
    return {
      id: clerkUser?.id,
      clerkId: clerkUser?.id,
      _id: clerkUser?.id,
      name: `${clerkUser?.firstName || ''} ${clerkUser?.lastName || ''}`.trim(),
      firstName: clerkUser?.firstName || '',
      lastName: clerkUser?.lastName || '',
      username: username,
      email: clerkUser?.emailAddresses?.[0]?.emailAddress || '',
      profilePicture: clerkUser?.imageUrl || 'https://via.placeholder.com/150',
      bannerImage: '',
      bio: '',
      location: '',
      followers: [],
      following: [],
      posts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };
  
  return { getCurrentUser, syncUser };
};