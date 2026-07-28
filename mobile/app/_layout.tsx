import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { useFonts } from "expo-font";
import { Anton_400Regular } from "@expo-google-fonts/anton";
import { DM_Sans_400Regular, DM_Sans_500Medium, DM_Sans_700Bold } from "@expo-google-fonts/dm-sans";
import { getMe, type SessionUser } from "@/lib/api";
import { ThemeProvider } from "@/src/theme";
import { Colors } from "@/src/theme/colors";
import OfflineIndicator from "@/components/OfflineIndicator";

export default function RootLayout() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [fontsLoaded] = useFonts({
    Anton: Anton_400Regular,
    "DM Sans": DM_Sans_400Regular,
    "DM Sans Medium": DM_Sans_500Medium,
    "DM Sans Bold": DM_Sans_700Bold,
  });

  useEffect(() => {
    getMe().then((res) => setUser(res?.user ?? null));
  }, []);

  // Gate on fonts + session resolution.
  if (!fontsLoaded || user === undefined) {
    return (
      <ThemeProvider>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background.primary }}>
          <ActivityIndicator size="large" color={Colors.brand.greenLight} />
          <Text style={{ color: Colors.text.primary, marginTop: 16, fontFamily: "DM Sans" }}>Loading Ykay College...</Text>
        </View>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <View style={{ flex: 1, backgroundColor: Colors.background.primary }}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background.primary } }}>
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
    </ThemeProvider>
  );
}
