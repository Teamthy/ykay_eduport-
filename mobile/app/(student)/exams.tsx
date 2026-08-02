import { useEffect, useState } from "react";
import { View, ScrollView, TouchableOpacity, RefreshControl, Alert } from "react-native";
import { studentApi } from "@/lib/api";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/theme";
import { Card } from "@/src/components/cards";
import { H2, Body, Caption } from "@/src/components/typography";
import { Badge } from "@/src/components/badges";
import { Button } from "@/src/components/buttons";
import { Column, Row } from "@/src/components/layout";
import { EmptyState } from "@/src/components/feedback";
import { bodyFont } from "@/src/theme/typography";
import { ClipboardCheck, Clock, Play, Lock, CheckCircle2, RotateCcw } from "lucide-react-native";

export default function StudentExams() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() { try { setData(await studentApi.exams()); } catch {} finally { setRefreshing(false); } }
  useEffect(() => { load(); }, []);

  const exams = data?.exams || [];
  function onStart(exam: any) {
    if (exam.feeLocked) { Alert.alert("Fees outstanding", "Clear your outstanding fees to access exams."); return; }
    router.push({ pathname: "/exam-runner", params: { examId: exam.id } });
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background.primary }} contentContainerStyle={{ padding: spacing.lg, paddingTop: 56 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand.greenLight} />}>
      <H2 style={{ marginBottom: spacing.xs }}>My Exams</H2>
      <Caption style={{ marginBottom: spacing.lg }}>Computer-based tests for your class</Caption>

      {exams.length > 0 ? (
        exams.map((exam: any) => {
          const done = exam.attempt && (exam.attempt.status === "GRADED" || exam.attempt.status === "SUBMITTED");
          const scored = exam.attempt?.scoreVisible;
          return (
            <Card key={exam.id} variant="default" padding={spacing.md} style={{ marginBottom: spacing.sm + 2 }}>
              <Row align="flex-start" gap={spacing.xs}>
                <Column style={{ flex: 1, marginRight: spacing.xs }}>
                  <Body tone="primary" style={{ fontFamily: bodyFont("bold"), fontSize: 16 }}>{exam.title}</Body>
                  <Caption style={{ marginTop: 4 }}>{exam.subjectName}</Caption>
                </Column>
                {exam.feeLocked ? <Badge tone="danger" icon={<Lock size={11} color={colors.danger} />}>FEES DUE</Badge>
                  : scored ? <Badge tone="success" icon={<CheckCircle2 size={11} color={colors.success} />}>{`${exam.attempt.percent}%`}</Badge>
                  : done ? <Badge tone="success">DONE</Badge>
                  : exam.canResume ? <Badge tone="warning">IN PROGRESS</Badge>
                  : exam.canStart ? <Badge tone="accent">OPEN</Badge>
                  : <Badge tone="neutral" icon={<Lock size={11} color={colors.text.muted} />}>LOCKED</Badge>}
              </Row>

              <Row gap={spacing.lg} style={{ marginTop: spacing.sm + 2 }}>
                <Row gap={4}><Clock size={14} color={colors.text.muted} /><Caption>{exam.durationMinutes} min</Caption></Row>
                <Row gap={4}><ClipboardCheck size={14} color={colors.text.muted} /><Caption>{exam.questionCount || "?"} questions</Caption></Row>
              </Row>

              {(exam.canStart || exam.canResume) && !exam.feeLocked && (
                <Button fullWidth style={{ marginTop: spacing.sm + 4 }} leftIcon={exam.canResume ? <RotateCcw size={16} color={colors.brand.white} /> : <Play size={16} color={colors.brand.white} fill={colors.brand.white} />} variant={exam.canResume ? "secondary" : "primary"} onPress={() => onStart(exam)}>
                  {exam.canResume ? "Resume Exam" : "Start Exam"}
                </Button>
              )}

              {scored && (
                <Card variant="default" padding={spacing.sm + 2} style={{ marginTop: spacing.sm + 2, backgroundColor: colors.status.successBg, borderWidth: 0 }}>
                  <Body style={{ color: colors.success, fontFamily: bodyFont("semibold") }}>Score: {exam.attempt.totalScore} / {exam.totalMarks} ({exam.attempt.percent}%)</Body>
                </Card>
              )}
            </Card>
          );
        })
      ) : (
        <EmptyState icon={<ClipboardCheck size={48} color={colors.border.strong} />} title="No exams available" />
      )}
    </ScrollView>
  );
}
