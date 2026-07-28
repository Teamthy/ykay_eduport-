import { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { studentApi } from "@/lib/api";
import { FileText, Award } from "lucide-react-native";

export default function ReportCards() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState("");

  async function load() {
    try {
      const res = await studentApi.reportCards();
      setData(res);
      setSelectedId(res?.reports?.[0]?.id || "");
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const selected = data?.reports?.find((r: any) => r.id === selectedId) || data?.reports?.[0];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#00072D" }}
      contentContainerStyle={{ padding: 20, paddingTop: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#2840E8" />}
    >
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>Report Cards</Text>

      {/* Term selector */}
      {data?.reports?.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          {data.reports.map((r: any) => (
            <TouchableOpacity
              key={r.id}
              onPress={() => setSelectedId(r.id)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                marginRight: 8,
                backgroundColor: selectedId === r.id ? "#123499" : "#051650",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
                {r.termLabel} {r.sessionLabel}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {selected ? (
        <View>
          {/* Summary card */}
          <View style={{ backgroundColor: "#051650", borderRadius: 20, padding: 20, marginBottom: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
              <View>
                <Text style={{ color: "#ffffff60", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Total</Text>
                <Text style={{ color: "#fff", fontSize: 28, fontWeight: "bold" }}>{selected.overallTotal}</Text>
              </View>
              <View>
                <Text style={{ color: "#ffffff60", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Average</Text>
                <Text style={{ color: "#fff", fontSize: 28, fontWeight: "bold" }}>{selected.overallAverage}</Text>
              </View>
              <View>
                <Text style={{ color: "#ffffff60", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Grade</Text>
                <Text style={{ color: "#2840E8", fontSize: 28, fontWeight: "bold" }}>{selected.overallGrade}</Text>
              </View>
            </View>
            {selected.classPosition && (
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <Award size={16} color="#2840E8" />
                <Text style={{ color: "#ffffff80", fontSize: 13 }}>Class Position: {selected.classPosition}</Text>
              </View>
            )}
          </View>

          {/* Subject scores */}
          <Text style={{ color: "#ffffff60", fontSize: 12, fontWeight: "700", marginBottom: 12, letterSpacing: 1 }}>
            SUBJECTS
          </Text>
          {selected.subjects?.map((subj: any, i: number) => (
            <View key={i} style={{ backgroundColor: "#051650", borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>{subj.subject}</Text>
                <Text style={{ color: "#ffffff40", fontSize: 11, marginTop: 2 }}>
                  CA: {subj.ca1 + subj.ca2} · Exam: {subj.exam}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>{subj.total}</Text>
                <Text style={{ color: "#2840E8", fontSize: 12, fontWeight: "600" }}>{subj.grade}</Text>
              </View>
            </View>
          ))}

          {/* Remarks */}
          {selected.classTeacherRemark ? (
            <View style={{ backgroundColor: "#051650", borderRadius: 12, padding: 14, marginTop: 12 }}>
              <Text style={{ color: "#ffffff60", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                Teacher's Remark
              </Text>
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

// Need TouchableOpacity import
import { TouchableOpacity } from "react-native";
