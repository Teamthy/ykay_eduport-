import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, RefreshControl } from "react-native";
import { teacherApi } from "@/lib/api";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/theme";
import { AppHeader } from "@/src/components/navigation";
import {
  DashboardGreeting,
  Metric,
  MetricGrid,
  ActionRow,
  SectionHeading,
  InlineError,
} from "@/src/components/dashboard";
import { Card } from "@/src/components/cards";
import { Body, Caption } from "@/src/components/typography";
import { Badge } from "@/src/components/badges";
import { Skeleton, EmptyState } from "@/src/components/feedback";
import { Button } from "@/src/components/buttons";
import { bodyFont } from "@/src/theme/typography";
import {
  ClipboardCheck,
  BookOpen,
  Users,
  Megaphone,
  Mail,
  BarChart3,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Heart,
} from "lucide-react-native";

export default function TeacherDashboard() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await teacherApi.dashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your dashboard.");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const teacher = data?.teacher;
  // The API already computes these. The old screen ignored `stats` entirely
  // and re-derived a student count in JS, so pendingCorrections,
  // openGradebooks, liveExams and todayRegisterDone were never surfaced.
  const s = data?.stats;
  const assignments = data?.assignments || [];
  const registerDone = !!s?.todayRegisterDone;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background.primary }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: 56, paddingBottom: 40 }}
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
      <AppHeader onBellPress={() => router.push("/teacher-announcements")} />

      <DashboardGreeting
        name={teacher?.displayName || (loading ? "" : "Teacher")}
        subtitle={
          teacher?.formClassName
            ? `Form teacher · ${teacher.formClassName}`
            : teacher?.roleLabel || null
        }
        photoUrl={teacher?.photoUrl}
        onAvatarPress={() => router.push("/(teacher)/profile")}
      />

      {error ? <InlineError message={error} onRetry={() => void load()} /> : null}

      {loading ? (
        <>
          <Skeleton width="100%" height={92} radius={16} style={{ marginBottom: 10 }} />
          <MetricGrid>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} width="48%" height={104} radius={16} />
            ))}
          </MetricGrid>
        </>
      ) : (
        <>
          {/* Today's register is the one time-boxed task a teacher owes the
              school each day, so it leads and states its status plainly. */}
          <Card
            variant="bordered"
            padding={spacing.md}
            onPress={() => router.push("/(teacher)/attendance")}
            style={{
              marginBottom: spacing.sm + 2,
              borderColor: registerDone ? colors.status.successBorder : colors.status.warningBorder,
              backgroundColor: registerDone ? colors.status.successBg : colors.status.warningBg,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              {registerDone ? (
                <CheckCircle2 size={18} color={colors.status.successText} />
              ) : (
                <AlertTriangle size={18} color={colors.status.warningText} />
              )}
              <View style={{ flex: 1 }}>
                <Body
                  tone="primary"
                  style={{
                    fontFamily: bodyFont("bold"),
                    color: registerDone ? colors.status.successText : colors.status.warningText,
                  }}
                >
                  {registerDone ? "Register submitted" : "Register not taken"}
                </Body>
                <Caption style={{ marginTop: 2 }}>
                  {registerDone
                    ? "Today's attendance is in."
                    : "Today's attendance is still outstanding."}
                </Caption>
              </View>
            </View>

            {!registerDone ? (
              <Button
                fullWidth
                size="sm"
                onPress={() => router.push("/(teacher)/attendance")}
                rightIcon={<ArrowRight size={15} color={colors.brand.white} />}
                style={{ marginTop: spacing.md }}
              >
                Take attendance
              </Button>
            ) : null}
          </Card>

          <MetricGrid style={{ marginBottom: spacing.lg }}>
            <Metric
              icon={<Layers size={18} color={colors.brand.greenLight} />}
              label="Classes"
              value={s?.classCount ?? assignments.length}
              hint={s?.subjectCount ? `${s.subjectCount} subjects` : undefined}
            />
            <Metric
              icon={<Users size={18} color={colors.brand.greenLight} />}
              label="Students"
              value={s?.totalStudents ?? "—"}
              onPress={() => router.push("/(teacher)/students")}
            />
            <Metric
              icon={<BookOpen size={18} color={colors.brand.greenLight} />}
              label="Open gradebooks"
              value={s?.openGradebooks ?? 0}
              hint={s?.openGradebooks ? "Awaiting entry" : "All submitted"}
              onPress={() => router.push("/(teacher)/gradebook")}
            />
            <Metric
              icon={
                <AlertTriangle
                  size={18}
                  color={s?.pendingCorrections ? colors.warning : colors.brand.greenLight}
                />
              }
              accent={s?.pendingCorrections ? colors.warning : undefined}
              label="Corrections"
              value={s?.pendingCorrections ?? 0}
              hint={s?.pendingCorrections ? "Pending review" : "None pending"}
            />
          </MetricGrid>
        </>
      )}

      <SectionHeading title="Quick actions" />
      <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
        <ActionRow
          icon={<ClipboardCheck size={18} color={colors.brand.greenLight} />}
          label="Take attendance"
          hint="Mark today's register"
          onPress={() => router.push("/(teacher)/attendance")}
        />
        <ActionRow
          icon={<BookOpen size={18} color={colors.brand.greenLight} />}
          label="Gradebook"
          hint="Enter and submit scores"
          badge={s?.openGradebooks}
          onPress={() => router.push("/(teacher)/gradebook")}
        />
        <ActionRow
          icon={<Users size={18} color={colors.brand.greenLight} />}
          label="Students"
          hint="Class rosters"
          onPress={() => router.push("/(teacher)/students")}
        />
        <ActionRow
          icon={<BarChart3 size={18} color={colors.brand.greenLight} />}
          label="Analytics"
          hint="Class performance"
          onPress={() => router.push("/teacher-analytics")}
        />
        <ActionRow
          icon={<Megaphone size={18} color={colors.brand.greenLight} />}
          label="Announcements"
          onPress={() => router.push("/teacher-announcements")}
        />
        <ActionRow
          icon={<Heart size={18} color={colors.brand.greenLight} />}
          label="Behaviour"
          hint="Log praise or a concern"
          onPress={() => router.push("/teacher-behavior")}
        />
        <ActionRow
          icon={<Mail size={18} color={colors.brand.greenLight} />}
          label="Messages"
          onPress={() => router.push("/messages")}
        />
      </View>

      <SectionHeading title="My classes" />
      {!loading && assignments.length === 0 ? (
        <Card variant="bordered" padding={spacing.lg}>
          <EmptyState
            icon={<Layers size={34} color={colors.border.strong} />}
            title="No classes assigned"
            message="An administrator will assign your classes shortly."
          />
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {assignments.map((a: any) => (
            <Card
              key={a.id}
              variant="default"
              padding={spacing.md}
              onPress={() => router.push("/(teacher)/students")}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <Body tone="primary" style={{ flex: 1, fontFamily: bodyFont("bold") }}>
                  {a.className}
                </Body>
                <Badge tone={a.role === "FORM_TEACHER" ? "accent" : "neutral"}>
                  {a.role === "FORM_TEACHER" ? "FORM" : "SUBJECT"}
                </Badge>
              </View>
              <Caption style={{ marginTop: 4 }}>
                {a.subjectName ? `${a.subjectName} · ` : ""}
                {a.studentCount} students
              </Caption>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
