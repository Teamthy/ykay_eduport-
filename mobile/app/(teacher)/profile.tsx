import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { teacherApi, logout } from "@/lib/api";
import { Mail, BookOpen, Layers, LogOut, Award } from "lucide-react-native";

export default function TeacherProfile() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    teacherApi.profile().then((res) => setData(res?.teacher));
  }, []);

  const t = data || {};
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#00072D" }} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 32 }}>Profile</Text>

      <View style={{ alignItems: "center", marginBottom: 28 }}>
        <View style={{ width: 84, height: 84, borderRadius: 22, backgroundColor: "#123499", justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#fff", fontSize: 32, fontWeight: "bold" }}>{t.displayName?.charAt(0)?.toUpperCase() || "T"}</Text>
        </View>
        <Text style={{ color: "#fff", fontSize: 20, fontWeight: "bold", marginTop: 12 }}>{t.displayName}</Text>
        <Text style={{ color: "#ffffff60", fontSize: 13 }}>{t.roleLabel || "Teacher"}</Text>
        {t.isFormTeacher && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, backgroundColor: "#2840E820", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Award size={12} color="#2840E8" />
            <Text style={{ color: "#2840E8", fontSize: 11, fontWeight: "700" }}>Form Teacher · {t.formClassName}</Text>
          </View>
        )}
      </View>

      <View style={{ gap: 12, marginBottom: 24 }}>
        <InfoRow icon={<Mail size={18} color="#2840E8" />} label="Email" value={t.email || ""} />
        <InfoRow icon={<BookOpen size={18} color="#2840E8" />} label="Subjects" value={(t.subjects || []).join(", ") || "—"} />
      </View>

      <Text style={{ color: "#ffffff60", fontSize: 12, fontWeight: "700", marginBottom: 10, letterSpacing: 1 }}>CLASS ASSIGNMENTS</Text>
      <View style={{ gap: 8, marginBottom: 28 }}>
        {(t.classes || []).map((c: any, i: number) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#051650", borderRadius: 12, padding: 14 }}>
            <Layers size={16} color="#2840E8" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>{c.name}</Text>
              <Text style={{ color: "#ffffff50", fontSize: 12 }}>{c.role}{c.subject ? ` · ${c.subject}` : ""}</Text>
            </View>
          </View>
        ))}
        {(t.classes || []).length === 0 && <Text style={{ color: "#ffffff40", fontSize: 13 }}>No class assignments.</Text>}
      </View>

      <TouchableOpacity
        onPress={async () => { await logout(); router.replace("/login"); }}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, backgroundColor: "#ff444415", borderRadius: 14 }}
      >
        <LogOut size={18} color="#ff4444" />
        <Text style={{ color: "#ff4444", fontWeight: "700", fontSize: 15 }}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#051650", borderRadius: 12, padding: 14 }}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#ffffff60", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{label}</Text>
        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "500" }}>{value}</Text>
      </View>
    </View>
  );
}
