import { useEffect, useState } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { teacherApi } from "@/lib/api";

export default function TeacherStudents() {
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try { setData(await teacherApi.students()); } catch {} finally { setRefreshing(false); }
  }
  useEffect(() => { load(); }, []);

  const students = data?.students || [];

  return (
    <FlatList
      data={students}
      keyExtractor={(_, i) => String(i)}
      style={{ flex: 1, backgroundColor: "#00072D" }}
      contentContainerStyle={{ padding: 20, paddingTop: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#2840E8" />}
      ListHeaderComponent={() => (
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
          Students ({students.length})
        </Text>
      )}
      renderItem={({ item }) => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#051650", borderRadius: 12, padding: 14, marginBottom: 8 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#123499", justifyContent: "center", alignItems: "center" }}>
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
              {item.displayName?.charAt(0)?.toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>{item.displayName}</Text>
            <Text style={{ color: "#ffffff60", fontSize: 12 }}>{item.studentId} · {item.className}</Text>
          </View>
        </View>
      )}
      ListEmptyComponent={() => (
        <View style={{ alignItems: "center", paddingVertical: 60 }}>
          <Text style={{ color: "#ffffff40" }}>No students found</Text>
        </View>
      )}
    />
  );
}
