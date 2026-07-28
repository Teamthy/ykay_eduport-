import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  BackHandler,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { studentApi } from "@/lib/api";
import { Clock, CheckCircle2, AlertTriangle } from "lucide-react-native";

type Question = {
  id: string;
  type: string;
  questionText: string;
  marks: number;
  options: { key: string; text: string }[] | null;
  savedResponse: string | null;
};

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

  // Keep a ref so the autosave/submit intervals always read the latest answers.
  const answersRef = useRef<Record<string, string>>({});
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  const examIdRef = useRef(examId);
  const attemptIdRef = useRef("");

  // ── Start the attempt ───────────────────────────────────────
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
    return () => {
      cancelled = true;
    };
  }, [examId]);

  // ── Countdown timer + auto-submit on expiry ─────────────────
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          doSubmit(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  // ── Periodic autosave (every 20s) ───────────────────────────
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => doSave(), 20_000);
    return () => clearInterval(t);
  }, [phase]);

  // ── Block accidental back navigation while running ──────────
  useEffect(() => {
    if (phase !== "running") return;
    const handler = () => {
      Alert.alert(
        "Leave exam?",
        "Your progress is saved. You can resume later if the exam is still open.",
        [
          { text: "Stay", style: "cancel" },
          { text: "Leave", style: "destructive", onPress: () => router.back() },
        ],
      );
      return true;
    };
    BackHandler.addEventListener("hardwareBackPress", handler);
    return () => BackHandler.removeEventListener("hardwareBackPress", handler);
  }, [phase]);

  function setAnswer(qId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  }

  async function doSave() {
    if (!attemptIdRef.current) return;
    setSaving(true);
    try {
      const payload = Object.entries(answersRef.current).map(([questionId, response]) => ({
        questionId,
        response,
      }));
      await studentApi.saveExam(examIdRef.current, attemptIdRef.current, payload);
    } catch {
      /* autosave failures are non-fatal */
    } finally {
      setSaving(false);
    }
  }

  async function doSubmit(auto = false) {
    if (phase === "submitting" || phase === "done") return;
    setPhase("submitting");
    try {
      const payload = Object.entries(answersRef.current).map(([questionId, response]) => ({
        questionId,
        response,
      }));
      const res: any = await studentApi.submitExam(examIdRef.current, attemptIdRef.current, payload);
      if (res?.queued) {
        setResult({
          message:
            "You're offline — your answers are saved and will be submitted automatically when you reconnect.",
        });
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
    Alert.alert(
      "Submit exam?",
      unanswered > 0
        ? `You have ${unanswered} unanswered question${unanswered > 1 ? "s" : ""}. Submit anyway?`
        : "You will not be able to change your answers after this.",
      [
        { text: "Keep working", style: "cancel" },
        { text: "Submit", style: "destructive", onPress: () => doSubmit(false) },
      ],
    );
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const lowTime = secondsLeft <= 60;
  const answeredCount = questions.filter((q) => answers[q.id]).length;

  // ── Loading ─────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <View style={{ flex: 1, backgroundColor: "#00072D", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2840E8" />
        <Text style={{ color: "#fff", marginTop: 16 }}>Starting exam…</Text>
      </View>
    );
  }

  // ── Error ───────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <View style={{ flex: 1, backgroundColor: "#00072D", justifyContent: "center", alignItems: "center", padding: 30 }}>
        <AlertTriangle size={48} color="#ff4444" />
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold", marginTop: 16, textAlign: "center" }}>
          Can't start exam
        </Text>
        <Text style={{ color: "#ffffff80", textAlign: "center", marginTop: 8 }}>{error}</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 24, backgroundColor: "#123499", paddingVertical: 12, paddingHorizontal: 28, borderRadius: 12 }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Submitted ───────────────────────────────────────────────
  if (phase === "done") {
    return (
      <View style={{ flex: 1, backgroundColor: "#00072D", justifyContent: "center", alignItems: "center", padding: 30 }}>
        <CheckCircle2 size={56} color="#22c55e" />
        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "bold", marginTop: 16 }}>Submitted!</Text>
        <Text style={{ color: "#ffffff80", textAlign: "center", marginTop: 8 }}>
          {result?.message || "Your exam has been submitted successfully."}
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/(student)/exams")}
          style={{ marginTop: 24, backgroundColor: "#123499", paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Back to exams</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Running ─────────────────────────────────────────────────
  const q = questions[current];
  const isMcq = q?.options && q.options.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#00072D" }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#ffffff10" }}>
        <Text style={{ color: "#fff", fontSize: 17, fontWeight: "bold" }} numberOfLines={1}>{exam?.title}</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <Text style={{ color: "#ffffff60", fontSize: 12 }}>
            Question {current + 1} of {questions.length} · {answeredCount} answered
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: lowTime ? "#ff444420" : "#2840E820", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
            <Clock size={13} color={lowTime ? "#ff4444" : "#2840E8"} />
            <Text style={{ color: lowTime ? "#ff4444" : "#2840E8", fontWeight: "700", fontSize: 13 }}>{mm}:{ss}</Text>
          </View>
        </View>
      </View>

      {/* Question palette */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 56, paddingVertical: 10, paddingHorizontal: 16 }}>
        {questions.map((qq, i) => {
          const answered = !!answers[qq.id];
          const isCurrent = i === current;
          return (
            <TouchableOpacity
              key={qq.id}
              onPress={() => setCurrent(i)}
              style={{
                width: 34, height: 34, borderRadius: 10, marginRight: 8,
                justifyContent: "center", alignItems: "center",
                backgroundColor: isCurrent ? "#2840E8" : answered ? "#12349955" : "#ffffff08",
                borderWidth: isCurrent ? 0 : 1,
                borderColor: answered ? "#2840E8" : "#ffffff15",
              }}
            >
              <Text style={{ color: isCurrent || answered ? "#fff" : "#ffffff50", fontWeight: "700", fontSize: 12 }}>{i + 1}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Question body */}
      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={{ backgroundColor: "#051650", borderRadius: 16, padding: 18, marginTop: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
            <Text style={{ color: "#2840E8", fontSize: 11, fontWeight: "700", letterSpacing: 1 }}>
              {isMcq ? "MULTIPLE CHOICE" : q?.type}
            </Text>
            <Text style={{ color: "#ffffff50", fontSize: 11 }}>{q?.marks} mark{q?.marks === 1 ? "" : "s"}</Text>
          </View>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600", lineHeight: 24 }}>{q?.questionText}</Text>

          {/* MCQ options */}
          {isMcq &&
            q.options!.map((opt) => {
              const selected = answers[q.id] === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setAnswer(q.id, opt.key)}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10,
                    padding: 14, borderRadius: 12,
                    backgroundColor: selected ? "#2840E820" : "#ffffff06",
                    borderWidth: 1.5, borderColor: selected ? "#2840E8" : "#ffffff10",
                  }}
                >
                  <View style={{
                    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
                    borderColor: selected ? "#2840E8" : "#ffffff30",
                    backgroundColor: selected ? "#2840E8" : "transparent",
                    justifyContent: "center", alignItems: "center",
                  }}>
                    {selected && <CheckCircle2 size={14} color="#fff" />}
                  </View>
                  <Text style={{ color: "#fff", fontSize: 15, flex: 1 }}>{opt.text}</Text>
                </TouchableOpacity>
              );
            })}

          {/* Essay answer */}
          {!isMcq && (
            <TextInput
              value={answers[q.id] || ""}
              onChangeText={(t) => setAnswer(q.id, t)}
              placeholder="Type your answer here…"
              placeholderTextColor="#ffffff40"
              multiline
              textAlignVertical="top"
              style={{
                color: "#fff", backgroundColor: "#00072D", borderRadius: 12, padding: 14,
                marginTop: 12, minHeight: 140, fontSize: 15, borderWidth: 1, borderColor: "#ffffff10",
              }}
            />
          )}
        </View>
      </ScrollView>

      {/* Footer nav */}
      <View style={{ flexDirection: "row", gap: 10, padding: 16, paddingBottom: 28, borderTopWidth: 1, borderTopColor: "#ffffff10" }}>
        <TouchableOpacity
          onPress={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: "#ffffff08", opacity: current === 0 ? 0.4 : 1 }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Previous</Text>
        </TouchableOpacity>

        {current < questions.length - 1 ? (
          <TouchableOpacity
            onPress={() => { setCurrent((c) => c + 1); doSave(); }}
            style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: "#123499" }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={confirmSubmit}
            disabled={phase === "submitting"}
            style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: "#22c55e", opacity: phase === "submitting" ? 0.6 : 1 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>{phase === "submitting" ? "Submitting…" : "Submit Exam"}</Text>
          </TouchableOpacity>
        )}
      </View>

      {saving && (
        <View style={{ position: "absolute", bottom: 90, alignSelf: "center", backgroundColor: "#00072Dcc", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
          <Text style={{ color: "#ffffff80", fontSize: 11 }}>Saving…</Text>
        </View>
      )}
    </View>
  );
}
