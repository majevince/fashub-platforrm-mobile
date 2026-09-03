import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="my-profile" />
      <Stack.Screen name="inventory" />
      <Stack.Screen name="workflows" />
      <Stack.Screen name="workflow/[id]" />
      <Stack.Screen name="favorites" />
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="settings/profile" />
      <Stack.Screen name="settings/business" />
      <Stack.Screen name="settings/location" />
      <Stack.Screen name="settings/services" />
      <Stack.Screen name="settings/pricing" />
      <Stack.Screen name="settings/availability" />
      <Stack.Screen name="settings/social" />
      <Stack.Screen name="settings/privacy" />
      <Stack.Screen name="settings/notifications" />
      <Stack.Screen name="settings/billing" />
    </Stack>
  );
}
