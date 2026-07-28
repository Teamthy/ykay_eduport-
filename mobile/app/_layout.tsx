import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { getMe, type SessionUser } from "@/lib/api";
import { theme } from "@/lib/theme";
import OfflineIndicator from "@/components/OfflineIndicator";

export default function RootLayout() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  useEffect(() => {
    getMe().then((res) => setUser(res?.user ?? null));
  }, []);

  if (user === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.bgPrimary }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ color: theme.colors.textPrimary, marginTop: 16 }}>Loading Ykay College...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bgPrimary },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="landing" redirect={!!user} />
        <Stack.Screen name="login" redirect={!!user} />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="(teacher)" />
        <Stack.Screen name="(parent)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="exam-runner" />
        <Stack.Screen name="announcements" />
        <Stack.Screen name="pay" />
        <Stack.Screen name="teacher-announcements" />
        <Stack.Screen name="teacher-messages" />
        <Stack.Screen name="student-teachers" />
        <Stack.Screen name="id-card" />
        <Stack.Screen name="parent-events" />
        <Stack.Screen name="parent-messages" />
        <Stack.Screen name="teacher-analytics" />
      </Stack>
      <OfflineIndicator />
    </View>
  );
}
