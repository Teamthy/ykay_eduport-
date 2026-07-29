import { useEffect, useState } from "react";
import { View, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { adminApi } from "@/lib/api";
import { useTheme } from "@/src/theme";
import { Card } from "@/src/components/cards";
import { H2, H3, Body, Caption, Label } from "@/src/components/typography";
import { Badge } from "@/src/components/badges";
import { Row, Column } from "@/src/components/layout";
import { AppHeader } from "@/src/components/navigation";
import { bodyFont } from "@/src/theme/typography";
import { GraduationCap, Users, Layers, CreditCard, DollarSign, FileText, Megaphone, Bell, ClipboardCheck, Calendar, ChevronRight } from "lucide-react-native";

const naira = (n: number) => "₦" + Number(n || 0).toLocaleString();

export default function AdminDashboard() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() { try { setData(await adminApi.dashboard()); } catch {} finally { setRefreshing(false); } }
  useEffect(() => { load(); }, []);

  const s = data?.stats;

  const tiles = [
    { icon: GraduationCap, label: "Students", desc: "Roster & enrolment", route: "/admin-students", count: s?.studentCount },
    { icon: Users, label: "Staff", desc: "Teaching & non-teaching", route: "/admin-staff", count: s?.teacherCount },
    { icon: DollarSign, label: "Finance", desc: "Revenue & expenses", route: "/admin-finance" },
    { icon: CreditCard, label: "Fees", desc: "Outstanding & collections", route: "/admin-fees", count: s?.openInvoiceCount, alert: s?.outstandingFees > 0 },
    { icon: FileText, label: "Admissions", desc: "Applications to review", route: "/admin-admissions", count: s?.pendingApplications, alert: s?.pendingApplications > 0 },
    { icon: FileText, label: "Report Cards", desc: "Generate & release", route: "/admin-reports", count: s?.draftReports, alert: s?.draftReports > 0 },
    { icon: Megaphone, label: "Announcements", desc: "Post school news", route: "/admin-news" },
    { icon: Bell, label: "Notifications", desc: "Broadcast alerts", route: "/admin-notifications" },
    { icon: ClipboardCheck, label: "Attendance", desc: "Correction requests", route: "/admin-corrections", count: s?.pendingCorrections, alert: s?.pendingCorrections > 0 },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background.primary }} contentContainerStyle={{ padding: spacing.lg, paddingTop: 56 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand.greenLight} />}>
      <AppHeader />
      <Caption style={{ marginTop: spacing.lg }}>School Overview</Caption>
      <H2 style={{ marginTop: 2, marginBottom: spacing.lg }}>{data?.admin?.name || "Administrator"}</H2>

      {/* Key stats */}
      <Row gap={spacing.sm} justify="flex-start" style={{ flexWrap: "wrap", marginBottom: spacing.md }}>
        <Stat icon={<GraduationCap size={18} color={colors.brand.greenLight} />} value={s?.studentCount} label="Students" />
        <Stat icon={<Users size={18} color={colors.brand.greenLight} />} value={s?.teacherCount} label="Staff" />
        <Stat icon={<Layers size={18} color={colors.brand.greenLight} />} value={s?.classCount} label="Classes" />
        <Stat icon={<Users size={18} color={colors.brand.greenLight} />} value={s?.parentCount} label="Parents" />
      </Row>

      {/* Outstanding fees highlight */}
      <Card variant="bordered" style={{ marginBottom: spacing.lg, borderColor: s?.outstandingFees > 0 ? colors.danger : colors.success }}>
        <Row align="center" gap={spacing.xs}><CreditCard size={18} color={s?.outstandingFees > 0 ? colors.danger : colors.success} /><Label>Outstanding Fees</Label></Row>
        <H2 style={{ color: s?.outstandingFees > 0 ? colors.danger : colors.success, marginTop: spacing.xs }}>{naira(s?.outstandingFees)}</H2>
        <Caption style={{ marginTop: 4 }}>{s?.openInvoiceCount || 0} open invoices · {s?.attendanceRateToday != null ? `${s.attendanceRateToday}% present today` : ""}</Caption>
      </Card>

      {/* Control center grid */}
      <Label style={{ marginBottom: spacing.sm }}>Control Center</Label>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <TouchableOpacity key={t.label} onPress={() => router.push(t.route as any)} style={{ width: "47%" }}>
              <Card variant="default" padding={spacing.md} style={{ height: 110 }}>
                <Row align="center" justify="space-between">
                  <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: `${colors.brand.green}20`, justifyContent: "center", alignItems: "center" }}>
                    <Icon size={20} color={colors.brand.greenLight} />
                  </View>
                  {t.count != null && t.count > 0 && <Badge tone={t.alert ? "warning" : "neutral"}>{String(t.count)}</Badge>}
                </Row>
                <Body tone="primary" style={{ fontFamily: bodyFont("bold"), marginTop: spacing.sm + 2 }}>{t.label}</Body>
                <Caption numberOfLines={1}>{t.desc}</Caption>
              </Card>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: any; label: string }) {
  const { spacing } = useTheme();
  return (
    <Card variant="default" padding={spacing.md} style={{ width: "47%" }}>
      {icon}
      <H2 style={{ marginTop: spacing.xs }}>{value ?? "—"}</H2>
      <Caption style={{ marginTop: 4 }}>{label}</Caption>
    </Card>
  );
}
