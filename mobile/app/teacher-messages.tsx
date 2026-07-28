import { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { teacherApi } from "@/lib/api";
import { Mail, MailOpen } from "lucide-react-native";

export default function TeacherMessages() {
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setData(await teacherApi.messages());
    } catch {
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const messages = data?.messages || [];

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return days < 7 ? `${days}d ago` : new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#00072D" }}
      contentContainerStyle={{ padding: 20, paddingTop: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#2840E8" />}
    >
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>Messages</Text>
      {messages.length > 0 ? (
        <View style={{ gap: 10 }}>
          {messages.map((m: any) => (
            <View key={m.id} style={{ backgroundColor: m.read ? "#051650" : "#0A2472", borderRadius: 14, padding: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
                {m.read ? <MailOpen size={16} color="#ffffff60" /> : <Mail size={16} color="#2840E8" />}
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: m.read ? "600" : "bold", flex: 1 }}>{m.subject}</Text>
              </View>
              {m.body ? <Text style={{ color: "#ffffff80", fontSize: 13, lineHeight: 20 }}>{m.body}</Text> : null}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                <Text style={{ color: "#ffffff40", fontSize: 11 }}>From {m.from || "School"}</Text>
                <Text style={{ color: "#ffffff40", fontSize: 11 }}>{timeAgo(m.at)}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 60 }}>
          <Mail size={48} color="#ffffff20" />
          <Text style={{ color: "#ffffff40", marginTop: 12 }}>No messages</Text>
        </View>
      )}
    </ScrollView>
  );
}
