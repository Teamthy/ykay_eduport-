import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from "react-native";
import { teacherApi } from "@/lib/api";
import { Check, X, Clock, MinusCircle, ChevronLeft, ChevronRight, Lock } from "lucide-react-native";

type Status = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });

const STATUS_META: Record<Status, { color: string; icon: any; label: string }> = {
  PRESENT: { color: "#22c55e", icon: Check, label: "P" },
  ABSENT: { color: "#ff4444", icon: X, label: "A" },
  LATE: { color: "#f59e0b", icon: Clock, label: "L" },
  EXCUSED: { color: "#6b7dd8", icon: MinusCircle, label: "E" },
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
      for (const r of res.roster || res.rows || []) {
        init[r.studentProfileId] = (r.status as Status) || "PRESENT";
      }
      setStatuses(init);
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
    if (classId) load(classId, date);
  }, [classId, date]);

  function shiftDay(delta: number) {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  }

  function setStatus(id: string, s: Status) {
    setStatuses((prev) => ({ ...prev, [id]: s }));
  }

  function markAll(s: Status) {
    const next: Record<string, Status> = {};
    for (const r of rows) next[r.studentProfileId] = s;
    setStatuses(next);
  }

  const counts = rows.reduce(
    (acc, r) => {
      const s = statuses[r.studentProfileId] || "PRESENT";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  async function save(finalize: boolean) {
    setSaving(true);
    try {
      const entries = rows.map((r) => ({ studentProfileId: r.studentProfileId, status: statuses[r.studentProfileId] || "PRESENT" }));
      await teacherApi.saveAttendance({ classId, sessionDate: date, periodKey: "DAILY_REGISTER", finalize, entries });
      Alert.alert("Saved", finalize ? "Attendance submitted." : "Attendance saved as draft.");
      if (finalize) {
        setLocked(true);
      }
    } catch (e: any) {
      Alert.alert("Save failed", e.message || "Could not save attendance.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#00072D" }}
      contentContainerStyle={{ padding: 20, paddingTop: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(classId, date); }} tintColor="#2840E8" />}
    >
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>Attendance</Text>

      {/* Class selector */}
      {classes.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {classes.map((c: any) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setClassId(c.id)}
              style={{ backgroundColor: classId === c.id ? "#123499" : "#051650", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8 }}
            >
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>{c.displayName}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Date nav */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#051650", borderRadius: 12, padding: 12, marginBottom: 12 }}>
        <TouchableOpacity onPress={() => shiftDay(-1)}><ChevronLeft size={20} color="#fff" /></TouchableOpacity>
        <Text style={{ color: "#fff", fontWeight: "600" }}>{fmtDate(date)}</Text>
        <TouchableOpacity onPress={() => shiftDay(1)}><ChevronRight size={20} color="#fff" /></TouchableOpacity>
      </View>

      {/* Summary */}
      {rows.length > 0 && (
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as Status[]).map((s) => (
            <View key={s} style={{ flex: 1, backgroundColor: `${STATUS_META[s].color}15`, borderRadius: 10, padding: 10, alignItems: "center" }}>
              <Text style={{ color: STATUS_META[s].color, fontSize: 18, fontWeight: "bold" }}>{counts[s] || 0}</Text>
              <Text style={{ color: STATUS_META[s].color, fontSize: 9, fontWeight: "700" }}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Locked banner */}
      {locked && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f59e0b15", borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <Lock size={16} color="#f59e0b" />
          <Text style={{ color: "#f59e0b", fontSize: 13 }}>Already submitted — contact admin to request a correction.</Text>
        </View>
      )}

      {/* Quick mark */}
      {!locked && rows.length > 0 && (
        <TouchableOpacity onPress={() => markAll("PRESENT")} style={{ backgroundColor: "#ffffff08", borderRadius: 10, padding: 12, alignItems: "center", marginBottom: 12 }}>
          <Text style={{ color: "#22c55e", fontWeight: "600", fontSize: 13 }}>Mark all Present</Text>
        </TouchableOpacity>
      )}

      {/* Roster */}
      {loading ? (
        <ActivityIndicator size="large" color="#2840E8" style={{ marginTop: 40 }} />
      ) : rows.length > 0 ? (
        rows.map((r) => {
          const cur = statuses[r.studentProfileId] || "PRESENT";
          return (
            <View key={r.studentProfileId} style={{ backgroundColor: "#051650", borderRadius: 14, padding: 14, marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#123499", justifyContent: "center", alignItems: "center", marginRight: 10 }}>
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>{r.displayName?.charAt(0)?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>{r.displayName}</Text>
                  <Text style={{ color: "#ffffff40", fontSize: 11 }}>{r.studentId}</Text>
                </View>
              </View>
              {!locked && (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as Status[]).map((s) => {
                    const M = STATUS_META[s];
                    const active = cur === s;
                    const Icon = M.icon;
                    return (
                      <TouchableOpacity
                        key={s}
                        onPress={() => setStatus(r.studentProfileId, s)}
                        style={{
                          flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
                          paddingVertical: 9, borderRadius: 10,
                          backgroundColor: active ? `${M.color}25` : "#ffffff06",
                          borderWidth: 1.5, borderColor: active ? M.color : "#ffffff10",
                        }}
                      >
                        <Icon size={13} color={active ? M.color : "#ffffff50"} />
                        <Text style={{ color: active ? M.color : "#ffffff60", fontSize: 11, fontWeight: "700" }}>{M.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 40 }}>
          <Text style={{ color: "#ffffff40" }}>No students in this class</Text>
        </View>
      )}

      {/* Save buttons */}
      {!locked && rows.length > 0 && (
        <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
          <TouchableOpacity onPress={() => save(false)} disabled={saving} style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: "#ffffff08", opacity: saving ? 0.5 : 1 }}>
            <Text style={{ color: "#fff", fontWeight: "600" }}>{saving ? "Saving…" : "Save Draft"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => save(true)} disabled={saving} style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: "#123499", opacity: saving ? 0.5 : 1 }}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>{saving ? "Submitting…" : "Submit"}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
