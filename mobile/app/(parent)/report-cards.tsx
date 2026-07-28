import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { parentApi } from "@/lib/api";
import { Award, FileText } from "lucide-react-native";

export default function ParentReportCards() {
  const [data, setData] = useState<any>(null);
  const [childId, setChildId] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [termId, setTermId] = useState("");

  async function load(id?: string) {
    try {
      const res = await parentApi.reportCards(id || undefined);
      setData(res);
      if (!id) setChildId(res?.selectedChild?.id || "");
      setTermId(res?.reports?.[0]?.id || "");
    } catch {
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function selectChild(id: string) {
    setChildId(id);
    load(id);
  }

  const children = data?.children || [];
  const reports = data?.reports || [];
  const selected = reports.find((r: any) => r.id === termId) || reports[0];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#00072D" }}
      contentContainerStyle={{ padding: 20, paddingTop: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(childId); }} tintColor="#2840E8" />}
    >
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>Report Cards</Text>

      {children.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {children.map((c: any) => (
            <TouchableOpacity key={c.id} onPress={() => selectChild(c.id)} style={{ backgroundColor: childId === c.id ? "#123499" : "#051650", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8 }}>
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>{c.displayName}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {reports.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {reports.map((r: any) => (
            <TouchableOpacity key={r.id} onPress={() => setTermId(r.id)} style={{ backgroundColor: termId === r.id ? "#123499" : "#051650", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8 }}>
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>{r.termLabel} {r.sessionLabel}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {selected ? (
        <View>
          <View style={{ backgroundColor: "#051650", borderRadius: 18, padding: 18, marginBottom: 18 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Mini label="Total" value={String(selected.overallTotal ?? "—")} />
              <Mini label="Average" value={String(selected.overallAverage ?? "—")} />
              <Mini label="Grade" value={selected.overallGrade || "—"} color="#2840E8" />
            </View>
            {selected.classPosition ? (
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginTop: 14 }}>
                <Award size={16} color="#2840E8" />
                <Text style={{ color: "#ffffff80", fontSize: 13 }}>Position: {selected.classPosition}</Text>
              </View>
            ) : null}
          </View>

          <Text style={{ color: "#ffffff60", fontSize: 12, fontWeight: "700", marginBottom: 10, letterSpacing: 1 }}>SUBJECTS</Text>
          {selected.subjects?.map((s: any, i: number) => (
            <View key={i} style={{ backgroundColor: "#051650", borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>{s.subject}</Text>
                <Text style={{ color: "#ffffff40", fontSize: 11, marginTop: 2 }}>CA: {s.ca1 + s.ca2} · Exam: {s.exam}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>{s.total}</Text>
                <Text style={{ color: "#2840E8", fontSize: 12, fontWeight: "600" }}>{s.grade}</Text>
              </View>
            </View>
          ))}

          {selected.classTeacherRemark ? (
            <View style={{ backgroundColor: "#051650", borderRadius: 12, padding: 14, marginTop: 12 }}>
              <Text style={{ color: "#ffffff60", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Teacher's Remark</Text>
              <Text style={{ color: "#ffffff80", fontSize: 13 }}>{selected.classTeacherRemark}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 60 }}>
          <FileText size={48} color="#ffffff20" />
          <Text style={{ color: "#ffffff40", marginTop: 12 }}>No report cards available</Text>
        </View>
      )}
    </ScrollView>
  );
}

function Mini({ label, value, color = "#fff" }: { label: string; value: string; color?: string }) {
  return (
    <View>
      <Text style={{ color: "#ffffff50", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>{label}</Text>
      <Text style={{ color, fontSize: 26, fontWeight: "bold", marginTop: 2 }}>{value}</Text>
    </View>
  );
}
