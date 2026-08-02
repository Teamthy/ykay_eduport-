import { useEffect, useState } from "react";
import { View, ScrollView, Switch, TouchableOpacity, Alert, Linking, Platform } from "react-native";
import { useRouter } from "expo-router";
import { logout } from "@/lib/api";
import { getPrefs, setPref, type PrefKey } from "@/lib/prefs";
import { biometricAvailable } from "@/lib/biometric";
import { haptic } from "@/lib/haptics";
import { useTheme } from "@/src/theme";
import { Card, H2, H3, Body, Caption, Label, Button, Divider } from "@/src/components";
import { useToast } from "@/components/MobileToast";
import {
  ArrowLeft,
  Fingerprint,
  Megaphone,
  CalendarCheck,
  Wallet,
  GraduationCap,
  LifeBuoy,
  Mail,
  Phone,
  Shield,
  LogOut,
  ChevronRight,
} from "lucide-react-native";

const SCHOOL_EMAIL = "info@ykaycollege.com";
const SCHOOL_PHONE = "+2347015374411";

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const { toast } = useToast();

  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [bioSupported, setBioSupported] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const keys: PrefKey[] = [
        "biometricLock",
        "notifyAnnouncements",
        "notifyAttendance",
        "notifyFees",
        "notifyResults",
      ];
      const [values, bio] = await Promise.all([getPrefs(keys), biometricAvailable()]);
      if (cancelled) return;
      setPrefs(values);
      setBioSupported(bio);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(key: PrefKey, value: boolean) {
    setPrefs((p) => ({ ...p, [key]: value }));
    await setPref(key, value);
    haptic("light");
  }

  function confirmSignOut() {
    Alert.alert("Sign out", "You'll need to sign in again to access your portal.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          toast("Signed out.", "info");
          router.replace("/login");
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background.primary }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: 60, paddingBottom: 48 }}
    >
      <TouchableOpacity
        onPress={() => router.back()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.md }}
      >
        <ArrowLeft size={20} color={colors.text.muted} />
        <Caption>Back</Caption>
      </TouchableOpacity>

      <H2 style={{ marginBottom: spacing.xl }}>Settings</H2>

      {/* ── Security ─────────────────────────────── */}
      <Label style={{ marginBottom: spacing.sm }}>Security</Label>
      <Card variant="default" padding={0} style={{ marginBottom: spacing.xl }}>
        <SettingToggle
          icon={<Fingerprint size={18} color={colors.brand.greenLight} />}
          title="Biometric unlock"
          subtitle={
            bioSupported
              ? "Require Face ID or fingerprint on launch"
              : "Not available on this device"
          }
          value={!!prefs.biometricLock && bioSupported}
          disabled={!bioSupported || !loaded}
          onChange={(v) => toggle("biometricLock", v)}
        />
        <Divider />
        <SettingLink
          icon={<Shield size={18} color={colors.brand.greenLight} />}
          title="Privacy policy"
          onPress={() => Linking.openURL("https://ykaycollege.edu.ng/privacy-policy")}
        />
      </Card>

      {/* ── Notifications ────────────────────────── */}
      <Label style={{ marginBottom: spacing.sm }}>Notifications</Label>
      <Card variant="default" padding={0} style={{ marginBottom: spacing.xl }}>
        <SettingToggle
          icon={<Megaphone size={18} color={colors.brand.greenLight} />}
          title="Announcements"
          subtitle="School news and notices"
          value={!!prefs.notifyAnnouncements}
          disabled={!loaded}
          onChange={(v) => toggle("notifyAnnouncements", v)}
        />
        <Divider />
        <SettingToggle
          icon={<CalendarCheck size={18} color={colors.brand.greenLight} />}
          title="Attendance"
          subtitle="Daily attendance updates"
          value={!!prefs.notifyAttendance}
          disabled={!loaded}
          onChange={(v) => toggle("notifyAttendance", v)}
        />
        <Divider />
        <SettingToggle
          icon={<Wallet size={18} color={colors.brand.greenLight} />}
          title="Fee reminders"
          subtitle="Invoices and payment confirmations"
          value={!!prefs.notifyFees}
          disabled={!loaded}
          onChange={(v) => toggle("notifyFees", v)}
        />
        <Divider />
        <SettingToggle
          icon={<GraduationCap size={18} color={colors.brand.greenLight} />}
          title="Results"
          subtitle="Report cards and exam scores"
          value={!!prefs.notifyResults}
          disabled={!loaded}
          onChange={(v) => toggle("notifyResults", v)}
        />
      </Card>

      {/* ── Support ──────────────────────────────── */}
      <Label style={{ marginBottom: spacing.sm }}>Help &amp; support</Label>
      <Card variant="default" padding={0} style={{ marginBottom: spacing.xl }}>
        <SettingLink
          icon={<Mail size={18} color={colors.brand.greenLight} />}
          title="Email the school"
          subtitle={SCHOOL_EMAIL}
          onPress={() => Linking.openURL(`mailto:${SCHOOL_EMAIL}`)}
        />
        <Divider />
        <SettingLink
          icon={<Phone size={18} color={colors.brand.greenLight} />}
          title="Call the school"
          subtitle={SCHOOL_PHONE}
          onPress={() => Linking.openURL(`tel:${SCHOOL_PHONE.replace(/\s/g, "")}`)}
        />
        <Divider />
        <SettingLink
          icon={<LifeBuoy size={18} color={colors.brand.greenLight} />}
          title="Help centre"
          onPress={() => Linking.openURL("https://ykaycollege.edu.ng/faq")}
        />
      </Card>

      <Button
        variant="ghost"
        fullWidth
        leftIcon={<LogOut size={18} color={colors.danger} />}
        onPress={confirmSignOut}
        style={{ backgroundColor: colors.status.errorBg }}
      >
        <Body tone="primary" style={{ color: colors.danger }}>
          Sign Out
        </Body>
      </Button>

      <View style={{ alignItems: "center", marginTop: spacing.xl }}>
        <Caption style={{ fontSize: 11 }}>Ykay College &amp; Leadership Academy</Caption>
        <Caption style={{ fontSize: 11, marginTop: 2 }}>
          Version 1.0.0 · {Platform.OS === "ios" ? "iOS" : "Android"}
        </Caption>
      </View>
    </ScrollView>
  );
}

function SettingToggle({
  icon,
  title,
  subtitle,
  value,
  disabled,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm + 2,
        padding: spacing.md,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Body tone="primary" style={{ fontFamily: "DM Sans Medium", fontSize: 15 }}>
          {title}
        </Body>
        {subtitle ? <Caption style={{ marginTop: 1 }}>{subtitle}</Caption> : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: colors.surface.cardHover, true: colors.brand.green }}
        thumbColor={colors.brand.white}
      />
    </View>
  );
}

function SettingLink({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  const { colors, spacing } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm + 2,
        padding: spacing.md,
      }}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Body tone="primary" style={{ fontFamily: "DM Sans Medium", fontSize: 15 }}>
          {title}
        </Body>
        {subtitle ? <Caption style={{ marginTop: 1 }}>{subtitle}</Caption> : null}
      </View>
      <ChevronRight size={18} color={colors.text.muted} />
    </TouchableOpacity>
  );
}
