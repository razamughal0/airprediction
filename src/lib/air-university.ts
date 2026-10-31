export type SubjectDef = {
  code: string;
  title: string;
  teacherName: string;
  teacherEmail: string;
  creditHours: string;
  room: string;
  schedule: string;
  isLab?: boolean;
  isAdvisory?: boolean;
  program: string;
  semesterNumber?: number;
};

export type TimetableSlot = {
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
  startCol: number;
  span: number;
  code: string;
  title: string;
  teacher: string;
  room: string;
  section?: string;
  highlight?: "green" | "blue" | "gold";
};

export type StudentSubjectRecord = {
  code: string;
  title: string;
  teacherName: string;
  teacherEmail: string;
  creditHours: string;
  room: string;
  schedule: string;
  attendance: number;
  quizScore: number;
  assignmentScore: number;
  midtermScore: number;
  finalScore: number;
  totalScore: number;
  grade: string;
  gradePoints: number;
  status: "On Track" | "Needs Attention" | "At Risk";
};

export type FacultyMember = {
  employeeId: string;
  name: string;
  email: string;
  designation: string;
  department: string;
  primaryDepartmentCode: string;
  additionalDepartments: string[];
  advisoryClass: string | null;
  programs: string[];
  subjects: { code: string; title: string; room: string; schedule: string; program: string; creditHours: string; section: string }[];
  officeRoom: string;
};

export const FIXED_SESSIONS = [
  { slot: "SESSION_1" as const, label: "Session 1", timeRange: "08:40 AM – 11:40 AM", startTime: "08:40 AM", endTime: "11:40 AM" },
  { slot: "SESSION_2" as const, label: "Session 2", timeRange: "11:40 AM – 02:40 PM", startTime: "11:40 AM", endTime: "02:40 PM" },
] as const;

export const TIMING_SLOTS = [
  "08:40-09:30",
  "09:40-10:30",
  "10:40-11:30",
  "11:40-12:30",
  "12:40-01:30",
  "01:40-02:30",
  "02:40-03:30",
] as const;

export const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

export const DEFAULT_GRADING_SCALE = [
  { letterGrade: "A", minPercentage: 85, maxPercentage: 100, gradePoints: 4.0 },
  { letterGrade: "A-", minPercentage: 80, maxPercentage: 84, gradePoints: 3.67 },
  { letterGrade: "B+", minPercentage: 75, maxPercentage: 79, gradePoints: 3.33 },
  { letterGrade: "B", minPercentage: 70, maxPercentage: 74, gradePoints: 3.0 },
  { letterGrade: "B-", minPercentage: 65, maxPercentage: 69, gradePoints: 2.67 },
  { letterGrade: "C+", minPercentage: 60, maxPercentage: 64, gradePoints: 2.33 },
  { letterGrade: "C", minPercentage: 55, maxPercentage: 59, gradePoints: 2.0 },
  { letterGrade: "D", minPercentage: 50, maxPercentage: 54, gradePoints: 1.0 },
  { letterGrade: "F", minPercentage: 0, maxPercentage: 49, gradePoints: 0.0 },
] as const;

export const AIR_PROGRAMS = [
  {
    code: "BSAI",
    name: "Bachelor of Science in Artificial Intelligence",
    departmentCode: "DAI",
    departmentName: "Department of Artificial Intelligence",
    section: "BSAI-S3-A",
    semester: "Semester 3",
    advisor: "Dr. Humaira",
    advisorEmail: "humaira@au.edu.pk",
    crName: "Abdul Hadi",
    crRegId: "AU-BSAI-24002",
  },
  {
    code: "BSCS",
    name: "Bachelor of Science in Computer Science",
    departmentCode: "DCS",
    departmentName: "Department of Computer Science",
    section: "BSCS-S3-A",
    semester: "Semester 3",
    advisor: "Dr. Tariq Mehmood",
    advisorEmail: "tariq.mehmood@au.edu.pk",
    crName: "Ali Hassan",
    crRegId: "AU-BSCS-24021",
  },
  {
    code: "BSDS",
    name: "Bachelor of Science in Data Science",
    departmentCode: "DDS",
    departmentName: "Department of Data Science",
    section: "BSDS-S3-A",
    semester: "Semester 3",
    advisor: "Dr. Saima Nawaz",
    advisorEmail: "saima.nawaz@au.edu.pk",
    crName: "Rehan Ahmed",
    crRegId: "AU-BSDS-24041",
  },
] as const;

