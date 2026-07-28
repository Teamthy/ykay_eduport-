import { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, BackHandler } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { studentApi } from "@/lib/api";
import { theme } from "@/lib/theme";
import { Clock, CheckCircle2, AlertTriangle } from "lucide-react-native";

type Question = { id: string; type: string; questionText: string; marks: number; options: { key: string; text: string }[] | null; savedResponse: string | null };
type Phase = "loading" | "running" | "submitting" | "done" | "error";

export default function ExamRunner() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("loading");
  const [exam, setExam] = useState<any>(null);
  const [attemptId, setAttemptId] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const answersRef = useRef<Record<string, string>>({});
  useEffect(() => { answersRef.current = answers; }, [answers]);
  const examIdRef = useRef(examId);
  const attemptIdRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res: any = await studentApi.startExam(examId);
        if (cancelled) return;
        setExam(res.exam);
        setAttemptId(res.attempt.id);
        attemptIdRef.current = res.attempt.id;
        setQuestions(res.questions);
        const init: Record<string, string> = {};
        for (const q of res.questions) if (q.savedResponse) init[q.id] = q.savedResponse;
        setAnswers(init);
        answersRef.current = init;
        setSecondsLeft(res.attempt.secondsLeft);
        setPhase("running");
      } catch (e: any) {
        if (cancelled) return;
        setError(e.message || "Could not start this exam.");
        setPhase("error");
      }
    })();
    return () => { cancelled = true; };
  }, [examId]);

  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => {
      setSecondsLeft((s) => { if (s <= 1) { clearInterval(t); doSubmit(true); return 0; } return s - 1; });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => doSave(), 20_000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "running") return;
    const handler = () => {
      Alert.alert("Leave exam?", "Your progress is saved. You can resume later if the exam is still open.", [{ text: "Stay", style: "cancel" }, { text: "Leave", style: "destructive", onPress: () => router.back() }]);
      return true;
    };
    BackHandler.addEventListener("hardwareBackPress", handler);
    return () => BackHandler.removeEventListener("hardwareBackPress", handler);
  }, [phase]);

  function setAnswer(qId: string, value: string) { setAnswers((prev) => ({ ...prev, [qId]: value })); }

  async function doSave() {
    if (!attemptIdRef.current) return;
    setSaving(true);
    try {
      const payload = Object.entries(answersRef.current).map(([questionId, response]) => ({ questionId, response }));
      await studentApi.saveExam(examIdRef.current, attemptIdRef.current, payload);
    } catch {} finally { setSaving(false); }
  }

  async function doSubmit(auto = false) {
    if (phase === "submitting" || phase === "done") return;
    setPhase("submitting");
    try {
      const payload = Object.entries(answersRef.current).map(([questionId, response]) => ({ questionId, response }));
      const res: any = await studentApi.submitExam(examIdRef.current, attemptIdRef.current, payload);
      if (res?.queued) {
        setResult({ message: "You're offline — your answers are saved and will be submitted automatically when you reconnect." });
        setPhase("done");
        return;
      }
      setResult(res);
      setPhase("done");
    } catch (e: any) {
      setError(e.message || "Submission failed. Your answers were autosaved — try again.");
      setPhase("error");
    }
  }

  function confirmSubmit() {
    const unanswered = questions.filter((q) => !answers[q.id]).length;
    Alert.alert("Submit exam?", unanswered > 0 ? `You have ${unanswered} unanswered question${unanswered > 1 ? "s" : ""}. Submit anyway?` : "You will not be able to change your answers after this.", [{ text: "Keep working", style: "cancel" }, { text: "Submit", style: "destructive", onPress: () => doSubmit(false) }]);
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const lowTime = secondsLeft <= 60;
  const answeredCount = questions.filter((q) => answers[q.id]).length;

  if (phase === "loading") {
    return (<View style={{ flex: 1, backgroundColor: theme.colors.bgPrimary, justifyContent: "center", alignItems: "center" }}><ActivityIndicator size="large" color={theme.colors.accent} /><Text style={{ color: theme.colors.textPrimary, marginTop: theme.spacing.md }}>Starting exam…</Text></View>);
  }
  if (phase === "error") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bgPrimary, justifyContent: "center", alignItems: "center", padding: 30 }}>
        <AlertTriangle size={48} color={theme.colors.danger} />
        <Text style={{ color: theme.colors.textPrimary, fontSize: 18, fontWeight: "bold", marginTop: theme.spacing.md, textAlign: "center" }}>Can't start exam</Text>
        <Text style={{ color: theme.colors.textSecondary, textAlign: "center", marginTop: theme.spacing.xs }}>{error}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: theme.spacing.xxl, backgroundColor: theme.colors.primary, paddingVertical: theme.spacing.sm + 2, paddingHorizontal: theme.spacing.xl, borderRadius: theme.radius.md }}>
          <Text style={{ color: theme.colors.textInverse, fontWeight: "700" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (phase === "done") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bgPrimary, justifyContent: "center", alignItems: "center", padding: 30 }}>
        <CheckCircle2 size={56} color={theme.colors.success} />
        <Text style={{ color: theme.colors.textPrimary, fontSize: 22, fontWeight: "bold", marginTop: theme.spacing.md }}>Submitted!</Text>
        <Text style={{ color: theme.colors.textSecondary, textAlign: "center", marginTop: theme.spacing.xs }}>{result?.message || "Your exam has been submitted successfully."}</Text>
        <TouchableOpacity onPress={() => router.replace("/(student)/exams")} style={{ marginTop: theme.spacing.xxl, backgroundColor: theme.colors.primary, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.xl, borderRadius: theme.radius.md }}>
          <Text style={{ color: theme.colors.textInverse, fontWeight: "700" }}>Back to exams</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const q = questions[current];
  const isMcq = q?.options && q.options.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }}>
      <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: 56, paddingBottom: theme.spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 17, fontWeight: "bold" }} numberOfLines={1}>{exam?.title}</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: theme.spacing.xs + 2 }}>
          <Text style={{ color: theme.colors.textFaint, fontSize: 12 }}>Question {current + 1} of {questions.length} · {answeredCount} answered</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: lowTime ? `${theme.colors.danger}20` : `${theme.colors.accent}20`, paddingHorizontal: theme.spacing.sm + 2, paddingVertical: 5, borderRadius: theme.radius.xs }}>
            <Clock size={13} color={lowTime ? theme.colors.danger : theme.colors.accent} />
            <Text style={{ color: lowTime ? theme.colors.danger : theme.colors.accent, fontWeight: "700", fontSize: 13 }}>{mm}:{ss}</Text>
          </View>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 56, paddingVertical: theme.spacing.xs + 2, paddingHorizontal: theme.spacing.md }}>
        {questions.map((qq, i) => {
          const answered = !!answers[qq.id];
          const isCurrent = i === current;
          return (
            <TouchableOpacity key={qq.id} onPress={() => setCurrent(i)} style={{ width: 34, height: 34, borderRadius: theme.radius.xs + 2, marginRight: theme.spacing.xs, justifyContent: "center", alignItems: "center", backgroundColor: isCurrent ? theme.colors.accent : answered ? `${theme.colors.primary}55` : theme.colors.border, borderWidth: isCurrent ? 0 : 1, borderColor: answered ? theme.colors.accent : theme.colors.borderDefault }}>
              <Text style={{ color: isCurrent || answered ? theme.colors.textInverse : theme.colors.textGhost, fontWeight: "700", fontSize: 12 }}>{i + 1}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView style={{ flex: 1, paddingHorizontal: theme.spacing.lg }} contentContainerStyle={{ paddingBottom: theme.spacing.lg }}>
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md + 2, marginTop: theme.spacing.xs }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: theme.spacing.xs + 2 }}>
            <Text style={{ color: theme.colors.accent, fontSize: 11, fontWeight: "700", letterSpacing: 1 }}>{isMcq ? "MULTIPLE CHOICE" : q?.type}</Text>
            <Text style={{ color: theme.colors.textGhost, fontSize: 11 }}>{q?.marks} mark{q?.marks === 1 ? "" : "s"}</Text>
          </View>
          <Text style={{ color: theme.colors.textPrimary, fontSize: 16, fontWeight: "600", lineHeight: 24 }}>{q?.questionText}</Text>

          {isMcq && q.options!.map((opt) => {
            const selected = answers[q.id] === opt.key;
            return (
              <TouchableOpacity key={opt.key} onPress={() => setAnswer(q.id, opt.key)} style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, marginTop: theme.spacing.xs + 2, padding: theme.spacing.sm + 2, borderRadius: theme.radius.sm + 2, backgroundColor: selected ? `${theme.colors.accent}20` : theme.colors.border, borderWidth: 1.5, borderColor: selected ? theme.colors.accent : theme.colors.borderDefault }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: selected ? theme.colors.accent : theme.colors.borderStrong, backgroundColor: selected ? theme.colors.accent : "transparent", justifyContent: "center", alignItems: "center" }}>
                  {selected && <CheckCircle2 size={14} color={theme.colors.textInverse} />}
                </View>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 15, flex: 1 }}>{opt.text}</Text>
              </TouchableOpacity>
            );
          })}

          {!isMcq && (
            <TextInput value={answers[q.id] || ""} onChangeText={(t) => setAnswer(q.id, t)} placeholder="Type your answer here…" placeholderTextColor={theme.colors.textGhost} multiline textAlignVertical="top" style={{ color: theme.colors.textPrimary, backgroundColor: theme.colors.bgPrimary, borderRadius: theme.radius.sm + 2, padding: theme.spacing.sm + 2, marginTop: theme.spacing.sm + 2, minHeight: 140, fontSize: 15, borderWidth: 1, borderColor: theme.colors.border }} />
          )}
        </View>
      </ScrollView>

      <View style={{ flexDirection: "row", gap: theme.spacing.sm + 2, padding: theme.spacing.md, paddingBottom: theme.spacing.xxl, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
        <TouchableOpacity onPress={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0} style={{ flex: 1, paddingVertical: theme.spacing.md, borderRadius: theme.radius.sm + 2, alignItems: "center", backgroundColor: theme.colors.border, opacity: current === 0 ? 0.4 : 1 }}>
          <Text style={{ color: theme.colors.textPrimary, fontWeight: "600" }}>Previous</Text>
        </TouchableOpacity>
        {current < questions.length - 1 ? (
          <TouchableOpacity onPress={() => { setCurrent((c) => c + 1); doSave(); }} style={{ flex: 1, paddingVertical: theme.spacing.md, borderRadius: theme.radius.sm + 2, alignItems: "center", backgroundColor: theme.colors.primary }}>
            <Text style={{ color: theme.colors.textInverse, fontWeight: "700" }}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={confirmSubmit} disabled={phase === "submitting"} style={{ flex: 1, paddingVertical: theme.spacing.md, borderRadius: theme.radius.sm + 2, alignItems: "center", backgroundColor: theme.colors.success, opacity: phase === "submitting" ? 0.6 : 1 }}>
            <Text style={{ color: theme.colors.textInverse, fontWeight: "700" }}>{phase === "submitting" ? "Submitting…" : "Submit Exam"}</Text>
          </TouchableOpacity>
        )}
      </View>

      {saving && (
        <View style={{ position: "absolute", bottom: 90, alignSelf: "center", backgroundColor: theme.colors.overlay, paddingHorizontal: theme.spacing.sm + 2, paddingVertical: 6, borderRadius: theme.radius.xs }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>Saving…</Text>
        </View>
      )}
    </View>
  );
}
