// hooks/useCurrentUser.ts
import { useQuery } from "@tanstack/react-query";
import { useUserService } from "../services/userService";
import { useAuth, useUser } from "@clerk/expo";

export const useCurrentUser = () => {
  const { getCurrentUser, syncUser } = useUserService();
  const { isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();

  const {
    data: currentUser,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["authUser", isSignedIn],
    queryFn: async () => {
      if (!isSignedIn) return null;
      try {
        await syncUser();
      } catch (err) {
        console.log("Sync failed, using Clerk data directly");
      }
      return getCurrentUser();
    },
    enabled: isSignedIn,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const finalUser = currentUser || (clerkUser ? {
    id: clerkUser.id,
    _id: clerkUser.id,
    clerkId: clerkUser.id,
    name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
    firstName: clerkUser.firstName || '',
    lastName: clerkUser.lastName || '',
    username: clerkUser.username || `${clerkUser.firstName?.toLowerCase() || "user"}${Math.floor(Math.random() * 1000)}`,
    email: clerkUser.emailAddresses?.[0]?.emailAddress || '',
    profilePicture: clerkUser.imageUrl || 'https://via.placeholder.com/150',
    bannerImage: '',
    bio: '',
    location: '',
    followers: [],
    following: [],
    posts: [],
    createdAt: clerkUser.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } : null);

  return { currentUser: finalUser, isLoading, error, refetch };
};