export const BSAI_SUBJECTS: SubjectDef[] = [
  {
    code: "AI232",
    title: "Introduction to Artificial Intelligence",
    teacherName: "Dr. Humaira",
    teacherEmail: "humaira@au.edu.pk",
    creditHours: "3",
    room: "Room-B-117",
    schedule: "Mon & Thu · 11:40 AM–02:40 PM",
    program: "BSAI",
    semesterNumber: 3,
  },
  {
    code: "CS216",
    title: "Data Structures and Algorithms",
    teacherName: "Usman Ali",
    teacherEmail: "usman.teacher@demo.edu",
    creditHours: "3",
    room: "Room-B-117",
    schedule: "Tue & Thu · 08:40 AM–11:40 AM",
    program: "BSAI",
    semesterNumber: 3,
  },
  {
    code: "CS112",
    title: "Object Oriented Programming",
    teacherName: "Ahmed Khan",
    teacherEmail: "ahmed.teacher@demo.edu",
    creditHours: "3",
    room: "Lab-B-001",
    schedule: "Mon & Wed · 08:40 AM–11:40 AM",
    program: "BSAI",
    semesterNumber: 3,
  },
  {
    code: "MA205",
    title: "Linear Algebra",
    teacherName: "Sara Ahmed",
    teacherEmail: "sara.teacher@demo.edu",
    creditHours: "3",
    room: "Room-B-122",
    schedule: "Tue & Fri · 11:40 AM–02:40 PM",
    program: "BSAI",
    semesterNumber: 3,
  },
  {
    code: "MA301",
    title: "Probability and Statistics",
    teacherName: "Adeel Khan",
    teacherEmail: "adeel.khan@au.edu.pk",
    creditHours: "3",
    room: "Room-B-117",
    schedule: "Wed 11:40 AM–02:40 PM & Fri 08:40 AM–11:40 AM",
    program: "BSAI",
    semesterNumber: 3,
  },
];

export const OTHER_PROGRAM_SUBJECTS: Record<string, SubjectDef[]> = {
  BSCS: [
    {
      code: "CS214",
      title: "Data Structures",
      teacherName: "Muneeba",
      teacherEmail: "muneeba@au.edu.pk",
      creditHours: "3",
      room: "Room-C-201",
      schedule: "Mon & Wed · 08:40 AM–11:40 AM",
      program: "BSCS",
      semesterNumber: 3,
    },
    {
      code: "CS220",
      title: "Database Systems",
      teacherName: "Usman Ali",
      teacherEmail: "usman.teacher@demo.edu",
      creditHours: "3",
      room: "Room-C-201",
      schedule: "Mon & Wed · 11:40 AM–02:40 PM",
      program: "BSCS",
      semesterNumber: 3,
    },
    {
      code: "CS115",
      title: "Discrete Structures",
      teacherName: "Sara Ahmed",
      teacherEmail: "sara.teacher@demo.edu",
      creditHours: "3",
      room: "Room-C-202",
      schedule: "Tue & Thu · 08:40 AM–11:40 AM",
      program: "BSCS",
      semesterNumber: 3,
    },
    {
      code: "CS301",
      title: "Operating Systems",
      teacherName: "Dr. Tariq Mehmood",
      teacherEmail: "tariq.mehmood@au.edu.pk",
      creditHours: "3",
      room: "Room-C-202",
      schedule: "Tue & Thu · 11:40 AM–02:40 PM",
      program: "BSCS",
      semesterNumber: 3,
    },
    {
      code: "CS310",
      title: "Software Engineering",
      teacherName: "Almas Ayesha",
      teacherEmail: "almas.ayesha@au.edu.pk",
      creditHours: "3",
      room: "Room-C-201",
      schedule: "Fri · 08:40 AM–02:40 PM",
      program: "BSCS",
      semesterNumber: 3,
    },
  ],
  BSDS: [
    {
      code: "DS201",
      title: "Introduction to Data Science",
      teacherName: "Dr. Saima Nawaz",
      teacherEmail: "saima.nawaz@au.edu.pk",
      creditHours: "3",
      room: "Room-D-104",
      schedule: "Mon & Wed · 08:40 AM–11:40 AM",
      program: "BSDS",
      semesterNumber: 3,
    },
    {
      code: "DS210",
      title: "Programming for Data Science",
      teacherName: "Ahmed Khan",
      teacherEmail: "ahmed.teacher@demo.edu",
      creditHours: "3",
      room: "Lab-D-102",
      schedule: "Mon & Thu · 11:40 AM–02:40 PM",
      program: "BSDS",
      semesterNumber: 3,
    },
    {
      code: "DS230",
      title: "Database Management",
      teacherName: "Usman Ali",
      teacherEmail: "usman.teacher@demo.edu",
      creditHours: "3",
      room: "Room-D-104",
      schedule: "Tue & Fri · 11:40 AM–02:40 PM",
      program: "BSDS",
      semesterNumber: 3,
    },
    {
      code: "DS240",
      title: "Probability and Statistics",
      teacherName: "Sara Ahmed",
      teacherEmail: "sara.teacher@demo.edu",
      creditHours: "3",
      room: "Room-D-105",
      schedule: "Wed 11:40 AM–02:40 PM & Fri 08:40 AM–11:40 AM",
      program: "BSDS",
      semesterNumber: 3,
    },
    {
      code: "DS305",
      title: "Machine Learning",
      teacherName: "Muneeba",
      teacherEmail: "muneeba@au.edu.pk",
      creditHours: "3",
      room: "Room-D-104",
      schedule: "Tue & Thu · 08:40 AM–11:40 AM",
      program: "BSDS",
      semesterNumber: 3,
    },
  ],
};

