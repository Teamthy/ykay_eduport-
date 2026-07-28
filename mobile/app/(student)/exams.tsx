import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { studentApi, api } from "@/lib/api";
import { useRouter } from "expo-router";
import { ClipboardCheck, Clock, Play, CheckCircle2, Lock } from "lucide-react-native";

export default function StudentExams() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const res = await studentApi.exams();
      setData(res);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#00072D" }}
      contentContainerStyle={{ padding: 20, paddingTop: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#2840E8" />}
    >
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>My Exams</Text>

      {data?.exams?.length > 0 ? (
        data.exams.map((exam: any) => (
          <View key={exam.id} style={{ backgroundColor: "#051650", borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>{exam.title}</Text>
                <Text style={{ color: "#ffffff60", fontSize: 13, marginTop: 4 }}>{exam.subjectName}</Text>
              </View>
              {exam.status === "PUBLISHED" ? (
                <View style={{ backgroundColor: "#2840E820", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ color: "#2840E8", fontSize: 10, fontWeight: "700" }}>OPEN</Text>
                </View>
              ) : exam.status === "CLOSED" ? (
                <View style={{ backgroundColor: "#22c55e20", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ color: "#22c55e", fontSize: 10, fontWeight: "700" }}>DONE</Text>
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Lock size={12} color="#ffffff40" />
                  <Text style={{ color: "#ffffff40", fontSize: 10, fontWeight: "700" }}>LOCKED</Text>
                </View>
              )}
            </View>

            <View style={{ flexDirection: "row", gap: 16, marginTop: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Clock size={14} color="#ffffff60" />
                <Text style={{ color: "#ffffff60", fontSize: 12 }}>{exam.durationMinutes} min</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <ClipboardCheck size={14} color="#ffffff60" />
                <Text style={{ color: "#ffffff60", fontSize: 12 }}>{exam.questionCount || "?"} questions</Text>
              </View>
            </View>

            {exam.status === "PUBLISHED" && (
              <TouchableOpacity
                onPress={async () => {
                  try {
                    // Start the attempt (will cache for offline)
                    await api(`/api/student/exams/${exam.id}/attempt`, { method: "POST" });
                    // Navigate to exam runner (web view or native)
                    Alert.alert("Exam", "Exam runner will be available in the next update. Use the web portal for now.");
                  } catch (err) {
                    Alert.alert("Cannot start", err instanceof Error ? err.message : "Unable to start exam.");
                  }
                }}
                style={{ marginTop: 12, backgroundColor: "#123499", borderRadius: 12, paddingVertical: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 }}
              >
                <Play size={16} color="#fff" fill="#fff" />
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Start Exam</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 60 }}>
          <ClipboardCheck size={48} color="#ffffff20" />
          <Text style={{ color: "#ffffff40", marginTop: 12 }}>No exams available</Text>
        </View>
      )}
    </ScrollView>
  );
}

import { Alert } from "react-native";
