import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { teacherApi } from "@/lib/api";
import { useRouter } from "expo-router";
import { theme } from "@/lib/theme";
import { YkayLogo } from "@/components/YkayLogo";
import { ClipboardCheck, BookOpen, Users, Bell, ChevronRight, Megaphone, Mail, BarChart3 } from "lucide-react-native";

export default function TeacherDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setData(await teacherApi.dashboard());
    } catch {
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const assignments = data?.assignments || [];
  const totalStudents = assignments.reduce((sum: number, a: any) => sum + (a.studentCount || 0), 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 56 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.accent} />}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.xxl, marginTop: theme.spacing.lg }}>
        <YkayLogo size={32} textSize={15} />
        <TouchableOpacity onPress={() => router.push("/teacher-announcements")} style={{ width: 42, height: 42, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, justifyContent: "center", alignItems: "center" }}>
          <Bell size={20} color={theme.colors.accent} />
        </TouchableOpacity>
      </View>

      <Text style={{ color: theme.colors.textFaint, fontSize: 14 }}>{greeting},</Text>
      <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: "bold", marginTop: 2, marginBottom: theme.spacing.xxl }}>{data?.teacher?.displayName || "Teacher"}</Text>

      <View style={{ flexDirection: "row", gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
        <Stat value={String(assignments.length)} label="Classes" />
        <Stat value={String(totalStudents)} label="Students" />
      </View>

      <Text style={{ color: theme.colors.textFaint, fontSize: 12, fontWeight: "700", marginBottom: theme.spacing.sm, letterSpacing: 1 }}>QUICK ACTIONS</Text>
      <View style={{ gap: theme.spacing.xs, marginBottom: theme.spacing.xxl }}>
        <ActionRow icon={<ClipboardCheck size={20} color={theme.colors.accent} />} label="Take Attendance" onPress={() => router.push("/(teacher)/attendance")} />
        <ActionRow icon={<BookOpen size={20} color={theme.colors.accent} />} label="Enter Grades" onPress={() => router.push("/(teacher)/gradebook")} />
        <ActionRow icon={<Users size={20} color={theme.colors.accent} />} label="Class Roster" onPress={() => router.push("/(teacher)/students")} />
        <ActionRow icon={<BarChart3 size={20} color={theme.colors.accent} />} label="Analytics" onPress={() => router.push("/teacher-analytics")} />
        <ActionRow icon={<Megaphone size={20} color={theme.colors.accent} />} label="Announcements" onPress={() => router.push("/teacher-announcements")} />
        <ActionRow icon={<Mail size={20} color={theme.colors.accent} />} label="Messages" onPress={() => router.push("/teacher-messages")} />
      </View>

      {assignments.length > 0 && (
        <View>
          <Text style={{ color: theme.colors.textFaint, fontSize: 12, fontWeight: "700", marginBottom: theme.spacing.sm, letterSpacing: 1 }}>MY CLASSES</Text>
          {assignments.map((a: any, i: number) => (
            <View key={i} style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.md, marginBottom: theme.spacing.xs }}>
              <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: "600" }}>{a.className}</Text>
              <Text style={{ color: theme.colors.textFaint, fontSize: 12, marginTop: 4 }}>{a.role}{a.subjectName ? ` · ${a.subjectName}` : ""}</Text>
              <Text style={{ color: theme.colors.accent, fontSize: 12, marginTop: 4 }}>{a.studentCount} students</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md, flex: 1 }}>
      <Text style={{ color: theme.colors.textPrimary, fontSize: 26, fontWeight: "bold" }}>{value}</Text>
      <Text style={{ color: theme.colors.textGhost, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

function ActionRow({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.md }}>
      {icon}
      <Text style={{ flex: 1, color: theme.colors.textPrimary, fontSize: 15, fontWeight: "500" }}>{label}</Text>
      <ChevronRight size={18} color={theme.colors.borderStrong} />
    </TouchableOpacity>
  );
}
