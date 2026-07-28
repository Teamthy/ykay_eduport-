import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from "react-native";
import { parentApi } from "@/lib/api";
import { useRouter } from "expo-router";
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
    if (status === "PAID") return { color: "#22c55e", icon: <CheckCircle2 size={12} color="#22c55e" />, label: "PAID" };
    if (status === "PARTIALLY_PAID") return { color: "#f59e0b", icon: <Clock size={12} color="#f59e0b" />, label: "PARTIAL" };
    if (status === "OVERDUE") return { color: "#ff4444", icon: <AlertCircle size={12} color="#ff4444" />, label: "OVERDUE" };
    return { color: "#ffffff60", icon: <Clock size={12} color="#ffffff60" />, label: status };
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#00072D" }}
      contentContainerStyle={{ padding: 20, paddingTop: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(childId); }} tintColor="#2840E8" />}
    >
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>School Fees</Text>

      {/* Child selector */}
      {children.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {children.map((c: any) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => selectChild(c.id)}
              style={{ backgroundColor: childId === c.id ? "#123499" : "#051650", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8 }}
            >
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>{c.displayName}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Summary */}
      <View style={{ backgroundColor: "#051650", borderRadius: 18, padding: 18, marginBottom: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Col label="Total Billed" value={naira(summary?.totalBilled)} />
          <Col label="Paid" value={naira(summary?.totalPaid)} color="#22c55e" />
          <Col label="Outstanding" value={naira(summary?.totalOutstanding)} color={summary?.totalOutstanding > 0 ? "#ff6b8a" : "#22c55e"} />
        </View>
      </View>

      {/* Invoices */}
      {invoices.length > 0 ? (
        invoices.map((inv: any) => {
          const s = statusMeta(inv.status);
          const due = inv.balanceDue > 0;
          return (
            <View key={inv.id} style={{ backgroundColor: "#051650", borderRadius: 16, padding: 16, marginBottom: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ color: "#fff", fontSize: 15, fontWeight: "bold" }}>{inv.title}</Text>
                  <Text style={{ color: "#ffffff50", fontSize: 12, marginTop: 3 }}>{inv.invoiceNumber} · {inv.termLabel}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: `${s.color}20`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  {s.icon}
                  <Text style={{ color: s.color, fontSize: 10, fontWeight: "700" }}>{s.label}</Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 20, marginTop: 12 }}>
                <Pair label="Amount" value={naira(inv.totalAmount)} />
                <Pair label="Paid" value={naira(inv.amountPaid)} color="#22c55e" />
                <Pair label="Balance" value={naira(inv.balanceDue)} color={due ? "#ff6b8a" : "#fff"} />
              </View>

              {inv.dueDate && (
                <Text style={{ color: "#ffffff40", fontSize: 11, marginTop: 10 }}>Due {new Date(inv.dueDate).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}</Text>
              )}

              {due && (
                <TouchableOpacity
                  onPress={() => pay(inv)}
                  disabled={paying === inv.id}
                  style={{ marginTop: 14, backgroundColor: "#123499", borderRadius: 12, paddingVertical: 13, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 }}
                >
                  {paying === inv.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <CreditCard size={16} color="#fff" />
                  )}
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>{paying === inv.id ? "Starting…" : "Pay with Card"}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 60 }}>
          <CreditCard size={48} color="#ffffff20" />
          <Text style={{ color: "#ffffff40", marginTop: 12 }}>No invoices yet</Text>
        </View>
      )}
    </ScrollView>
  );
}

function Col({ label, value, color = "#fff" }: { label: string; value: string; color?: string }) {
  return (
    <View>
      <Text style={{ color: "#ffffff50", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Text>
      <Text style={{ color, fontSize: 16, fontWeight: "bold", marginTop: 3 }}>{value}</Text>
    </View>
  );
}

function Pair({ label, value, color = "#fff" }: { label: string; value: string; color?: string }) {
  return (
    <View>
      <Text style={{ color: "#ffffff40", fontSize: 10, textTransform: "uppercase" }}>{label}</Text>
      <Text style={{ color, fontSize: 13, fontWeight: "600", marginTop: 2 }}>{value}</Text>
    </View>
  );
}
