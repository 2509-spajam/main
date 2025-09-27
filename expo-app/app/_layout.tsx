import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="map" />
        <Stack.Screen name="timer" />
        <Stack.Screen name="review" />
        <Stack.Screen name="reward" />
        <Stack.Screen name="profile" />
      </Stack>
    </>
  );
}
