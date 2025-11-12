import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-expo";
import { useApiClient, userApi } from "../utils/api";

export const useUserSync = () => {
  const { isLoaded, isSignedIn } = useAuth(); // <-- use isLoaded too
  const api = useApiClient();
  const hasSynced = useRef(false);

  const syncUserMutation = useMutation({
    mutationFn: () => userApi.syncUser(api),
    onSuccess: (response: any) => {
      console.log("✅ User synced successfully:", response.data.user);
      hasSynced.current = true;
    },
    onError: (error) => {
      console.error("❌ User sync failed:", error);
    },
  });

  useEffect(() => {
    if (!isLoaded) return; // wait until Clerk finishes loading
    if (isSignedIn && !hasSynced.current) {
      hasSynced.current = true;
      syncUserMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  return null;
};
