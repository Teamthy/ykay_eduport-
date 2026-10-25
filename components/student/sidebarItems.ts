import {
  Award,
  Bell,
  BookOpen,
  CalendarDays,
  CalendarClock,
  ClipboardCheck,
  FileText,
  GraduationCap,
  IdCard,
  LayoutDashboard,
  MessageCircle,
  Trophy,
  User,
} from "lucide-react";

/** Shared student routes, including the new personal practice and standings pages. */
export const STUDENT_SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
  { label: "Take Exams", href: "/student/exams", icon: ClipboardCheck },
  { label: "CA Test", href: "/student/ca-tests", icon: ClipboardCheck },
  { label: "Personal Practice", href: "/student/personal-practice", icon: Award },
  { label: "Teacher Practice Sets", href: "/student/waec-practice", icon: BookOpen },
  { label: "Leaderboards", href: "/student/leaderboards", icon: Trophy },
  { label: "Attendance", href: "/student/attendance", icon: CalendarDays },
  { label: "Timetable", href: "/student/timetable", icon: CalendarClock },
  { label: "Report Cards", href: "/student/report-cards", icon: FileText },
  { label: "Messages", href: "/student/messages", icon: MessageCircle },
  { label: "Announcements", href: "/student/announcements", icon: Bell },
  { label: "My Profile", href: "/student/profile", icon: User },
  { label: "Teachers", href: "/student/teachers", icon: GraduationCap },
  { label: "ID Card", href: "/student/id-card", icon: IdCard },
];
