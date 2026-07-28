import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { parentApi } from "@/lib/api";
import { theme } from "@/lib/theme";
import { Bell } from "lucide-react-native";

export default function ParentAttendance() {
  const [data, setData] = useState<any>(null);
  const [childId, setChildId] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function load(id?: string) {
    try {
      const res = await parentApi.attendance(id || undefined);
      setData(res);
      if (!id) setChildId(res?.selectedChild?.id || "");
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
  const s = data?.summary;
  const rate = s && s.total ? Math.round((s.present / s.total) * 100) : 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 56 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(childId); }} tintColor={theme.colors.accent} />}
    >
      <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: "bold", marginBottom: 4 }}>Attendance</Text>
      {data?.monthLabel && <Text style={{ color: theme.colors.textGhost, fontSize: 13, marginBottom: theme.spacing.md }}>{data.monthLabel}</Text>}

      {children.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: theme.spacing.md }}>
          {children.map((c: any) => (
            <TouchableOpacity key={c.id} onPress={() => selectChild(c.id)} style={{ backgroundColor: childId === c.id ? theme.colors.primary : theme.colors.surface, borderRadius: 20, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs + 2, marginRight: theme.spacing.xs }}>
              <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "600" }}>{c.displayName}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, padding: theme.spacing.xl, marginBottom: theme.spacing.lg, alignItems: "center" }}>
        <Text style={{ color: theme.colors.textFaint, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: theme.spacing.xs }}>Attendance Rate</Text>
        <Text style={{ color: rate >= 75 ? theme.colors.success : theme.colors.danger, fontSize: 48, fontWeight: "bold" }}>{rate}%</Text>
        <View style={{ flexDirection: "row", gap: theme.spacing.lg, marginTop: theme.spacing.md }}>
          <Stat label="Present" value={s?.present || 0} color={theme.colors.success} />
          <Stat label="Absent" value={s?.absent || 0} color={theme.colors.danger} />
          <Stat label="Late" value={s?.late || 0} color={theme.colors.warning} />
        </View>
      </View>

      {data?.recentAlerts?.length > 0 && (
        <View>
          <Text style={{ color: theme.colors.textFaint, fontSize: 12, fontWeight: "700", marginBottom: theme.spacing.xs + 2, letterSpacing: 1 }}>ATTENDANCE ALERTS</Text>
          {data.recentAlerts.slice(0, 8).map((a: any) => (
            <View key={a.id} style={{ flexDirection: "row", gap: theme.spacing.xs + 2, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm + 2, padding: theme.spacing.sm + 2, marginBottom: theme.spacing.xs }}>
              <Bell size={16} color={theme.colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 13 }} numberOfLines={2}>{a.messagePreview}</Text>
                <Text style={{ color: theme.colors.textGhost, fontSize: 11, marginTop: 2 }}>{new Date(a.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })}</Text>
              </View>
            </View>
          ))}
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
