import { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { studentApi, getMe } from "@/lib/api";
import { theme } from "@/lib/theme";
import { YkayLogo } from "@/components/YkayLogo";
import { Mail, Hash, IdCard } from "lucide-react-native";

export default function StudentIdCard() {
  const [dash, setDash] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    studentApi.dashboard().then(setDash).catch(() => {});
    getMe().then((r) => setUser(r?.user));
  }, []);

  const s = dash?.student || {};
  const initials = (user?.name || s.displayName || "S").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }} contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 56, alignItems: "center" }}>
      <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: "bold", marginBottom: 4 }}>Student ID Card</Text>
      <Text style={{ color: theme.colors.textGhost, fontSize: 13, marginBottom: theme.spacing.xxl }}>Present this at school events</Text>

      <View style={{ width: "100%", maxWidth: 360, borderRadius: theme.radius.xl, overflow: "hidden", backgroundColor: theme.colors.bgCard, borderWidth: 1, borderColor: `${theme.colors.accent}40` }}>
        <View style={{ padding: theme.spacing.md + 2, paddingBottom: theme.spacing.sm + 4, flexDirection: "row", alignItems: "center", gap: theme.spacing.sm + 2, backgroundColor: theme.colors.bgSecondary }}>
          <YkayLogo size={36} textSize={15} />
        </View>

        <View style={{ padding: theme.spacing.lg, flexDirection: "row", gap: theme.spacing.md }}>
          <View style={{ width: 74, height: 84, borderRadius: theme.radius.sm + 2, backgroundColor: theme.colors.primary, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ color: theme.colors.textInverse, fontSize: 28, fontWeight: "bold" }}>{initials}</Text>
          </View>
          <View style={{ flex: 1, justifyContent: "center", gap: theme.spacing.xs + 2 }}>
            <View>
              <Text style={{ color: theme.colors.textGhost, fontSize: 9, letterSpacing: 1 }}>NAME</Text>
              <Text style={{ color: theme.colors.textPrimary, fontSize: 16, fontWeight: "bold" }}>{user?.name || s.displayName || "Student"}</Text>
            </View>
            {s.className ? (
              <View>
                <Text style={{ color: theme.colors.textGhost, fontSize: 9, letterSpacing: 1 }}>CLASS</Text>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "600" }}>{s.className}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md, gap: theme.spacing.xs + 2 }}>
          {user?.email ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
              <Mail size={13} color={theme.colors.accent} />
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{user.email}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
            <Hash size={13} color={theme.colors.accent} />
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{s.studentId || user?.id?.slice(0, 12) || "—"}</Text>
          </View>
        </View>

        <View style={{ height: 28, backgroundColor: theme.colors.bgPrimary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2, paddingHorizontal: theme.spacing.lg }}>
          {Array.from({ length: 32 }).map((_, i) => (
            <View key={i} style={{ width: (i % 3) + 1, height: 16, backgroundColor: theme.colors.textPrimary }} />
          ))}
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, marginTop: theme.spacing.xxl }}>
        <IdCard size={16} color={theme.colors.textGhost} />
        <Text style={{ color: theme.colors.textGhost, fontSize: 12 }}>Digital ID — validity verified at the portal.</Text>
      </View>
    </ScrollView>
  );
}
