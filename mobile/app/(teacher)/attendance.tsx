import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from "react-native";
import { teacherApi } from "@/lib/api";
import { theme } from "@/lib/theme";
import { Check, X, Clock, MinusCircle, ChevronLeft, ChevronRight, Lock } from "lucide-react-native";

type Status = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });

const STATUS_META: Record<Status, { color: string; icon: any; label: string }> = {
  PRESENT: { color: theme.colors.success, icon: Check, label: "P" },
  ABSENT: { color: theme.colors.danger, icon: X, label: "A" },
  LATE: { color: theme.colors.warning, icon: Clock, label: "L" },
  EXCUSED: { color: theme.colors.info, icon: MinusCircle, label: "E" },
};

export default function TeacherAttendance() {
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load(cid?: string, d?: string) {
    setLoading(true);
    try {
      const res: any = await teacherApi.attendance(cid || undefined, d);
      setClasses(res.availableClasses || []);
      if (!cid) setClassId(res.selectedClass?.id || res.availableClasses?.[0]?.id || "");
      setRows(res.roster || res.rows || []);
      setLocked(Boolean(res.session?.isLocked));
      const init: Record<string, Status> = {};
      for (const r of res.roster || res.rows || []) init[r.studentProfileId] = (r.status as Status) || "PRESENT";
      setStatuses(init);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { if (classId) load(classId, date); }, [classId, date]);

  function shiftDay(delta: number) {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  }
  function setStatus(id: string, s: Status) { setStatuses((prev) => ({ ...prev, [id]: s })); }
  function markAll(s: Status) {
    const next: Record<string, Status> = {};
    for (const r of rows) next[r.studentProfileId] = s;
    setStatuses(next);
  }

  const counts = rows.reduce((acc, r) => {
    const s = statuses[r.studentProfileId] || "PRESENT";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  async function save(finalize: boolean) {
    setSaving(true);
    try {
      const entries = rows.map((r) => ({ studentProfileId: r.studentProfileId, status: statuses[r.studentProfileId] || "PRESENT" }));
      await teacherApi.saveAttendance({ classId, sessionDate: date, periodKey: "DAILY_REGISTER", finalize, entries });
      Alert.alert("Saved", finalize ? "Attendance submitted." : "Attendance saved as draft.");
      if (finalize) setLocked(true);
    } catch (e: any) {
      Alert.alert("Save failed", e.message || "Could not save attendance.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 56 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(classId, date); }} tintColor={theme.colors.accent} />}
    >
      <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: "bold", marginBottom: theme.spacing.md }}>Attendance</Text>

      {classes.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: theme.spacing.sm + 2 }}>
          {classes.map((c: any) => (
            <TouchableOpacity key={c.id} onPress={() => setClassId(c.id)} style={{ backgroundColor: classId === c.id ? theme.colors.primary : theme.colors.surface, borderRadius: 20, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs + 2, marginRight: theme.spacing.xs }}>
              <Text style={{ color: classId === c.id ? theme.colors.textInverse : theme.colors.textPrimary, fontSize: 13, fontWeight: "600" }}>{c.displayName}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm + 2, padding: theme.spacing.sm + 2, marginBottom: theme.spacing.sm + 2 }}>
        <TouchableOpacity onPress={() => shiftDay(-1)}><ChevronLeft size={20} color={theme.colors.textPrimary} /></TouchableOpacity>
        <Text style={{ color: theme.colors.textPrimary, fontWeight: "600" }}>{fmtDate(date)}</Text>
        <TouchableOpacity onPress={() => shiftDay(1)}><ChevronRight size={20} color={theme.colors.textPrimary} /></TouchableOpacity>
      </View>

      {rows.length > 0 && (
        <View style={{ flexDirection: "row", gap: theme.spacing.xs, marginBottom: theme.spacing.sm + 2 }}>
          {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as Status[]).map((s) => (
            <View key={s} style={{ flex: 1, backgroundColor: `${STATUS_META[s].color}15`, borderRadius: theme.radius.xs + 2, padding: theme.spacing.xs + 2, alignItems: "center" }}>
              <Text style={{ color: STATUS_META[s].color, fontSize: 18, fontWeight: "bold" }}>{counts[s] || 0}</Text>
              <Text style={{ color: STATUS_META[s].color, fontSize: 9, fontWeight: "700" }}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      {locked && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, backgroundColor: `${theme.colors.warning}15`, borderRadius: theme.radius.xs + 2, padding: theme.spacing.sm + 2, marginBottom: theme.spacing.sm + 2 }}>
          <Lock size={16} color={theme.colors.warning} />
          <Text style={{ color: theme.colors.warning, fontSize: 13, flex: 1 }}>Already submitted — contact admin to request a correction.</Text>
        </View>
      )}

      {!locked && rows.length > 0 && (
        <TouchableOpacity onPress={() => markAll("PRESENT")} style={{ backgroundColor: theme.colors.border, borderRadius: theme.radius.xs + 2, padding: theme.spacing.sm + 2, alignItems: "center", marginBottom: theme.spacing.sm + 2 }}>
          <Text style={{ color: theme.colors.success, fontWeight: "600", fontSize: 13 }}>Mark all Present</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 40 }} />
      ) : rows.length > 0 ? (
        rows.map((r) => {
          const cur = statuses[r.studentProfileId] || "PRESENT";
          return (
            <View key={r.studentProfileId} style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.sm + 2, marginBottom: theme.spacing.xs }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing.xs + 2 }}>
                <View style={{ width: 36, height: 36, borderRadius: theme.radius.xs + 2, backgroundColor: theme.colors.primary, justifyContent: "center", alignItems: "center", marginRight: theme.spacing.sm + 2 }}>
                  <Text style={{ color: theme.colors.textInverse, fontWeight: "bold" }}>{r.displayName?.charAt(0)?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "600" }}>{r.displayName}</Text>
                  <Text style={{ color: theme.colors.textGhost, fontSize: 11 }}>{r.studentId}</Text>
                </View>
              </View>
              {!locked && (
                <View style={{ flexDirection: "row", gap: theme.spacing.xs }}>
                  {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as Status[]).map((s) => {
                    const M = STATUS_META[s];
                    const active = cur === s;
                    const Icon = M.icon;
                    return (
                      <TouchableOpacity key={s} onPress={() => setStatus(r.studentProfileId, s)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 9, borderRadius: theme.radius.xs + 2, backgroundColor: active ? `${M.color}25` : theme.colors.border, borderWidth: 1.5, borderColor: active ? M.color : theme.colors.borderDefault }}>
                        <Icon size={13} color={active ? M.color : theme.colors.textGhost} />
                        <Text style={{ color: active ? M.color : theme.colors.textMuted, fontSize: 11, fontWeight: "700" }}>{M.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 40 }}><Text style={{ color: theme.colors.textGhost }}>No students in this class</Text></View>
      )}

      {!locked && rows.length > 0 && (
        <View style={{ flexDirection: "row", gap: theme.spacing.sm + 2, marginTop: theme.spacing.xs }}>
          <TouchableOpacity onPress={() => save(false)} disabled={saving} style={{ flex: 1, paddingVertical: theme.spacing.md, borderRadius: theme.radius.sm + 2, alignItems: "center", backgroundColor: theme.colors.border, opacity: saving ? 0.5 : 1 }}>
            <Text style={{ color: theme.colors.textPrimary, fontWeight: "600" }}>{saving ? "Saving…" : "Save Draft"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => save(true)} disabled={saving} style={{ flex: 1, paddingVertical: theme.spacing.md, borderRadius: theme.radius.sm + 2, alignItems: "center", backgroundColor: theme.colors.primary, opacity: saving ? 0.5 : 1 }}>
            <Text style={{ color: theme.colors.textInverse, fontWeight: "700" }}>{saving ? "Submitting…" : "Submit"}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
