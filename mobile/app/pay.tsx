import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import { theme } from "@/lib/theme";
import { CheckCircle2, X } from "lucide-react-native";

export default function PayScreen() {
  const { url, reference } = useLocalSearchParams<{ url: string; reference: string }>();
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  function onNav(navState: any) {
    const u: string = navState.url || "";
    if (u.includes("verify=") || u.includes("status=success") || u.includes("parent/fees")) setDone(true);
  }

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bgPrimary, justifyContent: "center", alignItems: "center", padding: 30 }}>
        <CheckCircle2 size={60} color={theme.colors.success} />
        <Text style={{ color: theme.colors.textPrimary, fontSize: 22, fontWeight: "bold", marginTop: theme.spacing.md }}>Payment received</Text>
        <Text style={{ color: theme.colors.textSecondary, textAlign: "center", marginTop: theme.spacing.xs }}>Your payment is being verified. Your invoice will update shortly.{"\n"}Ref: {reference}</Text>
        <TouchableOpacity onPress={() => router.replace("/(parent)/fees")} style={{ marginTop: theme.spacing.xxl, backgroundColor: theme.colors.primary, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.xl, borderRadius: theme.radius.md }}>
          <Text style={{ color: theme.colors.textInverse, fontWeight: "700" }}>Back to Fees</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: theme.spacing.md, paddingTop: 52, paddingBottom: theme.spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
        <Text style={{ color: theme.colors.textPrimary, fontWeight: "700" }}>Secure Payment</Text>
        <TouchableOpacity onPress={() => router.back()}><X size={22} color={theme.colors.textMuted} /></TouchableOpacity>
      </View>
      {loading && (
        <View style={{ position: "absolute", top: "50%", left: 0, right: 0, alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={{ color: theme.colors.textMuted, marginTop: theme.spacing.sm + 2 }}>Loading secure checkout…</Text>
        </View>
      )}
      <WebView source={{ uri: url }} onNavigationStateChange={onNav} onLoadEnd={() => setLoading(false)} style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }} />
    </View>
  );
}
