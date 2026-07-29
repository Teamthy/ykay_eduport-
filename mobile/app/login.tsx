import { useState } from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { login, logout } from "@/lib/api";
import { useTheme } from "@/src/theme";
import { Card } from "@/src/components/cards";
import { Input } from "@/src/components/inputs";
import { Button } from "@/src/components/buttons";
import { H3, Body } from "@/src/components/typography";
import { BackgroundCarousel } from "@/src/components/carousel";
import { YkayLogo } from "@/components/YkayLogo";
import { Mail, Lock, ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react-native";

const ALLOWED_ROLES = ["STUDENT", "IT_STUDENT", "PARENT", "TEACHER", "HOD", "ADMIN"];

// 5-image carousel: students, parents, staff, admin, school life.
const CAROUSEL_IMAGES = [
  require("../assets/carousel/1-students.jpg"),
  require("../assets/carousel/2-parents.jpg"),
  require("../assets/carousel/3-staff.jpg"),
  require("../assets/carousel/4-admin.jpg"),
  require("../assets/carousel/5-school.jpg"),
];

export default function LoginScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <View style={{ flex: 1, backgroundColor: colors.background.primary }}>
      {/* Carousel background */}
      <View style={StyleSheet.absoluteFill}>
        <BackgroundCarousel images={CAROUSEL_IMAGES} />
      </View>

      {/* Dark scrim for readability + subtle green brand tint */}
      <LinearGradient
        colors={["rgba(5,12,20,0.45)", "rgba(5,12,20,0.80)", "rgba(5,12,20,0.95)"]}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(78,197,77,0.08)" }]} />

      {/* Content */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: spacing.lg, paddingTop: 84, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {/* Brand */}
          <View style={{ alignItems: "center", marginBottom: spacing.xl }}>
            <View style={{ backgroundColor: "rgba(5,12,20,0.55)", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18 }}>
              <YkayLogo size={60} textSize={24} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: spacing.sm + 2 }}>
              <View style={{ height: 1, width: 28, backgroundColor: colors.brand.greenLight }} />
              <Text style={{ color: colors.text.muted, fontSize: 11, letterSpacing: 3, fontWeight: "600", fontFamily: "DM Sans" }}>STUDENT · PARENT · STAFF PORTAL</Text>
              <View style={{ height: 1, width: 28, backgroundColor: colors.brand.greenLight }} />
            </View>
          </View>

          {/* Glass form card */}
          <Card variant="glass" style={{ padding: spacing.lg }}>
            <H3>Welcome back</H3>
            <Body style={{ marginTop: 4, marginBottom: spacing.lg }}>Sign in with your school portal credentials</Body>

            <View style={{ gap: spacing.md }}>
              <Input label="Email" placeholder="you@ykaycollege.com" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} leftIcon={<Mail size={18} color={colors.text.muted} />} />
              <Input
                label="Password"
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                leftIcon={<Lock size={18} color={colors.text.muted} />}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPassword((s) => !s)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    {showPassword ? <EyeOff size={18} color={colors.brand.greenLight} /> : <Eye size={18} color={colors.text.muted} />}
                  </TouchableOpacity>
                }
              />
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
    </View>
  );
}
