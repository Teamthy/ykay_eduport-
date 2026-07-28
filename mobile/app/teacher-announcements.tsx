import { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { teacherApi } from "@/lib/api";
import { theme } from "@/lib/theme";
import { Bell, AlertCircle, Info, Megaphone } from "lucide-react-native";

export default function TeacherAnnouncements() {
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() { try { setData(await teacherApi.announcements()); } catch {} finally { setRefreshing(false); } }
  useEffect(() => { load(); }, []);

  const items = data?.announcements || [];
  function iconFor(kind: string) {
    if (kind === "ALERT") return <AlertCircle size={18} color={theme.colors.danger} />;
    if (kind === "EXAM" || kind === "RESULT") return <Megaphone size={18} color={theme.colors.accent} />;
    return <Info size={18} color={theme.colors.textMuted} />;
  }
  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }} contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 56 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.accent} />}>
      <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: "bold", marginBottom: theme.spacing.lg }}>Announcements</Text>
      {items.length > 0 ? (
        <View style={{ gap: theme.spacing.xs + 2 }}>
          {items.map((n: any) => (
            <View key={n.id} style={{ backgroundColor: n.read ? theme.colors.surface : theme.colors.bgCard, borderRadius: theme.radius.md, padding: theme.spacing.md, borderLeftWidth: 3, borderLeftColor: n.kind === "ALERT" ? theme.colors.danger : theme.colors.accent }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, marginBottom: 6 }}>
                {iconFor(n.kind)}
                <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: "700", flex: 1 }}>{n.title}</Text>
                {!n.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.accent }} />}
              </View>
              {n.body ? <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 20 }}>{n.body}</Text> : null}
              <Text style={{ color: theme.colors.textGhost, fontSize: 11, marginTop: theme.spacing.xs }}>{timeAgo(n.at)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 60 }}>
          <Bell size={48} color={theme.colors.borderStrong} />
          <Text style={{ color: theme.colors.textGhost, marginTop: theme.spacing.sm }}>No announcements</Text>
        </View>
      )}
    </ScrollView>
  );
}
