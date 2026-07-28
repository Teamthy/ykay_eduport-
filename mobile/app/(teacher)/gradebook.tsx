import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl, Alert, ActivityIndicator } from "react-native";
import { teacherApi } from "@/lib/api";
import { BookOpen, Lock, Save, Send } from "lucide-react-native";

type Scores = { ca1: string; ca2: string; midterm: string; assignment: string; exam: string };

export default function TeacherGradebook() {
  const [data, setData] = useState<any>(null);
  const [assignmentId, setAssignmentId] = useState("");
  const [scores, setScores] = useState<Record<string, Scores>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load(id?: string) {
    setLoading(true);
    try {
      const res: any = await teacherApi.gradebook(id);
      setData(res);
      if (!id) setAssignmentId(res.selectedAssignmentId || res.assignments?.[0]?.id || "");
      const init: Record<string, Scores> = {};
      for (const e of res.gradebook?.entries || []) {
        init[e.studentProfileId] = {
          ca1: String(e.ca1 ?? ""), ca2: String(e.ca2 ?? ""), midterm: String(e.midterm ?? ""),
          assignment: String(e.assignment ?? ""), exam: String(e.exam ?? ""),
        };
      }
      setScores(init);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (assignmentId) load(assignmentId);
  }, [assignmentId]);

  const assignments = data?.assignments || [];
  const gb = data?.gradebook;
  const limits = data?.scoreLimits || { ca1: 20, ca2: 20, midterm: 20, assignment: 20, exam: 60 };
  const editable = gb?.isEditable;
  const entries = gb?.entries || [];

  function setScore(id: string, field: keyof Scores, value: string, max: number) {
    let v = value.replace(/[^0-9]/g, "");
    if (v !== "" && Number(v) > max) v = String(max);
    setScores((prev) => ({ ...prev, [id]: { ...(prev[id] || emptyScores()), [field]: v } }));
  }

  function emptyScores(): Scores {
    return { ca1: "", ca2: "", midterm: "", assignment: "", exam: "" };
  }

  function buildPayload() {
    return entries.map((e: any) => {
      const s = scores[e.studentProfileId] || emptyScores();
      return {
        studentProfileId: e.studentProfileId,
        ca1: num(s.ca1), ca2: num(s.ca2), midterm: num(s.midterm),
        assignment: num(s.assignment), exam: num(s.exam),
      };
    });
  }

  async function save(action: "SAVE" | "SUBMIT") {
    if (!assignmentId) return;
    setSaving(true);
    try {
      await teacherApi.saveGradebook(assignmentId, action, buildPayload());
      Alert.alert(action === "SUBMIT" ? "Submitted" : "Saved", action === "SUBMIT" ? "Gradebook submitted for processing." : "Scores saved.");
      if (action === "SUBMIT") load(assignmentId);
    } catch (e: any) {
      Alert.alert("Failed", e.message || "Could not save scores.");
    } finally {
      setSaving(false);
    }
  }

  const cols: { key: keyof Scores; label: string; max: number }[] = [
    { key: "ca1", label: "CA1", max: limits.ca1 },
    { key: "ca2", label: "CA2", max: limits.ca2 },
    { key: "midterm", label: "Mid", max: limits.midterm },
    { key: "assignment", label: "Asg", max: limits.assignment },
    { key: "exam", label: "Exam", max: limits.exam },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#00072D" }}
      contentContainerStyle={{ padding: 20, paddingTop: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(assignmentId); }} tintColor="#2840E8" />}
    >
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 4 }}>Gradebook</Text>
      <Text style={{ color: "#ffffff40", fontSize: 13, marginBottom: 16 }}>Enter continuous assessment &amp; exam scores</Text>

      {/* Assignment selector */}
      {assignments.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {assignments.map((a: any) => (
            <TouchableOpacity
              key={a.id}
              onPress={() => setAssignmentId(a.id)}
              style={{ backgroundColor: assignmentId === a.id ? "#123499" : "#051650", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, marginRight: 8 }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>{a.subjectName}</Text>
              <Text style={{ color: assignmentId === a.id ? "#ffffff80" : "#ffffff40", fontSize: 10 }}>{a.className}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Status */}
      {gb?.statusLabel && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Text style={{ color: "#ffffff60", fontSize: 12 }}>{gb.sessionLabel} {gb.termLabel} ·</Text>
          <Text style={{ color: editable ? "#22c55e" : "#f59e0b", fontSize: 12, fontWeight: "700" }}>{gb.statusLabel}</Text>
        </View>
      )}

      {!editable && gb && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f59e0b15", borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <Lock size={16} color="#f59e0b" />
          <Text style={{ color: "#f59e0b", fontSize: 13, flex: 1 }}>Locked — scores can't be edited until reopened by admin.</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#2840E8" style={{ marginTop: 40 }} />
      ) : entries.length > 0 ? (
        <View>
          {/* Column header */}
          <View style={{ flexDirection: "row", paddingHorizontal: 4, marginBottom: 8 }}>
            <Text style={{ flex: 1, color: "#ffffff40", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 }}>STUDENT</Text>
            {cols.map((c) => (
              <Text key={c.key} style={{ width: 50, color: "#ffffff40", fontSize: 10, fontWeight: "700", textAlign: "center" }}>{c.label}</Text>
            ))}
            <Text style={{ width: 50, color: "#ffffff40", fontSize: 10, fontWeight: "700", textAlign: "center" }}>TOT</Text>
          </View>

          {entries.map((e: any) => {
            const s = scores[e.studentProfileId] || emptyScores();
            const liveTotal = num(s.ca1) + num(s.ca2) + num(s.midterm) + num(s.assignment) + num(s.exam);
            return (
              <View key={e.studentProfileId} style={{ backgroundColor: "#051650", borderRadius: 12, padding: 10, marginBottom: 8, flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1, paddingRight: 6 }}>
                  <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }} numberOfLines={1}>{e.displayName}</Text>
                  <Text style={{ color: "#2840E8", fontSize: 11, fontWeight: "600" }}>{e.grade || "—"}</Text>
                </View>
                {cols.map((c) => (
                  <TextInput
                    key={c.key}
                    value={s[c.key]}
                    onChangeText={(v) => setScore(e.studentProfileId, c.key, v, c.max)}
                    editable={editable}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#ffffff30"
                    style={{
                      width: 50, height: 38, marginRight: 0, marginLeft: 0,
                      backgroundColor: editable ? "#00072D" : "#00072D80",
                      color: "#fff", borderRadius: 8, padding: 0, textAlign: "center",
                      fontSize: 13, borderWidth: 1, borderColor: "#ffffff10",
                    }}
                  />
                ))}
                <Text style={{ width: 50, color: liveTotal > 0 ? "#fff" : "#ffffff30", fontSize: 14, fontWeight: "bold", textAlign: "center" }}>
                  {liveTotal > 0 ? liveTotal : "—"}
                </Text>
              </View>
            );
          })}

          {editable && (
            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <TouchableOpacity onPress={() => save("SAVE")} disabled={saving} style={{ flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: "#ffffff08", opacity: saving ? 0.5 : 1 }}>
                <Save size={16} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "600" }}>{saving ? "Saving…" : "Save"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => save("SUBMIT")} disabled={saving} style={{ flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: "#123499", opacity: saving ? 0.5 : 1 }}>
                <Send size={16} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "700" }}>Submit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 40 }}>
          <BookOpen size={48} color="#ffffff20" />
          <Text style={{ color: "#ffffff40", marginTop: 12 }}>No subject assignments yet</Text>
        </View>
      )}
    </ScrollView>
  );
}

function num(s: string) {
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}
