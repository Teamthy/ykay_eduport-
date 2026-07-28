import { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { adminApi, logout } from "@/lib/api";
import { useRouter } from "expo-router";
import { YkayLogo } from "@/components/YkayLogo";
import { theme } from "@/lib/theme";
import { Users, GraduationCap, Layers, CreditCard, Calendar, AlertCircle, Activity } from "lucide-react-native";

const naira = (n: number) => "₦" + Number(n || 0).toLocaleString();

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setData(await adminApi.dashboard());
    } catch {
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const s = data?.stats;
  const activity = data?.activity || [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }}
      contentContainerStyle={{ padding: 20, paddingTop: 56 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.accent} />}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <YkayLogo size={36} textSize={16} />
      </View>

      <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>School Overview</Text>
      <Text style={{ color: theme.colors.textPrimary, fontSize: 22, fontWeight: "bold", marginBottom: 20 }}>
        {data?.admin?.name || "Administrator"}
      </Text>

      {/* People grid */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <Stat icon={<GraduationCap size={18} color={theme.colors.accent} />} value={s?.studentCount} label="Students" />
        <Stat icon={<Users size={18} color={theme.colors.accent} />} value={s?.teacherCount} label="Staff" />
        <Stat icon={<Layers size={18} color={theme.colors.accent} />} value={s?.classCount} label="Classes" />
        <Stat icon={<Users size={18} color={theme.colors.accent} />} value={s?.parentCount} label="Parents" />
      </View>

      {/* Outstanding fees */}
      <View style={{ backgroundColor: s?.outstandingFees > 0 ? "#3a1228" : "#0d2818", borderRadius: theme.radius.lg, padding: 18, marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <CreditCard size={18} color={s?.outstandingFees > 0 ? "#ff6b8a" : "#22c55e"} />
          <Text style={{ color: theme.colors.textFaint, fontSize: 11, fontWeight: "700", letterSpacing: 1 }}>OUTSTANDING FEES</Text>
        </View>
        <Text style={{ color: s?.outstandingFees > 0 ? "#ff6b8a" : "#22c55e", fontSize: 28, fontWeight: "bold", marginTop: 8 }}>
          {naira(s?.outstandingFees)}
        </Text>
        <Text style={{ color: theme.colors.textGhost, fontSize: 12, marginTop: 2 }}>{s?.openInvoiceCount || 0} open invoices</Text>
      </View>

      {/* Attendance today */}
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
        <Stat icon={<Calendar size={18} color={theme.colors.accent} />} value={s?.attendanceRateToday != null ? `${s.attendanceRateToday}%` : "—"} label="Present Today" />
        <Stat icon={<Calendar size={18} color={theme.colors.accent} />} value={`${s?.presentToday || 0}/${s?.attendanceMarkedToday || 0}`} label="Marked Today" />
      </View>

      {/* Pending items */}
      {(s?.pendingApplications > 0 || s?.pendingCorrections > 0 || s?.draftReports > 0) && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: theme.colors.textFaint, fontSize: 12, fontWeight: "700", letterSpacing: 1, marginBottom: 10 }}>NEEDS ATTENTION</Text>
          {s?.pendingApplications > 0 && <PendingRow icon={<AlertCircle size={15} color="#f59e0b" />} text={`${s.pendingApplications} admission applications to review`} />}
          {s?.pendingCorrections > 0 && <PendingRow icon={<AlertCircle size={15} color="#f59e0b" />} text={`${s.pendingCorrections} attendance corrections pending`} />}
          {s?.draftReports > 0 && <PendingRow icon={<AlertCircle size={15} color="#f59e0b" />} text={`${s.draftReports} report cards in draft`} />}
        </View>
      )}

      {/* Recent activity */}
      {activity.length > 0 && (
        <View>
          <Text style={{ color: theme.colors.textFaint, fontSize: 12, fontWeight: "700", letterSpacing: 1, marginBottom: 10 }}>RECENT ACTIVITY</Text>
          {activity.slice(0, 8).map((a: any, i: number) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 12, marginBottom: 8 }}>
              <Activity size={15} color={theme.colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "500" }} numberOfLines={1}>{a.action}</Text>
                <Text style={{ color: theme.colors.textGhost, fontSize: 11 }}>{a.actorName}{a.actorRole ? ` · ${a.actorRole}` : ""}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: any; label: string }) {
  return (
    <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: 16, width: "47%", gap: 8 }}>
      {icon}
      <Text style={{ color: theme.colors.textPrimary, fontSize: 22, fontWeight: "bold" }}>{value ?? "—"}</Text>
      <Text style={{ color: theme.colors.textGhost, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
}

function PendingRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 12, marginBottom: 8 }}>
      {icon}
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>{text}</Text>
    </View>
  );
}
