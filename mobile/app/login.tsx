import { useState } from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { login, logout } from "@/lib/api";
import { useTheme, Gradients } from "@/src/theme";
import { Button } from "@/src/components/buttons";
import { Input } from "@/src/components/inputs";
import { Card } from "@/src/components/cards";
import { H3, Body, Label } from "@/src/components/typography";
import { YkayLogo } from "@/components/YkayLogo";
import { Mail, Lock, ArrowRight, ShieldCheck } from "lucide-react-native";

const ALLOWED_ROLES = ["STUDENT", "IT_STUDENT", "PARENT", "TEACHER", "HOD", "ADMIN"];

export default function LoginScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
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
      if (!ALLOWED_ROLES.includes(user.role)) {
        await logout();
        Alert.alert("Use the web portal", "This account manages the school from the web portal — not the mobile app.");
        return;
      }
      if (user.role === "TEACHER" || user.role === "HOD") router.replace("/(teacher)/dashboard");
      else if (user.role === "PARENT") router.replace("/(parent)/dashboard");
      else if (user.role === "ADMIN") router.replace("/(admin)/dashboard");
      else router.replace("/(student)/dashboard");
    } catch (err) {
      Alert.alert("Login failed", err instanceof Error ? err.message : "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={[...Gradients.hero]} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: spacing.lg, paddingTop: 80, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {/* Brand */}
          <View style={{ alignItems: "center", marginBottom: spacing.xl }}>
            <YkayLogo size={64} textSize={26} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: spacing.sm + 2 }}>
              <View style={{ height: 1, width: 28, backgroundColor: colors.brand.greenLight }} />
              <Text style={{ color: colors.text.muted, fontSize: 11, letterSpacing: 3, fontWeight: "600", fontFamily: "DM Sans" }}>STUDENT · PARENT · STAFF PORTAL</Text>
              <View style={{ height: 1, width: 28, backgroundColor: colors.brand.greenLight }} />
            </View>
          </View>

          {/* Form */}
          <Card variant="bordered" style={{ padding: spacing.lg }}>
            <H3>Welcome back</H3>
            <Body style={{ marginTop: 4, marginBottom: spacing.lg }}>Sign in with your school portal credentials</Body>

            <View style={{ gap: spacing.md }}>
              <Input label="Email" placeholder="you@ykaycollege.com" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} leftIcon={<Mail size={18} color={colors.text.muted} />} />
              <Input label="Password" placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} leftIcon={<Lock size={18} color={colors.text.muted} />} />
            </View>

            <Button fullWidth size="lg" loading={loading} onPress={handleLogin} rightIcon={!loading ? <ArrowRight size={18} color={colors.brand.white} /> : undefined} style={{ marginTop: spacing.xl }}>
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </Card>

          {/* Footer */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: spacing.xl }}>
            <ShieldCheck size={13} color={colors.text.muted} />
            <Text style={{ color: colors.text.muted, fontSize: 11, fontFamily: "DM Sans" }}>Authorized access for students, parents &amp; staff only</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
