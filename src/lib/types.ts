export type Role = "admin" | "teacher" | "student";
export type View =
  | "overview"
  | "students"
  | "timetable"
  | "courses"
  | "academics"
  | "campus"
  | "interventions"
  | "insights"
  | "users"
  | "settings"
  | "records"
  | "resources";

export type Student = {
  id: number;
  studentId: string;
  name: string;
  email: string;
  course: string; // BSAI | BSCS | BSDS
  year: number;
  semesterNumber: number;
  sectionCode: string;
  programId?: number | null;
  departmentId?: number | null;
  semesterId?: number | null;
  sectionId?: number | null;
  avatarColor: string;
  engagement: number;
  quizScore: number;
  attendance: number;
  lateSubmissions: number;
  missedAssessments: number;
  riskScore: number;
  gpa: string | number;
  cgpa: string | number;
  earnedCredits: number;
  isCr: boolean;
  warningLevel: string;
  status: string;
  lastActive: string;
  weeklyActivity: number[];
  createdAt: string;
};

export type PortalUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  isCr?: boolean;
  studentId: number | null;
  departmentId?: number | null;
  courses: string[];
  notificationsEnabled: boolean;
  weeklyDigest: boolean;
  createdAt: string;
};

export type Intervention = {
  id: number;
  studentId: number;
  authorId: number;
  title: string;
  type: string;
  notes: string;
  status: "scheduled" | "in_progress" | "completed";
  dueDate: string;
  createdAt: string;
};

export type TimetableEntryDTO = {
  id: number;
  programId: number;
  programCode: string;
  semesterId: number;
  semesterNumber: number;
  sectionId: number;
  sectionCode: string;
  courseId: number;
  courseCode: string;
  courseName: string;
  teacherId: number;
  teacherName: string;
  classroomId: number;
  classroomCode: string;
  dayOfWeek: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
  sessionSlot: "SESSION_1" | "SESSION_2";
  startTime: string;
  endTime: string;
  creditHours: number;
  status: string;
};

export type DepartmentDTO = {
  id: number;
  code: string;
  name: string;
  buildingCode: string;
  headName: string;
};

export type ProgramDTO = {
  id: number;
  code: string;
  name: string;
  departmentId: number;
  degreeLevel: string;
  totalCredits: number;
  durationYears: number;
};

export type SectionDTO = {
  id: number;
  code: string;
  name: string;
  programId: number;
  programCode: string;
  semesterId: number;
  semesterNumber: number;
  advisorName: string;
  crStudentId: number | null;
  capacity: number;
};

export type TeacherDTO = {
  id: number;
  userId: number | null;
  employeeId: string;
  name: string;
  email: string;
  designation: string;
  primaryDepartmentId: number;
  primaryDepartmentCode: string;
  additionalDepartments: string[];
  assignedPrograms: string[];
  maxWeeklyHours: number;
  officeRoom: string;
};

export type CourseDTO = {
  id: number;
  code: string;
  name: string;
  programId: number;
  programCode: string;
  departmentId: number;
  semesterNumber: number;
  creditHours: number;
  courseType: string;
  status: string;
};

export type BuildingDTO = {
  id: number;
  code: string;
  name: string;
  buildingType: string;
  floors: number;
  posX: string | number;
  posZ: string | number;
  color: string;
  description: string;
};

export type ClassroomDTO = {
  id: number;
  code: string;
  name: string;
  buildingId: number;
  roomType: string;
  capacity: number;
  floor: number;
  hasMultimedia: boolean;
  hasLabPcs: boolean;
};

export type CrAssignmentDTO = {
  id: number;
  sectionId: number;
  sectionCode: string;
  programCode: string;
  semesterNumber: number;
  studentId: number;
  studentName: string;
  studentRegNo: string;
  assignedBy: string;
  status: string;
  assignedAt: string;
};

export type EnrollmentDTO = {
  id: number;
  studentId: number;
  courseId: number;
  sectionId: number;
  semesterNumber: number;
  teacherId: number;
  attendancePct: number;
  quizMarks: string | number;
  assignmentMarks: string | number;
  midtermMarks: string | number;
  finalMarks: string | number;
  totalMarks: string | number;
  letterGrade: string;
  gradePoints: string | number;
  status: string;
};

export type GpaRecordDTO = {
  id: number;
  studentId: number;
  semesterNumber: number;
  semesterName: string;
  creditHours: number;
  qualityPoints: string | number;
  gpa: string | number;
  cgpa: string | number;
  courseBreakdown: { code: string; name: string; creditHours: number; marks: number; grade: string; points: number }[];
};

export type BacklogDTO = {
  id: number;
  studentId: number;
  courseId: number;
  courseCode: string;
  courseName: string;
  programCode: string;
  semesterNumber: number;
  creditHours: number;
  failedGrade: string;
  attempts: number;
  status: "uncleared" | "repeated" | "cleared";
  clearedSemester: number | null;
};

