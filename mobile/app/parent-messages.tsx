import { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { parentApi } from "@/lib/api";
import { theme } from "@/lib/theme";
import { Mail, MailOpen } from "lucide-react-native";

export default function ParentMessages() {
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() { try { setData(await parentApi.messages()); } catch {} finally { setRefreshing(false); } }
  useEffect(() => { load(); }, []);

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
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }} contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 56 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.accent} />}>
      <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: "bold", marginBottom: theme.spacing.lg }}>Messages</Text>
      {messages.length > 0 ? (
        <View style={{ gap: theme.spacing.xs + 2 }}>
          {messages.map((m: any) => (
            <View key={m.id} style={{ backgroundColor: m.read ? theme.colors.surface : theme.colors.bgCard, borderRadius: theme.radius.md, padding: theme.spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs + 2, marginBottom: 6 }}>
                {m.read ? <MailOpen size={16} color={theme.colors.textMuted} /> : <Mail size={16} color={theme.colors.accent} />}
                <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: m.read ? "600" : "bold", flex: 1 }}>{m.subject}</Text>
              </View>
              {m.body ? <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 20 }}>{m.body}</Text> : null}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: theme.spacing.xs }}>
                <Text style={{ color: theme.colors.textGhost, fontSize: 11 }}>From {m.from || "School"}</Text>
                <Text style={{ color: theme.colors.textGhost, fontSize: 11 }}>{timeAgo(m.at)}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 60 }}>
          <Mail size={48} color={theme.colors.borderStrong} />
          <Text style={{ color: theme.colors.textGhost, marginTop: theme.spacing.sm }}>No messages</Text>
        </View>
      )}
    </ScrollView>
  );
}
