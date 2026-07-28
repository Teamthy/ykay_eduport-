import { useEffect, useState } from "react";
import { ScrollView, TouchableOpacity, RefreshControl, View } from "react-native";
import { teacherApi } from "@/lib/api";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/theme";
import { Card } from "@/src/components/cards";
import { H2, H3, Body, Caption, Label } from "@/src/components/typography";
import { Column } from "@/src/components/layout";
import { AppHeader } from "@/src/components/navigation";
import { bodyFont } from "@/src/theme/typography";
import { ClipboardCheck, BookOpen, Users, ChevronRight, Megaphone, Mail, BarChart3 } from "lucide-react-native";

export default function TeacherDashboard() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() { try { setData(await teacherApi.dashboard()); } catch {} finally { setRefreshing(false); } }
  useEffect(() => { load(); }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const assignments = data?.assignments || [];
  const totalStudents = assignments.reduce((sum: number, a: any) => sum + (a.studentCount || 0), 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background.primary }} contentContainerStyle={{ padding: spacing.lg, paddingTop: 56 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand.greenLight} />}>
      <AppHeader onBellPress={() => router.push("/teacher-announcements")} />

      <Caption>{greeting},</Caption>
      <H2 style={{ marginTop: 2, marginBottom: spacing.lg }}>{data?.teacher?.displayName || "Teacher"}</H2>

      <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg }}>
        <Stat value={String(assignments.length)} label="Classes" />
        <Stat value={String(totalStudents)} label="Students" />
      </View>

      <Label style={{ marginBottom: spacing.sm }}>Quick Actions</Label>
      <Column gap={spacing.sm} style={{ marginBottom: spacing.lg }}>
        <ActionRow icon={<ClipboardCheck size={20} color={colors.brand.greenLight} />} label="Take Attendance" onPress={() => router.push("/(teacher)/attendance")} />
        <ActionRow icon={<BookOpen size={20} color={colors.brand.greenLight} />} label="Enter Grades" onPress={() => router.push("/(teacher)/gradebook")} />
        <ActionRow icon={<Users size={20} color={colors.brand.greenLight} />} label="Class Roster" onPress={() => router.push("/(teacher)/students")} />
        <ActionRow icon={<BarChart3 size={20} color={colors.brand.greenLight} />} label="Analytics" onPress={() => router.push("/teacher-analytics")} />
        <ActionRow icon={<Megaphone size={20} color={colors.brand.greenLight} />} label="Announcements" onPress={() => router.push("/teacher-announcements")} />
        <ActionRow icon={<Mail size={20} color={colors.brand.greenLight} />} label="Messages" onPress={() => router.push("/teacher-messages")} />
      </Column>

      {assignments.length > 0 && (
        <Column gap={spacing.xs}>
          <Label style={{ marginBottom: spacing.xs }}>My Classes</Label>
          {assignments.map((a: any, i: number) => (
            <Card key={i} variant="default" padding={spacing.md}>
              <Body tone="primary" style={{ fontFamily: bodyFont("semibold") }}>{a.className}</Body>
              <Caption style={{ marginTop: 4 }}>{a.role}{a.subjectName ? ` · ${a.subjectName}` : ""}</Caption>
              <Caption style={{ color: colors.brand.greenLight, marginTop: 4 }}>{a.studentCount} students</Caption>
            </Card>
          ))}
        </Column>
      )}
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const { spacing } = useTheme();
  return (
    <Card variant="default" padding={spacing.md} style={{ flex: 1 }}>
      <H2 style={{ fontSize: 26 }}>{value}</H2>
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
