import { Stack } from "expo-router";

export default function ScreensLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="chat" />
      <Stack.Screen name="view-user" />
      <Stack.Screen name="view-post" />
      <Stack.Screen name="followers" />
    </Stack>
  );
}