export const BSAI_TIMETABLE: TimetableSlot[] = [
  { day: "Monday", startCol: 0, span: 3, code: "CS112", title: "Object Oriented Programming", teacher: "Ahmed Khan", room: "Lab-B-001", highlight: "green" },
  { day: "Monday", startCol: 3, span: 3, code: "AI232", title: "Introduction to Artificial Intelligence", teacher: "Dr. Humaira", room: "Room-B-117", highlight: "blue" },
  { day: "Tuesday", startCol: 0, span: 3, code: "CS216", title: "Data Structures and Algorithms", teacher: "Usman Ali", room: "Room-B-117" },
  { day: "Tuesday", startCol: 3, span: 3, code: "MA205", title: "Linear Algebra", teacher: "Sara Ahmed", room: "Room-B-122" },
  { day: "Wednesday", startCol: 0, span: 3, code: "CS112", title: "Object Oriented Programming", teacher: "Ahmed Khan", room: "Lab-B-001" },
  { day: "Wednesday", startCol: 3, span: 3, code: "MA301", title: "Probability and Statistics", teacher: "Adeel Khan", room: "Room-B-117" },
  { day: "Thursday", startCol: 0, span: 3, code: "CS216", title: "Data Structures and Algorithms", teacher: "Usman Ali", room: "Room-B-117" },
  { day: "Thursday", startCol: 3, span: 3, code: "AI232", title: "Introduction to Artificial Intelligence", teacher: "Dr. Humaira", room: "Room-B-117", highlight: "blue" },
  { day: "Friday", startCol: 0, span: 3, code: "MA301", title: "Probability and Statistics", teacher: "Adeel Khan", room: "Room-B-117" },
  { day: "Friday", startCol: 3, span: 3, code: "MA205", title: "Linear Algebra", teacher: "Sara Ahmed", room: "Room-B-122", section: "BSAI-S3-A" },
];

