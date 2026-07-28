import { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { studentApi } from "@/lib/api";
import { theme } from "@/lib/theme";
import { Calendar, Check, X, Clock } from "lucide-react-native";

export default function StudentAttendance() {
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setData(await studentApi.attendance());
    } catch {
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const rate = data?.summary ? Math.round((data.summary.present / data.summary.total) * 100) : 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 56 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.accent} />}
    >
      <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: "bold", marginBottom: theme.spacing.lg }}>My Attendance</Text>

      <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, padding: theme.spacing.xl, marginBottom: theme.spacing.lg, alignItems: "center" }}>
        <Text style={{ color: theme.colors.textFaint, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: theme.spacing.xs }}>Attendance Rate</Text>
        <Text style={{ color: rate >= 75 ? theme.colors.success : theme.colors.danger, fontSize: 48, fontWeight: "bold" }}>{rate}%</Text>
        <View style={{ flexDirection: "row", gap: theme.spacing.lg, marginTop: theme.spacing.md }}>
          <Stat label="Present" value={data?.summary?.present || 0} color={theme.colors.success} />
          <Stat label="Absent" value={data?.summary?.absent || 0} color={theme.colors.danger} />
          <Stat label="Late" value={data?.summary?.late || 0} color={theme.colors.warning} />
        </View>
      </View>

      {data?.entries?.length > 0 && (
        <View>
          <Text style={{ color: theme.colors.textFaint, fontSize: 12, fontWeight: "700", marginBottom: theme.spacing.sm + 2, letterSpacing: 1 }}>RECENT</Text>
          {data.entries.slice(0, 20).map((entry: any, i: number) => {
            const color = entry.status === "PRESENT" ? theme.colors.success : entry.status === "LATE" ? theme.colors.warning : theme.colors.danger;
            return (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, marginBottom: theme.spacing.xs }}>
                <View style={{ width: 36, height: 36, borderRadius: theme.radius.sm, backgroundColor: `${color}15`, justifyContent: "center", alignItems: "center" }}>
                  {entry.status === "PRESENT" ? <Check size={16} color={theme.colors.success} /> : entry.status === "LATE" ? <Clock size={16} color={theme.colors.warning} /> : <X size={16} color={theme.colors.danger} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "500" }}>
                    {new Date(entry.date).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}
                  </Text>
                  <Text style={{ color: theme.colors.textGhost, fontSize: 12 }}>{entry.status}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ color, fontSize: 22, fontWeight: "bold" }}>{value}</Text>
      <Text style={{ color: theme.colors.textGhost, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>{label}</Text>
    </View>
  );
}
