import { useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-expo";
import { useApiClient, userApi } from "../utils/api";

export const useUserSync = () => {
  const { isSignedIn } = useAuth();
  const api = useApiClient();

  const mutationFn = useCallback(() => userApi.syncUser(api), [api]);
  const onSuccess = useCallback((response: any) => console.log("User synced successfully:", response.data.user), []);
  const onError = useCallback((error: unknown) => console.error("User sync failed:", error), []);

  const syncUserMutation = useMutation({
    mutationFn,
    onSuccess,
    onError,
  });

  // auto-sync user when signed in
  useEffect(() => {
    // if user is signed in and user is not synced yet, sync user
    if (isSignedIn && !syncUserMutation.data && !syncUserMutation.isPending) {
      syncUserMutation.mutate();
    }
  }, [isSignedIn, syncUserMutation]);

  return null;
};