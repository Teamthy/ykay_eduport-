import { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { studentApi } from "@/lib/api";
import { Calendar, Check, X, Clock } from "lucide-react-native";

export default function StudentAttendance() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const res = await studentApi.attendance();
      setData(res);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const rate = data?.summary ? Math.round((data.summary.present / data.summary.total) * 100) : 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#00072D" }}
      contentContainerStyle={{ padding: 20, paddingTop: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#2840E8" />}
    >
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>My Attendance</Text>

      {/* Summary card */}
      <View style={{ backgroundColor: "#051650", borderRadius: 20, padding: 24, marginBottom: 20, alignItems: "center" }}>
        <Text style={{ color: "#ffffff60", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
          Attendance Rate
        </Text>
        <Text style={{ color: rate >= 75 ? "#22c55e" : "#ff4444", fontSize: 48, fontWeight: "bold" }}>
          {rate}%
        </Text>
        <View style={{ flexDirection: "row", gap: 20, marginTop: 16 }}>
          <Stat label="Present" value={data?.summary?.present || 0} color="#22c55e" />
          <Stat label="Absent" value={data?.summary?.absent || 0} color="#ff4444" />
          <Stat label="Late" value={data?.summary?.late || 0} color="#f59e0b" />
        </View>
      </View>

      {/* Recent entries */}
      {data?.entries?.length > 0 && (
        <View>
          <Text style={{ color: "#ffffff60", fontSize: 12, fontWeight: "700", marginBottom: 12, letterSpacing: 1 }}>
            RECENT
          </Text>
          {data.entries.slice(0, 20).map((entry: any, i: number) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: entry.status === "PRESENT" ? "#22c55e15" : entry.status === "LATE" ? "#f59e0b15" : "#ff444415",
                justifyContent: "center", alignItems: "center",
              }}>
                {entry.status === "PRESENT" ? <Check size={16} color="#22c55e" /> :
                 entry.status === "LATE" ? <Clock size={16} color="#f59e0b" /> :
                 <X size={16} color="#ff4444" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "500" }}>
                  {new Date(entry.date).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}
                </Text>
                <Text style={{ color: "#ffffff40", fontSize: 12 }}>{entry.status}</Text>
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
