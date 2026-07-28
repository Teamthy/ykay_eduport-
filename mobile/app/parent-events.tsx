import { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { parentApi } from "@/lib/api";
import { theme } from "@/lib/theme";
import { Calendar, Info, Megaphone, AlertCircle } from "lucide-react-native";

export default function ParentEvents() {
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() { try { setData(await parentApi.events()); } catch {} finally { setRefreshing(false); } }
  useEffect(() => { load(); }, []);

  const events = data?.events || [];
  function iconFor(kind: string) {
    if (kind === "ALERT") return <AlertCircle size={18} color={theme.colors.danger} />;
    if (kind === "EVENT") return <Megaphone size={18} color={theme.colors.accent} />;
    return <Info size={18} color={theme.colors.textMuted} />;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }} contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 56 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.accent} />}>
      <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: "bold", marginBottom: theme.spacing.lg }}>Events</Text>
      {events.length > 0 ? (
        <View style={{ gap: theme.spacing.xs + 2 }}>
          {events.map((ev: any) => {
            const d = new Date(ev.at);
            return (
              <View key={ev.id} style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.md, flexDirection: "row", gap: theme.spacing.sm + 2 }}>
                <View style={{ width: 48, height: 48, borderRadius: theme.radius.xs + 2, backgroundColor: theme.colors.bgPrimary, justifyContent: "center", alignItems: "center" }}>
                  <Text style={{ color: theme.colors.accent, fontSize: 16, fontWeight: "bold" }}>{d.getDate()}</Text>
                  <Text style={{ color: theme.colors.textGhost, fontSize: 9, textTransform: "uppercase" }}>{d.toLocaleString("en", { month: "short" })}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {iconFor(ev.kind)}
                    <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: "700", flex: 1 }}>{ev.title}</Text>
                  </View>
                  {ev.description ? <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 20 }}>{ev.description}</Text> : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 60 }}>
          <Calendar size={48} color={theme.colors.borderStrong} />
          <Text style={{ color: theme.colors.textGhost, marginTop: theme.spacing.sm }}>No upcoming events</Text>
        </View>
      )}
    </ScrollView>
  );
}
