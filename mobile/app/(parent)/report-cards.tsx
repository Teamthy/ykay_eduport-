import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { parentApi } from "@/lib/api";
import { theme } from "@/lib/theme";
import { Award, FileText } from "lucide-react-native";

export default function ParentReportCards() {
  const [data, setData] = useState<any>(null);
  const [childId, setChildId] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [termId, setTermId] = useState("");

  async function load(id?: string) {
    try {
      const res = await parentApi.reportCards(id || undefined);
      setData(res);
      if (!id) setChildId(res?.selectedChild?.id || "");
      setTermId(res?.reports?.[0]?.id || "");
    } catch {
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function selectChild(id: string) {
    setChildId(id);
    load(id);
  }

  const children = data?.children || [];
  const reports = data?.reports || [];
  const selected = reports.find((r: any) => r.id === termId) || reports[0];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 56 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(childId); }} tintColor={theme.colors.accent} />}
    >
      <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: "bold", marginBottom: theme.spacing.md }}>Report Cards</Text>

      {children.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: theme.spacing.sm + 2 }}>
          {children.map((c: any) => (
            <TouchableOpacity key={c.id} onPress={() => selectChild(c.id)} style={{ backgroundColor: childId === c.id ? theme.colors.primary : theme.colors.surface, borderRadius: 20, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs + 2, marginRight: theme.spacing.xs }}>
              <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "600" }}>{c.displayName}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {reports.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: theme.spacing.md }}>
          {reports.map((r: any) => (
            <TouchableOpacity key={r.id} onPress={() => setTermId(r.id)} style={{ backgroundColor: termId === r.id ? theme.colors.primary : theme.colors.surface, borderRadius: 20, paddingHorizontal: theme.spacing.sm + 2, paddingVertical: theme.spacing.xs + 1, marginRight: theme.spacing.xs }}>
              <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: "600" }}>{r.termLabel} {r.sessionLabel}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {selected ? (
        <View>
          <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md + 2, marginBottom: theme.spacing.md + 2 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Mini label="Total" value={String(selected.overallTotal ?? "—")} />
              <Mini label="Average" value={String(selected.overallAverage ?? "—")} />
              <Mini label="Grade" value={selected.overallGrade || "—"} color={theme.colors.accent} />
            </View>
            {selected.classPosition ? (
              <View style={{ flexDirection: "row", gap: theme.spacing.xs, alignItems: "center", marginTop: theme.spacing.sm + 2 }}>
                <Award size={16} color={theme.colors.accent} />
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Position: {selected.classPosition}</Text>
              </View>
            ) : null}
          </View>

          <Text style={{ color: theme.colors.textFaint, fontSize: 12, fontWeight: "700", marginBottom: theme.spacing.xs + 2, letterSpacing: 1 }}>SUBJECTS</Text>
          {selected.subjects?.map((s: any, i: number) => (
            <View key={i} style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm + 2, padding: theme.spacing.sm + 2, marginBottom: theme.spacing.xs, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "600" }}>{s.subject}</Text>
                <Text style={{ color: theme.colors.textGhost, fontSize: 11, marginTop: 2 }}>CA: {s.ca1 + s.ca2} · Exam: {s.exam}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 18, fontWeight: "bold" }}>{s.total}</Text>
                <Text style={{ color: theme.colors.accent, fontSize: 12, fontWeight: "600" }}>{s.grade}</Text>
              </View>
            </View>
          ))}

          {selected.classTeacherRemark ? (
            <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm + 2, padding: theme.spacing.sm + 2, marginTop: theme.spacing.sm }}>
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
