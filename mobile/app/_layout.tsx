import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { Slot } from "expo-router"; // 🛑 FIX: Use Slot instead of Stack here
import "../global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";

const queryClient = new QueryClient();

// 💡 IMPORTANT: Replace this with your actual Clerk Publishable Key!
// It must be a real key, not the placeholder text.
const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_b3JnYW5pYy1tYW4tMzYuY2xlcmsuYWNjb3VudHMuZGV2JA";

export default function RootLayout() {
  return (
    // Make sure CLERK_PUBLISHABLE_KEY is passed here
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <QueryClientProvider client={queryClient}>
        {/* The Slot component renders the active layout, which prevents the loop */}
        <Slot screenOptions={{ headerShown: false }} />
        <StatusBar style="dark" />
      </QueryClientProvider>
    </ClerkProvider>
  );
}