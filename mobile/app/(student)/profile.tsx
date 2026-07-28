import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { logout, getMe } from "@/lib/api";
import { useEffect, useState } from "react";
import { User, Mail, GraduationCap, LogOut } from "lucide-react-native";

export default function StudentProfile() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    getMe().then((res) => setUser(res?.user));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#00072D", padding: 20, paddingTop: 60 }}>
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 32 }}>Profile</Text>

      {/* Avatar */}
      <View style={{ alignItems: "center", marginBottom: 32 }}>
        <View style={{
          width: 80, height: 80, borderRadius: 20,
          backgroundColor: "#123499",
          justifyContent: "center", alignItems: "center",
        }}>
          <Text style={{ color: "#fff", fontSize: 32, fontWeight: "bold" }}>
            {user?.name?.charAt(0)?.toUpperCase() || "S"}
          </Text>
        </View>
        <Text style={{ color: "#fff", fontSize: 20, fontWeight: "bold", marginTop: 12 }}>{user?.name}</Text>
        <Text style={{ color: "#ffffff60", fontSize: 13 }}>{user?.role}</Text>
      </View>

      {/* Info rows */}
      <View style={{ gap: 12, marginBottom: 32 }}>
        <InfoRow icon={<Mail size={18} color="#2840E8" />} label="Email" value={user?.email || ""} />
        <InfoRow icon={<GraduationCap size={18} color="#2840E8" />} label="Role" value={user?.role || ""} />
        <InfoRow icon={<User size={18} color="#2840E8" />} label="User ID" value={user?.id?.slice(0, 12) + "..." || ""} />
      </View>

      {/* Logout */}
      <TouchableOpacity
        onPress={async () => { await logout(); router.replace("/login"); }}
        style={{
          flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
          padding: 16, backgroundColor: "#ff444415", borderRadius: 14,
        }}
      >
        <LogOut size={18} color="#ff4444" />
        <Text style={{ color: "#ff4444", fontWeight: "700", fontSize: 15 }}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={{ color: "#ffffff20", fontSize: 11, textAlign: "center", marginTop: 24 }}>
        Ykay College v1.0.0
      </Text>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#051650", borderRadius: 12, padding: 14 }}>
      {icon}
      <View>
        <Text style={{ color: "#ffffff60", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{label}</Text>
        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "500" }}>{value}</Text>
      </View>
    </View>
  );
}
