import { useEffect, useState } from "react";
import { View, ScrollView, RefreshControl, TextInput } from "react-native";
import { adminApi } from "@/lib/api";
import { useTheme } from "@/src/theme";
import { Card } from "@/src/components/cards";
import { H2, Body, Caption, Label } from "@/src/components/typography";
import { Column } from "@/src/components/layout";
import { EmptyState } from "@/src/components/feedback";
import { bodyFont } from "@/src/theme/typography";
import { Search, GraduationCap } from "lucide-react-native";

export default function AdminStudents() {
  const { colors, spacing } = useTheme();
  const [data, setData] = useState<any>(null);
  const [q, setQ] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function load() { try { setData(await adminApi.students()); } catch {} finally { setRefreshing(false); } }
  useEffect(() => { load(); }, []);

  const all = data?.students || [];
  const students = q ? all.filter((s: any) => `${s.displayName} ${s.studentId} ${s.className || ""}`.toLowerCase().includes(q.toLowerCase())) : all;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background.primary }} contentContainerStyle={{ padding: spacing.lg, paddingTop: 56 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand.greenLight} />}>
      <H2 style={{ marginBottom: spacing.xs }}>Students</H2>
      <Caption style={{ marginBottom: spacing.md }}>{all.length} enrolled · {(data?.classes || []).length} classes</Caption>

      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.background.elevated, borderRadius: 12, paddingHorizontal: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border.subtle }}>
        <Search size={18} color={colors.text.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search name or ID…" placeholderTextColor={colors.text.muted} style={{ flex: 1, color: colors.text.primary, paddingVertical: 12, fontFamily: "DM Sans" }} />
      </View>

      {students.length > 0 ? (
        <Column gap={spacing.xs + 2}>
          {students.slice(0, 200).map((s: any) => (
            <Card key={s.id} variant="default" padding={spacing.sm + 2} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm + 2 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brand.green, justifyContent: "center", alignItems: "center" }}>
                <Body tone="inverse" style={{ fontFamily: bodyFont("bold") }}>{s.displayName?.charAt(0)?.toUpperCase()}</Body>
              </View>
              <Column style={{ flex: 1 }}>
                <Body tone="primary" style={{ fontFamily: bodyFont("semibold") }}>{s.displayName}</Body>
                <Caption>{s.studentId} · {s.className || "—"}</Caption>
              </Column>
            </Card>
          ))}
        </Column>
      ) : (
        <EmptyState icon={<GraduationCap size={48} color={colors.border.strong} />} title={q ? "No matches" : "No students"} />
      )}
    </ScrollView>
  );
}
