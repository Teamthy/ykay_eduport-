import { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { teacherApi } from "@/lib/api";
import { theme } from "@/lib/theme";
import { TrendingUp, ClipboardCheck, BookOpen, BarChart3 } from "lucide-react-native";

export default function TeacherAnalytics() {
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() { try { setData(await teacherApi.analytics()); } catch {} finally { setRefreshing(false); } }
  useEffect(() => { load(); }, []);

  const att = data?.attendance;
  const exams = data?.exams || [];
  const gradebooks = data?.gradebooks || [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }} contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 56 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.accent} />}>
      <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: "bold", marginBottom: 4 }}>Analytics</Text>
      <Text style={{ color: theme.colors.textGhost, fontSize: 13, marginBottom: theme.spacing.lg }}>Your teaching performance at a glance</Text>

      <View style={{ flexDirection: "row", gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
        <BigStat icon={<TrendingUp size={18} color={theme.colors.accent} />} value={att?.overallRate != null ? `${att.overallRate}%` : "—"} label="Attendance Rate" />
        <BigStat icon={<ClipboardCheck size={18} color={theme.colors.accent} />} value={String(att?.totalSessions || 0)} label="Sessions (30d)" />
      </View>

      {att?.byClass?.length > 0 && (
        <Section title="ATTENDANCE BY CLASS">
          {att.byClass.map((c: any, i: number) => <BarRow key={i} label={c.className} value={c.rate != null ? `${c.rate}%` : "—"} pct={c.rate} />)}
        </Section>
      )}

      {exams.length > 0 && (
        <Section title="EXAM AVERAGES">
          {exams.slice(0, 8).map((e: any, i: number) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs + 2, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm + 2, padding: theme.spacing.sm + 2, marginBottom: theme.spacing.xs }}>
              <BookOpen size={15} color={theme.colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>{e.title || e.className}</Text>
                <Text style={{ color: theme.colors.textGhost, fontSize: 11 }}>{e.className} · {e.attempts || 0} attempts</Text>
              </View>
              <Text style={{ color: e.avgScore >= 50 ? theme.colors.success : theme.colors.warning, fontSize: 16, fontWeight: "bold" }}>{e.avgScore != null ? `${e.avgScore}%` : "—"}</Text>
            </View>
          ))}
        </Section>
      )}

      {gradebooks.length > 0 && (
        <Section title="GRADEBOOK AVERAGES">
          {gradebooks.map((g: any, i: number) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs + 2, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm + 2, padding: theme.spacing.sm + 2, marginBottom: theme.spacing.xs }}>
              <BarChart3 size={15} color={theme.colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "600" }}>{g.subject}</Text>
                <Text style={{ color: theme.colors.textGhost, fontSize: 11 }}>{g.className} · {g.entryCount} students</Text>
              </View>
              <Text style={{ color: theme.colors.accent, fontSize: 16, fontWeight: "bold" }}>{g.avgScore != null ? g.avgScore : "—"}</Text>
            </View>
          ))}
        </Section>
      )}

      {!att?.byClass?.length && !exams.length && !gradebooks.length && (
        <View style={{ alignItems: "center", paddingVertical: 40 }}>
          <BarChart3 size={48} color={theme.colors.borderStrong} />
          <Text style={{ color: theme.colors.textGhost, marginTop: theme.spacing.sm }}>Not enough data yet</Text>
        </View>
      )}
    </ScrollView>
  );
}

function BigStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md, flex: 1, gap: theme.spacing.xs }}>
      {icon}
      <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: "bold" }}>{value}</Text>
      <Text style={{ color: theme.colors.textGhost, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<View style={{ marginBottom: theme.spacing.lg }}><Text style={{ color: theme.colors.textFaint, fontSize: 12, fontWeight: "700", marginBottom: theme.spacing.xs + 2, letterSpacing: 1 }}>{title}</Text>{children}</View>);
}
function BarRow({ label, value, pct }: { label: string; value: string; pct: number | null }) {
  const p = Math.max(0, Math.min(100, pct || 0));
  return (
    <View style={{ marginBottom: theme.spacing.xs + 2 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "500" }}>{label}</Text>
        <Text style={{ color: p >= 75 ? theme.colors.success : theme.colors.warning, fontSize: 13, fontWeight: "700" }}>{value}</Text>
      </View>
      <View style={{ height: 6, backgroundColor: theme.colors.border, borderRadius: 3, overflow: "hidden" }}>
        <View style={{ height: "100%", width: `${p}%`, backgroundColor: p >= 75 ? theme.colors.success : theme.colors.warning, borderRadius: 3 }} />
      </View>
    </View>
  );
}
