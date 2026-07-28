import { useEffect, useState } from "react";
import { ScrollView, RefreshControl, View } from "react-native";
import { adminApi } from "@/lib/api";
import { useTheme } from "@/src/theme";
import { Card } from "@/src/components/cards";
import { H2, H3, Body, Caption, Label } from "@/src/components/typography";
import { Badge } from "@/src/components/badges";
import { Row, Column } from "@/src/components/layout";
import { AppHeader } from "@/src/components/navigation";
import { bodyFont } from "@/src/theme/typography";
import { Users, GraduationCap, Layers, CreditCard, Calendar, AlertCircle, Activity } from "lucide-react-native";

const naira = (n: number) => "₦" + Number(n || 0).toLocaleString();

export default function AdminDashboard() {
  const { colors, spacing } = useTheme();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() { try { setData(await adminApi.dashboard()); } catch {} finally { setRefreshing(false); } }
  useEffect(() => { load(); }, []);

  const s = data?.stats;
  const activity = data?.activity || [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background.primary }} contentContainerStyle={{ padding: spacing.lg, paddingTop: 56 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand.greenLight} />}>
      <AppHeader />

      <Caption>School Overview</Caption>
      <H2 style={{ marginTop: 2, marginBottom: spacing.lg }}>{data?.admin?.name || "Administrator"}</H2>

      {/* People */}
      <Row gap={spacing.sm} justify="flex-start" style={{ flexWrap: "wrap", marginBottom: spacing.md }}>
        <Stat icon={<GraduationCap size={18} color={colors.brand.greenLight} />} value={s?.studentCount} label="Students" />
        <Stat icon={<Users size={18} color={colors.brand.greenLight} />} value={s?.teacherCount} label="Staff" />
        <Stat icon={<Layers size={18} color={colors.brand.greenLight} />} value={s?.classCount} label="Classes" />
        <Stat icon={<Users size={18} color={colors.brand.greenLight} />} value={s?.parentCount} label="Parents" />
      </Row>

      {/* Outstanding fees */}
      <Card variant="bordered" style={{ marginBottom: spacing.md, borderColor: s?.outstandingFees > 0 ? colors.danger : colors.success }}>
        <Row align="center" gap={spacing.xs}>
          <CreditCard size={18} color={s?.outstandingFees > 0 ? colors.danger : colors.success} />
          <Label>Outstanding Fees</Label>
        </Row>
        <H2 style={{ color: s?.outstandingFees > 0 ? colors.danger : colors.success, marginTop: spacing.xs }}>{naira(s?.outstandingFees)}</H2>
        <Caption style={{ marginTop: 4 }}>{s?.openInvoiceCount || 0} open invoices</Caption>
      </Card>

      {/* Attendance today */}
      <Row gap={spacing.sm} style={{ marginBottom: spacing.md }}>
        <Stat icon={<Calendar size={18} color={colors.brand.greenLight} />} value={s?.attendanceRateToday != null ? `${s.attendanceRateToday}%` : "—"} label="Present Today" />
        <Stat icon={<Calendar size={18} color={colors.brand.greenLight} />} value={`${s?.presentToday || 0}/${s?.attendanceMarkedToday || 0}`} label="Marked Today" />
      </Row>

      {/* Needs attention */}
      {(s?.pendingApplications > 0 || s?.pendingCorrections > 0 || s?.draftReports > 0) && (
        <Column gap={spacing.xs + 2} style={{ marginBottom: spacing.md }}>
          <Label>Needs Attention</Label>
          {s?.pendingApplications > 0 && <Pending text={`${s.pendingApplications} admission applications to review`} />}
          {s?.pendingCorrections > 0 && <Pending text={`${s.pendingCorrections} attendance corrections pending`} />}
          {s?.draftReports > 0 && <Pending text={`${s.draftReports} report cards in draft`} />}
        </Column>
      )}

      {/* Activity */}
      {activity.length > 0 && (
        <Column gap={spacing.xs}>
          <Label style={{ marginBottom: spacing.xs }}>Recent Activity</Label>
          {activity.slice(0, 8).map((a: any, i: number) => (
            <Card key={i} variant="default" padding={12} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm + 2 }}>
              <Activity size={15} color={colors.brand.greenLight} />
              <Column style={{ flex: 1 }}>
                <Body tone="primary" numberOfLines={1}>{a.action}</Body>
                <Caption>{a.actorName}{a.actorRole ? ` · ${a.actorRole}` : ""}</Caption>
              </Column>
            </Card>
          ))}
        </Column>
      )}
    </ScrollView>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: any; label: string }) {
  const { spacing } = useTheme();
  return (
    <Card variant="default" padding={spacing.md} style={{ width: "48%" }}>
      {icon}
      <H2 style={{ marginTop: spacing.xs }}>{value ?? "—"}</H2>
      <Caption style={{ marginTop: 4 }}>{label}</Caption>
    </Card>
  );
}

function Pending({ text }: { text: string }) {
  const { colors, spacing } = useTheme();
  return (
    <Card variant="default" padding={12} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm + 2 }}>
      <AlertCircle size={15} color={colors.warning} />
      <Body style={{ flex: 1 }}>{text}</Body>
    </Card>
  );
}
