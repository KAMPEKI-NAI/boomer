import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-expo";
import { useApiClient, userApi } from "../utils/api";

export const useUserSync = () => {
  const { isSignedIn } = useAuth();
  const api = useApiClient();

  const { mutate, data } = useMutation({
    mutationFn: () => userApi.syncUser(api),
    onSuccess: (response: any) => {
      console.log("User synced successfully:", response.data.user);
    },
    onError: (error) => {
      console.error("User sync failed:", error);
    },
  });

  // Auto-sync user when signed in
  useEffect(() => {
    if (isSignedIn && !data) {
      mutate();
    }
  }, [isSignedIn, mutate, data]); // ✅ stable dependencies

  return null;
};
