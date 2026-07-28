import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from "react-native";
import { studentApi } from "@/lib/api";
import { useRouter } from "expo-router";
import { theme } from "@/lib/theme";
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

  function onStart(exam: any) {
    if (exam.feeLocked) {
      Alert.alert("Fees outstanding", "Clear your outstanding fees to access exams. Visit the bursar or web portal.");
      return;
    }
    router.push({ pathname: "/exam-runner", params: { examId: exam.id } });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 56 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.accent} />}
    >
      <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: "bold", marginBottom: 4 }}>My Exams</Text>
      <Text style={{ color: theme.colors.textGhost, fontSize: 13, marginBottom: theme.spacing.lg }}>Computer-based tests for your class</Text>

      {exams.length > 0 ? (
        exams.map((exam: any) => {
          const done = exam.attempt && (exam.attempt.status === "GRADED" || exam.attempt.status === "SUBMITTED");
          const scored = exam.attempt?.scoreVisible;
          return (
            <View key={exam.id} style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.sm + 2 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1, marginRight: theme.spacing.xs }}>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 16, fontWeight: "bold" }}>{exam.title}</Text>
                  <Text style={{ color: theme.colors.textFaint, fontSize: 13, marginTop: 4 }}>{exam.subjectName}</Text>
                </View>
                {exam.feeLocked ? (
                  <Badge color={theme.colors.danger} icon={<Lock size={11} color={theme.colors.danger} />} label="FEES DUE" />
                ) : scored ? (
                  <Badge color={theme.colors.success} icon={<CheckCircle2 size={11} color={theme.colors.success} />} label={`${exam.attempt.percent}%`} />
                ) : done ? (
                  <Badge color={theme.colors.success} label="DONE" />
                ) : exam.canResume ? (
                  <Badge color={theme.colors.warning} label="IN PROGRESS" />
                ) : exam.canStart ? (
                  <Badge color={theme.colors.accent} label="OPEN" />
                ) : (
                  <Badge color={theme.colors.textGhost} icon={<Lock size={11} color={theme.colors.textGhost} />} label="LOCKED" />
                )}
              </View>

              <View style={{ flexDirection: "row", gap: theme.spacing.lg, marginTop: theme.spacing.sm + 2 }}>
                <Meta icon={<Clock size={14} color={theme.colors.textFaint} />} text={`${exam.durationMinutes} min`} />
                <Meta icon={<ClipboardCheck size={14} color={theme.colors.textFaint} />} text={`${exam.questionCount || "?"} questions`} />
              </View>

              {(exam.canStart || exam.canResume) && !exam.feeLocked && (
                <TouchableOpacity
                  onPress={() => onStart(exam)}
                  style={{ marginTop: theme.spacing.sm + 2, backgroundColor: exam.canResume ? theme.colors.warning : theme.colors.primary, borderRadius: theme.radius.sm + 2, paddingVertical: 13, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: theme.spacing.xs }}
                >
                  {exam.canResume ? <RotateCcw size={16} color={theme.colors.textPrimary} /> : <Play size={16} color={theme.colors.textPrimary} fill={theme.colors.textPrimary} />}
                  <Text style={{ color: theme.colors.textPrimary, fontWeight: "700", fontSize: 14 }}>{exam.canResume ? "Resume Exam" : "Start Exam"}</Text>
                </TouchableOpacity>
              )}

              {scored && (
                <View style={{ marginTop: theme.spacing.sm + 2, padding: theme.spacing.sm + 2, backgroundColor: `${theme.colors.success}10`, borderRadius: theme.radius.sm }}>
                  <Text style={{ color: theme.colors.success, fontSize: 13, fontWeight: "600" }}>
                    Score: {exam.attempt.totalScore} / {exam.totalMarks} ({exam.attempt.percent}%)
                  </Text>
                </View>
              )}
            </View>
          );
        })
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 60 }}>
          <ClipboardCheck size={48} color={theme.colors.borderStrong} />
          <Text style={{ color: theme.colors.textGhost, marginTop: theme.spacing.sm }}>No exams available</Text>
        </View>
      )}
    </ScrollView>
  );
}

function Badge({ color, icon, label }: { color: string; icon?: React.ReactNode; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: `${color}20`, borderRadius: theme.radius.xs, paddingHorizontal: theme.spacing.xs, paddingVertical: 4 }}>
      {icon}
      <Text style={{ color, fontSize: 10, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      {icon}
      <Text style={{ color: theme.colors.textFaint, fontSize: 12 }}>{text}</Text>
    </View>
  );
}
