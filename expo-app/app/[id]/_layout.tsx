import { Stack } from "expo-router";
import { useLocalSearchParams } from "expo-router";

export default function DynamicLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen
        name="timer"
        options={{
          title: `Timer - ${id}`,
          // IDに基づいてヘッダーやオプションをカスタマイズ可能
        }}
      />
      <Stack.Screen
        name="review"
        options={{
          title: `review - ${id}`,
          // IDに基づいてヘッダーやオプションをカスタマイズ可能
        }}
      />
    </Stack>
  );
}
