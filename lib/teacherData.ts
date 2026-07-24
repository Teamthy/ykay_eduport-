// Teacher-specific mock data with role system

export type TeacherRole = "subject_teacher" | "class_teacher" | "both";

export interface TeacherSubjectAssignment {
  subject: string;
  classes: string[]; // e.g., ["SS1A", "SS1B", "SS2A"]
}

export interface Teacher {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  photoUrl: string;
  role: TeacherRole;
  bio: string;
  qualification: string;
  employmentDate: string;
  department?: string;
  status: "Active" | "On Leave" | "Suspended";

  // Subject Teacher assignments
  subjectAssignments: TeacherSubjectAssignment[];

  // Class Teacher assignment (only one class)
  formClass?: string; // e.g., "SS2A"
  formClassStudentCount?: number;

  // Stats
  totalStudentsTaught: number;
  totalSubjects: number;
  totalClasses: number;
}

export const CURRENT_TEACHER: Teacher = {
  id: "TCH-001",
  userId: "USR-TCH-001",
  firstName: "Grace",
  lastName: "Okonkwo",
  fullName: "Dr. Grace Okonkwo",
  email: "grace.o@ykaycollege.com",
  phone: "0803 456 7890",
  photoUrl:
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
  role: "both", // Subject teacher AND Form teacher
  bio: "Passionate educator with over 12 years of experience in Mathematics and Physics. Committed to nurturing analytical minds and future problem-solvers.",
  qualification: "PhD in Mathematics Education, University of Ibadan",
  employmentDate: "2016-09-01",
  department: "Sciences",
  status: "Active",
  subjectAssignments: [
    { subject: "Mathematics", classes: ["JSS1A", "JSS2A", "SS1A", "SS2A", "SS2B"] },
    { subject: "Physics", classes: ["SS2A", "SS2B", "SS3A"] },
  ],
  formClass: "SS2A",
  formClassStudentCount: 32,
  totalStudentsTaught: 145,
  totalSubjects: 2,
  totalClasses: 6,
};

// Sample subject teacher (no form class)
export const SAMPLE_SUBJECT_TEACHER: Teacher = {
  id: "TCH-002",
  userId: "USR-TCH-002",
  firstName: "Tunde",
  lastName: "Bakare",
  fullName: "Mr. Tunde Bakare",
  email: "tunde.b@ykaycollege.com",
  phone: "0805 234 5678",
  photoUrl:
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
  role: "subject_teacher",
  bio: "English Literature enthusiast committed to fostering critical thinking through the study of classical and contemporary literature.",
  qualification: "MA English Literature, University of Lagos",
  employmentDate: "2018-01-15",
  department: "Humanities",
  status: "Active",
  subjectAssignments: [
    { subject: "English Literature", classes: ["SS1A", "SS1B", "SS2A", "SS2B", "SS3A"] },
    { subject: "History", classes: ["JSS3A", "SS1A"] },
  ],
  totalStudentsTaught: 168,
  totalSubjects: 2,
  totalClasses: 7,
};

// Sample class teacher only (no subjects)
export const SAMPLE_CLASS_TEACHER: Teacher = {
  id: "TCH-003",
  userId: "USR-TCH-003",
  firstName: "Kolawole",
  lastName: "Adeyemi",
  fullName: "Mr. Kolawole Adeyemi",
  email: "kolawole.a@ykaycollege.com",
  phone: "0807 890 1234",
  photoUrl:
    "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80",
  role: "class_teacher",
  bio: "Dedicated to nurturing well-rounded individuals with strong moral character and academic excellence.",
  qualification: "B.Ed Educational Management, University of Ibadan",
  employmentDate: "2019-09-15",
  department: "Junior School",
  status: "Active",
  subjectAssignments: [
    { subject: "Basic Science", classes: ["JSS1A"] },
    { subject: "ICT", classes: ["JSS1A", "JSS2A"] },
  ],
  formClass: "JSS1A",
  formClassStudentCount: 28,
  totalStudentsTaught: 56,
  totalSubjects: 2,
  totalClasses: 3,
};

// Form class students (for Class Teacher view)
export interface FormClassStudent {
  id: string;
  studentId: string;
  name: string;
  gender: "Male" | "Female";
  photoUrl: string;
  attendanceRate: number;
  overallGrade: string;
  behaviorScore: number;
  parentContact: string;
  status: "Excellent" | "Good" | "Needs Attention";
}

