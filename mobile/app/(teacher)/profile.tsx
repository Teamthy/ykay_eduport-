import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { teacherApi, logout } from "@/lib/api";
import { theme } from "@/lib/theme";
import { YkayLogo } from "@/components/YkayLogo";
import { Mail, BookOpen, Layers, LogOut, Award } from "lucide-react-native";

export default function TeacherProfile() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  useEffect(() => { teacherApi.profile().then((res) => setData(res?.teacher)); }, []);

  const t = data || {};
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }} contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 56 }}>
      <YkayLogo size={32} textSize={15} />
      <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: "bold", marginTop: theme.spacing.xxl, marginBottom: theme.spacing.xxl }}>Profile</Text>

      <View style={{ alignItems: "center", marginBottom: theme.spacing.xxl }}>
        <View style={{ width: 84, height: 84, borderRadius: theme.radius.xl, backgroundColor: theme.colors.primary, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: theme.colors.textInverse, fontSize: 32, fontWeight: "bold" }}>{t.displayName?.charAt(0)?.toUpperCase() || "T"}</Text>
        </View>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 20, fontWeight: "bold", marginTop: theme.spacing.sm }}>{t.displayName}</Text>
        <Text style={{ color: theme.colors.textFaint, fontSize: 13 }}>{t.roleLabel || "Teacher"}</Text>
        {t.isFormTeacher && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: theme.spacing.xs + 2, backgroundColor: `${theme.colors.accent}20`, borderRadius: theme.radius.xs, paddingHorizontal: theme.spacing.sm + 2, paddingVertical: 5 }}>
            <Award size={12} color={theme.colors.accent} />
            <Text style={{ color: theme.colors.accent, fontSize: 11, fontWeight: "700" }}>Form Teacher · {t.formClassName}</Text>
          </View>
        )}
      </View>

      <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.xxl }}>
        <InfoRow icon={<Mail size={18} color={theme.colors.accent} />} label="Email" value={t.email || ""} />
        <InfoRow icon={<BookOpen size={18} color={theme.colors.accent} />} label="Subjects" value={(t.subjects || []).join(", ") || "—"} />
      </View>

      <Text style={{ color: theme.colors.textFaint, fontSize: 12, fontWeight: "700", marginBottom: theme.spacing.xs + 2, letterSpacing: 1 }}>CLASS ASSIGNMENTS</Text>
      <View style={{ gap: theme.spacing.xs, marginBottom: theme.spacing.xxl }}>
        {(t.classes || []).map((c: any, i: number) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs + 2, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm + 2, padding: theme.spacing.sm + 2 }}>
            <Layers size={16} color={theme.colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "600" }}>{c.name}</Text>
              <Text style={{ color: theme.colors.textGhost, fontSize: 12 }}>{c.role}{c.subject ? ` · ${c.subject}` : ""}</Text>
            </View>
          </View>
        ))}
        {(t.classes || []).length === 0 && <Text style={{ color: theme.colors.textGhost, fontSize: 13 }}>No class assignments.</Text>}
      </View>

      <TouchableOpacity onPress={async () => { await logout(); router.replace("/login"); }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: theme.spacing.xs, padding: theme.spacing.md, backgroundColor: `${theme.colors.danger}15`, borderRadius: theme.radius.md }}>
        <LogOut size={18} color={theme.colors.danger} />
        <Text style={{ color: theme.colors.danger, fontWeight: "700", fontSize: 15 }}>Sign Out</Text>
      </TouchableOpacity>
      <Text style={{ color: theme.colors.borderStrong, fontSize: 11, textAlign: "center", marginTop: theme.spacing.xxl }}>Ykay College · Staff Portal</Text>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm + 2, padding: theme.spacing.sm + 2 }}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.textFaint, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{label}</Text>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "500" }}>{value}</Text>
      </View>
    </View>
  );
}
