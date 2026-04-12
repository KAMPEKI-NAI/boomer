import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Stack } from "expo-router";
import "../global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { socketService } from "../services/socketService";

const queryClient = new QueryClient();

function SocketInitializer() {
  const { getToken, userId, isSignedIn } = useAuth();
  const { user } = useUser();
  const initialized = useRef(false);

  useEffect(() => {
    const init = async () => {
      if (isSignedIn && userId && user && !initialized.current) {
        initialized.current = true;
        const connected = await socketService.connect(userId, getToken);
        if (!connected) {
          initialized.current = false;
          console.log("Socket connection failed, will retry");
        } else {
          console.log("Socket connected successfully");
        }
      }
    };
    init();
  }, [isSignedIn, userId, user, getToken]);

  return null;
}

export default function RootLayout() {
  return (
    <ClerkProvider 
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <QueryClientProvider client={queryClient}>
        <SocketInitializer />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(screens)" />
        </Stack>
        <StatusBar style="dark" />
      </QueryClientProvider>
    </ClerkProvider>
  );
}