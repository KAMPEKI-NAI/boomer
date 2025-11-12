import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';

export default function AuthRoutesLayout() {
  // Get isLoaded, not just isSignedIn
  const { isSignedIn, isLoaded } = useAuth();

  // Wait for Clerk to load before doing anything
  if (!isLoaded) {
    return null; // or a <LoadingSpinner />
  }

  // Now that we're loaded, we can safely check isSignedIn
  if (isSignedIn) {
    // 🛑 CRITICAL FIX: Redirect explicitly to the protected (tabs) group, not the root '/'
    return <Redirect href={'/(tabs)'} />;
  }

  // User is not logged in, show the auth stack (Login/Signup screens)
  // Ensure you have screens like app/(auth)/login.tsx and app/(auth)/signup.tsx
  return <Stack screenOptions={{ headerShown: false }} />;
}