import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { teacherApi } from "@/lib/api";
import { useRouter } from "expo-router";
import { ClipboardCheck, BookOpen, Users, Bell, ChevronRight, Megaphone, Mail } from "lucide-react-native";

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
      style={{ flex: 1, backgroundColor: "#00072D" }}
      contentContainerStyle={{ padding: 20, paddingTop: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#2840E8" />}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#ffffff60", fontSize: 14 }}>{greeting},</Text>
          <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold", marginTop: 2 }}>
            {data?.teacher?.displayName || "Teacher"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/teacher-announcements")}
          style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: "#051650", justifyContent: "center", alignItems: "center" }}
        >
          <Bell size={20} color="#2840E8" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
        <Stat value={String(assignments.length)} label="Classes" />
        <Stat value={String(totalStudents)} label="Students" />
      </View>

      {/* Quick actions */}
      <Text style={{ color: "#ffffff60", fontSize: 12, fontWeight: "700", marginBottom: 12, letterSpacing: 1 }}>QUICK ACTIONS</Text>
      <View style={{ gap: 8, marginBottom: 24 }}>
        <ActionRow icon={<ClipboardCheck size={20} color="#2840E8" />} label="Take Attendance" onPress={() => router.push("/(teacher)/attendance")} />
        <ActionRow icon={<BookOpen size={20} color="#2840E8" />} label="Enter Grades" onPress={() => router.push("/(teacher)/gradebook")} />
        <ActionRow icon={<Users size={20} color="#2840E8" />} label="Class Roster" onPress={() => router.push("/(teacher)/students")} />
        <ActionRow icon={<Megaphone size={20} color="#2840E8" />} label="Announcements" onPress={() => router.push("/teacher-announcements")} />
        <ActionRow icon={<Mail size={20} color="#2840E8" />} label="Messages" onPress={() => router.push("/teacher-messages")} />
      </View>

      {/* Assignments */}
      {assignments.length > 0 && (
        <View>
          <Text style={{ color: "#ffffff60", fontSize: 12, fontWeight: "700", marginBottom: 12, letterSpacing: 1 }}>MY CLASSES</Text>
          {assignments.map((a: any, i: number) => (
            <View key={i} style={{ backgroundColor: "#051650", borderRadius: 14, padding: 16, marginBottom: 8 }}>
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>{a.className}</Text>
              <Text style={{ color: "#ffffff60", fontSize: 12, marginTop: 4 }}>
                {a.role}{a.subjectName ? ` · ${a.subjectName}` : ""}
              </Text>
              <Text style={{ color: "#2840E8", fontSize: 12, marginTop: 4 }}>{a.studentCount} students</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ backgroundColor: "#051650", borderRadius: 16, padding: 16, flex: 1 }}>
      <Text style={{ color: "#fff", fontSize: 26, fontWeight: "bold" }}>{value}</Text>
      <Text style={{ color: "#ffffff40", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

function ActionRow({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#051650", borderRadius: 14, padding: 16 }}>
      {icon}
      <Text style={{ flex: 1, color: "#fff", fontSize: 15, fontWeight: "500" }}>{label}</Text>
      <ChevronRight size={18} color="#ffffff30" />
    </TouchableOpacity>
  );
}
