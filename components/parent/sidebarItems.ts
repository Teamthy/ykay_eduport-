import {
  Award,
  Calendar,
  CalendarDays,
  CreditCard,
  FileText,
  LayoutDashboard,
  MessageCircle,
  Trophy,
} from "lucide-react";

/** Shared parent navigation so every portal page exposes the same routes. */
export const PARENT_SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/parent/dashboard", icon: LayoutDashboard },
  { label: "Attendance", href: "/parent/attendance", icon: CalendarDays },
  { label: "Fees", href: "/parent/fees", icon: CreditCard },
  { label: "Report Cards", href: "/parent/report-cards", icon: FileText },
  { label: "Exam Results", href: "/parent/exam-results", icon: Award },
  { label: "Rankings", href: "/parent/leaderboards", icon: Trophy },
  { label: "Messages", href: "/parent/messages", icon: MessageCircle },
  { label: "Events", href: "/parent/events", icon: Calendar },
];
