import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { studentApi, logout } from "@/lib/api";
import { useRouter } from "expo-router";
import { theme } from "@/lib/theme";
import { YkayLogo } from "@/components/YkayLogo";
import {
  Award,
  Calendar,
  TrendingUp,
  Clock,
  GraduationCap,
  ChevronRight,
  ClipboardCheck,
  Bell,
  Users,
  CreditCard,
} from "lucide-react-native";

export default function StudentDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setData(await studentApi.dashboard());
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 56 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.accent} />}
    >
      <YkayLogo size={32} textSize={15} />

      {/* Greeting + bell */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: theme.spacing.xxl, marginTop: theme.spacing.lg }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.textFaint, fontSize: 14 }}>{greeting},</Text>
          <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: "bold", marginTop: 2 }}>
            {data?.student?.displayName || "Student"}
          </Text>
          <Text style={{ color: theme.colors.textGhost, fontSize: 13, marginTop: 4 }}>{data?.student?.className || ""}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/announcements")}
          style={{ width: 42, height: 42, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, justifyContent: "center", alignItems: "center" }}
        >
          <Bell size={20} color={theme.colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, marginBottom: theme.spacing.xxl }}>
        <StatCard icon={<TrendingUp size={20} color={theme.colors.accent} />} label="Attendance" value={data?.stats ? `${data.stats.attendanceRate}%` : "—"} />
        <StatCard icon={<Award size={20} color={theme.colors.accent} />} label="Avg Score" value={data?.stats ? `${data.stats.averageScore}` : "—"} />
        <StatCard icon={<Clock size={20} color={theme.colors.accent} />} label="Position" value={data?.stats?.classPosition || "—"} />
        <StatCard icon={<GraduationCap size={20} color={theme.colors.accent} />} label="Grade" value={data?.stats?.overallGrade || "—"} />
      </View>

      {/* Quick actions */}
      <Text style={{ color: theme.colors.textFaint, fontSize: 12, fontWeight: "700", marginBottom: theme.spacing.sm, letterSpacing: 1 }}>QUICK ACTIONS</Text>
      <View style={{ gap: theme.spacing.xs }}>
        <ActionRow icon={<Award size={20} color={theme.colors.accent} />} label="View Report Cards" onPress={() => router.push("/(student)/report-cards")} />
        <ActionRow icon={<ClipboardCheck size={20} color={theme.colors.accent} />} label="Take Exam" onPress={() => router.push("/(student)/exams")} />
        <ActionRow icon={<Calendar size={20} color={theme.colors.accent} />} label="My Attendance" onPress={() => router.push("/(student)/attendance")} />
        <ActionRow icon={<Bell size={20} color={theme.colors.accent} />} label="Announcements" onPress={() => router.push("/announcements")} />
        <ActionRow icon={<Users size={20} color={theme.colors.accent} />} label="My Teachers" onPress={() => router.push("/student-teachers")} />
        <ActionRow icon={<CreditCard size={20} color={theme.colors.accent} />} label="ID Card" onPress={() => router.push("/id-card")} />
      </View>

      {/* Timetable preview */}
      {data?.timetable?.length > 0 && (
        <View style={{ marginTop: theme.spacing.xxl }}>
          <Text style={{ color: theme.colors.textFaint, fontSize: 12, fontWeight: "700", marginBottom: theme.spacing.sm, letterSpacing: 1 }}>TODAY'S SCHEDULE</Text>
          {data.timetable.slice(0, 5).map((item: any, idx: number) => (
            <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, marginBottom: theme.spacing.xs }}>
              <View style={{ width: 4, height: 32, backgroundColor: theme.colors.primary, borderRadius: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "600" }}>{item.subject}</Text>
                <Text style={{ color: theme.colors.textGhost, fontSize: 12 }}>{item.time} · {item.teacher}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        onPress={async () => { await logout(); router.replace("/login"); }}
        style={{ marginTop: theme.spacing.xxl, padding: theme.spacing.md, alignItems: "center", backgroundColor: theme.colors.border, borderRadius: theme.radius.md }}
      >
        <Text style={{ color: theme.colors.danger, fontWeight: "600" }}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md, width: "47%", gap: theme.spacing.xs }}>
      {icon}
      <Text style={{ color: theme.colors.textPrimary, fontSize: 22, fontWeight: "bold" }}>{value}</Text>
      <Text style={{ color: theme.colors.textGhost, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{label}</Text>
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
