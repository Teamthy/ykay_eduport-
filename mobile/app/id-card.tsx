import { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { studentApi, getMe } from "@/lib/api";
import { useTheme } from "@/src/theme";
import { Card } from "@/src/components/cards";
import { H2, Body, Caption } from "@/src/components/typography";
import { Column } from "@/src/components/layout";
import { YkayLogo } from "@/components/YkayLogo";
import { bodyFont } from "@/src/theme/typography";
import { Mail, Hash, IdCard } from "lucide-react-native";

export default function StudentIdCard() {
  const { colors, spacing } = useTheme();
  const [dash, setDash] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => { studentApi.dashboard().then(setDash).catch(() => {}); getMe().then((r) => setUser(r?.user)); }, []);

  const s = dash?.student || {};
  const initials = (user?.name || s.displayName || "S").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background.primary }} contentContainerStyle={{ padding: spacing.lg, paddingTop: 56, alignItems: "center" }}>
      <H2 style={{ marginBottom: spacing.xs }}>Student ID Card</H2>
      <Caption style={{ marginBottom: spacing.xxl }}>Present this at school events</Caption>

      <Card variant="bordered" padding={0} style={{ width: "100%", maxWidth: 360, overflow: "hidden" }}>
        <View style={{ padding: spacing.md + 2, flexDirection: "row", alignItems: "center", gap: spacing.sm + 2, backgroundColor: colors.background.secondary }}>
          <YkayLogo size={36} textSize={15} />
        </View>
        <View style={{ padding: spacing.lg, flexDirection: "row", gap: spacing.md }}>
          <View style={{ width: 74, height: 84, borderRadius: 14, backgroundColor: colors.brand.green, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ color: colors.text.inverse, fontSize: 28, fontWeight: "bold", fontFamily: bodyFont("bold") }}>{initials}</Text>
          </View>
          <View style={{ flex: 1, justifyContent: "center", gap: spacing.xs + 2 }}>
            <Column><Caption>NAME</Caption><Body tone="primary" style={{ fontFamily: bodyFont("bold") }}>{user?.name || s.displayName || "Student"}</Body></Column>
            {s.className ? <Column><Caption>CLASS</Caption><Body tone="primary" style={{ fontFamily: bodyFont("semibold") }}>{s.className}</Body></Column> : null}
          </View>
        </View>
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.xs + 2 }}>
          {user?.email ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}><Mail size={13} color={colors.brand.greenLight} /><Body style={{ fontSize: 12 }} numberOfLines={1}>{user.email}</Body></View>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}><Hash size={13} color={colors.brand.greenLight} /><Body style={{ fontSize: 12 }}>{s.studentId || user?.id?.slice(0, 12) || "—"}</Body></View>
        </View>
        <View style={{ height: 28, backgroundColor: colors.background.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2, paddingHorizontal: spacing.lg }}>
          {Array.from({ length: 32 }).map((_, i) => <View key={i} style={{ width: (i % 3) + 1, height: 16, backgroundColor: colors.text.primary }} />)}
        </View>
      </Card>

      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xxl }}>
        <IdCard size={16} color={colors.text.muted} />
        <Caption>Digital ID — validity verified at the portal.</Caption>
      </View>
    </ScrollView>
  );
}
