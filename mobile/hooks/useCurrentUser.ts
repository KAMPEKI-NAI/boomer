import { useQuery } from "@tanstack/react-query";
import { useUserService } from "../services/userService";

export const useCurrentUser = () => {
  const { getCurrentUser, syncUser } = useUserService();

  const {
    data: currentUser,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["authUser"],
    queryFn: async () => {
      // First sync the user
      await syncUser();
      // Then get the current user
      return getCurrentUser();
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  return { currentUser, isLoading, error, refetch };
};