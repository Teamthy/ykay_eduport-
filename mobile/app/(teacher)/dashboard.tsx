import { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { teacherApi } from "@/lib/api";

export default function TeacherDashboard() {
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try { setData(await teacherApi.dashboard()); } catch {} finally { setRefreshing(false); }
  }
  useEffect(() => { load(); }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#00072D" }}
      contentContainerStyle={{ padding: 20, paddingTop: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#2840E8" />}
    >
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold" }}>
        Welcome, {data?.teacher?.displayName || "Teacher"}
      </Text>
      <Text style={{ color: "#ffffff60", fontSize: 14, marginTop: 4, marginBottom: 24 }}>
        {data?.assignments?.length || 0} classes assigned
      </Text>

      {data?.assignments?.map((a: any, i: number) => (
        <View key={i} style={{ backgroundColor: "#051650", borderRadius: 14, padding: 16, marginBottom: 8 }}>
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>{a.className}</Text>
          <Text style={{ color: "#ffffff60", fontSize: 12, marginTop: 4 }}>
            {a.role} {a.subjectName ? `· ${a.subjectName}` : ""}
          </Text>
          <Text style={{ color: "#2840E8", fontSize: 12, marginTop: 4 }}>
            {a.studentCount} students
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
