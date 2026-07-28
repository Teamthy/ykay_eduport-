import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { logout, getMe } from "@/lib/api";
import { theme } from "@/lib/theme";
import { YkayLogo } from "@/components/YkayLogo";
import { User, Mail, GraduationCap, LogOut } from "lucide-react-native";

export default function StudentProfile() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    getMe().then((res) => setUser(res?.user));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bgPrimary, padding: theme.spacing.lg, paddingTop: 56 }}>
      <YkayLogo size={32} textSize={15} />
      <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: "bold", marginTop: theme.spacing.xxl, marginBottom: theme.spacing.xxl }}>Profile</Text>

      <View style={{ alignItems: "center", marginBottom: theme.spacing.xxl }}>
        <View style={{ width: 80, height: 80, borderRadius: theme.radius.xl, backgroundColor: theme.colors.primary, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: theme.colors.textPrimary, fontSize: 32, fontWeight: "bold" }}>{user?.name?.charAt(0)?.toUpperCase() || "S"}</Text>
        </View>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 20, fontWeight: "bold", marginTop: theme.spacing.sm }}>{user?.name}</Text>
        <Text style={{ color: theme.colors.textFaint, fontSize: 13 }}>{user?.role}</Text>
      </View>

      <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.xxl }}>
        <InfoRow icon={<Mail size={18} color={theme.colors.accent} />} label="Email" value={user?.email || ""} />
        <InfoRow icon={<GraduationCap size={18} color={theme.colors.accent} />} label="Role" value={user?.role || ""} />
        <InfoRow icon={<User size={18} color={theme.colors.accent} />} label="User ID" value={user?.id?.slice(0, 12) + "…" || ""} />
      </View>

      <TouchableOpacity
        onPress={async () => { await logout(); router.replace("/login"); }}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: theme.spacing.xs, padding: theme.spacing.md, backgroundColor: `${theme.colors.danger}15`, borderRadius: theme.radius.md }}
      >
        <LogOut size={18} color={theme.colors.danger} />
        <Text style={{ color: theme.colors.danger, fontWeight: "700", fontSize: 15 }}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={{ color: theme.colors.borderStrong, fontSize: 11, textAlign: "center", marginTop: theme.spacing.xxl }}>Ykay College · Student Portal</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm + 2, padding: theme.spacing.sm + 2 }}>
      {icon}
      <View>
        <Text style={{ color: theme.colors.textFaint, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{label}</Text>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "500" }}>{value}</Text>
      </View>
    </View>
  );
}
