import { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { parentApi } from "@/lib/api";
import { Calendar, Info, Megaphone, AlertCircle } from "lucide-react-native";

export default function ParentEvents() {
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setData(await parentApi.events());
    } catch {
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const events = data?.events || [];

  function iconFor(kind: string) {
    if (kind === "ALERT") return <AlertCircle size={18} color="#ff4444" />;
    if (kind === "EVENT") return <Megaphone size={18} color="#2840E8" />;
    return <Info size={18} color="#ffffff60" />;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#00072D" }}
      contentContainerStyle={{ padding: 20, paddingTop: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#2840E8" />}
    >
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>Events</Text>
      {events.length > 0 ? (
        <View style={{ gap: 10 }}>
          {events.map((ev: any) => {
            const d = new Date(ev.at);
            return (
              <View key={ev.id} style={{ backgroundColor: "#051650", borderRadius: 14, padding: 16, flexDirection: "row", gap: 12 }}>
                <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: "#00072D", justifyContent: "center", alignItems: "center" }}>
                  <Text style={{ color: "#2840E8", fontSize: 16, fontWeight: "bold" }}>{d.getDate()}</Text>
                  <Text style={{ color: "#ffffff50", fontSize: 9, textTransform: "uppercase" }}>{d.toLocaleString("en", { month: "short" })}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {iconFor(ev.kind)}
                    <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700", flex: 1 }}>{ev.title}</Text>
                  </View>
                  {ev.description ? <Text style={{ color: "#ffffff80", fontSize: 13, marginTop: 6, lineHeight: 20 }}>{ev.description}</Text> : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 60 }}>
          <Calendar size={48} color="#ffffff20" />
          <Text style={{ color: "#ffffff40", marginTop: 12 }}>No upcoming events</Text>
        </View>
      )}
    </ScrollView>
  );
}
