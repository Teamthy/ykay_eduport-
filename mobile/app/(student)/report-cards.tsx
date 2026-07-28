import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { studentApi } from "@/lib/api";
import { theme } from "@/lib/theme";
import { FileText, Award } from "lucide-react-native";

export default function ReportCards() {
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState("");

  async function load() {
    try {
      const res = await studentApi.reportCards();
      setData(res);
      setSelectedId(res?.reports?.[0]?.id || "");
    } catch {
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const selected = data?.reports?.find((r: any) => r.id === selectedId) || data?.reports?.[0];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 56 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.accent} />}
    >
      <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: "bold", marginBottom: theme.spacing.lg }}>Report Cards</Text>

      {data?.reports?.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: theme.spacing.lg }}>
          {data.reports.map((r: any) => (
            <TouchableOpacity
              key={r.id}
              onPress={() => setSelectedId(r.id)}
              style={{ paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: 20, marginRight: theme.spacing.xs, backgroundColor: selectedId === r.id ? theme.colors.primary : theme.colors.surface }}
            >
              <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "600" }}>{r.termLabel} {r.sessionLabel}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {selected ? (
        <View>
          <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.lg }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: theme.spacing.md }}>
              <Mini label="Total" value={String(selected.overallTotal ?? "—")} />
              <Mini label="Average" value={String(selected.overallAverage ?? "—")} />
              <Mini label="Grade" value={selected.overallGrade || "—"} color={theme.colors.accent} />
            </View>
            {selected.classPosition ? (
              <View style={{ flexDirection: "row", gap: theme.spacing.xs, alignItems: "center", marginTop: theme.spacing.sm }}>
                <Award size={16} color={theme.colors.accent} />
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Class Position: {selected.classPosition}</Text>
              </View>
            ) : null}
          </View>

          <Text style={{ color: theme.colors.textFaint, fontSize: 12, fontWeight: "700", marginBottom: theme.spacing.sm, letterSpacing: 1 }}>SUBJECTS</Text>
          {selected.subjects?.map((subj: any, i: number) => (
            <View key={i} style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm, padding: theme.spacing.sm + 2, marginBottom: theme.spacing.xs, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "600" }}>{subj.subject}</Text>
                <Text style={{ color: theme.colors.textGhost, fontSize: 11, marginTop: 2 }}>CA: {subj.ca1 + subj.ca2} · Exam: {subj.exam}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 18, fontWeight: "bold" }}>{subj.total}</Text>
                <Text style={{ color: theme.colors.accent, fontSize: 12, fontWeight: "600" }}>{subj.grade}</Text>
              </View>
            </View>
          ))}

          {selected.classTeacherRemark ? (
            <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm, padding: theme.spacing.sm + 2, marginTop: theme.spacing.sm }}>
              <Text style={{ color: theme.colors.textFaint, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Teacher's Remark</Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>{selected.classTeacherRemark}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 60 }}>
          <FileText size={48} color={theme.colors.borderStrong} />
          <Text style={{ color: theme.colors.textGhost, marginTop: theme.spacing.sm }}>No report cards available</Text>
        </View>
      )}
    </ScrollView>
  );
}

function Mini({ label, value, color = "#fff" }: { label: string; value: string; color?: string }) {
  return (
    <View>
      <Text style={{ color: theme.colors.textGhost, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>{label}</Text>
      <Text style={{ color, fontSize: 26, fontWeight: "bold", marginTop: 2 }}>{value}</Text>
    </View>
  );
}
