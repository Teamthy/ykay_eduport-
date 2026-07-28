import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { adminApi, logout, getMe } from "@/lib/api";
import { YkayLogo } from "@/components/YkayLogo";
import { theme } from "@/lib/theme";
import { Mail, Shield, LogOut } from "lucide-react-native";

export default function AdminProfile() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    getMe().then((res) => setUser(res?.user));
    adminApi.dashboard().then((r) => setUser((u) => ({ ...u, roleLabel: r?.admin?.role })));
  }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }} contentContainerStyle={{ padding: 20, paddingTop: 56 }}>
      <YkayLogo size={36} textSize={16} />
      <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: "bold", marginTop: 28, marginBottom: 28 }}>Profile</Text>

      <View style={{ alignItems: "center", marginBottom: 28 }}>
        <View style={{ width: 84, height: 84, borderRadius: 22, backgroundColor: theme.colors.primary, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#fff", fontSize: 32, fontWeight: "bold" }}>{user?.name?.charAt(0)?.toUpperCase() || "A"}</Text>
        </View>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 20, fontWeight: "bold", marginTop: 12 }}>{user?.name}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, backgroundColor: `${theme.colors.accent}20`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
          <Shield size={12} color={theme.colors.accent} />
          <Text style={{ color: theme.colors.accent, fontSize: 11, fontWeight: "700" }}>{user?.roleLabel || user?.role || "Administrator"}</Text>
        </View>
      </View>

      <View style={{ gap: 12, marginBottom: 28 }}>
        <Row icon={<Mail size={18} color={theme.colors.accent} />} label="Email" value={user?.email || ""} />
        <Row icon={<Shield size={18} color={theme.colors.accent} />} label="Access" value="School Administrator" />
      </View>

      <View style={{ backgroundColor: theme.colors.surface, borderRadius: 12, padding: 14, marginBottom: 24 }}>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
          This is the admin overview. Full school management (students, staff, fees, report cards) is available on the web portal.
        </Text>
      </View>

      <TouchableOpacity
        onPress={async () => { await logout(); router.replace("/login"); }}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, backgroundColor: "#ff444415", borderRadius: theme.radius.md }}
      >
        <LogOut size={18} color="#ff4444" />
        <Text style={{ color: "#ff4444", fontWeight: "700", fontSize: 15 }}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 14 }}>
      {icon}
      <View>
        <Text style={{ color: theme.colors.textFaint, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{label}</Text>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "500" }}>{value}</Text>
      </View>
    </View>
  );
}