export const PROGRAM_TIMETABLES: Record<string, TimetableSlot[]> = {
  BSAI: BSAI_TIMETABLE,
  BSCS: [
    { day: "Monday", startCol: 0, span: 3, code: "CS214", title: "Data Structures", teacher: "Muneeba", room: "Room-C-201", highlight: "blue" },
    { day: "Monday", startCol: 3, span: 3, code: "CS220", title: "Database Systems", teacher: "Usman Ali", room: "Room-C-201" },
    { day: "Tuesday", startCol: 0, span: 3, code: "CS115", title: "Discrete Structures", teacher: "Sara Ahmed", room: "Room-C-202", highlight: "green" },
    { day: "Tuesday", startCol: 3, span: 3, code: "CS301", title: "Operating Systems", teacher: "Dr. Tariq Mehmood", room: "Room-C-202" },
    { day: "Wednesday", startCol: 0, span: 3, code: "CS214", title: "Data Structures", teacher: "Muneeba", room: "Room-C-201" },
    { day: "Wednesday", startCol: 3, span: 3, code: "CS220", title: "Database Systems", teacher: "Usman Ali", room: "Room-C-201" },
    { day: "Thursday", startCol: 0, span: 3, code: "CS115", title: "Discrete Structures", teacher: "Sara Ahmed", room: "Room-C-202" },
    { day: "Thursday", startCol: 3, span: 3, code: "CS301", title: "Operating Systems", teacher: "Dr. Tariq Mehmood", room: "Room-C-202" },
    { day: "Friday", startCol: 0, span: 3, code: "CS310", title: "Software Engineering", teacher: "Almas Ayesha", room: "Room-C-201" },
    { day: "Friday", startCol: 3, span: 3, code: "CS226", title: "Computer Architecture", teacher: "Almas Ayesha", room: "Room-C-201" },
  ],
  BSDS: [
    { day: "Monday", startCol: 0, span: 3, code: "DS201", title: "Introduction to Data Science", teacher: "Dr. Saima Nawaz", room: "Room-D-104", highlight: "green" },
    { day: "Monday", startCol: 3, span: 3, code: "DS210", title: "Programming for Data Science", teacher: "Ahmed Khan", room: "Lab-D-102" },
    { day: "Tuesday", startCol: 0, span: 3, code: "DS305", title: "Machine Learning", teacher: "Muneeba", room: "Room-D-104" },
    { day: "Tuesday", startCol: 3, span: 3, code: "DS230", title: "Database Management", teacher: "Usman Ali", room: "Room-D-104" },
    { day: "Wednesday", startCol: 0, span: 3, code: "DS201", title: "Introduction to Data Science", teacher: "Dr. Saima Nawaz", room: "Room-D-104" },
    { day: "Wednesday", startCol: 3, span: 3, code: "DS240", title: "Probability and Statistics", teacher: "Sara Ahmed", room: "Room-D-105" },
    { day: "Thursday", startCol: 0, span: 3, code: "DS305", title: "Machine Learning", teacher: "Muneeba", room: "Room-D-104", highlight: "blue" },
    { day: "Thursday", startCol: 3, span: 3, code: "DS210", title: "Programming for Data Science", teacher: "Ahmed Khan", room: "Lab-D-102" },
    { day: "Friday", startCol: 0, span: 3, code: "DS240", title: "Probability and Statistics", teacher: "Sara Ahmed", room: "Room-D-105" },
    { day: "Friday", startCol: 3, span: 3, code: "DS230", title: "Database Management", teacher: "Usman Ali", room: "Room-D-104" },
  ],
};

