import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { login } from "@/lib/api";
import { Mail, Lock, ArrowRight, GraduationCap } from "lucide-react-native";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const { user } = await login(email, password);
      // Route based on role
      if (user.role === "TEACHER" || user.role === "HOD") {
        router.replace("/(teacher)/dashboard");
      } else if (user.role === "PARENT") {
        router.replace("/(student)/dashboard"); // TODO: parent portal
      } else {
        router.replace("/(student)/dashboard");
      }
    } catch (err) {
      Alert.alert("Login failed", err instanceof Error ? err.message : "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#00072D", justifyContent: "center", padding: 24 }}
    >
      {/* Logo */}
      <View style={{ alignItems: "center", marginBottom: 40 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            backgroundColor: "#123499",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <GraduationCap size={32} color="#fff" />
        </View>
        <Text style={{ fontSize: 30, fontWeight: "bold", color: "#fff", letterSpacing: 0.5 }}>
          Ykay <Text style={{ color: "#2840E8" }}>College</Text>
        </Text>
        <Text style={{ color: "#ffffff60", fontSize: 12, marginTop: 6, letterSpacing: 2 }}>
          STUDENT &amp; STAFF PORTAL
        </Text>
      </View>

      {/* Email */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: "#ffffff80", fontSize: 12, marginBottom: 6, fontWeight: "600" }}>
          EMAIL
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#0A2472",
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 4,
          }}
        >
          <Mail size={18} color="#ffffff60" />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@ykaycollege.com"
            placeholderTextColor="#ffffff40"
            autoCapitalize="none"
            keyboardType="email-address"
            style={{
              flex: 1,
              color: "#fff",
              paddingVertical: 14,
              marginLeft: 10,
              fontSize: 16,
            }}
          />
        </View>
      </View>

      {/* Password */}
      <View style={{ marginBottom: 32 }}>
        <Text style={{ color: "#ffffff80", fontSize: 12, marginBottom: 6, fontWeight: "600" }}>
          PASSWORD
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#0A2472",
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 4,
          }}
        >
          <Lock size={18} color="#ffffff60" />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#ffffff40"
            secureTextEntry
            style={{
              flex: 1,
              color: "#fff",
              paddingVertical: 14,
              marginLeft: 10,
              fontSize: 16,
            }}
          />
        </View>
      </View>

      {/* Login button */}
      <TouchableOpacity
        onPress={handleLogin}
        disabled={loading}
        style={{
          backgroundColor: "#123499",
          borderRadius: 14,
          paddingVertical: 16,
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 8,
          opacity: loading ? 0.5 : 1,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
          {loading ? "Signing in..." : "Sign In"}
        </Text>
        {!loading && <ArrowRight size={18} color="#fff" />}
      </TouchableOpacity>

      <Text style={{ color: "#ffffff30", fontSize: 12, textAlign: "center", marginTop: 24 }}>
        Use your Ykay College portal credentials
      </Text>
    </KeyboardAvoidingView>
  );
}
