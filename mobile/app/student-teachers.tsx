import { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { studentApi } from "@/lib/api";
import { Users, BookOpen } from "lucide-react-native";

export default function StudentTeachers() {
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setData(await studentApi.teachers());
    } catch {
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const teachers = data?.teachers || [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#00072D" }}
      contentContainerStyle={{ padding: 20, paddingTop: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#2840E8" />}
    >
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 4 }}>My Teachers</Text>
      {data?.className && <Text style={{ color: "#ffffff40", fontSize: 13, marginBottom: 20 }}>{data.className}</Text>}

      {teachers.length > 0 ? (
        <View style={{ gap: 10 }}>
          {teachers.map((t: any) => (
            <View key={t.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#051650", borderRadius: 14, padding: 14 }}>
              <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: "#123499", justifyContent: "center", alignItems: "center" }}>
                <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>{t.name?.charAt(0)?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>{t.name}</Text>
                {t.subject ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 }}>
                    <BookOpen size={12} color="#2840E8" />
                    <Text style={{ color: "#2840E8", fontSize: 12, fontWeight: "600" }}>{t.subject}</Text>
                  </View>
                ) : null}
                {t.role && t.role !== t.subject ? <Text style={{ color: "#ffffff50", fontSize: 11, marginTop: 2 }}>{t.role}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 60 }}>
          <Users size={48} color="#ffffff20" />
          <Text style={{ color: "#ffffff40", marginTop: 12 }}>No teachers assigned yet</Text>
        </View>
      )}
    </ScrollView>
  );
}
