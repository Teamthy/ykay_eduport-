import { Redirect } from "expo-router";
import { getMe, type SessionUser } from "@/lib/api";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Colors } from "@/src/theme/colors";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    getMe().then((res) => { setUser(res?.user ?? null); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background.primary }}>
        <ActivityIndicator size="large" color={Colors.brand.greenLight} />
      </View>
    );
  }

  if (!user) return <Redirect href="/landing" />;

  const role = user.role;
  const href =
    role === "TEACHER" || role === "HOD" ? "/(teacher)/dashboard"
      : role === "PARENT" ? "/(parent)/dashboard"
        : role === "ADMIN" ? "/(admin)/dashboard"
          : "/(student)/dashboard";

  return <Redirect href={href} />;
}
