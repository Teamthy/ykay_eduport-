import { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { studentApi } from "@/lib/api";
import { theme } from "@/lib/theme";
import { Users, BookOpen } from "lucide-react-native";

export default function StudentTeachers() {
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() { try { setData(await studentApi.teachers()); } catch {} finally { setRefreshing(false); } }
  useEffect(() => { load(); }, []);

  const teachers = data?.teachers || [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }} contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 56 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.accent} />}>
      <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: "bold", marginBottom: 4 }}>My Teachers</Text>
      {data?.className && <Text style={{ color: theme.colors.textGhost, fontSize: 13, marginBottom: theme.spacing.lg }}>{data.className}</Text>}

      {teachers.length > 0 ? (
        <View style={{ gap: theme.spacing.xs + 2 }}>
          {teachers.map((t: any) => (
            <View key={t.id} style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm + 2, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.sm + 2 }}>
              <View style={{ width: 46, height: 46, borderRadius: theme.radius.xs + 4, backgroundColor: theme.colors.primary, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ color: theme.colors.textInverse, fontWeight: "bold", fontSize: 18 }}>{t.name?.charAt(0)?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: "600" }}>{t.name}</Text>
                {t.subject ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 }}>
                    <BookOpen size={12} color={theme.colors.accent} />
                    <Text style={{ color: theme.colors.accent, fontSize: 12, fontWeight: "600" }}>{t.subject}</Text>
                  </View>
                ) : null}
                {t.role && t.role !== t.subject ? <Text style={{ color: theme.colors.textGhost, fontSize: 11, marginTop: 2 }}>{t.role}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 60 }}>
          <Users size={48} color={theme.colors.borderStrong} />
          <Text style={{ color: theme.colors.textGhost, marginTop: theme.spacing.sm }}>No teachers assigned yet</Text>
        </View>
      )}
    </ScrollView>
  );
}
