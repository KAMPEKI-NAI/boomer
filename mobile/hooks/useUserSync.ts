import { useEffect, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-expo";
import { useApiClient, userApi } from "../utils/api";

export const useUserSync = () => {
  const { isSignedIn } = useAuth();
  const api = useApiClient();
  const hasSyncedRef = useRef(false);

  const syncUserMutation = useMutation({
    mutationFn: () => userApi.syncUser(api),
    onSuccess: (response: any) => {
      console.log("User synced successfully:", response.data.user);
      hasSyncedRef.current = true;
    },
    onError: (error) => console.error("User sync failed:", error),
  });

  const syncUser = useCallback(() => {
    if (!hasSyncedRef.current) {
      syncUserMutation.mutate();
      hasSyncedRef.current = true;
    }
  }, [syncUserMutation]);

  useEffect(() => {
    if (isSignedIn) {
      syncUser();
    } else {
      // Reset when user signs out
      hasSyncedRef.current = false;
    }
  }, [isSignedIn, syncUser]);

  return null;
};