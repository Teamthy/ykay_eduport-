import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { YkayLogo } from "@/components/YkayLogo";
import { theme } from "@/lib/theme";
import {
  FileText,
  CreditCard,
  ClipboardCheck,
  Calendar,
  Bell,
  ArrowRight,
  ShieldCheck,
} from "lucide-react-native";

export default function LandingScreen() {
  const router = useRouter();

  const features = [
    { icon: FileText, title: "Results & Report Cards", desc: "Termly grades, positions and remarks." },
    { icon: CreditCard, title: "Pay School Fees", desc: "Secure card payments via Paystack." },
    { icon: ClipboardCheck, title: "Take Exams", desc: "Computer-based tests, right on your phone." },
    { icon: Calendar, title: "Attendance", desc: "Track presence and get alerts." },
    { icon: Bell, title: "Announcements", desc: "School news, events and messages." },
  ];

  return (
    <LinearGradient colors={[...theme.gradient]} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 64, paddingBottom: 40 }}>
        {/* Brand */}
        <View style={{ alignItems: "center", marginBottom: 36 }}>
          <YkayLogo size={64} textSize={26} />
          <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 14, letterSpacing: 1, textAlign: "center" }}>
            Your school, in your pocket.
          </Text>
        </View>

        {/* Hero card */}
        <View style={{ backgroundColor: "rgba(10,36,114,0.55)", borderRadius: theme.radius.lg, padding: 22, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 28 }}>
          <Text style={{ color: theme.colors.textPrimary, fontSize: 22, fontWeight: "800", lineHeight: 30 }}>
            One app for every member of the Ykay family.
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 14, marginTop: 10, lineHeight: 22 }}>
            Students, parents and staff — manage results, fees, exams and attendance anywhere, even offline.
          </Text>
        </View>

        {/* Features */}
        <View style={{ gap: 12, marginBottom: 32 }}>
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <View key={f.title} style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "rgba(5,22,80,0.6)", borderRadius: theme.radius.md, padding: 14 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.primary, justifyContent: "center", alignItems: "center" }}>
                  <Icon size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: "700" }}>{f.title}</Text>
                  <Text style={{ color: theme.colors.textGhost, fontSize: 12, marginTop: 2 }}>{f.desc}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={() => router.push("/login")}
          activeOpacity={0.85}
          style={{ backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, paddingVertical: 17, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Get Started</Text>
          <ArrowRight size={18} color="#fff" />
        </TouchableOpacity>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 22 }}>
          <ShieldCheck size={13} color={theme.colors.textGhost} />
          <Text style={{ color: theme.colors.textGhost, fontSize: 11 }}>For students, parents &amp; staff</Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
