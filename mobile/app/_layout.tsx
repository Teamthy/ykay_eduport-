import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { getMe, type SessionUser } from "@/lib/api";
import { Redirect } from "expo-router";

export default function RootLayout() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  useEffect(() => {
    getMe().then((res) => setUser(res?.user ?? null));
  }, []);

  if (user === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#00072D" }}>
        <ActivityIndicator size="large" color="#123499" />
        <Text style={{ color: "#fff", marginTop: 16 }}>Loading Ykay College...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#00072D" },
        }}
      >
        <Stack.Screen name="index" redirect={!!user} />
        <Stack.Screen name="login" redirect={!!user} />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="(teacher)" />
        <Stack.Screen name="(parent)" />
        <Stack.Screen name="exam-runner" />
        <Stack.Screen name="announcements" />
        <Stack.Screen name="pay" />
        <Stack.Screen name="teacher-announcements" />
        <Stack.Screen name="teacher-messages" />
      </Stack>
    </>
  );
}
