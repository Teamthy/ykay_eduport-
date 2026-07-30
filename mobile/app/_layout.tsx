import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { useFonts } from "expo-font";
import { Anton_400Regular } from "@expo-google-fonts/anton";
import { DM_Sans_400Regular, DM_Sans_500Medium, DM_Sans_700Bold } from "@expo-google-fonts/dm-sans";
import { getMe, type SessionUser } from "@/lib/api";
import { setAuthExpiredHandler } from "@/lib/http";
import { configureNotifications, registerForPushNotifications } from "@/lib/notifications";
import { ThemeProvider } from "@/src/theme";
import { Colors } from "@/src/theme/colors";
import OfflineIndicator from "@/components/OfflineIndicator";
import { BiometricGate } from "@/components/BiometricGate";

export default function RootLayout() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [fontsLoaded] = useFonts({
    Anton: Anton_400Regular,
    "DM Sans": DM_Sans_400Regular,
    "DM Sans Medium": DM_Sans_500Medium,
    "DM Sans Bold": DM_Sans_700Bold,
  });
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    configureNotifications();
    setAuthExpiredHandler(() => router.replace("/login"));
    let cancelled = false;
    getMe()
      .then((res) => {
        if (!cancelled) setUser(res?.user ?? null);
        if (res?.user) void registerForPushNotifications();
      })
      .catch(() => { if (!cancelled) setUser(null); });
    const t = setTimeout(() => setTimedOut(true), 4000);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  if (user === undefined && !timedOut) {
    return (
      <ThemeProvider>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background.primary }}>
          <ActivityIndicator size="large" color={Colors.brand.greenLight} />
          <Text style={{ color: Colors.text.primary, marginTop: 16 }}>Loading Ykay College...</Text>
        </View>
      </ThemeProvider>
    );
  }

  const resolvedUser = user === undefined ? null : user;

  const stack = (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background.primary } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="landing" redirect={!!resolvedUser} />
      <Stack.Screen name="login" redirect={!!resolvedUser} />
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
      <Stack.Screen name="practice" />
      <Stack.Screen name="practice-runner" />
      <Stack.Screen name="admin-students" />
      <Stack.Screen name="admin-staff" />
      <Stack.Screen name="admin-finance" />
      <Stack.Screen name="admin-fees" />
      <Stack.Screen name="admin-admissions" />
      <Stack.Screen name="admin-reports" />
      <Stack.Screen name="admin-news" />
      <Stack.Screen name="admin-notifications" />
      <Stack.Screen name="admin-corrections" />
    </Stack>
  );

  return (
    <ThemeProvider>
      <View style={{ flex: 1, backgroundColor: Colors.background.primary }}>
        <StatusBar style="light" />
        {resolvedUser ? (
          <BiometricGate>
            {stack}
            <OfflineIndicator />
          </BiometricGate>
        ) : (
          stack
        )}
      </View>
    </ThemeProvider>
  );
}
