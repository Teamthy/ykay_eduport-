import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { parentApi } from "@/lib/api";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/theme";
import { Card } from "@/src/components/cards";
import { H2, H3, Body, Caption, Label } from "@/src/components/typography";
import { Badge } from "@/src/components/badges";
import { Row, Column } from "@/src/components/layout";
import { AppHeader } from "@/src/components/navigation";
import { bodyFont } from "@/src/theme/typography";
import { CreditCard, Calendar, TrendingUp, Bell, ChevronRight, Users, GraduationCap, FileText, Megaphone, Mail } from "lucide-react-native";

const naira = (n: number) => "₦" + Number(n || 0).toLocaleString();

export default function ParentDashboard() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() { try { setData(await parentApi.dashboard()); } catch {} finally { setRefreshing(false); } }
  useEffect(() => { load(); }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const child = data?.selectedChild;
  const fin = data?.finance;
  const att = data?.attendance;
  const outstanding = fin?.totalOutstanding > 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background.primary }} contentContainerStyle={{ padding: spacing.lg, paddingTop: 56 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand.greenLight} />}>
      <AppHeader />

      <Caption>{greeting},</Caption>
      <H2 style={{ marginTop: 2, marginBottom: spacing.lg }}>{data?.parent?.displayName || "Parent"}</H2>

      {data && data.children?.length === 0 && (
        <Card variant="bordered" style={{ alignItems: "center", padding: spacing.xl }}>
          <GraduationCap size={40} color={colors.border.strong} />
          <H3 style={{ marginTop: spacing.sm }}>No children linked yet</H3>
          <Body style={{ marginTop: 6, textAlign: "center" }}>The school will link your ward's profile to this account.</Body>
        </Card>
      )}

      {data?.children?.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
          {data.children.map((c: any) => (
            <Card key={c.id} variant={c.isPrimary ? "elevated" : "default"} padding={10} style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, marginRight: spacing.sm, backgroundColor: c.isPrimary ? colors.brand.green : colors.background.elevated }}>
              <Users size={14} color={c.isPrimary ? colors.brand.white : colors.text.muted} />
              <View>
                <Text style={{ color: colors.text.primary, fontSize: 13, fontWeight: "600", fontFamily: bodyFont("semibold") }}>{c.displayName}</Text>
                <Text style={{ color: c.isPrimary ? colors.brand.white : colors.text.muted, fontSize: 11 }}>{c.className}</Text>
              </View>
            </Card>
          ))}
        </ScrollView>
      )}

      {child && (
        <TouchableOpacity onPress={() => router.push("/(parent)/fees")}>
          <Card variant="bordered" style={{ marginBottom: spacing.md, borderColor: outstanding ? colors.danger : colors.success }}>
            <Row align="center" gap={spacing.xs}>
              <CreditCard size={18} color={outstanding ? colors.danger : colors.success} />
              <Label>Outstanding Fees</Label>
              <View style={{ flex: 1 }} />
              <ChevronRight size={16} color={colors.border.strong} />
            </Row>
            <H2 tone={outstanding ? "inverse" : "inverse"} style={{ color: outstanding ? colors.danger : colors.success, marginTop: spacing.xs }}>{naira(fin?.totalOutstanding)}</H2>
            <Caption style={{ marginTop: 4 }}>Paid {naira(fin?.totalPaid)} of {naira(fin?.totalBilled)}</Caption>
            {outstanding && <Card variant="default" padding={10} style={{ marginTop: spacing.sm + 2, alignItems: "center", backgroundColor: colors.border.subtle }}><Text style={{ color: colors.text.primary, fontWeight: "700", fontFamily: bodyFont("bold") }}>Tap to pay →</Text></Card>}
          </Card>
        </TouchableOpacity>
      )}

      {child && (
        <>
          <Row gap={spacing.sm} style={{ marginBottom: spacing.md }}>
            <StatCard icon={<TrendingUp size={18} color={colors.brand.greenLight} />} value={att ? `${att.attendanceRate}%` : "—"} label={`${child.displayName?.split(" ")[0]}'s Attendance`} />
            <StatCard icon={<Calendar size={18} color={colors.brand.greenLight} />} value={child.className || "—"} label="Class" small />
          </Row>
          <Column gap={spacing.sm} style={{ marginBottom: spacing.md }}>
            <ActionRow icon={<FileText size={20} color={colors.brand.greenLight} />} label="View Report Cards" onPress={() => router.push("/(parent)/report-cards")} />
            <ActionRow icon={<Calendar size={20} color={colors.brand.greenLight} />} label="Attendance" onPress={() => router.push("/(parent)/attendance")} />
            <ActionRow icon={<Megaphone size={20} color={colors.brand.greenLight} />} label="Events" onPress={() => router.push("/parent-events")} />
            <ActionRow icon={<Mail size={20} color={colors.brand.greenLight} />} label="Messages" onPress={() => router.push("/parent-messages")} />
          </Column>
        </>
      )}

      {data?.recentAlerts?.length > 0 && (
        <Column gap={spacing.xs + 2}>
          <Label>Recent Alerts</Label>
          {data.recentAlerts.slice(0, 4).map((a: any) => (
            <Card key={a.id} variant="default" padding={12} style={{ flexDirection: "row", gap: spacing.sm + 2 }}>
              <Bell size={16} color={colors.warning} />
              <Column style={{ flex: 1 }}>
                <Body tone="primary" numberOfLines={2}>{a.messagePreview}</Body>
                <Caption style={{ marginTop: 2 }}>{new Date(a.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })}</Caption>
              </Column>
            </Card>
          ))}
        </Column>
      )}
    </ScrollView>
  );
}

function StatCard({ icon, value, label, small }: { icon: React.ReactNode; value: string; label: string; small?: boolean }) {
  const { spacing } = useTheme();
  return (
    <Card variant="default" padding={spacing.md} style={{ flex: 1 }}>
      {icon}
      <H3 style={{ marginTop: spacing.xs, fontSize: small ? 15 : 22 }}>{value}</H3>
      <Caption style={{ marginTop: 4 }}>{label}</Caption>
    </Card>
  );
}

function ActionRow({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  const { colors, spacing } = useTheme();
  return (
    <TouchableOpacity onPress={onPress}>
      <Card variant="default" padding={spacing.md} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        {icon}
        <Body tone="primary" style={{ flex: 1, fontFamily: bodyFont("medium") }}>{label}</Body>
        <ChevronRight size={18} color={colors.border.strong} />
      </Card>
    </TouchableOpacity>
  );
}
