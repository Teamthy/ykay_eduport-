import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { login, logout } from "@/lib/api";
import { theme } from "@/lib/theme";
import { Mail, Lock, ArrowRight, GraduationCap, ShieldCheck } from "lucide-react-native";

/** Only school members get a mobile experience. Platform operators use the web. */
const ALLOWED_ROLES = ["STUDENT", "IT_STUDENT", "PARENT", "TEACHER", "HOD", "ADMIN"];

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

      // Gate: only students, parents and staff may use the mobile app.
      if (!ALLOWED_ROLES.includes(user.role)) {
        await logout();
        Alert.alert(
          "Use the web portal",
          "This account manages the school from the web portal — not the mobile app.",
        );
        return;
      }

      if (user.role === "TEACHER" || user.role === "HOD") {
        router.replace("/(teacher)/dashboard");
      } else if (user.role === "PARENT") {
        router.replace("/(parent)/dashboard");
      } else if (user.role === "ADMIN") {
        router.replace("/(admin)/dashboard");
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
    <LinearGradient colors={[...theme.gradient]} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24, paddingTop: 80, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand */}
          <View style={{ alignItems: "center", marginBottom: 40 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 20,
                backgroundColor: theme.colors.primary,
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 20,
                shadowColor: theme.colors.accent,
                shadowOpacity: 0.35,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 6 },
                elevation: 8,
              }}
            >
              <GraduationCap size={36} color="#fff" />
            </View>
            <Text style={{ color: theme.colors.textPrimary, fontSize: 30, fontWeight: "800", letterSpacing: 0.3 }}>
              Ykay College
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
              <View style={{ height: 1, width: 28, backgroundColor: theme.colors.accent }} />
              <Text style={{ color: theme.colors.textMuted, fontSize: 11, letterSpacing: 3, fontWeight: "600" }}>
                STUDENT · PARENT · STAFF PORTAL
              </Text>
              <View style={{ height: 1, width: 28, backgroundColor: theme.colors.accent }} />
            </View>
          </View>

          {/* Form card */}
          <View style={{ backgroundColor: "rgba(10,36,114,0.55)", borderRadius: theme.radius.lg, padding: 22, borderWidth: 1, borderColor: theme.colors.border }}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 15, fontWeight: "700", marginBottom: 4 }}>
              Welcome back
            </Text>
            <Text style={{ color: theme.colors.textGhost, fontSize: 12, marginBottom: 22 }}>
              Sign in with your school portal credentials
            </Text>

            {/* Email */}
            <FieldLabel label="EMAIL" />
            <InputBox icon={<Mail size={18} color={theme.colors.textFaint} />}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@ykaycollege.com"
                placeholderTextColor="#ffffff40"
                autoCapitalize="none"
                keyboardType="email-address"
                style={{ flex: 1, color: theme.colors.textPrimary, paddingVertical: 14, marginLeft: 10, fontSize: 16 }}
              />
            </InputBox>

            {/* Password */}
            <View style={{ height: 16 }} />
            <FieldLabel label="PASSWORD" />
            <InputBox icon={<Lock size={18} color={theme.colors.textFaint} />}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#ffffff40"
                secureTextEntry
                style={{ flex: 1, color: theme.colors.textPrimary, paddingVertical: 14, marginLeft: 10, fontSize: 16 }}
              />
            </InputBox>

            {/* Sign in */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
              style={{
                backgroundColor: theme.colors.primary,
                borderRadius: theme.radius.md,
                paddingVertical: 16,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                marginTop: 26,
                opacity: loading ? 0.55 : 1,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                {loading ? "Signing in…" : "Sign In"}
              </Text>
              {!loading && <ArrowRight size={18} color="#fff" />}
            </TouchableOpacity>
          </View>

          {/* Footer note */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 28 }}>
            <ShieldCheck size={13} color={theme.colors.textGhost} />
            <Text style={{ color: theme.colors.textGhost, fontSize: 11, textAlign: "center" }}>
              Authorized access for students, parents &amp; staff only
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <Text style={{ color: theme.colors.textFaint, fontSize: 11, marginBottom: 6, fontWeight: "700", letterSpacing: 1 }}>
      {label}
    </Text>
  );
}

function InputBox({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.colors.bgPrimary,
        borderRadius: theme.radius.md,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      {icon}
      {children}
    </View>
  );
}
