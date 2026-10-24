export const DEMO_EMAIL_DOMAIN = "demo.example.invalid";

export const DEMO_ROLE_COUNTS = {
  SUPER_ADMIN: 1,
  ADMIN: 1,
  DIRECTOR: 1,
  BURSAR: 1,
  COORDINATOR: 1,
  HOD: 1,
  TEACHER: 5,
  PARENT: 10,
  STUDENT: 50,
  IT_STUDENT: 1,
} as const;

export type DemoRole = keyof typeof DEMO_ROLE_COUNTS;

export type DemoAccount = {
  email: string;
  name: string;
  role: DemoRole;
};

const demoEmail = (localPart: string) => `${localPart}@${DEMO_EMAIL_DOMAIN}`;

export const DEMO_STAFF_ACCOUNTS: DemoAccount[] = [
  { email: demoEmail("super-admin"), name: "Demo Super Admin", role: "SUPER_ADMIN" },
  { email: demoEmail("admin"), name: "Demo School Admin", role: "ADMIN" },
  { email: demoEmail("director"), name: "Demo Director", role: "DIRECTOR" },
  { email: demoEmail("bursar"), name: "Demo Bursar", role: "BURSAR" },
  { email: demoEmail("coordinator"), name: "Demo Coordinator", role: "COORDINATOR" },
  { email: demoEmail("hod"), name: "Demo Head of Department", role: "HOD" },
  { email: demoEmail("it-student"), name: "Demo IT Student", role: "IT_STUDENT" },
];

export type DemoTeacher = {
  email: string;
  name: string;
  role: "TEACHER" | "HOD";
  roleLabel: string;
  subject: string;
};

export const DEMO_TEACHERS: DemoTeacher[] = [
  {
    email: demoEmail("hod"),
    name: "Demo Head of Department",
    role: "HOD",
    roleLabel: "Head of Department",
    subject: "Mathematics",
  },
  ...Array.from({ length: DEMO_ROLE_COUNTS.TEACHER }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    const subjects = [
      "English Studies",
      "Mathematics",
      "Digital Technologies",
      "Biology",
      "Chemistry",
    ];
    return {
      email: demoEmail(`teacher${number}`),
      name: `Demo Teacher ${number}`,
      role: "TEACHER" as const,
      roleLabel: "Subject Teacher",
      subject: subjects[index],
    };
  }),
];

export type DemoParent = {
  email: string;
  name: string;
  index: number;
};

export const DEMO_PARENTS: DemoParent[] = Array.from(
  { length: DEMO_ROLE_COUNTS.PARENT },
  (_, index) => {
    const number = String(index + 1).padStart(3, "0");
    return {
      email: demoEmail(`parent${number}`),
      name: `Demo Parent ${number}`,
      index,
    };
  },
);

export const DEMO_CLASS_LEVELS = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"] as const;
export const DEMO_CLASS_ARMS = ["A", "B"] as const;

export type DemoStudent = {
  email: string;
  studentId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  gender: "Female" | "Male";
  classLevel: (typeof DEMO_CLASS_LEVELS)[number];
  arm: (typeof DEMO_CLASS_ARMS)[number];
  parentEmail: string;
  parentName: string;
};

export const DEMO_STUDENTS: DemoStudent[] = Array.from(
  { length: DEMO_ROLE_COUNTS.STUDENT },
  (_, index) => {
    const number = String(index + 1).padStart(3, "0");
    const parent = DEMO_PARENTS[Math.floor(index / 5)];
    const classSlot = index % (DEMO_CLASS_LEVELS.length * DEMO_CLASS_ARMS.length);
    const firstName = "Demo";
    const lastName = `Student ${number}`;

    return {
      email: demoEmail(`student${number}`),
      studentId: `DEMO/2026/${number}`,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      gender: index % 2 === 0 ? "Female" : "Male",
      classLevel: DEMO_CLASS_LEVELS[classSlot % DEMO_CLASS_LEVELS.length],
      arm: DEMO_CLASS_ARMS[Math.floor(classSlot / DEMO_CLASS_LEVELS.length)],
      parentEmail: parent.email,
      parentName: parent.name,
    };
  },
);

export function getDemoRoleCounts(accounts: DemoAccount[]): Partial<Record<DemoRole, number>> {
  return accounts.reduce<Partial<Record<DemoRole, number>>>((counts, account) => {
    counts[account.role] = (counts[account.role] ?? 0) + 1;
    return counts;
  }, {});
}

export function getCompleteDemoAccounts(): DemoAccount[] {
  return [
    ...DEMO_STAFF_ACCOUNTS,
    ...DEMO_TEACHERS.filter((teacher) => teacher.role === "TEACHER"),
    ...DEMO_PARENTS.map(({ email, name }) => ({ email, name, role: "PARENT" as const })),
    ...DEMO_STUDENTS.map(({ email, displayName }) => ({
      email,
      name: displayName,
      role: "STUDENT" as const,
    })),
  ];
}
