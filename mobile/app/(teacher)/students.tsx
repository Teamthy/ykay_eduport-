import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Linking } from "react-native";
import { teacherApi } from "@/lib/api";
import { theme } from "@/lib/theme";
import { Phone, Users } from "lucide-react-native";

export default function TeacherStudents() {
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setData(await teacherApi.roster());
    } catch {
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const students = data?.students || [];

  return (
    <FlatList
      data={students}
      keyExtractor={(item: any) => item.id}
      style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 56 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.accent} />}
      ListHeaderComponent={() => (
        <View>
          <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: "bold" }}>{data?.className || "My Class"}</Text>
          <Text style={{ color: theme.colors.textFaint, fontSize: 14, marginTop: 4, marginBottom: theme.spacing.lg }}>{students.length} students</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm + 2, padding: theme.spacing.sm + 2, marginBottom: theme.spacing.xs }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 40, height: 40, borderRadius: theme.radius.xs + 2, backgroundColor: theme.colors.primary, justifyContent: "center", alignItems: "center", marginRight: theme.spacing.sm + 2 }}>
              <Text style={{ color: theme.colors.textInverse, fontWeight: "bold", fontSize: 16 }}>{item.displayName?.charAt(0)?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "600" }}>{item.displayName}</Text>
              <Text style={{ color: theme.colors.textFaint, fontSize: 12 }}>{item.studentId}{item.gender ? ` · ${item.gender}` : ""}</Text>
            </View>
          </View>
          {(item.guardianName || item.guardianPhone) && (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: theme.spacing.xs + 2, paddingTop: theme.spacing.xs + 2, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.textGhost, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Guardian</Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{item.guardianName || "—"}</Text>
              </View>
              {item.guardianPhone ? (
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.guardianPhone}`)} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: `${theme.colors.accent}20`, borderRadius: theme.radius.xs + 2, paddingHorizontal: theme.spacing.sm + 2, paddingVertical: theme.spacing.xs + 2 }}>
                  <Phone size={13} color={theme.colors.accent} />
                  <Text style={{ color: theme.colors.accent, fontSize: 12, fontWeight: "600" }}>Call</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>
      )}
      ListEmptyComponent={() => (
        <View style={{ alignItems: "center", paddingVertical: 60 }}>
          <Users size={48} color={theme.colors.borderStrong} />
          <Text style={{ color: theme.colors.textGhost, marginTop: theme.spacing.sm }}>No students found</Text>
        </View>
      )}
    />
  );
}
