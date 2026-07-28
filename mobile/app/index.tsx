import { Redirect } from "expo-router";
import { getMe, type SessionUser } from "@/lib/api";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    getMe().then((res) => {
      setUser(res?.user ?? null);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#00072D" }}>
        <ActivityIndicator size="large" color="#123499" />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;

  const role = user.role;
  const href =
    role === "TEACHER" || role === "HOD"
      ? "/(teacher)/dashboard"
      : role === "PARENT"
        ? "/(parent)/dashboard"
        : "/(student)/dashboard";

  return <Redirect href={href} />;
}
