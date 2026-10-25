"use client";

import { useEffect, useMemo, useState } from "react";
import type { LeaderboardCategory, LeaderboardScope, Standing } from "@/lib/leaderboards";
import { readJsonResponse } from "@/lib/api-response";
import LeaderboardView, { type LeaderboardSubjectOption } from "./LeaderboardView";

type Child = {
  id: string;
  studentId: string;
  displayName: string;
  className: string;
  relationship?: string | null;
  isPrimary: boolean;
};

type LeaderboardData = {
  classroom: { id: string; displayName: string; level: string };
  periodLabel: string;
  subjectOptions: LeaderboardSubjectOption[];
  selectedSubject: LeaderboardSubjectOption | null;
  cohortSize: number;
  myRank: number | null;
  myStars: number | null;
  topStandings: Standing[];
};

type ApiPayload = LeaderboardData & {
  children?: Child[];
  selectedChild?: Child | null;
  leaderboard?: LeaderboardData | null;
  error?: string;
};

type Props = { audience: "student" | "parent" };

export default function LeaderboardPanel({ audience }: Props) {
  const [category, setCategory] = useState<LeaderboardCategory>("OVERALL");
  const [scope, setScope] = useState<LeaderboardScope>("CLASS");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const url = useMemo(() => {
    const params = new URLSearchParams({ category, scope });
    if (selectedSubjectId) params.set("subjectId", selectedSubjectId);
    if (audience === "parent" && selectedStudentId) params.set("studentId", selectedStudentId);
    return `${audience === "parent" ? "/api/parent" : "/api/student"}/leaderboards?${params}`;
  }, [audience, category, scope, selectedSubjectId, selectedStudentId]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(url, { cache: "no-store", signal: controller.signal });
        const payload = await readJsonResponse<ApiPayload>(response);
        if (!response.ok) throw new Error(payload.error || "Unable to load standings.");
        if (audience === "parent") {
          setChildren(payload.children ?? []);
          setSelectedChild(payload.selectedChild ?? null);
          setSelectedStudentId((current) => payload.selectedChild?.id ?? current);
          if (payload.leaderboard) setData(payload.leaderboard);
          else setData(null);
        } else {
          setData(payload);
        }
        if (payload.selectedSubject?.id && payload.selectedSubject.id !== selectedSubjectId) {
          setSelectedSubjectId(payload.selectedSubject.id);
        }
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === "AbortError") return;
        setData(null);
        setError(loadError instanceof Error ? loadError.message : "Unable to load standings.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [audience, url, selectedSubjectId]);

  const childSelector =
    audience === "parent" && children.length ? (
      <label className="block max-w-xl rounded-[1.5rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-[var(--card-shadow)]">
        <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Ward
        </span>
        <select
          aria-label="Select child for leaderboard"
          value={selectedStudentId}
          onChange={(event) => {
            setSelectedStudentId(event.target.value);
            setSelectedSubjectId("");
          }}
          className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-[var(--input-text)]"
        >
          {children.map((child) => (
            <option key={child.id} value={child.id}>
              {child.displayName} · {child.className}
            </option>
          ))}
        </select>
      </label>
    ) : null;

  if (!loading && !error && audience === "parent" && children.length === 0) {
    return (
      <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 text-sm text-[var(--text-muted)]">
        No active ward is linked to this parent account yet.
      </div>
    );
  }

  return (
    <LeaderboardView
      category={category}
      onCategoryChange={setCategory}
      scope={scope}
      onScopeChange={(value) => {
        setScope(value);
        if (value === "CLASS") setSelectedSubjectId("");
      }}
      subjectOptions={data?.subjectOptions ?? []}
      selectedSubjectId={selectedSubjectId || data?.selectedSubject?.id || ""}
      onSubjectChange={setSelectedSubjectId}
      className={selectedChild?.className || data?.classroom.displayName || "Current class"}
      periodLabel={data?.periodLabel || "Current term"}
      cohortSize={data?.cohortSize ?? 0}
      myRank={data?.myRank ?? null}
      myStars={data?.myStars ?? null}
      topStandings={data?.topStandings ?? []}
      loading={loading}
      error={error}
      childSelector={childSelector}
    />
  );
}
