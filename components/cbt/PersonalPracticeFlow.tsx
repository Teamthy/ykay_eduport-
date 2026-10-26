"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Layers3,
  LoaderCircle,
  Play,
  RotateCcw,
  Search,
  TimerOff,
} from "lucide-react";
import PersonalPracticeRunner from "@/components/cbt/PersonalPracticeRunner";

type PracticeMode = "topic" | "subject" | "mixed";
type ClassLevel = "jss1" | "jss2" | "jss3" | "ss1" | "ss2" | "ss3";
type PracticeTerm = "all" | "first" | "second" | "third";

type Subject = {
  id: string;
  slug: string;
  name: string;
  classLevel: ClassLevel;
  department: string | null;
  questionCount: number;
};

type ResumableSession = {
  id: string;
  classLevel: ClassLevel;
  practiceMode: PracticeMode;
  topic: string | null;
  term: Exclude<PracticeTerm, "all"> | null;
  subjectNames: string[];
  questionCount: number;
  isTimed: boolean;
  secondsLeft: number | null;
  createdAt: string;
};

const CLASSES: Array<{ value: ClassLevel; label: string }> = [
  { value: "jss1", label: "JSS 1" },
  { value: "jss2", label: "JSS 2" },
  { value: "jss3", label: "JSS 3" },
  { value: "ss1", label: "SS 1" },
  { value: "ss2", label: "SS 2" },
  { value: "ss3", label: "SS 3" },
];

const MODES: Array<{
  value: PracticeMode;
  title: string;
  description: string;
  icon: typeof BookOpen;
}> = [
  {
    value: "topic",
    title: "Topic focus",
    description: "Practise one topic in one subject, with instant answers and explanations.",
    icon: BookOpen,
  },
  {
    value: "subject",
    title: "Subject focus",
    description: "Draw a varied set across all reviewed topics in one subject.",
    icon: Layers3,
  },
  {
    value: "mixed",
    title: "Mixed-topic remix",
    description: "Mix topics across one or more subjects for a broader revision set.",
    icon: RotateCcw,
  },
];

function minutesAndSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

