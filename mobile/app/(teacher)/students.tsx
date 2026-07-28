import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Linking } from "react-native";
import { teacherApi } from "@/lib/api";
import { Phone, Users } from "lucide-react-native";

export default function TeacherStudents() {
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setData(await teacherApi.roster());
    } catch {
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const students = data?.students || [];

  return (
    <FlatList
      data={students}
      keyExtractor={(item: any) => item.id}
      style={{ flex: 1, backgroundColor: "#00072D" }}
      contentContainerStyle={{ padding: 20, paddingTop: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#2840E8" />}
      ListHeaderComponent={() => (
        <View>
          <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold" }}>{data?.className || "My Class"}</Text>
          <Text style={{ color: "#ffffff60", fontSize: 14, marginTop: 4, marginBottom: 20 }}>{students.length} students</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <View style={{ backgroundColor: "#051650", borderRadius: 12, padding: 14, marginBottom: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#123499", justifyContent: "center", alignItems: "center", marginRight: 12 }}>
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>{item.displayName?.charAt(0)?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>{item.displayName}</Text>
              <Text style={{ color: "#ffffff60", fontSize: 12 }}>{item.studentId}{item.gender ? ` · ${item.gender}` : ""}</Text>
            </View>
          </View>
          {(item.guardianName || item.guardianPhone) && (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#ffffff08" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#ffffff40", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Guardian</Text>
                <Text style={{ color: "#ffffff80", fontSize: 12 }}>{item.guardianName || "—"}</Text>
              </View>
              {item.guardianPhone ? (
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.guardianPhone}`)} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#2840E820", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Phone size={13} color="#2840E8" />
                  <Text style={{ color: "#2840E8", fontSize: 12, fontWeight: "600" }}>Call</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>
      )}
      ListEmptyComponent={() => (
        <View style={{ alignItems: "center", paddingVertical: 60 }}>
          <Users size={48} color="#ffffff20" />
          <Text style={{ color: "#ffffff40", marginTop: 12 }}>No students found</Text>
        </View>
      )}
    />
  );
}