export const AIR_FACULTY: FacultyMember[] = [
  {
    employeeId: "AU-FAC-101",
    name: "Ahmed Khan",
    email: "ahmed.teacher@demo.edu",
    designation: "Associate Professor (Cross-Department Computing)",
    department: "Department of Artificial Intelligence",
    primaryDepartmentCode: "DAI",
    additionalDepartments: ["DCS", "DDS"],
    advisoryClass: "BSAI — Semester 1 (BSAI-S1-A)",
    programs: ["BSAI", "BSCS", "BSDS"],
    officeRoom: "AI Block B · Room-B-104",
    subjects: [
      { code: "CS112", title: "Object Oriented Programming", room: "Lab-B-001", schedule: "Mon & Wed 08:40–11:40", program: "BSAI", creditHours: "3", section: "BSAI-S3-A" },
      { code: "CS101", title: "Programming Fundamentals", room: "Room-B-105", schedule: "Tue & Thu 08:40–11:40", program: "BSAI", creditHours: "3", section: "BSAI-S1-A" },
      { code: "CS101", title: "Programming Fundamentals", room: "Room-C-105", schedule: "Tue & Fri 11:40–02:40", program: "BSCS", creditHours: "3", section: "BSCS-S1-A" },
      { code: "DS210", title: "Programming for Data Science", room: "Lab-D-102", schedule: "Mon & Thu 11:40–02:40", program: "BSDS", creditHours: "3", section: "BSDS-S3-A" },
    ],
  },
  {
    employeeId: "AU-FAC-102",
    name: "Sara Ahmed",
    email: "sara.teacher@demo.edu",
    designation: "Assistant Professor (Mathematics & Formal Methods)",
    department: "Department of Data Science",
    primaryDepartmentCode: "DDS",
    additionalDepartments: ["DAI", "DCS"],
    advisoryClass: null,
    programs: ["BSAI", "BSCS", "BSDS"],
    officeRoom: "Block D · Room-D-108",
    subjects: [
      { code: "MA205", title: "Linear Algebra", room: "Room-B-122", schedule: "Tue & Fri 11:40–02:40", program: "BSAI", creditHours: "3", section: "BSAI-S3-A" },
      { code: "CS115", title: "Discrete Structures", room: "Room-C-202", schedule: "Tue & Thu 08:40–11:40", program: "BSCS", creditHours: "3", section: "BSCS-S3-A" },
      { code: "DS240", title: "Probability and Statistics", room: "Room-D-105", schedule: "Wed 11:40–02:40 & Fri 08:40–11:40", program: "BSDS", creditHours: "3", section: "BSDS-S3-A" },
    ],
  },
  {
    employeeId: "AU-FAC-103",
    name: "Usman Ali",
    email: "usman.teacher@demo.edu",
    designation: "Assistant Professor (Systems & Databases)",
    department: "Department of Computer Science",
    primaryDepartmentCode: "DCS",
    additionalDepartments: ["DAI", "DDS"],
    advisoryClass: "BSCS — Semester 1 (BSCS-S1-A)",
    programs: ["BSAI", "BSCS", "BSDS"],
    officeRoom: "Block C · Room-C-210",
    subjects: [
      { code: "CS216", title: "Data Structures and Algorithms", room: "Room-B-117", schedule: "Tue & Thu 08:40–11:40", program: "BSAI", creditHours: "3", section: "BSAI-S3-A" },
      { code: "CS220", title: "Database Systems", room: "Room-C-201", schedule: "Mon & Wed 11:40–02:40", program: "BSCS", creditHours: "3", section: "BSCS-S3-A" },
      { code: "DS230", title: "Database Management", room: "Room-D-104", schedule: "Tue & Fri 11:40–02:40", program: "BSDS", creditHours: "3", section: "BSDS-S3-A" },
    ],
  },
  {
    employeeId: "AU-FAC-104",
    name: "Dr. Humaira",
    email: "humaira@au.edu.pk",
    designation: "Assistant Professor & BSAI Class Advisor",
    department: "Department of Artificial Intelligence",
    primaryDepartmentCode: "DAI",
    additionalDepartments: ["DCS", "DDS"],
    advisoryClass: "BSAI — Semester 3 (BSAI-S3-A)",
    programs: ["BSAI", "BSCS", "BSDS"],
    officeRoom: "AI Block B · Room-B-117",
    subjects: [
      { code: "AI232", title: "Introduction to Artificial Intelligence", room: "Room-B-117", schedule: "Mon & Thu 11:40–02:40", program: "BSAI", creditHours: "3", section: "BSAI-S3-A" },
      { code: "AI105", title: "Foundations of AI", room: "Room-B-105", schedule: "Wed & Fri 08:40–11:40", program: "BSAI", creditHours: "3", section: "BSAI-S1-A" },
    ],
  },
  {
    employeeId: "AU-FAC-105",
    name: "Almas Ayesha",
    email: "almas.ayesha@au.edu.pk",
    designation: "Senior Lecturer (Architecture & Labs)",
    department: "Department of Computer Science",
    primaryDepartmentCode: "DCS",
    additionalDepartments: ["DAI"],
    advisoryClass: null,
    programs: ["BSAI", "BSCS"],
    officeRoom: "Block B · Room-B-122",
    subjects: [
      { code: "CS310", title: "Software Engineering", room: "Room-C-201", schedule: "Fri 08:40–11:40", program: "BSCS", creditHours: "3", section: "BSCS-S3-A" },
      { code: "CS226", title: "Computer Architecture", room: "Room-C-201", schedule: "Fri 11:40–02:40", program: "BSCS", creditHours: "3", section: "BSCS-S3-A" },
      { code: "CS112L", title: "Programming Lab", room: "Lab-B-001", schedule: "Tue & Thu 11:40–02:40", program: "BSAI", creditHours: "3", section: "BSAI-S1-A" },
    ],
  },
  {
    employeeId: "AU-FAC-106",
    name: "Muneeba",
    email: "muneeba@au.edu.pk",
    designation: "Lecturer (Algorithms & Machine Learning)",
    department: "Department of Artificial Intelligence",
    primaryDepartmentCode: "DAI",
    additionalDepartments: ["DCS", "DDS"],
    advisoryClass: null,
    programs: ["BSAI", "BSCS", "BSDS"],
    officeRoom: "Block B · Room-B-117",
    subjects: [
      { code: "CS214", title: "Data Structures", room: "Room-C-201", schedule: "Mon & Wed 08:40–11:40", program: "BSCS", creditHours: "3", section: "BSCS-S3-A" },
      { code: "DS305", title: "Machine Learning", room: "Room-D-104", schedule: "Tue & Thu 08:40–11:40", program: "BSDS", creditHours: "3", section: "BSDS-S3-A" },
    ],
  },
  {
    employeeId: "AU-FAC-107",
    name: "Adeel Khan",
    email: "adeel.khan@au.edu.pk",
    designation: "Assistant Professor (Applied Mathematics)",
    department: "Department of Artificial Intelligence",
    primaryDepartmentCode: "DAI",
    additionalDepartments: ["DCS", "DDS"],
    advisoryClass: null,
    programs: ["BSAI", "BSCS", "BSDS"],
    officeRoom: "Block B · Room-B-118",
    subjects: [
      { code: "MA301", title: "Probability and Statistics", room: "Room-B-117", schedule: "Wed 11:40–02:40 & Fri 08:40–11:40", program: "BSAI", creditHours: "3", section: "BSAI-S3-A" },
      { code: "MA110", title: "Calculus", room: "Room-B-105", schedule: "Mon 08:40–11:40 & Wed 11:40–02:40", program: "BSAI", creditHours: "3", section: "BSAI-S1-A" },
    ],
  },
  {
    employeeId: "AU-FAC-108",
    name: "Dr. Tariq Mehmood",
    email: "tariq.mehmood@au.edu.pk",
    designation: "Associate Professor & BSCS Class Advisor",
    department: "Department of Computer Science",
    primaryDepartmentCode: "DCS",
    additionalDepartments: ["DAI"],
    advisoryClass: "BSCS — Semester 3 (BSCS-S3-A)",
    programs: ["BSCS", "BSAI"],
    officeRoom: "Block C · Room-C-201",
    subjects: [
      { code: "CS301", title: "Operating Systems", room: "Room-C-202", schedule: "Tue & Thu 11:40–02:40", program: "BSCS", creditHours: "3", section: "BSCS-S3-A" },
      { code: "CS105", title: "Introduction to Computing", room: "Room-C-105", schedule: "Mon & Wed 08:40–11:40", program: "BSCS", creditHours: "3", section: "BSCS-S1-A" },
    ],
  },
  {
    employeeId: "AU-FAC-109",
    name: "Dr. Saima Nawaz",
    email: "saima.nawaz@au.edu.pk",
    designation: "Associate Professor & BSDS Class Advisor",
    department: "Department of Data Science",
    primaryDepartmentCode: "DDS",
    additionalDepartments: ["DAI"],
    advisoryClass: "BSDS — Semester 3 (BSDS-S3-A)",
    programs: ["BSDS", "BSAI"],
    officeRoom: "Block D · Room-D-104",
    subjects: [
      { code: "DS201", title: "Introduction to Data Science", room: "Room-D-104", schedule: "Mon & Wed 08:40–11:40", program: "BSDS", creditHours: "3", section: "BSDS-S3-A" },
      { code: "DS110", title: "Statistical Computing", room: "Room-C-105", schedule: "Tue & Thu 08:40–11:40", program: "BSCS", creditHours: "3", section: "BSCS-S1-A" },
    ],
  },
  {
    employeeId: "AU-FAC-110",
    name: "Sohail Ahmed",
    email: "sohail.ahmed@au.edu.pk",
    designation: "Assistant Professor (Calculus & Analytics)",
    department: "Department of Computer Science",
    primaryDepartmentCode: "DCS",
    additionalDepartments: ["DAI", "DDS"],
    advisoryClass: null,
    programs: ["BSAI", "BSCS", "BSDS"],
    officeRoom: "Block B · Room-B-119",
    subjects: [
      { code: "MA110", title: "Calculus & Analytical Geometry", room: "Room-B-105", schedule: "Mon & Fri 11:40–02:40", program: "BSAI", creditHours: "3", section: "BSAI-S1-A" },
      { code: "MA110", title: "Calculus & Analytical Geometry", room: "Room-C-105", schedule: "Mon 11:40–02:40, Wed 11:40–02:40, Thu 11:40–02:40 & Fri 08:40–11:40", program: "BSCS", creditHours: "3", section: "BSCS-S1-A" },
    ],
  },
];

