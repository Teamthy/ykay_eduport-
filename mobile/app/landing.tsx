import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { YkayLogo } from "@/components/YkayLogo";
import { theme } from "@/lib/theme";
import { FileText, CreditCard, ClipboardCheck, ArrowRight } from "lucide-react-native";

const SLIDES = [
  {
    icon: FileText,
    title: "Results at your fingertips",
    desc: "Termly report cards, grades, class positions and teacher remarks — anywhere, anytime.",
  },
  {
    icon: CreditCard,
    title: "Pay fees securely",
    desc: "Settle school fees by card via Paystack, straight from your phone — no queues.",
  },
  {
    icon: ClipboardCheck,
    title: "Exams & attendance",
    desc: "Take computer-based tests and track attendance. It even works offline.",
  },
];

export default function LandingScreen() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const Icon = slide.icon;
  const last = i === SLIDES.length - 1;

  return (
    <LinearGradient colors={[...theme.gradient]} style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 24, paddingTop: 60 }}>
        {/* Brand + skip */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <YkayLogo size={36} textSize={16} />
          <TouchableOpacity onPress={() => router.push("/login")}>
            <Text style={{ color: theme.colors.textGhost, fontSize: 13, fontWeight: "600" }}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Slide */}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 30,
              backgroundColor: theme.colors.primary,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 34,
              shadowColor: theme.colors.accent,
              shadowOpacity: 0.3,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <Icon size={48} color={theme.colors.textPrimary} />
          </View>
          <Text style={{ color: theme.colors.textPrimary, fontSize: 27, fontWeight: "800", textAlign: "center", lineHeight: 35 }}>
            {slide.title}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 15, textAlign: "center", marginTop: 14, lineHeight: 23, paddingHorizontal: 8 }}>
            {slide.desc}
          </Text>
        </View>

        {/* Dots */}
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 26 }}>
          {SLIDES.map((_, idx) => (
            <View
              key={idx}
              style={{
                width: idx === i ? 26 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: idx === i ? theme.colors.accent : theme.colors.borderStrong,
              }}
            />
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={() => (last ? router.push("/login") : setI(i + 1))}
          activeOpacity={0.85}
          style={{
            backgroundColor: theme.colors.primary,
            borderRadius: theme.radius.md,
            paddingVertical: 17,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Text style={{ color: theme.colors.textPrimary, fontWeight: "700", fontSize: 16 }}>
            {last ? "Get Started" : "Next"}
          </Text>
          {!last && <ArrowRight size={18} color={theme.colors.textPrimary} />}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}
