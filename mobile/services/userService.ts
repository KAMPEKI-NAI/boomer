// services/userService.ts
import { useAuth, useUser } from "@clerk/expo";


const API_BASE_URL = 'https://boomer-k9z3.onrender.com'; 


export const useUserService = () => {
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  
  const getCurrentUser = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
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
      
      if (!clerkUser || !token) {
        return createUserFromClerk();
      }
      
      const response = await fetch(`${API_BASE_URL}/api/users/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: clerkUser.id,
          firstName: clerkUser.firstName || "",
          lastName: clerkUser.lastName || "",
          email: clerkUser.emailAddresses?.[0]?.emailAddress || "",
          username: clerkUser.username || clerkUser.id,
          profilePicture: clerkUser.imageUrl || "https://via.placeholder.com/150",
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Sync user error:', error);
      return createUserFromClerk();
    }
  };
  
  const createUserFromClerk = () => {
    return {
      id: clerkUser?.id,
      clerkId: clerkUser?.id,
      name: `${clerkUser?.firstName || ''} ${clerkUser?.lastName || ''}`.trim(),
      firstName: clerkUser?.firstName || '',
      lastName: clerkUser?.lastName || '',
      username: clerkUser?.username || clerkUser?.id,
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