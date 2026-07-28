import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { parentApi } from "@/lib/api";
import { Check, X, Clock, Bell } from "lucide-react-native";

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
      style={{ flex: 1, backgroundColor: "#00072D" }}
      contentContainerStyle={{ padding: 20, paddingTop: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(childId); }} tintColor="#2840E8" />}
    >
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 4 }}>Attendance</Text>
      {data?.monthLabel && <Text style={{ color: "#ffffff40", fontSize: 13, marginBottom: 16 }}>{data.monthLabel}</Text>}

      {children.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {children.map((c: any) => (
            <TouchableOpacity key={c.id} onPress={() => selectChild(c.id)} style={{ backgroundColor: childId === c.id ? "#123499" : "#051650", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8 }}>
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>{c.displayName}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={{ backgroundColor: "#051650", borderRadius: 20, padding: 24, marginBottom: 20, alignItems: "center" }}>
        <Text style={{ color: "#ffffff60", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Attendance Rate</Text>
        <Text style={{ color: rate >= 75 ? "#22c55e" : "#ff4444", fontSize: 48, fontWeight: "bold" }}>{rate}%</Text>
        <View style={{ flexDirection: "row", gap: 20, marginTop: 16 }}>
          <Stat label="Present" value={s?.present || 0} color="#22c55e" />
          <Stat label="Absent" value={s?.absent || 0} color="#ff4444" />
          <Stat label="Late" value={s?.late || 0} color="#f59e0b" />
        </View>
      </View>

      {data?.recentAlerts?.length > 0 && (
        <View>
          <Text style={{ color: "#ffffff60", fontSize: 12, fontWeight: "700", marginBottom: 10, letterSpacing: 1 }}>ATTENDANCE ALERTS</Text>
          {data.recentAlerts.slice(0, 8).map((a: any) => (
            <View key={a.id} style={{ flexDirection: "row", gap: 10, backgroundColor: "#051650", borderRadius: 12, padding: 12, marginBottom: 8 }}>
              <Bell size={16} color="#f59e0b" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontSize: 13 }} numberOfLines={2}>{a.messagePreview}</Text>
                <Text style={{ color: "#ffffff40", fontSize: 11, marginTop: 2 }}>{new Date(a.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })}</Text>
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
      <Text style={{ color: "#ffffff40", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>{label}</Text>
    </View>
  );
}