export default function PersonalPracticeFlow() {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<PracticeMode>("topic");
  const [classLevel, setClassLevel] = useState<ClassLevel>("jss1");
  const [term, setTerm] = useState<PracticeTerm>("all");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [topicSearch, setTopicSearch] = useState("");
  const [questionCount, setQuestionCount] = useState(30);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [resumableSessions, setResumableSessions] = useState<ResumableSession[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const selectedSubjects = useMemo(
    () => subjects.filter((subject) => selectedSlugs.includes(subject.slug)),
    [selectedSlugs, subjects],
  );
  const filteredSubjects = useMemo(() => {
    const query = subjectSearch.trim().toLowerCase();
    if (!query) return subjects;
    return subjects.filter((subject) =>
      `${subject.name} ${subject.department ?? ""}`.toLowerCase().includes(query),
    );
  }, [subjectSearch, subjects]);
  const filteredTopics = useMemo(() => {
    const query = topicSearch.trim().toLowerCase();
    return query ? topics.filter((topic) => topic.toLowerCase().includes(query)) : topics;
  }, [topicSearch, topics]);

  const loadResumableSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const response = await fetch("/api/cbt/sessions", { cache: "no-store" });
      const payload = (await response.json()) as { sessions?: ResumableSession[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to load saved practice sets.");
      setResumableSessions(payload.sessions ?? []);
    } catch {
      setResumableSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    const querySessionId = new URLSearchParams(window.location.search).get("session");
    // Restore a previously saved session from the URL on page entry.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (querySessionId) setSessionId(querySessionId);
    void loadResumableSessions();
  }, [loadResumableSessions]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadSubjects() {
      setLoadingSubjects(true);
      setSubjects([]);
      setSelectedSlugs([]);
      setSelectedTopic("");
      setTopics([]);
      setError("");
      try {
        const response = await fetch(`/api/cbt/subjects?classLevel=${classLevel}&term=${term}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as { subjects?: Subject[]; error?: string };
        if (!response.ok)
          throw new Error(payload.error || "Unable to load subjects for this class.");
        setSubjects(payload.subjects ?? []);
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load subjects.");
      } finally {
        if (!controller.signal.aborted) setLoadingSubjects(false);
      }
    }
    void loadSubjects();
    return () => controller.abort();
  }, [classLevel, term]);

  const selectedTopicSubject = mode === "topic" ? selectedSubjects[0] : null;
  useEffect(() => {
    if (step !== 4 || mode !== "topic" || !selectedTopicSubject) return;
    const controller = new AbortController();
    async function loadTopics() {
      setLoadingTopics(true);
      setTopics([]);
      setSelectedTopic("");
      setError("");
      try {
        const response = await fetch(
          `/api/cbt/topics?subject=${encodeURIComponent(selectedTopicSubject!.slug)}&term=${term}`,
          { cache: "no-store", signal: controller.signal },
        );
        const payload = (await response.json()) as { topics?: string[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "Unable to load topics.");
        setTopics(payload.topics ?? []);
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load topics.");
      } finally {
        if (!controller.signal.aborted) setLoadingTopics(false);
      }
    }
    void loadTopics();
    return () => controller.abort();
  }, [mode, selectedTopicSubject, step, term]);

  const chooseSubject = (subject: Subject) => {
    setSelectedSlugs((current) => {
      if (mode === "mixed") {
        return current.includes(subject.slug)
          ? current.filter((slug) => slug !== subject.slug)
          : [...current, subject.slug];
      }
      return [subject.slug];
    });
  };

  function goToSettings() {
    if (!selectedSubjects.length) {
      setError("Choose at least one subject to continue.");
      return;
    }
    setError("");
    setStep(mode === "topic" ? 4 : 5);
  }

  async function startPractice() {
    if (!selectedSubjects.length) return;
    if (mode === "topic" && !selectedTopic) {
      setError("Choose a topic before starting.");
      return;
    }
    setStarting(true);
    setError("");
    try {
      const response = await fetch("/api/cbt/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classLevel,
          practiceMode: mode,
          term,
          subjectSlugs: selectedSubjects.map((subject) => subject.slug),
          topic: mode === "topic" ? selectedTopic : null,
          questionCount,
          durationMinutes,
        }),
      });
      const payload = (await response.json()) as { sessionId?: string; error?: string };
      if (!response.ok || !payload.sessionId) {
        throw new Error(payload.error || "Unable to start this practice set.");
      }
      setSessionId(payload.sessionId);
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}?session=${payload.sessionId}`,
      );
      await loadResumableSessions();
    } catch (startError) {
      setError(
        startError instanceof Error ? startError.message : "Unable to start this practice set.",
      );
    } finally {
      setStarting(false);
    }
  }

  function exitSession() {
    setSessionId(null);
    window.history.replaceState(null, "", window.location.pathname);
    setStep(0);
    void loadResumableSessions();
  }

  if (sessionId) {
    return <PersonalPracticeRunner key={sessionId} sessionId={sessionId} onExit={exitSession} />;
  }

  const totalSteps = mode === "topic" ? 6 : 5;
  const currentStep = step + 1;

  return (
    <div className="space-y-6">
      {resumableSessions.length ? (
        <section className="rounded-[1.7rem] border border-brand-orange/30 bg-brand-orange/5 p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-orange">
                Pick up where you left off
              </p>
              <h2 className="mt-1 font-display text-2xl text-[var(--text-primary)]">
                Saved practice sets
              </h2>
            </div>
            {loadingSessions ? (
              <LoaderCircle size={18} className="animate-spin text-brand-orange" />
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {resumableSessions.map((saved) => (
              <article
                key={saved.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                    {saved.classLevel.toUpperCase()} · {saved.subjectNames.join(", ") || "Practice"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {saved.term ? `${saved.term} term · ` : "All terms · "}
                    {saved.practiceMode === "topic"
                      ? saved.topic
                      : saved.practiceMode === "mixed"
                        ? "Mixed-topic remix"
                        : "Subject focus"}
                    {" · "}
                    {saved.questionCount} questions
                    {saved.isTimed && saved.secondsLeft !== null
                      ? ` · ${minutesAndSeconds(saved.secondsLeft)} left`
                      : " · Untimed"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSessionId(saved.id);
                    window.history.replaceState(
                      null,
                      "",
                      `${window.location.pathname}?session=${saved.id}`,
                    );
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-navy px-4 py-2 text-xs font-bold text-white"
                >
                  <Play size={13} fill="currentColor" /> Resume
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)] md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">
              Personal CBT practice
            </p>
            <h2 className="mt-1 font-display text-3xl text-[var(--text-primary)]">
              Build your own practice set
            </h2>
          </div>
          <p className="rounded-full bg-[var(--bg-secondary)] px-3 py-2 text-xs font-bold text-[var(--text-muted)]">
            Step {currentStep} of {totalSteps}
          </p>
        </div>

        <div className="mt-5 flex gap-1" aria-label="Practice setup progress">
          {Array.from({ length: totalSteps }, (_, index) => (
            <span
              key={index}
              className={`h-1.5 flex-1 rounded-full ${index < currentStep ? "bg-brand-green" : "bg-[var(--bg-secondary)]"}`}
            />
          ))}
        </div>

        {step === 0 ? (
          <div className="mt-7">
            <h3 className="font-display text-2xl text-[var(--text-primary)]">
              Choose a practice mode
            </h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Every set is drawn from reviewed curriculum questions and can be resumed later.
            </p>
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {MODES.map((option) => {
                const Icon = option.icon;
                const isSelected = mode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMode(option.value)}
                    className={`rounded-2xl border p-5 text-left transition ${isSelected ? "border-brand-green bg-brand-green/5 ring-1 ring-brand-green/20" : "border-[var(--border-subtle)] hover:border-brand-green/30"}`}
                  >
                    <span className="flex items-center justify-between">
                      <Icon
                        size={20}
                        className={isSelected ? "text-brand-green" : "text-[var(--text-muted)]"}
                      />
                      {isSelected ? <Check size={17} className="text-brand-green" /> : null}
                    </span>
                    <span className="mt-4 block text-base font-bold text-[var(--text-primary)]">
                      {option.title}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-[var(--text-muted)]">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="mt-7">
            <h3 className="font-display text-2xl text-[var(--text-primary)]">Select a class</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Choose the curriculum level you want to revise.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {CLASSES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setClassLevel(option.value)}
                  className={`rounded-2xl border px-4 py-5 text-center font-display text-xl ${classLevel === option.value ? "border-brand-green bg-brand-green/5 text-brand-green" : "border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-brand-green/30"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-7">
            <h3 className="font-display text-2xl text-[var(--text-primary)]">Choose a term</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Filter the reviewed question bank by the term in the supplied scheme. Unassigned
              legacy questions appear under all terms only.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ["all", "All terms"],
                  ["first", "First term"],
                  ["second", "Second term"],
                  ["third", "Third term"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={term === value}
                  onClick={() => setTerm(value)}
                  className={`rounded-2xl border px-4 py-5 text-left font-bold ${term === value ? "border-brand-green bg-brand-green/5 text-brand-green" : "border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-brand-green/30"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl text-[var(--text-primary)]">
                  Choose subject{mode === "mixed" ? "s" : ""}
                </h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {mode === "mixed"
                    ? "Select one or more subjects for a mixed-topic remix."
                    : "Pick one subject. Use search to find it quickly."}
                </p>
              </div>
              <label className="relative w-full sm:w-64">
                <span className="sr-only">Search subjects</span>
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  type="search"
                  value={subjectSearch}
                  onChange={(event) => setSubjectSearch(event.target.value)}
                  placeholder="Search subjects…"
                  className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] py-2.5 pl-9 pr-3 text-sm text-[var(--input-text)]"
                />
              </label>
            </div>

            {loadingSubjects ? (
              <div className="mt-6 flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <LoaderCircle size={17} className="animate-spin" /> Loading reviewed subjects…
              </div>
            ) : subjects.length ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredSubjects.map((subject) => {
                  const selected = selectedSlugs.includes(subject.slug);
                  return (
                    <button
                      key={subject.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => chooseSubject(subject)}
                      className={`flex min-h-24 items-start gap-3 rounded-2xl border p-4 text-left ${selected ? "border-brand-green bg-brand-green/5" : "border-[var(--border-subtle)] hover:border-brand-green/30"}`}
                    >
                      <span
                        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border ${selected ? "border-brand-green bg-brand-green text-brand-navy" : "border-[var(--border-subtle)] text-transparent"}`}
                      >
                        <Check size={13} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-[var(--text-primary)]">
                          {subject.name}
                        </span>
                        <span className="mt-1 block text-xs text-[var(--text-muted)]">
                          {subject.questionCount.toLocaleString()} reviewed questions
                        </span>
                        {subject.department ? (
                          <span className="mt-1 block text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                            {subject.department}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
                {!filteredSubjects.length ? (
                  <p className="text-sm text-[var(--text-muted)]">No subjects match your search.</p>
                ) : null}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-[var(--bg-secondary)] p-5 text-sm text-[var(--text-muted)]">
                <p className="font-semibold text-[var(--text-primary)]">
                  No reviewed questions for {classLevel.toUpperCase()} in{" "}
                  {term === "all" ? "all terms" : `${term} term`} yet
                </p>
                <p className="mt-2 leading-relaxed">
                  Practice sets use reviewed questions assigned to the selected term. Legacy
                  questions without a verified term assignment appear only when All terms is
                  selected. If this class and term have an imported bank waiting, an administrator
                  can release it from the CBT question bank after review.
                </p>
              </div>
            )}
            {selectedSubjects.length ? (
              <p className="mt-4 text-xs text-brand-green">
                Selected: {selectedSubjects.map((subject) => subject.name).join(", ")}
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 4 && mode === "topic" ? (
          <div className="mt-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl text-[var(--text-primary)]">Choose a topic</h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Topics for {selectedTopicSubject?.name || "your subject"}.
                </p>
              </div>
              <label className="relative w-full sm:w-64">
                <span className="sr-only">Search topics</span>
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  type="search"
                  value={topicSearch}
                  onChange={(event) => setTopicSearch(event.target.value)}
                  placeholder="Search topics…"
                  className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] py-2.5 pl-9 pr-3 text-sm text-[var(--input-text)]"
                />
              </label>
            </div>
            {loadingTopics ? (
              <div className="mt-6 flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <LoaderCircle size={17} className="animate-spin" /> Loading topics…
              </div>
            ) : topics.length ? (
              <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {filteredTopics.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setSelectedTopic(topic)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold ${selectedTopic === topic ? "border-brand-green bg-brand-green/5 text-brand-green" : "border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-brand-green/30"}`}
                  >
                    {topic}
                  </button>
                ))}
                {!filteredTopics.length ? (
                  <p className="text-sm text-[var(--text-muted)]">No topics match your search.</p>
                ) : null}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-[var(--bg-secondary)] p-5 text-sm text-[var(--text-muted)]">
                No reviewed topics are available for this subject yet.
              </div>
            )}
          </div>
        ) : null}

        {step === 5 ? (
          <div className="mt-7">
            <h3 className="font-display text-2xl text-[var(--text-primary)]">
              Set practice length
            </h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Each practice set is limited to 60 questions. Your answers save as you go.
            </p>
            <div className="mt-5 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border-subtle)] p-5">
                <label
                  htmlFor="practice-question-count"
                  className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]"
                >
                  Question count
                </label>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    id="practice-question-count"
                    type="range"
                    min={1}
                    max={60}
                    value={questionCount}
                    onChange={(event) =>
                      setQuestionCount(Math.min(60, Math.max(1, Number(event.target.value))))
                    }
                    className="w-full accent-emerald-600"
                  />
                  <input
                    aria-label="Number of practice questions"
                    type="number"
                    min={1}
                    max={60}
                    value={questionCount}
                    onChange={(event) =>
                      setQuestionCount(Math.min(60, Math.max(1, Number(event.target.value) || 1)))
                    }
                    className="w-20 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-center font-bold text-[var(--input-text)]"
                  />
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  The server enforces the 60-question maximum.
                </p>
              </div>

              <fieldset className="rounded-2xl border border-[var(--border-subtle)] p-5">
                <legend className="px-1 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                  Timer
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[0, 10, 15, 20, 30, 45].map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      aria-pressed={durationMinutes === minutes}
                      onClick={() => setDurationMinutes(minutes)}
                      className={`rounded-full border px-3 py-2 text-xs font-bold ${durationMinutes === minutes ? "border-brand-green bg-brand-green text-brand-navy" : "border-[var(--border-subtle)] text-[var(--text-primary)]"}`}
                    >
                      {minutes === 0 ? (
                        <>
                          <TimerOff size={13} className="mr-1 inline" />
                          Untimed
                        </>
                      ) : (
                        <>
                          <Clock3 size={13} className="mr-1 inline" />
                          {minutes} min
                        </>
                      )}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-[var(--text-muted)]">
                  Timed sets submit automatically when time runs out.
                </p>
              </fieldset>
            </div>

            <div className="mt-5 rounded-2xl bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-muted)]">
              <p className="font-bold text-[var(--text-primary)]">Set summary</p>
              <p className="mt-1">
                {classLevel.toUpperCase()} · {term === "all" ? "All terms" : `${term} term`} ·{" "}
                {selectedSubjects.map((subject) => subject.name).join(", ")}
                {mode === "topic" ? ` · ${selectedTopic}` : ""}
              </p>
              <p className="mt-1">
                Up to {questionCount} questions ·{" "}
                {durationMinutes ? `${durationMinutes} minute timer` : "untimed"}
              </p>
            </div>
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-5">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => {
                setError("");
                if (step === 5 && mode !== "topic") setStep(3);
                else setStep((current) => Math.max(0, current - 1));
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-5 py-2.5 text-sm font-bold text-[var(--text-primary)]"
            >
              <ArrowLeft size={15} /> Back
            </button>
          ) : (
            <span />
          )}

          {step < 2 ? (
            <button
              type="button"
              onClick={() => {
                setError("");
                setStep((current) => current + 1);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-brand-navy px-5 py-2.5 text-sm font-bold text-white"
            >
              Continue <ArrowRight size={15} />
            </button>
          ) : null}
          {step === 2 ? (
            <button
              type="button"
              onClick={() => {
                setError("");
                setStep(3);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-brand-navy px-5 py-2.5 text-sm font-bold text-white"
            >
              Continue <ArrowRight size={15} />
            </button>
          ) : null}
          {step === 3 ? (
            <button
              type="button"
              onClick={goToSettings}
              disabled={loadingSubjects || !selectedSubjects.length}
              className="inline-flex items-center gap-2 rounded-full bg-brand-navy px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              Continue <ArrowRight size={15} />
            </button>
          ) : null}
          {step === 4 && mode === "topic" ? (
            <button
              type="button"
              onClick={() => {
                setError("");
                setStep(5);
              }}
              disabled={!selectedTopic || loadingTopics}
              className="inline-flex items-center gap-2 rounded-full bg-brand-navy px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              Continue <ArrowRight size={15} />
            </button>
          ) : null}
          {step === 5 ? (
            <button
              type="button"
              onClick={() => void startPractice()}
              disabled={
                starting || !selectedSubjects.length || (mode === "topic" && !selectedTopic)
              }
              className="inline-flex items-center gap-2 rounded-full bg-brand-green px-6 py-2.5 text-sm font-bold text-brand-navy disabled:opacity-50"
            >
              {starting ? (
                <LoaderCircle size={15} className="animate-spin" />
              ) : (
                <Play size={15} fill="currentColor" />
              )}
              Start practice
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
