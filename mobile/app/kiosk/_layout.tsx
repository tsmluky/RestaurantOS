import { Stack } from "expo-router";

export default function KioskLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="setup" options={{ presentation: "modal" }} />
    </Stack>
  );
}