export const FORM_CLASS_STUDENTS: FormClassStudent[] = [
  {
    id: "1",
    studentId: "YKC/2025/002",
    name: "Emmanuel Adebayo",
    gender: "Male",
    photoUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
    attendanceRate: 96,
    overallGrade: "A1",
    behaviorScore: 92,
    parentContact: "0802 123 4567",
    status: "Excellent",
  },
  {
    id: "2",
    studentId: "YKC/2025/007",
    name: "Blessing Eze",
    gender: "Female",
    photoUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
    attendanceRate: 88,
    overallGrade: "B2",
    behaviorScore: 85,
    parentContact: "0803 987 6543",
    status: "Good",
  },
  {
    id: "3",
    studentId: "YKC/2025/012",
    name: "Chinedu Okoro",
    gender: "Male",
    photoUrl:
      "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80",
    attendanceRate: 72,
    overallGrade: "C5",
    behaviorScore: 68,
    parentContact: "0705 112 2334",
    status: "Needs Attention",
  },
  {
    id: "4",
    studentId: "YKC/2025/018",
    name: "Fatima Yusuf",
    gender: "Female",
    photoUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
    attendanceRate: 94,
    overallGrade: "A1",
    behaviorScore: 96,
    parentContact: "0806 445 5566",
    status: "Excellent",
  },
  {
    id: "5",
    studentId: "YKC/2025/024",
    name: "David Okoye",
    gender: "Male",
    photoUrl:
      "https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?auto=format&fit=crop&w=200&q=80",
    attendanceRate: 90,
    overallGrade: "B2",
    behaviorScore: 88,
    parentContact: "0808 771 8899",
    status: "Good",
  },
  {
    id: "6",
    studentId: "YKC/2025/029",
    name: "Aisha Ibrahim",
    gender: "Female",
    photoUrl:
      "https://images.unsplash.com/photo-1614289371518-722f2615943d?auto=format&fit=crop&w=200&q=80",
    attendanceRate: 85,
    overallGrade: "B3",
    behaviorScore: 82,
    parentContact: "0809 445 6677",
    status: "Good",
  },
];

// Behavior records
export interface BehaviorRecord {
  id: string;
  studentName: string;
  studentId: string;
  type: "Commendation" | "Warning" | "Note";
  category: string;
  description: string;
  date: string;
  reportedBy: string;
  parentNotified: boolean;
}

export const BEHAVIOR_RECORDS: BehaviorRecord[] = [
  {
    id: "1",
    studentName: "Emmanuel Adebayo",
    studentId: "YKC/2025/002",
    type: "Commendation",
    category: "Academic Excellence",
    description: "Outstanding performance in Mathematics test - scored 98%.",
    date: "2025-07-18",
    reportedBy: "Dr. Grace Okonkwo",
    parentNotified: true,
  },
  {
    id: "2",
    studentName: "Chinedu Okoro",
    studentId: "YKC/2025/012",
    type: "Warning",
    category: "Punctuality",
    description: "Late to class for the third time this week. Meeting scheduled with parent.",
    date: "2025-07-17",
    reportedBy: "Dr. Grace Okonkwo",
    parentNotified: true,
  },
  {
    id: "3",
    studentName: "Fatima Yusuf",
    studentId: "YKC/2025/018",
    type: "Commendation",
    category: "Leadership",
    description: "Elected as class prefect. Excellent organizational skills.",
    date: "2025-07-15",
    reportedBy: "Dr. Grace Okonkwo",
    parentNotified: false,
  },
  {
    id: "4",
    studentName: "Blessing Eze",
    studentId: "YKC/2025/007",
    type: "Note",
    category: "Health",
    description: "Complained of frequent headaches. Recommended visit to school nurse.",
    date: "2025-07-14",
    reportedBy: "Dr. Grace Okonkwo",
    parentNotified: true,
  },
];

// Class announcements
export interface ClassAnnouncement {
  id: string;
  title: string;
  body: string;
  audience: "Class Only" | "Parents Only" | "Both";
  date: string;
  postedBy: string;
  read: number;
  total: number;
}

export const CLASS_ANNOUNCEMENTS: ClassAnnouncement[] = [
  {
    id: "1",
    title: "Mid-Term Test Schedule Released",
    body: "Please note that our mid-term tests begin Monday, August 4th. Kindly review the timetable and prepare accordingly.",
    audience: "Both",
    date: "2025-07-19",
    postedBy: "Dr. Grace Okonkwo",
    read: 28,
    total: 32,
  },
  {
    id: "2",
    title: "Class Photo Day",
    body: "Class photo day is scheduled for Friday. Please come in complete school uniform.",
    audience: "Class Only",
    date: "2025-07-17",
    postedBy: "Dr. Grace Okonkwo",
    read: 30,
    total: 32,
  },
  {
    id: "3",
    title: "PTM Confirmation",
    body: "Parent-Teacher Meeting confirmed for Saturday 26th July at 10 AM. Kindly confirm your attendance.",
    audience: "Parents Only",
    date: "2025-07-15",
    postedBy: "Dr. Grace Okonkwo",
    read: 24,
    total: 30,
  },
];
