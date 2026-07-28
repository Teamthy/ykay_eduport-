import { Redirect } from "expo-router";
import { getMe } from "@/lib/api";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    getMe().then((res) => {
      setIsLoggedIn(!!res?.user);
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

  // Route to login or the appropriate portal based on role
  return <Redirect href={isLoggedIn ? "/(student)/dashboard" : "/login"} />;
}
