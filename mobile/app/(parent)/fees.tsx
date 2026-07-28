import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from "react-native";
import { parentApi } from "@/lib/api";
import { useRouter } from "expo-router";
import { theme } from "@/lib/theme";
import { CreditCard, CheckCircle2, Clock, AlertCircle } from "lucide-react-native";

const naira = (n: number) => "₦" + Number(n || 0).toLocaleString();

export default function ParentFees() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [childId, setChildId] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);

  async function load(id?: string) {
    try {
      const res = await parentApi.fees(id || undefined);
      setData(res);
      if (!id) setChildId(res?.selectedChild?.id || "");
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

  async function pay(invoice: any) {
    setPaying(invoice.id);
    try {
      const res: any = await parentApi.pay(invoice.id, "PAYSTACK");
      if (res.authorizationUrl) {
        router.push({ pathname: "/pay", params: { url: res.authorizationUrl, reference: res.reference } });
      } else {
        Alert.alert("Payment", res.message || "Payment initiated.");
      }
    } catch (e: any) {
      Alert.alert("Payment failed", e.message || "Could not start payment.");
    } finally {
      setPaying(null);
    }
  }

  const children = data?.children || [];
  const invoices = data?.invoices || [];
  const summary = data?.summary;

  function statusMeta(status: string) {
    if (status === "PAID") return { color: theme.colors.success, icon: <CheckCircle2 size={12} color={theme.colors.success} />, label: "PAID" };
    if (status === "PARTIALLY_PAID") return { color: theme.colors.warning, icon: <Clock size={12} color={theme.colors.warning} />, label: "PARTIAL" };
    if (status === "OVERDUE") return { color: theme.colors.danger, icon: <AlertCircle size={12} color={theme.colors.danger} />, label: "OVERDUE" };
    return { color: theme.colors.textFaint, icon: <Clock size={12} color={theme.colors.textFaint} />, label: status };
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 56 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(childId); }} tintColor={theme.colors.accent} />}
    >
      <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: "bold", marginBottom: theme.spacing.md }}>School Fees</Text>

      {children.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: theme.spacing.md }}>
          {children.map((c: any) => (
            <TouchableOpacity key={c.id} onPress={() => selectChild(c.id)} style={{ backgroundColor: childId === c.id ? theme.colors.primary : theme.colors.surface, borderRadius: 20, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs + 2, marginRight: theme.spacing.xs }}>
              <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "600" }}>{c.displayName}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md + 2, marginBottom: theme.spacing.lg }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Col label="Total Billed" value={naira(summary?.totalBilled)} />
          <Col label="Paid" value={naira(summary?.totalPaid)} color={theme.colors.success} />
          <Col label="Outstanding" value={naira(summary?.totalOutstanding)} color={summary?.totalOutstanding > 0 ? "#ff6b8a" : theme.colors.success} />
        </View>
      </View>

      {invoices.length > 0 ? (
        invoices.map((inv: any) => {
          const s = statusMeta(inv.status);
          const due = inv.balanceDue > 0;
          return (
            <View key={inv.id} style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.sm + 2 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1, marginRight: theme.spacing.xs }}>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: "bold" }}>{inv.title}</Text>
                  <Text style={{ color: theme.colors.textGhost, fontSize: 12, marginTop: 3 }}>{inv.invoiceNumber} · {inv.termLabel}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: `${s.color}20`, borderRadius: theme.radius.xs, paddingHorizontal: theme.spacing.xs, paddingVertical: 4 }}>
                  {s.icon}
                  <Text style={{ color: s.color, fontSize: 10, fontWeight: "700" }}>{s.label}</Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: theme.spacing.lg, marginTop: theme.spacing.sm + 2 }}>
                <Pair label="Amount" value={naira(inv.totalAmount)} />
                <Pair label="Paid" value={naira(inv.amountPaid)} color={theme.colors.success} />
                <Pair label="Balance" value={naira(inv.balanceDue)} color={due ? "#ff6b8a" : theme.colors.textPrimary} />
              </View>

              {inv.dueDate && <Text style={{ color: theme.colors.textGhost, fontSize: 11, marginTop: theme.spacing.xs + 2 }}>Due {new Date(inv.dueDate).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}</Text>}

              {due && (
                <TouchableOpacity onPress={() => pay(inv)} disabled={paying === inv.id} style={{ marginTop: theme.spacing.sm + 2, backgroundColor: theme.colors.primary, borderRadius: theme.radius.sm + 2, paddingVertical: 13, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: theme.spacing.xs }}>
                  {paying === inv.id ? <ActivityIndicator size="small" color={theme.colors.textPrimary} /> : <CreditCard size={16} color={theme.colors.textPrimary} />}
                  <Text style={{ color: theme.colors.textPrimary, fontWeight: "700", fontSize: 14 }}>{paying === inv.id ? "Starting…" : "Pay with Card"}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 60 }}>
          <CreditCard size={48} color={theme.colors.borderStrong} />
          <Text style={{ color: theme.colors.textGhost, marginTop: theme.spacing.sm }}>No invoices yet</Text>
        </View>
      )}
    </ScrollView>
  );
}

function Col({ label, value, color = "#fff" }: { label: string; value: string; color?: string }) {
  return (
    <View>
      <Text style={{ color: theme.colors.textGhost, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Text>
      <Text style={{ color, fontSize: 16, fontWeight: "bold", marginTop: 3 }}>{value}</Text>
    </View>
  );
}

function Pair({ label, value, color = "#fff" }: { label: string; value: string; color?: string }) {
  return (
    <View>
      <Text style={{ color: theme.colors.textGhost, fontSize: 10, textTransform: "uppercase" }}>{label}</Text>
      <Text style={{ color, fontSize: 13, fontWeight: "600", marginTop: 2 }}>{value}</Text>
    </View>
  );
}
