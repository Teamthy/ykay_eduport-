import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import { CheckCircle2, X } from "lucide-react-native";

export default function PayScreen() {
  const { url, reference } = useLocalSearchParams<{ url: string; reference: string }>();
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  // Paystack redirects to the callback URL once payment is processed.
  function onNav(navState: any) {
    const u: string = navState.url || "";
    if (u.includes("verify=") || u.includes("status=success") || u.includes("parent/fees")) {
      setDone(true);
    }
  }

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: "#00072D", justifyContent: "center", alignItems: "center", padding: 30 }}>
        <CheckCircle2 size={60} color="#22c55e" />
        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "bold", marginTop: 16 }}>Payment received</Text>
        <Text style={{ color: "#ffffff80", textAlign: "center", marginTop: 8 }}>
          Your payment is being verified. Your invoice will update shortly.{"\n"}Ref: {reference}
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/(parent)/fees")}
          style={{ marginTop: 28, backgroundColor: "#123499", paddingVertical: 14, paddingHorizontal: 36, borderRadius: 12 }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Back to Fees</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#00072D" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#ffffff10" }}>
        <Text style={{ color: "#fff", fontWeight: "700" }}>Secure Payment</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={22} color="#ffffff80" />
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={{ position: "absolute", top: "50%", left: 0, right: 0, alignItems: "center" }}>
          <ActivityIndicator size="large" color="#2840E8" />
          <Text style={{ color: "#ffffff60", marginTop: 12 }}>Loading secure checkout…</Text>
        </View>
      )}

      <WebView
        source={{ uri: url }}
        onNavigationStateChange={onNav}
        onLoadEnd={() => setLoading(false)}
        style={{ flex: 1, backgroundColor: "#00072D" }}
      />
    </View>
  );
}
