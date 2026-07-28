import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from "react-native";
import { studentApi } from "@/lib/api";
import { useRouter } from "expo-router";
import { ClipboardCheck, Clock, Play, Lock, CheckCircle2, RotateCcw } from "lucide-react-native";

export default function StudentExams() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setData(await studentApi.exams());
    } catch {
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const exams = data?.exams || [];

  function openExam(examId: string) {
    router.push({ pathname: "/exam-runner", params: { examId } });
  }

  function onStart(exam: any) {
    if (exam.feeLocked) {
      Alert.alert("Fees outstanding", "Clear your outstanding fees to access exams. Visit the bursar or web portal.");
      return;
    }
    openExam(exam.id);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#00072D" }}
      contentContainerStyle={{ padding: 20, paddingTop: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#2840E8" />}
    >
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 4 }}>My Exams</Text>
      <Text style={{ color: "#ffffff40", fontSize: 13, marginBottom: 20 }}>Computer-based tests for your class</Text>

      {exams.length > 0 ? (
        exams.map((exam: any) => {
          const done = exam.attempt && (exam.attempt.status === "GRADED" || exam.attempt.status === "SUBMITTED");
          const scored = exam.attempt?.scoreVisible;
          return (
            <View key={exam.id} style={{ backgroundColor: "#051650", borderRadius: 16, padding: 16, marginBottom: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>{exam.title}</Text>
                  <Text style={{ color: "#ffffff60", fontSize: 13, marginTop: 4 }}>{exam.subjectName}</Text>
                </View>
                {exam.feeLocked ? (
                  <Badge color="#ff4444" icon={<Lock size={11} color="#ff4444" />} label="FEES DUE" />
                ) : scored ? (
                  <Badge color="#22c55e" icon={<CheckCircle2 size={11} color="#22c55e" />} label={`${exam.attempt.percent}%`} />
                ) : done ? (
                  <Badge color="#22c55e" label="DONE" />
                ) : exam.canResume ? (
                  <Badge color="#f59e0b" label="IN PROGRESS" />
                ) : exam.canStart ? (
                  <Badge color="#2840E8" label="OPEN" />
                ) : (
                  <Badge color="#ffffff40" icon={<Lock size={11} color="#ffffff40" />} label="LOCKED" />
                )}
              </View>

              <View style={{ flexDirection: "row", gap: 16, marginTop: 12 }}>
                <Meta icon={<Clock size={14} color="#ffffff60" />} text={`${exam.durationMinutes} min`} />
                <Meta icon={<ClipboardCheck size={14} color="#ffffff60" />} text={`${exam.questionCount || "?"} questions`} />
              </View>

              {(exam.canStart || exam.canResume) && !exam.feeLocked && (
                <TouchableOpacity
                  onPress={() => onStart(exam)}
                  style={{ marginTop: 14, backgroundColor: exam.canResume ? "#f59e0b" : "#123499", borderRadius: 12, paddingVertical: 13, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 }}
                >
                  {exam.canResume ? <RotateCcw size={16} color="#fff" /> : <Play size={16} color="#fff" fill="#fff" />}
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>{exam.canResume ? "Resume Exam" : "Start Exam"}</Text>
                </TouchableOpacity>
              )}

              {scored && (
                <View style={{ marginTop: 12, padding: 12, backgroundColor: "#22c55e10", borderRadius: 10 }}>
                  <Text style={{ color: "#22c55e", fontSize: 13, fontWeight: "600" }}>
                    Score: {exam.attempt.totalScore} / {exam.totalMarks} ({exam.attempt.percent}%)
                  </Text>
                </View>
              )}
            </View>
          );
        })
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 60 }}>
          <ClipboardCheck size={48} color="#ffffff20" />
          <Text style={{ color: "#ffffff40", marginTop: 12 }}>No exams available</Text>
        </View>
      )}
    </ScrollView>
  );
}

function Badge({ color, icon, label }: { color: string; icon?: React.ReactNode; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: `${color}20`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
      {icon}
      <Text style={{ color, fontSize: 10, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      {icon}
      <Text style={{ color: "#ffffff60", fontSize: 12 }}>{text}</Text>
    </View>
  );
}
