export type MessageCategory = "parent" | "student" | "admin" | "colleague";
export type MessagePriority = "normal" | "urgent";

export interface Message {
  id: string;
  from: {
    name: string;
    role: string;
    avatar: string;
    userId: string;
  };
  to: {
    name: string;
    userId: string;
  };
  subject: string;
  body: string;
  preview: string;
  category: MessageCategory;
  priority: MessagePriority;
  unread: boolean;
  starred: boolean;
  attachments?: { name: string; size: string; type: string }[];
  time: string;
  timestamp: number;
  thread?: MessageReply[];
}

export interface MessageReply {
  id: string;
  from: string;
  fromRole: string;
  avatar: string;
  body: string;
  time: string;
}

export const TEACHER_MESSAGES: Message[] = [
  {
    id: "1",
    from: { name: "Mrs. Chinwe Ogunlade", role: "Parent (Adeola)", avatar: "CO", userId: "P001" },
    to: { name: "Dr. Grace Okonkwo", userId: "T001" },
    subject: "Question about Adeola's Math homework",
    body: "Good afternoon Dr. Grace, I hope this message finds you well. I wanted to inquire about the extra homework you assigned last Friday. Adeola mentioned it was quite challenging and she wasn't able to complete the last two questions. Could you kindly provide some guidance or perhaps we could arrange a brief tutoring session?\n\nAdeola has been working diligently but is struggling with the quadratic equations chapter. Any support would be greatly appreciated.\n\nBest regards,\nMrs. Chinwe Ogunlade",
    preview: "Good afternoon Dr. Grace, I wanted to inquire about the extra homework...",
    category: "parent",
    priority: "normal",
    unread: true,
    starred: false,
    time: "10 min ago",
    timestamp: Date.now() - 600000,
    thread: [],
  },
  {
    id: "2",
    from: { name: "Admin Office", role: "School Administration", avatar: "AO", userId: "A001" },
    to: { name: "Dr. Grace Okonkwo", userId: "T001" },
    subject: "URGENT: Term Report Card Submission Deadline",
    body: "Dear Dr. Grace,\n\nThis is a reminder that all First Term 2025/2026 report cards must be submitted by Friday, July 25th at 5:00 PM. Please ensure you have:\n\n1. Entered all CA and exam scores\n2. Added class teacher remarks (for SS2A)\n3. Reviewed each student's overall performance\n4. Submitted through the portal\n\nFailure to meet the deadline will delay the school-wide report card release.\n\nBest regards,\nAdmin Office",
    preview: "URGENT: All report cards must be submitted by Friday, July 25th...",
    category: "admin",
    priority: "urgent",
    unread: true,
    starred: true,
    time: "2 hours ago",
    timestamp: Date.now() - 7200000,
    thread: [],
  },
  {
    id: "3",
    from: { name: "Emmanuel Adebayo", role: "Student (SS2A)", avatar: "EA", userId: "S002" },
    to: { name: "Dr. Grace Okonkwo", userId: "T001" },
    subject: "Request for Extra Physics Class",
    body: "Good morning Ma,\n\nI would like to request an extra Physics class this week to review the chapter on Electromagnetic Induction. I'm preparing for the upcoming JAMB exams and want to make sure I understand it thoroughly.\n\nWould you be available on Wednesday or Thursday after school?\n\nThank you,\nEmmanuel",
    preview: "I would like to request an extra Physics class...",
    category: "student",
    priority: "normal",
    unread: false,
    starred: false,
    time: "5 hours ago",
    timestamp: Date.now() - 18000000,
    thread: [
      {
        id: "r1",
        from: "Dr. Grace Okonkwo",
        fromRole: "Teacher",
        avatar: "GO",
        body: "Hi Emmanuel, I'd be happy to help. Let's meet Thursday after school in Lab 1 at 3 PM. Please bring your JAMB textbook.",
        time: "4 hours ago",
      },
      {
        id: "r2",
        from: "Emmanuel Adebayo",
        fromRole: "Student",
        avatar: "EA",
        body: "Thank you Ma. I'll be there.",
        time: "3 hours ago",
      },
    ],
  },
  {
    id: "4",
    from: { name: "Mr. Tunde Bakare", role: "Fellow Teacher", avatar: "TB", userId: "T002" },
    to: { name: "Dr. Grace Okonkwo", userId: "T001" },
    subject: "Collaboration on Cross-Subject Project",
    body: "Hi Grace,\n\nI've been thinking about how we could design a joint project between Mathematics and English Literature — something that helps students see how logical structure applies to both subjects. What do you think about a project on 'Mathematical Patterns in Poetry'?\n\nLet me know if you're interested.\n\nTunde",
    preview: "I've been thinking about how we could design a joint project...",
    category: "colleague",
    priority: "normal",
    unread: false,
    starred: false,
    time: "Yesterday",
    timestamp: Date.now() - 86400000,
    thread: [],
  },
  {
    id: "5",
    from: { name: "Mr. Femi Adeleke", role: "Parent (Chidi)", avatar: "FA", userId: "P002" },
    to: { name: "Dr. Grace Okonkwo", userId: "T001" },
    subject: "Concern about Chidi's Recent Performance",
    body: "Dear Dr. Grace,\n\nMy wife and I have noticed a decline in Chidi's Mathematics scores this term. Could we schedule a meeting to discuss what we can do to support him at home? We're very concerned and want to intervene early.\n\nWe're available any weekday after 4 PM.\n\nBest regards,\nFemi",
    preview: "My wife and I have noticed a decline in Chidi's Mathematics scores...",
    category: "parent",
    priority: "urgent",
    unread: true,
    starred: false,
    time: "Yesterday",
    timestamp: Date.now() - 90000000,
    thread: [],
  },
  {
    id: "6",
    from: { name: "Mrs. Amina Sule", role: "Fellow Teacher", avatar: "AS", userId: "T003" },
    to: { name: "Dr. Grace Okonkwo", userId: "T001" },
    subject: "Chemistry Lab equipment needed",
    body: "Hi Grace,\n\nCould you check if the Physics lab has extra beakers we could borrow? The Chemistry lab is running low.\n\nThanks!",
    preview: "Could you check if the Physics lab has extra beakers...",
    category: "colleague",
    priority: "normal",
    unread: false,
    starred: false,
    time: "2 days ago",
    timestamp: Date.now() - 172800000,
    thread: [],
  },
  {
    id: "7",
    from: { name: "Fatima Yusuf", role: "Student (SS2A)", avatar: "FY", userId: "S018" },
    to: { name: "Dr. Grace Okonkwo", userId: "T001" },
    subject: "Thank you for the recommendation letter",
    body: "Good day Ma,\n\nI wanted to express my sincere gratitude for the recommendation letter you wrote for my scholarship application. I received acceptance today!\n\nThank you for believing in me.\n\nFatima",
    preview: "I wanted to express my sincere gratitude for the recommendation letter...",
    category: "student",
    priority: "normal",
    unread: false,
    starred: true,
    time: "3 days ago",
    timestamp: Date.now() - 259200000,
    thread: [],
  },
];

// Attendance History Data
export interface AttendanceHistoryDay {
  date: string;
  status: "Present" | "Absent" | "Late" | "Holiday" | "Weekend";
  presentCount?: number;
  absentCount?: number;
  lateCount?: number;
  totalStudents?: number;
  note?: string;
}

export function generateAttendanceHistory(month: number, year: number): AttendanceHistoryDay[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const history: AttendanceHistoryDay[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split("T")[0];

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      history.push({ date: dateStr, status: "Weekend" });
      continue;
    }

    // Fake some holidays
    if (day === 4 || day === 15) {
      history.push({
        date: dateStr,
        status: "Holiday",
        note: day === 4 ? "Mid-Term Break" : "Public Holiday",
      });
      continue;
    }

    // Random past days
    if (date <= new Date()) {
      const total = 32;
      const absent = Math.floor(Math.random() * 4);
      const late = Math.floor(Math.random() * 3);
      const present = total - absent - late;
      const status = absent > 2 ? "Absent" : late > 1 ? "Late" : "Present";
      history.push({
        date: dateStr,
        status,
        presentCount: present,
        absentCount: absent,
        lateCount: late,
        totalStudents: total,
      });
    }
  }

  return history;
}
