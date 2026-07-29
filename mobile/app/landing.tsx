import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme, Gradients } from "@/src/theme";
import { YkayLogo } from "@/components/YkayLogo";
import { H2, Body, Caption } from "@/src/components/typography";
import { Button } from "@/src/components/buttons";
import { FileText, CreditCard, ClipboardCheck, ArrowRight } from "lucide-react-native";

const SLIDES = [
  { icon: FileText, title: "Results at your fingertips", desc: "Termly report cards, grades, class positions and teacher remarks — anywhere, anytime." },
  { icon: CreditCard, title: "Pay fees securely", desc: "Settle school fees by card via Paystack, straight from your phone — no queues." },
  { icon: ClipboardCheck, title: "Exams & attendance", desc: "Take computer-based tests and track attendance. It even works offline." },
];

export default function LandingScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const Icon = slide.icon;
  const last = i === SLIDES.length - 1;

  return (
    <LinearGradient colors={[...Gradients.hero]} style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: spacing.lg, paddingTop: 60 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <YkayLogo size={36} textSize={16} />
          <TouchableOpacity onPress={() => router.push("/login")}>
            <Text style={{ color: colors.text.muted, fontSize: 13, fontWeight: "600", fontFamily: "DM Sans" }}>Skip</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <View style={{ width: 100, height: 100, borderRadius: 30, backgroundColor: colors.brand.green, justifyContent: "center", alignItems: "center", marginBottom: 34, shadowColor: colors.brand.green, shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 }}>
            <Icon size={48} color={colors.brand.white} />
          </View>
          <H2 style={{ textAlign: "center", fontSize: 27 }}>{slide.title}</H2>
          <Body style={{ textAlign: "center", marginTop: 14, paddingHorizontal: 8 }}>{slide.desc}</Body>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 26 }}>
          {SLIDES.map((_, idx) => (
            <View key={idx} style={{ width: idx === i ? 26 : 8, height: 8, borderRadius: 4, backgroundColor: idx === i ? colors.brand.greenLight : colors.border.strong }} />
          ))}
        </View>

        <Button fullWidth size="lg" variant="primary" rightIcon={!last ? <ArrowRight size={18} color={colors.brand.white} /> : undefined} onPress={() => (last ? router.push("/login") : setI(i + 1))}>
          {last ? "Get Started" : "Next"}
        </Button>
        <Caption style={{ textAlign: "center", marginTop: 16 }}>For students, parents &amp; staff</Caption>
      </View>
    </LinearGradient>
  );
}
