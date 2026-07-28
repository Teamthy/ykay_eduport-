import { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { studentApi } from "@/lib/api";
import { Bell, Megaphone, AlertCircle, Info } from "lucide-react-native";

export default function Announcements() {
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setData(await studentApi.announcements());
    } catch {
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const items = data?.announcements || [];

  function iconFor(kind: string) {
    if (kind === "ALERT") return <AlertCircle size={18} color="#ff4444" />;
    if (kind === "EXAM" || kind === "RESULT") return <Megaphone size={18} color="#2840E8" />;
    return <Info size={18} color="#ffffff60" />;
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#00072D" }}
      contentContainerStyle={{ padding: 20, paddingTop: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#2840E8" />}
    >
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>Announcements</Text>

      {items.length > 0 ? (
        <View style={{ gap: 10 }}>
          {items.map((n: any) => (
            <View
              key={n.id}
              style={{
                backgroundColor: n.read ? "#051650" : "#0A2472",
                borderRadius: 14,
                padding: 16,
                borderLeftWidth: 3,
                borderLeftColor: n.kind === "ALERT" ? "#ff4444" : "#2840E8",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                {iconFor(n.kind)}
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700", flex: 1 }}>{n.title}</Text>
                {!n.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#2840E8" }} />}
              </View>
              {n.body ? <Text style={{ color: "#ffffff80", fontSize: 13, lineHeight: 20 }}>{n.body}</Text> : null}
              <Text style={{ color: "#ffffff40", fontSize: 11, marginTop: 8 }}>{timeAgo(n.at)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 60 }}>
          <Bell size={48} color="#ffffff20" />
          <Text style={{ color: "#ffffff40", marginTop: 12 }}>No announcements yet</Text>
        </View>
      )}
    </ScrollView>
  );
}