export function getProgramSubjects(program: string): SubjectDef[] {
  if (program === "BSAI") return BSAI_SUBJECTS;
  return OTHER_PROGRAM_SUBJECTS[program] ?? BSAI_SUBJECTS;
}

export function getProgramInfo(program: string) {
  return AIR_PROGRAMS.find((item) => item.code === program) ?? AIR_PROGRAMS[0];
}

export function scoreToGrade(
  score: number,
  scale: readonly { letterGrade: string; minPercentage: number; maxPercentage: number; gradePoints: number }[] = DEFAULT_GRADING_SCALE,
): { letterGrade: string; gradePoints: number } {
  const rounded = Math.round(score);
  for (const band of scale) {
    if (rounded >= band.minPercentage) {
      return { letterGrade: band.letterGrade, gradePoints: Number(band.gradePoints) };
    }
  }
  return { letterGrade: "F", gradePoints: 0.0 };
}

export function calculateWeightedGpa(courses: { creditHours: number; gradePoints: number }[]): {
  totalCredits: number;
  qualityPoints: number;
  gpa: number;
} {
  const totalCredits = courses.reduce((acc, c) => acc + c.creditHours, 0);
  if (totalCredits === 0) return { totalCredits: 0, qualityPoints: 0, gpa: 0 };
  const qualityPoints = courses.reduce((acc, c) => acc + c.creditHours * c.gradePoints, 0);
  const gpa = Number((qualityPoints / totalCredits).toFixed(2));
  return { totalCredits, qualityPoints: Number(qualityPoints.toFixed(2)), gpa };
}

