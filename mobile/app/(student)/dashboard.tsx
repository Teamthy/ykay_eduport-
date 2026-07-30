import { useEffect, useState } from "react";
import { ScrollView, TouchableOpacity, RefreshControl, View } from "react-native";
import { studentApi, logout } from "@/lib/api";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/theme";
import { Card } from "@/src/components/cards";
import { H2, Body, Caption, Label } from "@/src/components/typography";
import { Row, Column } from "@/src/components/layout";
import { AppHeader } from "@/src/components/navigation";
import { bodyFont } from "@/src/theme/typography";
import { Award, Calendar, TrendingUp, Clock, GraduationCap, ChevronRight, ClipboardCheck, Bell, Users, CreditCard } from "lucide-react-native";

export default function StudentDashboard() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try { setData(await studentApi.dashboard()); } catch {} finally { setRefreshing(false); }
  }
  useEffect(() => { load(); }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background.primary }} contentContainerStyle={{ padding: spacing.lg, paddingTop: 56 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand.greenLight} />}>
      <AppHeader onBellPress={() => router.push("/announcements")} />

      <Caption>{greeting},</Caption>
      <H2 style={{ marginTop: 2 }}>{data?.student?.displayName || "Student"}</H2>
      <Caption style={{ marginTop: 4, marginBottom: spacing.lg }}>{data?.student?.className || ""}</Caption>

      {/* Stats */}
      <Row gap={spacing.sm} justify="flex-start" style={{ flexWrap: "wrap", marginBottom: spacing.lg }}>
        <StatCard icon={<TrendingUp size={20} color={colors.brand.greenLight} />} value={data?.stats ? `${data.stats.attendanceRate}%` : "—"} label="Attendance" />
        <StatCard icon={<Award size={20} color={colors.brand.greenLight} />} value={data?.stats ? `${data.stats.averageScore}` : "—"} label="Avg Score" />
        <StatCard icon={<Clock size={20} color={colors.brand.greenLight} />} value={data?.stats?.classPosition || "—"} label="Position" />
        <StatCard icon={<GraduationCap size={20} color={colors.brand.greenLight} />} value={data?.stats?.overallGrade || "—"} label="Grade" />
      </Row>

      <Label style={{ marginBottom: spacing.sm }}>Quick Actions</Label>
      <Column gap={spacing.sm} style={{ marginBottom: spacing.lg }}>
        <ActionRow icon={<Award size={20} color={colors.brand.greenLight} />} label="View Report Cards" onPress={() => router.push("/(student)/report-cards")} />
        <ActionRow icon={<ClipboardCheck size={20} color={colors.brand.greenLight} />} label="Take Exam" onPress={() => router.push("/(student)/exams")} />
        <ActionRow icon={<GraduationCap size={20} color={colors.brand.greenLight} />} label="Practice Tests" onPress={() => router.push("/practice")} />
        <ActionRow icon={<Calendar size={20} color={colors.brand.greenLight} />} label="My Attendance" onPress={() => router.push("/(student)/attendance")} />
        <ActionRow icon={<Bell size={20} color={colors.brand.greenLight} />} label="Announcements" onPress={() => router.push("/announcements")} />
        <ActionRow icon={<Users size={20} color={colors.brand.greenLight} />} label="My Teachers" onPress={() => router.push("/student-teachers")} />
        <ActionRow icon={<CreditCard size={20} color={colors.brand.greenLight} />} label="ID Card" onPress={() => router.push("/id-card")} />
      </Column>

      {data?.timetable?.length > 0 && (
        <Column gap={spacing.sm} style={{ marginBottom: spacing.lg }}>
          <Label>Today's Schedule</Label>
          {data.timetable.slice(0, 5).map((item: any, i: number) => (
            <Row key={i} gap={spacing.sm} align="center">
              <View style={{ width: 4, height: 32, backgroundColor: colors.brand.green, borderRadius: 2 }} />
              <Column>
                <Body tone="primary" style={{ fontFamily: bodyFont("semibold") }}>{item.subject}</Body>
                <Caption>{item.time} · {item.teacher}</Caption>
              </Column>
            </Row>
          ))}
        </Column>
      )}

      <TouchableOpacity onPress={async () => { await logout(); router.replace("/login"); }} style={{ marginTop: spacing.lg, padding: spacing.md, alignItems: "center", backgroundColor: colors.status.errorBg, borderRadius: 14 }}>
        <Body tone="primary" style={{ color: colors.danger, fontFamily: bodyFont("semibold") }}>Sign Out</Body>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <Card variant="default" padding={16} style={{ width: "48%" }}>
      {icon}
      <H2 style={{ marginTop: 8 }}>{value}</H2>
      <Caption style={{ marginTop: 4 }}>{label}</Caption>
    </Card>
  );
}

function ActionRow({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  const { colors, spacing } = useTheme();
  return (
    <TouchableOpacity onPress={onPress}>
      <Card variant="default" padding={16} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        {icon}
        <Body tone="primary" style={{ flex: 1, fontFamily: bodyFont("medium") }}>{label}</Body>
        <ChevronRight size={18} color={colors.border.strong} />
      </Card>
    </TouchableOpacity>
  );
}
