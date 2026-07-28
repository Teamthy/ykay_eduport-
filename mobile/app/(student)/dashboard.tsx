import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { studentApi, logout } from "@/lib/api";
import { useRouter } from "expo-router";
import {
  Award,
  Calendar,
  TrendingUp,
  Clock,
  GraduationCap,
  ChevronRight,
  ClipboardCheck,
  Bell,
} from "lucide-react-native";

export default function StudentDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setData(await studentApi.dashboard());
    } catch {
      // Offline or error — show cached/empty
    } finally {
      setLoading(false);
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
      style={{ flex: 1, backgroundColor: "#00072D" }}
      contentContainerStyle={{ padding: 20, paddingTop: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#2840E8" />}
    >
      {/* Greeting + bell */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#ffffff60", fontSize: 14 }}>{greeting},</Text>
          <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold", marginTop: 2 }}>
            {data?.student?.displayName || "Student"}
          </Text>
          <Text style={{ color: "#ffffff40", fontSize: 13, marginTop: 4 }}>
            {data?.student?.className || ""}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/announcements")}
          style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: "#051650", justifyContent: "center", alignItems: "center" }}
        >
          <Bell size={20} color="#2840E8" />
        </TouchableOpacity>
      </View>

      {/* Stats grid */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <StatCard icon={<TrendingUp size={20} color="#2840E8" />} label="Attendance" value={data?.stats ? `${data.stats.attendanceRate}%` : "—"} />
        <StatCard icon={<Award size={20} color="#2840E8" />} label="Avg Score" value={data?.stats ? `${data.stats.averageScore}` : "—"} />
        <StatCard icon={<Clock size={20} color="#2840E8" />} label="Position" value={data?.stats?.classPosition || "—"} />
        <StatCard icon={<GraduationCap size={20} color="#2840E8" />} label="Grade" value={data?.stats?.overallGrade || "—"} />
      </View>

      {/* Quick actions */}
      <Text style={{ color: "#ffffff60", fontSize: 12, fontWeight: "700", marginBottom: 12, letterSpacing: 1 }}>
        QUICK ACTIONS
      </Text>
      <View style={{ gap: 8 }}>
        <ActionRow icon={<Award size={20} color="#2840E8" />} label="View Report Cards" onPress={() => router.push("/(student)/report-cards")} />
        <ActionRow icon={<ClipboardCheck size={20} color="#2840E8" />} label="Take Exam" onPress={() => router.push("/(student)/exams")} />
        <ActionRow icon={<Calendar size={20} color="#2840E8" />} label="My Attendance" onPress={() => router.push("/(student)/attendance")} />
        <ActionRow icon={<Bell size={20} color="#2840E8" />} label="Announcements" onPress={() => router.push("/announcements")} />
      </View>

      {/* Timetable preview */}
      {data?.timetable && data.timetable.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={{ color: "#ffffff60", fontSize: 12, fontWeight: "700", marginBottom: 12, letterSpacing: 1 }}>
            TODAY'S SCHEDULE
          </Text>
          {data.timetable.slice(0, 5).map((item: any, i: number) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <View style={{ width: 4, height: 32, backgroundColor: "#123499", borderRadius: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>{item.subject}</Text>
                <Text style={{ color: "#ffffff40", fontSize: 12 }}>{item.time} · {item.teacher}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Logout */}
      <TouchableOpacity
        onPress={async () => { await logout(); router.replace("/login"); }}
        style={{ marginTop: 32, padding: 16, alignItems: "center", backgroundColor: "#ffffff08", borderRadius: 14 }}
      >
        <Text style={{ color: "#ff4444", fontWeight: "600" }}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={{ backgroundColor: "#051650", borderRadius: 16, padding: 16, width: "47%", gap: 8 }}>
      {icon}
      <Text style={{ color: "#fff", fontSize: 22, fontWeight: "bold" }}>{value}</Text>
      <Text style={{ color: "#ffffff40", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{label}</Text>
    </View>
  );
}

function ActionRow({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#051650", borderRadius: 14, padding: 16 }}
    >
      {icon}
      <Text style={{ flex: 1, color: "#fff", fontSize: 15, fontWeight: "500" }}>{label}</Text>
      <ChevronRight size={18} color="#ffffff30" />
    </TouchableOpacity>
  );
}