export function buildStudentSubjectRecords(student: {
  id: number;
  course: string;
  engagement: number;
  quizScore: number;
  attendance: number;
  lateSubmissions: number;
  missedAssessments: number;
}): StudentSubjectRecord[] {
  const subjects = getProgramSubjects(student.course);
  return subjects.map((subject, idx) => {
    const shift = ((student.id * 7 + idx * 5) % 13) - 6;
    const attendance = Math.max(42, Math.min(100, student.attendance + shift));
    const quizScore = Math.max(35, Math.min(100, student.quizScore + (((student.id + idx * 3) % 15) - 7)));
    const penalty = student.lateSubmissions * 2 + student.missedAssessments * 3;
    const assignmentScore = Math.max(
      38,
      Math.min(100, Math.round(student.engagement * 0.55 + student.quizScore * 0.45 - penalty + shift)),
    );
    const midtermScore = Math.max(35, Math.min(100, Math.round(quizScore * 0.6 + assignmentScore * 0.4 + ((idx % 3) - 1) * 3)));
    const finalScore = Math.max(36, Math.min(100, Math.round(quizScore * 0.5 + midtermScore * 0.5 + ((idx % 2) * 3 - 1))));
    const totalScore = Math.max(
      36,
      Math.min(99, Math.round(quizScore * 0.15 + assignmentScore * 0.15 + midtermScore * 0.3 + finalScore * 0.4)),
    );
    const { letterGrade, gradePoints } = scoreToGrade(totalScore);
    const status: StudentSubjectRecord["status"] =
      totalScore < 55 || attendance < 65 ? "At Risk" : totalScore < 70 || attendance < 75 ? "Needs Attention" : "On Track";
    return {
      code: subject.code,
      title: subject.title,
      teacherName: subject.teacherName,
      teacherEmail: subject.teacherEmail,
      creditHours: subject.creditHours,
      room: subject.room,
      schedule: subject.schedule,
      attendance,
      quizScore,
      assignmentScore,
      midtermScore,
      finalScore,
      totalScore,
      grade: letterGrade,
      gradePoints,
      status,
    };
  });
}
