import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl, Alert, ActivityIndicator } from "react-native";
import { teacherApi } from "@/lib/api";
import { theme } from "@/lib/theme";
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
        init[e.studentProfileId] = { ca1: String(e.ca1 ?? ""), ca2: String(e.ca2 ?? ""), midterm: String(e.midterm ?? ""), assignment: String(e.assignment ?? ""), exam: String(e.exam ?? "") };
      }
      setScores(init);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { if (assignmentId) load(assignmentId); }, [assignmentId]);

  const assignments = data?.assignments || [];
  const gb = data?.gradebook;
  const limits = data?.scoreLimits || { ca1: 20, ca2: 20, midterm: 20, assignment: 20, exam: 60 };
  const editable = gb?.isEditable;
  const entries = gb?.entries || [];

  const emptyScores = (): Scores => ({ ca1: "", ca2: "", midterm: "", assignment: "", exam: "" });
  function num(s: string) { const n = parseInt(s, 10); return isNaN(n) ? 0 : n; }

  function setScore(id: string, field: keyof Scores, value: string, max: number) {
    let v = value.replace(/[^0-9]/g, "");
    if (v !== "" && Number(v) > max) v = String(max);
    setScores((prev) => ({ ...prev, [id]: { ...(prev[id] || emptyScores()), [field]: v } }));
  }

  async function save(action: "SAVE" | "SUBMIT") {
    if (!assignmentId) return;
    setSaving(true);
    try {
      const payload = entries.map((e: any) => {
        const s = scores[e.studentProfileId] || emptyScores();
        return { studentProfileId: e.studentProfileId, ca1: num(s.ca1), ca2: num(s.ca2), midterm: num(s.midterm), assignment: num(s.assignment), exam: num(s.exam) };
      });
      await teacherApi.saveGradebook(assignmentId, action, payload);
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
      style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 56 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(assignmentId); }} tintColor={theme.colors.accent} />}
    >
      <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: "bold", marginBottom: 4 }}>Gradebook</Text>
      <Text style={{ color: theme.colors.textGhost, fontSize: 13, marginBottom: theme.spacing.md }}>Enter continuous assessment &amp; exam scores</Text>

      {assignments.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: theme.spacing.sm + 2 }}>
          {assignments.map((a: any) => (
            <TouchableOpacity key={a.id} onPress={() => setAssignmentId(a.id)} style={{ backgroundColor: assignmentId === a.id ? theme.colors.primary : theme.colors.surface, borderRadius: theme.radius.sm + 2, paddingHorizontal: theme.spacing.sm + 2, paddingVertical: theme.spacing.xs + 2, marginRight: theme.spacing.xs }}>
              <Text style={{ color: assignmentId === a.id ? theme.colors.textInverse : theme.colors.textPrimary, fontSize: 12, fontWeight: "600" }}>{a.subjectName}</Text>
              <Text style={{ color: assignmentId === a.id ? theme.colors.textInverse : theme.colors.textGhost, fontSize: 10 }}>{a.className}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {gb?.statusLabel && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, marginBottom: theme.spacing.sm + 2 }}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{gb.sessionLabel} {gb.termLabel} ·</Text>
          <Text style={{ color: editable ? theme.colors.success : theme.colors.warning, fontSize: 12, fontWeight: "700" }}>{gb.statusLabel}</Text>
        </View>
      )}

      {!editable && gb && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, backgroundColor: `${theme.colors.warning}15`, borderRadius: theme.radius.xs + 2, padding: theme.spacing.sm + 2, marginBottom: theme.spacing.sm + 2 }}>
          <Lock size={16} color={theme.colors.warning} />
          <Text style={{ color: theme.colors.warning, fontSize: 13, flex: 1 }}>Locked — scores can't be edited until reopened by admin.</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 40 }} />
      ) : entries.length > 0 ? (
        <View>
          <View style={{ flexDirection: "row", paddingHorizontal: 4, marginBottom: theme.spacing.xs }}>
            <Text style={{ flex: 1, color: theme.colors.textGhost, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 }}>STUDENT</Text>
            {cols.map((c) => <Text key={c.key} style={{ width: 50, color: theme.colors.textGhost, fontSize: 10, fontWeight: "700", textAlign: "center" }}>{c.label}</Text>)}
            <Text style={{ width: 50, color: theme.colors.textGhost, fontSize: 10, fontWeight: "700", textAlign: "center" }}>TOT</Text>
          </View>

          {entries.map((e: any) => {
            const s = scores[e.studentProfileId] || emptyScores();
            const liveTotal = num(s.ca1) + num(s.ca2) + num(s.midterm) + num(s.assignment) + num(s.exam);
            return (
              <View key={e.studentProfileId} style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm + 2, padding: theme.spacing.xs + 2, marginBottom: theme.spacing.xs, flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1, paddingRight: theme.spacing.xs - 4 }}>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>{e.displayName}</Text>
                  <Text style={{ color: theme.colors.accent, fontSize: 11, fontWeight: "600" }}>{e.grade || "—"}</Text>
                </View>
                {cols.map((c) => (
                  <TextInput key={c.key} value={s[c.key]} onChangeText={(v) => setScore(e.studentProfileId, c.key, v, c.max)} editable={editable} keyboardType="numeric" placeholder="0" placeholderTextColor={theme.colors.textGhost} style={{ width: 50, height: 38, backgroundColor: theme.colors.bgPrimary, color: theme.colors.textPrimary, borderRadius: theme.radius.xs, textAlign: "center", fontSize: 13, borderWidth: 1, borderColor: theme.colors.border }} />
                ))}
                <Text style={{ width: 50, color: liveTotal > 0 ? theme.colors.textPrimary : theme.colors.textGhost, fontSize: 14, fontWeight: "bold", textAlign: "center" }}>{liveTotal > 0 ? liveTotal : "—"}</Text>
              </View>
            );
          })}

          {editable && (
            <View style={{ flexDirection: "row", gap: theme.spacing.sm + 2, marginTop: theme.spacing.xs }}>
              <TouchableOpacity onPress={() => save("SAVE")} disabled={saving} style={{ flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: theme.spacing.xs, paddingVertical: theme.spacing.md, borderRadius: theme.radius.sm + 2, backgroundColor: theme.colors.border, opacity: saving ? 0.5 : 1 }}>
                <Save size={16} color={theme.colors.textPrimary} />
                <Text style={{ color: theme.colors.textPrimary, fontWeight: "600" }}>{saving ? "Saving…" : "Save"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => save("SUBMIT")} disabled={saving} style={{ flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: theme.spacing.xs, paddingVertical: theme.spacing.md, borderRadius: theme.radius.sm + 2, backgroundColor: theme.colors.primary, opacity: saving ? 0.5 : 1 }}>
                <Send size={16} color={theme.colors.textInverse} />
                <Text style={{ color: theme.colors.textInverse, fontWeight: "700" }}>Submit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 40 }}>
          <BookOpen size={48} color={theme.colors.borderStrong} />
          <Text style={{ color: theme.colors.textGhost, marginTop: theme.spacing.sm }}>No subject assignments yet</Text>
        </View>
      )}
    </ScrollView>
  );
}
