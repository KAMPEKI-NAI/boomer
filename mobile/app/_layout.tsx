// app/_layout.tsx
import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Stack } from "expo-router";
import "../global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { socketService } from "../services/socketService";
import { API_CONFIG } from "../config/api.config";

const queryClient = new QueryClient();

// Component to initialize socket
function SocketInitializer() {
  const { getToken, userId } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    const initSocket = async () => {
      if (userId && user) {
        // Pass getToken function to socket service
        await socketService.connect(userId, getToken);
      }
    };
    
    initSocket();
    
    return () => {
      socketService.disconnect();
    };
  }, [userId, user, getToken]);

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