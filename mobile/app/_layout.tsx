// app/_layout.tsx
import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Stack } from "expo-router";
import "../global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { socketService } from "../services/socketService";

const queryClient = new QueryClient();

function SocketInitializer() {
  const { getToken, userId, isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    const initSocket = async () => {
      if (isSignedIn && userId && user) {
        // Pass the getToken function, not the token itself
        await socketService.connect(userId, getToken);
        console.log("Socket initialized with getToken function");
      }
    };
    
    initSocket();
    
    return () => {
      socketService.disconnect();
    };
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