export type CourseWithdrawalDTO = {
  id: number;
  studentId: number;
  courseId: number;
  courseCode: string;
  courseName: string;
  programCode: string;
  semesterNumber: number;
  creditHours: number;
  withdrawalType: string;
  status: string;
  reason: string;
  requestedAt: string;
  processedBy: string;
};

export type AcademicWarningDTO = {
  id: number;
  studentId: number;
  riskLevel: "Low Risk" | "Medium Risk" | "High Risk" | "Critical Risk";
  riskScore: number;
  reasons: string[];
  gpaTrigger: boolean;
  attendanceTrigger: boolean;
  backlogTrigger: boolean;
  withdrawalTrigger: boolean;
  status: string;
};

export type AcademicRequestDTO = {
  id: number;
  studentId: number;
  studentName: string;
  sectionId: number;
  sectionCode: string;
  programCode: string;
  requestType: string;
  subject: string;
  description: string;
  status: string;
  submittedByCr: boolean;
  responseNote: string;
  createdAt: string;
};

export type NotificationDTO = {
  id: number;
  userId: number | null;
  roleTarget: string;
  sectionId: number | null;
  title: string;
  message: string;
  category: string;
  isRead: boolean;
  createdAt: string;
};

export type GradingBoundaryDTO = {
  id: number;
  letterGrade: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoints: string | number;
};

export type AuditLogDTO = {
  id: number;
  actorUserId: number | null;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
};

export type LoginDirectory = {
  students: { id: number; studentId: string; name: string; email: string; course: string; semesterNumber: number; sectionCode: string; isCr: boolean }[];
  teachers: { id: number; employeeId: string; name: string; email: string; designation: string; assignedPrograms: string[] }[];
  admins: { id: number; name: string; email: string }[];
};

export type Workspace = {
  authenticated?: boolean;
  loginDirectory?: LoginDirectory;
  user: PortalUser;
  students: Student[];
  interventions: Intervention[];
  users: PortalUser[];
  departments?: DepartmentDTO[];
  programs?: ProgramDTO[];
  sections?: SectionDTO[];
  teachers?: TeacherDTO[];
  courses?: CourseDTO[];
  buildings?: BuildingDTO[];
  classrooms?: ClassroomDTO[];
  timetableEntries?: TimetableEntryDTO[];
  crAssignments?: CrAssignmentDTO[];
  enrollments?: EnrollmentDTO[];
  gpaRecords?: GpaRecordDTO[];
  backlogs?: BacklogDTO[];
  withdrawals?: CourseWithdrawalDTO[];
  warnings?: AcademicWarningDTO[];
  requests?: AcademicRequestDTO[];
  notifications?: NotificationDTO[];
  gradingScale?: GradingBoundaryDTO[];
  auditLogs?: AuditLogDTO[];
  stats: {
    total: number;
    high: number;
    moderate: number;
    low: number;
    active: number;
    engagement: number;
    critical?: number;
    avgGpa?: number;
    avgCgpa?: number;
    totalTeachers?: number;
    totalCourses?: number;
    totalSections?: number;
    totalCrs?: number;
    weeklyScheduledClasses?: number;
    unclearedBacklogs?: number;
    approvedDrops?: number;
    passRate?: number;
  };
};

export const COURSES = ["BSAI", "BSCS", "BSDS"];

export const CR_REGISTRY: Record<string, string> = {
  "AU-BSAI-24002": "CR · BSAI-S3-A",
  "abdul.hadi@students.au.edu.pk": "CR · BSAI-S3-A",
  "AU-BSAI-24013": "CR · BSAI-S1-A",
  "AU-BSCS-24021": "CR · BSCS-S3-A",
  "AU-BSCS-24033": "CR · BSCS-S1-A",
  "AU-BSDS-24041": "CR · BSDS-S3-A",
};

export function getStudentBadge(
  student: Pick<Student, "studentId" | "email" | "name" | "course"> & { isCr?: boolean; sectionCode?: string },
): string | null {
  if (student.isCr && student.sectionCode) return `CR · ${student.sectionCode}`;
  if (CR_REGISTRY[student.studentId]) return CR_REGISTRY[student.studentId];
  if (CR_REGISTRY[student.email]) return CR_REGISTRY[student.email];
  if (student.name.toLowerCase() === "abdul hadi" && student.course === "BSAI") return "CR · BSAI";
  return null;
}

export function riskLevel(score: number) {
  return score >= 65 ? "High risk" : score >= 40 ? "Moderate" : "Low risk";
}

export function warningCategory(score: number): "Low Risk" | "Medium Risk" | "High Risk" | "Critical Risk" {
  if (score >= 80) return "Critical Risk";
  if (score >= 65) return "High Risk";
  if (score >= 40) return "Medium Risk";
  return "Low Risk";
}

export function initials(name: string) {
  return name
    .replace(/^(Dr\.|Prof\.|Engr\.|Mr\.|Ms\.|Miss|System)\s+/i, "")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function formatDate(value: string) {
  return new Date(value + (value.length === 10 ? "T12:00:00" : "")).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
