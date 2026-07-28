import { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { teacherApi } from "@/lib/api";
import { TrendingUp, ClipboardCheck, BookOpen, BarChart3 } from "lucide-react-native";

export default function TeacherAnalytics() {
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setData(await teacherApi.analytics());
    } catch {
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const att = data?.attendance;
  const exams = data?.exams || [];
  const gradebooks = data?.gradebooks || [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#00072D" }}
      contentContainerStyle={{ padding: 20, paddingTop: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#2840E8" />}
    >
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 4 }}>Analytics</Text>
      <Text style={{ color: "#ffffff40", fontSize: 13, marginBottom: 20 }}>Your teaching performance at a glance</Text>

      {/* Top stats */}
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
        <BigStat icon={<TrendingUp size={18} color="#2840E8" />} value={att?.overallRate != null ? `${att.overallRate}%` : "—"} label="Attendance Rate" />
        <BigStat icon={<ClipboardCheck size={18} color="#2840E8" />} value={String(att?.totalSessions || 0)} label="Sessions (30d)" />
      </View>

      {/* Attendance by class */}
      {att?.byClass?.length > 0 && (
        <Section title="ATTENDANCE BY CLASS">
          {att.byClass.map((c: any, i: number) => (
            <BarRow key={i} label={c.className} value={c.rate != null ? `${c.rate}%` : "—"} pct={c.rate} />
          ))}
        </Section>
      )}

      {/* Exam averages */}
      {exams.length > 0 && (
        <Section title="EXAM AVERAGES">
          {exams.slice(0, 8).map((e: any, i: number) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#051650", borderRadius: 12, padding: 12, marginBottom: 8 }}>
              <BookOpen size={15} color="#2840E8" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }} numberOfLines={1}>{e.title || e.className}</Text>
                <Text style={{ color: "#ffffff40", fontSize: 11 }}>{e.className} · {e.attempts || 0} attempts</Text>
              </View>
              <Text style={{ color: e.avgScore >= 50 ? "#22c55e" : "#f59e0b", fontSize: 16, fontWeight: "bold" }}>{e.avgScore != null ? `${e.avgScore}%` : "—"}</Text>
            </View>
          ))}
        </Section>
      )}

      {/* Gradebook averages */}
      {gradebooks.length > 0 && (
        <Section title="GRADEBOOK AVERAGES">
          {gradebooks.map((g: any, i: number) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#051650", borderRadius: 12, padding: 12, marginBottom: 8 }}>
              <BarChart3 size={15} color="#2840E8" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>{g.subject}</Text>
                <Text style={{ color: "#ffffff40", fontSize: 11 }}>{g.className} · {g.entryCount} students</Text>
              </View>
              <Text style={{ color: "#2840E8", fontSize: 16, fontWeight: "bold" }}>{g.avgScore != null ? g.avgScore : "—"}</Text>
            </View>
          ))}
        </Section>
      )}

      {(!att?.byClass?.length && !exams.length && !gradebooks.length) && (
        <View style={{ alignItems: "center", paddingVertical: 40 }}>
          <BarChart3 size={48} color="#ffffff20" />
          <Text style={{ color: "#ffffff40", marginTop: 12 }}>Not enough data yet</Text>
        </View>
      )}
    </ScrollView>
  );
}

function BigStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <View style={{ backgroundColor: "#051650", borderRadius: 16, padding: 16, flex: 1, gap: 8 }}>
      {icon}
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold" }}>{value}</Text>
      <Text style={{ color: "#ffffff40", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ color: "#ffffff60", fontSize: 12, fontWeight: "700", marginBottom: 10, letterSpacing: 1 }}>{title}</Text>
      {children}
    </View>
  );
}

function BarRow({ label, value, pct }: { label: string; value: string; pct: number | null }) {
  const p = Math.max(0, Math.min(100, pct || 0));
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
        <Text style={{ color: "#fff", fontSize: 13, fontWeight: "500" }}>{label}</Text>
        <Text style={{ color: p >= 75 ? "#22c55e" : "#f59e0b", fontSize: 13, fontWeight: "700" }}>{value}</Text>
      </View>
      <View style={{ height: 6, backgroundColor: "#ffffff10", borderRadius: 3, overflow: "hidden" }}>
        <View style={{ height: "100%", width: `${p}%`, backgroundColor: p >= 75 ? "#22c55e" : "#f59e0b", borderRadius: 3 }} />
      </View>
    </View>
  );
}
