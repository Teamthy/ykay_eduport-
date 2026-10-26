import Link from "next/link";
import { Award, CalendarCheck, ClipboardCheck, Trophy } from "lucide-react";

type Flow = "take" | "ca" | "practice" | "teacher-practice" | "leaderboards";

const FLOWS: Array<{ id: Flow; label: string; href: string; icon: typeof ClipboardCheck }> = [
  { id: "take", label: "Take Exams", href: "/student/exams", icon: ClipboardCheck },
  { id: "ca", label: "CA Test", href: "/student/ca-tests", icon: CalendarCheck },
  { id: "practice", label: "Personal Practice", href: "/student/personal-practice", icon: Award },
  {
    id: "teacher-practice",
    label: "Teacher Practice Sets",
    href: "/student/waec-practice",
    icon: ClipboardCheck,
  },
  { id: "leaderboards", label: "Leaderboards", href: "/student/leaderboards", icon: Trophy },
];

export default function StudentCbtNav({ active }: { active: Flow }) {
  return (
    <nav
      aria-label="Student CBT tests"
      className="flex flex-wrap gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-2"
    >
      {FLOWS.filter((flow) => flow.id !== active).map((flow) => {
        const Icon = flow.icon;
        const selected = flow.id === active;
        return (
          <Link
            key={flow.id}
            href={flow.href}
            aria-current={selected ? "page" : undefined}
            className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
              selected
                ? "bg-brand-green text-brand-navy"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Icon size={15} aria-hidden="true" />
            {flow.label}
          </Link>
        );
      })}
    </nav>
  );
}
