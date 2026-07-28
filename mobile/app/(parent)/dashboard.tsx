import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { parentApi } from "@/lib/api";
import { useRouter } from "expo-router";
import { theme } from "@/lib/theme";
import { YkayLogo } from "@/components/YkayLogo";
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
      style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 56 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.accent} />}
    >
      <YkayLogo size={32} textSize={15} />

      <Text style={{ color: theme.colors.textFaint, fontSize: 14, marginTop: theme.spacing.lg }}>{greeting},</Text>
      <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: "bold", marginTop: 2, marginBottom: theme.spacing.xxl }}>{data?.parent?.displayName || "Parent"}</Text>

      {data && data.children?.length === 0 && (
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.xl, alignItems: "center" }}>
          <GraduationCap size={40} color={theme.colors.borderStrong} />
          <Text style={{ color: theme.colors.textPrimary, fontWeight: "600", marginTop: theme.spacing.sm, textAlign: "center" }}>No children linked yet</Text>
          <Text style={{ color: theme.colors.textFaint, fontSize: 13, marginTop: 6, textAlign: "center" }}>The school will link your ward's profile to this account.</Text>
        </View>
      )}

      {data?.children?.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: theme.spacing.lg }}>
          {data.children.map((c: any) => (
            <View key={c.id} style={{ backgroundColor: c.isPrimary ? theme.colors.primary : theme.colors.surface, borderRadius: theme.radius.sm + 2, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs + 2, marginRight: theme.spacing.xs, flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
              <Users size={14} color={c.isPrimary ? theme.colors.textPrimary : theme.colors.textFaint} />
              <View>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "600" }}>{c.displayName}</Text>
                <Text style={{ color: c.isPrimary ? theme.colors.textSecondary : theme.colors.textGhost, fontSize: 11 }}>{c.className}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {child && (
        <TouchableOpacity
          onPress={() => router.push("/(parent)/fees")}
          style={{ backgroundColor: outstanding ? "#3a1228" : "#0d2818", borderRadius: theme.radius.lg, padding: theme.spacing.md + 2, marginBottom: theme.spacing.md }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
              <CreditCard size={18} color={outstanding ? "#ff6b8a" : theme.colors.success} />
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>FEES OUTSTANDING</Text>
            </View>
            <ChevronRight size={16} color={theme.colors.borderStrong} />
          </View>
          <Text style={{ color: outstanding ? "#ff6b8a" : theme.colors.success, fontSize: 30, fontWeight: "bold", marginTop: theme.spacing.xs }}>{naira(fin?.totalOutstanding)}</Text>
          <Text style={{ color: theme.colors.textGhost, fontSize: 12, marginTop: 4 }}>Paid {naira(fin?.totalPaid)} of {naira(fin?.totalBilled)}</Text>
          {outstanding && (
            <View style={{ marginTop: theme.spacing.sm + 2, backgroundColor: theme.colors.border, borderRadius: theme.radius.sm, paddingVertical: theme.spacing.xs + 2, alignItems: "center" }}>
              <Text style={{ color: theme.colors.textPrimary, fontWeight: "700", fontSize: 13 }}>Tap to pay →</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {child && (
        <>
          <View style={{ flexDirection: "row", gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
            <StatCard icon={<TrendingUp size={18} color={theme.colors.accent} />} label={`${child.displayName?.split(" ")[0]}'s Attendance`} value={att ? `${att.attendanceRate}%` : "—"} />
            <StatCard icon={<Calendar size={18} color={theme.colors.accent} />} label="Class" value={child.className || "—"} small />
          </View>
          <View style={{ gap: theme.spacing.xs, marginBottom: theme.spacing.md }}>
            <ActionRow icon={<FileText size={20} color={theme.colors.accent} />} label="View Report Cards" onPress={() => router.push("/(parent)/report-cards")} />
            <ActionRow icon={<Calendar size={20} color={theme.colors.accent} />} label="Attendance" onPress={() => router.push("/(parent)/attendance")} />
            <ActionRow icon={<Megaphone size={20} color={theme.colors.accent} />} label="Events" onPress={() => router.push("/parent-events")} />
            <ActionRow icon={<Mail size={20} color={theme.colors.accent} />} label="Messages" onPress={() => router.push("/parent-messages")} />
          </View>
        </>
      )}

      {data?.recentAlerts?.length > 0 && (
        <View>
          <Text style={{ color: theme.colors.textFaint, fontSize: 12, fontWeight: "700", marginBottom: theme.spacing.xs + 2, letterSpacing: 1 }}>RECENT ALERTS</Text>
          {data.recentAlerts.slice(0, 4).map((a: any) => (
            <View key={a.id} style={{ flexDirection: "row", gap: theme.spacing.xs + 2, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm + 2, padding: theme.spacing.sm + 2, marginBottom: theme.spacing.xs }}>
              <Bell size={16} color={theme.colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 13 }} numberOfLines={2}>{a.messagePreview}</Text>
                <Text style={{ color: theme.colors.textGhost, fontSize: 11, marginTop: 2 }}>{new Date(a.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })}</Text>
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
    <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md, flex: 1, gap: theme.spacing.xs }}>
      {icon}
      <Text style={{ color: theme.colors.textPrimary, fontSize: small ? 15 : 22, fontWeight: "bold" }} numberOfLines={1}>{value}</Text>
      <Text style={{ color: theme.colors.textGhost, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
}

function ActionRow({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.md }}>
      {icon}
      <Text style={{ flex: 1, color: theme.colors.textPrimary, fontSize: 15, fontWeight: "500" }}>{label}</Text>
      <ChevronRight size={18} color={theme.colors.borderStrong} />
    </TouchableOpacity>
  );
}
