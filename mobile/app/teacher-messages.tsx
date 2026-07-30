import { useEffect, useState } from "react";
import { View, ScrollView, RefreshControl } from "react-native";
import { teacherApi } from "@/lib/api";
import { useTheme } from "@/src/theme";
import { H2 } from "@/src/components/typography";
import { ListItem } from "@/src/components/lists";
import { EmptyState } from "@/src/components/feedback";
import { Mail, MailOpen } from "lucide-react-native";

export default function TeacherMessages() {
  const { colors, spacing } = useTheme();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() { try { setData(await teacherApi.messages()); } catch {} finally { setRefreshing(false); } }
  useEffect(() => { load(); }, []);

  const messages = data?.messages || [];
  const timeAgo = (iso: string) => {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return days < 7 ? `${days}d ago` : new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background.primary }} contentContainerStyle={{ padding: spacing.lg, paddingTop: 56 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand.greenLight} />}>
      <H2 style={{ marginBottom: spacing.lg }}>Messages</H2>
      {messages.length > 0 ? (
        messages.map((m: any) => (
          <ListItem key={m.id} leftIcon={m.read ? <MailOpen size={20} color={colors.text.muted} /> : <Mail size={20} color={colors.brand.greenLight} />} title={m.subject} subtitle={m.body ? `${m.from || "School"} · ${timeAgo(m.at)} · ${m.body}` : `${m.from || "School"} · ${timeAgo(m.at)}`} unread={!m.read} accentColor={colors.brand.greenLight} />
        ))
      ) : (
        <EmptyState icon={<Mail size={48} color={colors.border.strong} />} title="No messages" />
      )}
    </ScrollView>
  );
}
