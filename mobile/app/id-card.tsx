import { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { studentApi, getMe } from "@/lib/api";
import { GraduationCap, IdCard, Mail, Hash } from "lucide-react-native";

export default function StudentIdCard() {
  const [dash, setDash] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    studentApi.dashboard().then(setDash).catch(() => {});
    getMe().then((r) => setUser(r?.user));
  }, []);

  const s = dash?.student || {};
  const initials = (user?.name || s.displayName || "S").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#00072D" }} contentContainerStyle={{ padding: 20, paddingTop: 60, alignItems: "center" }}>
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 4 }}>Student ID Card</Text>
      <Text style={{ color: "#ffffff40", fontSize: 13, marginBottom: 28 }}>Present this at school events</Text>

      {/* Card */}
      <View style={{ width: "100%", maxWidth: 360, borderRadius: 22, overflow: "hidden", backgroundColor: "#0A2472", borderWidth: 1, borderColor: "#2840E840" }}>
        {/* Header */}
        <View style={{ padding: 18, paddingBottom: 14, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#051650" }}>
          <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "#123499", justifyContent: "center", alignItems: "center" }}>
            <GraduationCap size={22} color="#fff" />
          </View>
          <View>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold", letterSpacing: 0.5 }}>YKAY COLLEGE</Text>
            <Text style={{ color: "#ffffff60", fontSize: 10, letterSpacing: 2 }}>STUDENT IDENTITY CARD</Text>
          </View>
        </View>

        {/* Body */}
        <View style={{ padding: 20, flexDirection: "row", gap: 16 }}>
          <View style={{ width: 74, height: 84, borderRadius: 12, backgroundColor: "#123499", justifyContent: "center", alignItems: "center" }}>
            <Text style={{ color: "#fff", fontSize: 28, fontWeight: "bold" }}>{initials}</Text>
          </View>
          <View style={{ flex: 1, justifyContent: "center", gap: 8 }}>
            <View>
              <Text style={{ color: "#ffffff50", fontSize: 9, letterSpacing: 1 }}>NAME</Text>
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>{user?.name || s.displayName || "Student"}</Text>
            </View>
            {s.className ? (
              <View>
                <Text style={{ color: "#ffffff50", fontSize: 9, letterSpacing: 1 }}>CLASS</Text>
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>{s.className}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Footer rows */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16, gap: 10 }}>
          {user?.email ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Mail size={13} color="#2840E8" />
              <Text style={{ color: "#ffffff80", fontSize: 12 }} numberOfLines={1}>{user.email}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Hash size={13} color="#2840E8" />
            <Text style={{ color: "#ffffff80", fontSize: 12 }}>{s.studentId || user?.id?.slice(0, 12) || "—"}</Text>
          </View>
        </View>

        {/* Barcode strip */}
        <View style={{ height: 28, backgroundColor: "#00072D", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2, paddingHorizontal: 20 }}>
          {Array.from({ length: 32 }).map((_, i) => (
            <View key={i} style={{ width: (i % 3) + 1, height: 16, backgroundColor: "#ffffff" }} />
          ))}
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 24 }}>
        <IdCard size={16} color="#ffffff40" />
        <Text style={{ color: "#ffffff40", fontSize: 12 }}>This is a digital ID — validity is verified at the portal.</Text>
      </View>
    </ScrollView>
  );
}
