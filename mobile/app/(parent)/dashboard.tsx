import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { parentApi } from "@/lib/api";
import { useRouter } from "expo-router";
import { CreditCard, Calendar, TrendingUp, Bell, ChevronRight, Users, GraduationCap, FileText, Megaphone, Mail } from "lucide-react-native";

const naira = (n: number) => "₦" + Number(n || 0).toLocaleString();

export default function ParentDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setData(await parentApi.dashboard());
    } catch {
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const child = data?.selectedChild;
  const fin = data?.finance;
  const att = data?.attendance;
  const outstanding = fin?.totalOutstanding > 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#00072D" }}
      contentContainerStyle={{ padding: 20, paddingTop: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#2840E8" />}
    >
      <Text style={{ color: "#ffffff60", fontSize: 14 }}>{greeting},</Text>
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold", marginTop: 2, marginBottom: 24 }}>
        {data?.parent?.displayName || "Parent"}
      </Text>

      {/* No children linked */}
      {data && data.children?.length === 0 && (
        <View style={{ backgroundColor: "#051650", borderRadius: 16, padding: 24, alignItems: "center" }}>
          <GraduationCap size={40} color="#ffffff30" />
          <Text style={{ color: "#fff", fontWeight: "600", marginTop: 12, textAlign: "center" }}>No children linked yet</Text>
          <Text style={{ color: "#ffffff60", fontSize: 13, marginTop: 6, textAlign: "center" }}>
            The school will link your ward's profile to this account.
          </Text>
        </View>
      )}

      {/* Children chips */}
      {data?.children?.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          {data.children.map((c: any) => (
            <View key={c.id} style={{ backgroundColor: c.isPrimary ? "#123499" : "#051650", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginRight: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Users size={14} color={c.isPrimary ? "#fff" : "#ffffff60"} />
              <View>
                <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>{c.displayName}</Text>
                <Text style={{ color: c.isPrimary ? "#ffffff80" : "#ffffff40", fontSize: 11 }}>{c.className}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Finance card */}
      {child && (
        <TouchableOpacity
          onPress={() => router.push("/(parent)/fees")}
          style={{ backgroundColor: outstanding ? "#3a1228" : "#0d2818", borderRadius: 18, padding: 18, marginBottom: 16 }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <CreditCard size={18} color={outstanding ? "#ff6b8a" : "#22c55e"} />
              <Text style={{ color: "#ffffff80", fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>FEES OUTSTANDING</Text>
            </View>
            <ChevronRight size={16} color="#ffffff40" />
          </View>
          <Text style={{ color: outstanding ? "#ff6b8a" : "#22c55e", fontSize: 30, fontWeight: "bold", marginTop: 8 }}>
            {naira(fin?.totalOutstanding)}
          </Text>
          <Text style={{ color: "#ffffff50", fontSize: 12, marginTop: 4 }}>
            Paid {naira(fin?.totalPaid)} of {naira(fin?.totalBilled)}
          </Text>
          {outstanding && (
            <View style={{ marginTop: 12, backgroundColor: "#ffffff10", borderRadius: 10, paddingVertical: 10, alignItems: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Tap to pay →</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Stats row */}
      {child && (
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          <StatCard
            icon={<TrendingUp size={18} color="#2840E8" />}
            label={`${child.displayName?.split(" ")[0]}'s Attendance`}
            value={att ? `${att.attendanceRate}%` : "—"}
          />
          <StatCard
            icon={<Calendar size={18} color="#2840E8" />}
            label="Class"
            value={child.className || "—"}
            small
          />
        </View>
      )}

      {/* Quick links */}
      {child && (
        <View style={{ gap: 8, marginBottom: 16 }}>
          <ActionRow icon={<FileText size={20} color="#2840E8" />} label="View Report Cards" onPress={() => router.push("/(parent)/report-cards")} />
          <ActionRow icon={<Calendar size={20} color="#2840E8" />} label="Attendance" onPress={() => router.push("/(parent)/attendance")} />
          <ActionRow icon={<Megaphone size={20} color="#2840E8" />} label="Events" onPress={() => router.push("/parent-events")} />
          <ActionRow icon={<Mail size={20} color="#2840E8" />} label="Messages" onPress={() => router.push("/parent-messages")} />
        </View>
      )}

      {/* Recent alerts */}
      {data?.recentAlerts?.length > 0 && (
        <View>
          <Text style={{ color: "#ffffff60", fontSize: 12, fontWeight: "700", marginBottom: 10, letterSpacing: 1 }}>RECENT ALERTS</Text>
          {data.recentAlerts.slice(0, 4).map((a: any) => (
            <View key={a.id} style={{ flexDirection: "row", gap: 10, backgroundColor: "#051650", borderRadius: 12, padding: 12, marginBottom: 8 }}>
              <Bell size={16} color="#f59e0b" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontSize: 13 }} numberOfLines={2}>{a.messagePreview}</Text>
                <Text style={{ color: "#ffffff40", fontSize: 11, marginTop: 2 }}>{new Date(a.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({ icon, label, value, small }: { icon: React.ReactNode; label: string; value: string; small?: boolean }) {
  return (
    <View style={{ backgroundColor: "#051650", borderRadius: 16, padding: 16, flex: 1, gap: 8 }}>
      {icon}
      <Text style={{ color: "#fff", fontSize: small ? 15 : 22, fontWeight: "bold" }} numberOfLines={1}>{value}</Text>
      <Text style={{ color: "#ffffff40", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
}

function ActionRow({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#051650", borderRadius: 14, padding: 16 }}>
      {icon}
      <Text style={{ flex: 1, color: "#fff", fontSize: 15, fontWeight: "500" }}>{label}</Text>
      <ChevronRight size={18} color="#ffffff30" />
    </TouchableOpacity>
  );
}
