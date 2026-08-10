import { useEffect, useState } from "react";
import { View, ScrollView, TextInput, TouchableOpacity, RefreshControl, Alert } from "react-native";
import { useRouter } from "expo-router";
import { adminApi } from "@/lib/api";
import { useTheme } from "@/src/theme";
import { Card } from "@/src/components/cards";
import { H2, Body, Caption, Label } from "@/src/components/typography";
import { Screen, AppBar, Row, Column } from "@/src/components/layout";
import { EmptyState } from "@/src/components/feedback";
import { useToast } from "@/components/MobileToast";
import { bodyFont } from "@/src/theme/typography";
import { CheckCircle2, Clock, UserCheck, ScanLine, Users } from "lucide-react-native";

export default function StaffAttendanceScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [badge, setBadge] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      setData(await adminApi.staffAttendance());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load staff attendance.");
    } finally {
      setRefreshing(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function record() {
    const code = badge.trim();
    if (!code) {
      toast("Enter or paste a staff badge code.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res: any = await adminApi.recordStaffScan(code);
      toast(
        `${res.staff?.displayName || "Staff"} ${res.event?.eventType === "CHECK_OUT" ? "checked out" : "checked in"}`,
        "success",
      );
      setBadge("");
      void load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not record the scan.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const summary = data?.summary;
  const rows = data?.rows || [];

  const statusMeta = (s: string) =>
    s === "IN"
      ? { label: "IN", color: colors.success, bg: colors.status.successBg }
      : s === "OUT"
        ? { label: "OUT", color: colors.warning, bg: colors.status.warningBg }
        : { label: "ABSENT", color: colors.text.muted, bg: colors.surface.card };

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
          tintColor={colors.brand.greenLight}
        />
      }
    >
      <AppBar title="Staff Attendance" onBack={() => router.back()} />
      <H2 style={{ marginBottom: spacing.xs }}>Staff Attendance</H2>
      <Caption style={{ marginBottom: spacing.md }}>
        {data?.date || ""} · Late cutoff {data?.lateCutoff || ""}
      </Caption>

      {error ? (
        <EmptyState icon={<Users size={44} color={colors.border.strong} />} title={error} />
      ) : !summary ? null : (
        <>
          {/* ── Manual badge entry ── */}
          <Card
            variant="bordered"
            padding={spacing.md}
            style={{ marginBottom: spacing.lg, borderColor: colors.brand.green }}
          >
            <Label style={{ marginBottom: spacing.sm }}>Record a scan</Label>
            <Row gap={spacing.sm}>
              <TextInput
                value={badge}
                onChangeText={setBadge}
                placeholder="Type staff badge code (e.g. YKST-1234)"
                placeholderTextColor={colors.text.muted}
                autoCapitalize="characters"
                autoCorrect={false}
                onSubmitEditing={() => void record()}
                style={{
                  flex: 1,
                  color: colors.text.primary,
                  backgroundColor: colors.background.primary,
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.md,
                  paddingVertical: 12,
                  fontSize: 15,
                  borderWidth: 1,
                  borderColor: colors.border.default,
                }}
              />
              <TouchableOpacity
                onPress={() => void record()}
                disabled={submitting}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: 14,
                  borderRadius: radius.md,
                  backgroundColor: colors.brand.green,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                <ScanLine size={20} color={colors.brand.white} />
              </TouchableOpacity>
            </Row>
            <Caption style={{ marginTop: spacing.xs }}>
              QR camera scanning is coming on the app — you can type the badge code on the badge/QR
              card.
            </Caption>
          </Card>

          {/* ── Summary ── */}
          <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg }}>
            <SummaryTile label="Present" value={summary.present} color={colors.success} />
            <SummaryTile label="Absent" value={summary.absent} color={colors.text.muted} />
            <SummaryTile label="Late" value={summary.late} color={colors.warning} />
            <SummaryTile label="Still in" value={summary.stillIn} color={colors.brand.greenLight} />
          </View>

          {/* ── Roster ── */}
          <Label style={{ marginBottom: spacing.sm }}>Staff · {rows.length}</Label>
          {rows.length === 0 ? (
            <EmptyState
              icon={<Users size={44} color={colors.border.strong} />}
              title="No staff listed"
            />
          ) : (
            <Column gap={spacing.xs + 2}>
              {rows.map((r: any) => {
                const m = statusMeta(r.status);
                return (
                  <Card
                    key={r.teacherProfileId}
                    variant="default"
                    padding={spacing.sm + 4}
                    style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm + 2 }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        backgroundColor: m.bg,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Body style={{ color: m.color, fontFamily: bodyFont("bold"), fontSize: 12 }}>
                        {r.displayName.charAt(0).toUpperCase()}
                      </Body>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Body
                        tone="primary"
                        style={{ fontFamily: bodyFont("semibold") }}
                        numberOfLines={1}
                      >
                        {r.displayName}
                      </Body>
                      <Caption numberOfLines={1}>
                        {r.status === "IN" && r.checkInAt
                          ? `In ${new Date(r.checkInAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}${r.isLate ? ` · late ${r.lateMinutes}m` : ""}`
                          : r.status === "OUT"
                            ? "Checked out"
                            : r.role || "—"}
                      </Caption>
                    </View>
                    <View
                      style={{
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 3,
                        borderRadius: radius.sm,
                        backgroundColor: m.bg,
                      }}
                    >
                      <Caption
                        style={{ color: m.color, fontFamily: bodyFont("bold"), fontSize: 11 }}
                      >
                        {m.label}
                      </Caption>
                    </View>
                  </Card>
                );
              })}
            </Column>
          )}
        </>
      )}
    </Screen>
  );
}

function SummaryTile({ label, value, color }: { label: string; value: number; color: string }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        padding: spacing.sm + 2,
        borderRadius: radius.md,
        backgroundColor: colors.surface.card,
        borderWidth: 1,
        borderColor: colors.border.subtle,
      }}
    >
      <Body style={{ fontFamily: bodyFont("bold"), fontSize: 20, color }}>{value}</Body>
      <Caption style={{ fontSize: 10, textAlign: "center" }}>{label}</Caption>
    </View>
  );
}
