import { useState } from "react";
import { View, ScrollView, TextInput, Alert } from "react-native";
import { adminApi } from "@/lib/api";
import { useTheme } from "@/src/theme";
import { Card } from "@/src/components/cards";
import { H2, Body, Caption, Label } from "@/src/components/typography";
import { Button } from "@/src/components/buttons";
import { Column } from "@/src/components/layout";
import { bodyFont } from "@/src/theme/typography";
import { UserPlus, Shield } from "lucide-react-native";

const ROLES = ["TEACHER", "HOD", "COORDINATOR", "BURSAR", "DIRECTOR", "ADMIN"];

export default function AdminStaff() {
  const { colors, spacing } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("TEACHER");
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!name.trim() || !email.trim()) { Alert.alert("Required", "Name and email are required."); return; }
    setSaving(true);
    try {
      const res: any = await adminApi.createStaff({ name, email, role, phone: phone || undefined });
      Alert.alert("Staff created", `Account created for ${name}. Temporary password: ${res?.tempPassword || "(see audit log)"}. They'll change it on first login.`);
      setName(""); setEmail(""); setPhone(""); setRole("TEACHER");
    } catch (e: any) { Alert.alert("Failed", e.message || "Could not create staff."); }
    finally { setSaving(false); }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background.primary }} contentContainerStyle={{ padding: spacing.lg, paddingTop: 56 }}>
      <H2 style={{ marginBottom: spacing.xs }}>Staff</H2>
      <Caption style={{ marginBottom: spacing.lg }}>Create teaching &amp; non-teaching accounts</Caption>

      <Card variant="bordered" style={{ marginBottom: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
        <Shield size={16} color={colors.brand.greenLight} /><Label>New Staff Account</Label>
      </Card>

      <Column gap={spacing.md}>
        <Field label="Full Name"><TextInput value={name} onChangeText={setName} placeholder="e.g. Mr. Emeka Nwosu" placeholderTextColor={colors.text.muted} style={input(colors)} /></Field>
        <Field label="Email"><TextInput value={email} onChangeText={setEmail} placeholder="staff@ykaycollege.com" placeholderTextColor={colors.text.muted} keyboardType="email-address" autoCapitalize="none" style={input(colors)} /></Field>
        <Field label="Phone (optional)"><TextInput value={phone} onChangeText={setPhone} placeholder="080…" placeholderTextColor={colors.text.muted} keyboardType="phone-pad" style={input(colors)} /></Field>
        <Field label="Role">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            {ROLES.map((r) => (
              <TouchableOpacity key={r} onPress={() => setRole(r)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: role === r ? colors.brand.green : colors.background.elevated, borderWidth: 1, borderColor: role === r ? colors.brand.green : colors.border.subtle }}>
                <Body tone={role === r ? "inverse" : "primary"} style={{ fontFamily: bodyFont("semibold") }}>{r}</Body>
              </TouchableOpacity>
            ))}
          </View>
        </Field>
      </Column>

      <Button fullWidth loading={saving} leftIcon={<UserPlus size={16} color={colors.brand.white} />} onPress={create} style={{ marginTop: spacing.lg }}>{saving ? "Creating…" : "Create Staff Account"}</Button>
      <Caption style={{ marginTop: spacing.md, textAlign: "center" }}>Full staff roster &amp; assignments are on the web portal.</Caption>
    </ScrollView>
  );
}

function input(colors: any) { return { backgroundColor: colors.background.primary, color: colors.text.primary, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border.subtle, fontFamily: "DM Sans" }; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { const { spacing } = useTheme(); return (<View style={{ gap: spacing.xs }}><Label>{label}</Label>{children}</View>); }

import { TouchableOpacity } from "react-native";
