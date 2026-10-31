import {
  pgTable,
  serial,
  varchar,
  integer,
  text,
  timestamp,
  jsonb,
  boolean,
  numeric,
} from "drizzle-orm/pg-core";

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 30 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 140 }).notNull(),
  buildingCode: varchar("building_code", { length: 30 }).notNull(),
  headName: varchar("head_name", { length: 120 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  departmentId: integer("department_id").notNull().references(() => departments.id),
  degreeLevel: varchar("degree_level", { length: 40 }).notNull().default("BS"),
  totalCredits: integer("total_credits").notNull().default(132),
  durationYears: integer("duration_years").notNull().default(4),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const academicSessions = pgTable("academic_sessions", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 30 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  startDate: varchar("start_date", { length: 16 }).notNull(),
  endDate: varchar("end_date", { length: 16 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const semesters = pgTable("semesters", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull().references(() => programs.id),
  semesterNumber: integer("semester_number").notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  sessionId: integer("session_id").references(() => academicSessions.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const buildings = pgTable("buildings", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 30 }).notNull().unique(),
  name: varchar("name", { length: 140 }).notNull(),
  buildingType: varchar("building_type", { length: 50 }).notNull(),
  floors: integer("floors").notNull().default(3),
  posX: numeric("pos_x", { precision: 6, scale: 2 }).notNull().default("0"),
  posZ: numeric("pos_z", { precision: 6, scale: 2 }).notNull().default("0"),
  color: varchar("color", { length: 20 }).notNull().default("#1e6091"),
  description: text("description").notNull().default(""),
});

export const classrooms = pgTable("classrooms", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  buildingId: integer("building_id").notNull().references(() => buildings.id),
  roomType: varchar("room_type", { length: 40 }).notNull().default("Lecture Hall"),
  capacity: integer("capacity").notNull().default(40),
  floor: integer("floor").notNull().default(1),
  hasMultimedia: boolean("has_multimedia").notNull().default(true),
  hasLabPcs: boolean("has_lab_pcs").notNull().default(false),
});

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  studentId: varchar("student_id", { length: 30 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 180 }).notNull().unique(),
  course: varchar("course", { length: 100 }).notNull(), // Program code: BSAI, BSCS, BSDS
  year: integer("year").notNull().default(2),
  semesterNumber: integer("semester_number").notNull().default(3),
  sectionCode: varchar("section_code", { length: 30 }).notNull().default("BSAI-S3-A"),
  programId: integer("program_id"),
  departmentId: integer("department_id"),
  semesterId: integer("semester_id"),
  sectionId: integer("section_id"),
  avatarColor: varchar("avatar_color", { length: 20 }).notNull(),
  engagement: integer("engagement").notNull(),
  quizScore: integer("quiz_score").notNull(),
  attendance: integer("attendance").notNull(),
  lateSubmissions: integer("late_submissions").notNull(),
  missedAssessments: integer("missed_assessments").notNull(),
  riskScore: integer("risk_score").notNull(),
  gpa: numeric("gpa", { precision: 4, scale: 2 }).notNull().default("3.10"),
  cgpa: numeric("cgpa", { precision: 4, scale: 2 }).notNull().default("3.15"),
  earnedCredits: integer("earned_credits").notNull().default(36),
  isCr: boolean("is_cr").notNull().default(false),
  warningLevel: varchar("warning_level", { length: 30 }).notNull().default("Low Risk"),
  status: varchar("status", { length: 30 }).notNull().default("active"),
  lastActive: timestamp("last_active", { withTimezone: true }).notNull(),
  weeklyActivity: jsonb("weekly_activity").$type<number[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("portal_users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 180 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 200 }).notNull().default(""),
  role: varchar("role", { length: 20 }).notNull(), // admin | teacher | student
  isCr: boolean("is_cr").notNull().default(false),
  studentId: integer("student_id").references(() => students.id),
  departmentId: integer("department_id"),
  courses: jsonb("courses").$type<string[]>().notNull().default([]), // Program codes
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  weeklyDigest: boolean("weekly_digest").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sections = pgTable("sections", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 30 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  programId: integer("program_id").notNull().references(() => programs.id),
  programCode: varchar("program_code", { length: 20 }).notNull(),
  semesterId: integer("semester_id").notNull().references(() => semesters.id),
  semesterNumber: integer("semester_number").notNull(),
  advisorName: varchar("advisor_name", { length: 120 }).notNull(),
  crStudentId: integer("cr_student_id"),
  capacity: integer("capacity").notNull().default(30),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teachers = pgTable("teachers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  employeeId: varchar("employee_id", { length: 30 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 180 }).notNull().unique(),
  designation: varchar("designation", { length: 100 }).notNull(),
  primaryDepartmentId: integer("primary_department_id").notNull().references(() => departments.id),
  primaryDepartmentCode: varchar("primary_department_code", { length: 20 }).notNull(),
  additionalDepartments: jsonb("additional_departments").$type<string[]>().notNull().default([]),
  assignedPrograms: jsonb("assigned_programs").$type<string[]>().notNull().default([]),
  maxWeeklyHours: integer("max_weekly_hours").notNull().default(18),
  officeRoom: varchar("office_room", { length: 60 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 30 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  programId: integer("program_id").notNull().references(() => programs.id),
  programCode: varchar("program_code", { length: 20 }).notNull(),
  departmentId: integer("department_id").notNull().references(() => departments.id),
  semesterNumber: integer("semester_number").notNull(),
  creditHours: integer("credit_hours").notNull().default(3),
  courseType: varchar("course_type", { length: 30 }).notNull().default("Core"),
  status: varchar("status", { length: 30 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teacherAssignments = pgTable("teacher_assignments", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull().references(() => teachers.id),
  courseId: integer("course_id").notNull().references(() => courses.id),
  programId: integer("program_id").notNull().references(() => programs.id),
  semesterId: integer("semester_id").notNull().references(() => semesters.id),
  sectionId: integer("section_id").notNull().references(() => sections.id),
  classroomId: integer("classroom_id").notNull().references(() => classrooms.id),
  weeklySessions: integer("weekly_sessions").notNull().default(2),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id),
  courseId: integer("course_id").notNull().references(() => courses.id),
  sectionId: integer("section_id").notNull().references(() => sections.id),
  semesterNumber: integer("semester_number").notNull(),
  teacherId: integer("teacher_id").notNull().references(() => teachers.id),
  attendancePct: integer("attendance_pct").notNull().default(85),
  quizMarks: numeric("quiz_marks", { precision: 5, scale: 2 }).notNull().default("12.00"), // out of 15
  assignmentMarks: numeric("assignment_marks", { precision: 5, scale: 2 }).notNull().default("12.00"), // out of 15
  midtermMarks: numeric("midterm_marks", { precision: 5, scale: 2 }).notNull().default("22.00"), // out of 30
  finalMarks: numeric("final_marks", { precision: 5, scale: 2 }).notNull().default("30.00"), // out of 40
  totalMarks: numeric("total_marks", { precision: 5, scale: 2 }).notNull().default("76.00"), // out of 100
  letterGrade: varchar("letter_grade", { length: 5 }).notNull().default("B+"),
  gradePoints: numeric("grade_points", { precision: 3, scale: 2 }).notNull().default("3.30"),
  status: varchar("status", { length: 30 }).notNull().default("enrolled"), // enrolled | completed | failed | dropped
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const timetableEntries = pgTable("timetable_entries", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull().references(() => programs.id),
  programCode: varchar("program_code", { length: 20 }).notNull(),
  semesterId: integer("semester_id").notNull().references(() => semesters.id),
  semesterNumber: integer("semester_number").notNull(),
  sectionId: integer("section_id").notNull().references(() => sections.id),
  sectionCode: varchar("section_code", { length: 30 }).notNull(),
  courseId: integer("course_id").notNull().references(() => courses.id),
  courseCode: varchar("course_code", { length: 30 }).notNull(),
  courseName: varchar("course_name", { length: 160 }).notNull(),
  teacherId: integer("teacher_id").notNull().references(() => teachers.id),
  teacherName: varchar("teacher_name", { length: 120 }).notNull(),
  classroomId: integer("classroom_id").notNull().references(() => classrooms.id),
  classroomCode: varchar("classroom_code", { length: 40 }).notNull(),
  dayOfWeek: varchar("day_of_week", { length: 20 }).notNull(), // Monday..Friday
  sessionSlot: varchar("session_slot", { length: 20 }).notNull(), // SESSION_1 | SESSION_2
  startTime: varchar("start_time", { length: 20 }).notNull(), // 08:40 AM
  endTime: varchar("end_time", { length: 20 }).notNull(), // 11:40 AM
  creditHours: integer("credit_hours").notNull().default(3),
  status: varchar("status", { length: 25 }).notNull().default("scheduled"),
});

export const crAssignments = pgTable("cr_assignments", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").notNull().references(() => sections.id).unique(),
  sectionCode: varchar("section_code", { length: 30 }).notNull(),
  programCode: varchar("program_code", { length: 20 }).notNull(),
  semesterNumber: integer("semester_number").notNull(),
  studentId: integer("student_id").notNull().references(() => students.id),
  studentName: varchar("student_name", { length: 120 }).notNull(),
  studentRegNo: varchar("student_reg_no", { length: 40 }).notNull(),
  assignedBy: varchar("assigned_by", { length: 120 }).notNull().default("System Administrator"),
  status: varchar("status", { length: 25 }).notNull().default("active"),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
});

export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id),
  courseId: integer("course_id").notNull().references(() => courses.id),
  sectionId: integer("section_id").notNull().references(() => sections.id),
  timetableEntryId: integer("timetable_entry_id").references(() => timetableEntries.id),
  date: varchar("date", { length: 16 }).notNull(),
  sessionSlot: varchar("session_slot", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("present"), // present | absent | late | excused
  markedBy: varchar("marked_by", { length: 120 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => courses.id),
  sectionId: integer("section_id").notNull().references(() => sections.id),
  title: varchar("title", { length: 160 }).notNull(),
  assessmentType: varchar("assessment_type", { length: 40 }).notNull(), // Quiz | Assignment | Midterm | Final | Practical | Project
  totalMarks: numeric("total_marks", { precision: 5, scale: 2 }).notNull(),
  weightage: numeric("weightage", { precision: 5, scale: 2 }).notNull(),
  dueDate: varchar("due_date", { length: 16 }).notNull(),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assessmentResults = pgTable("assessment_results", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id").notNull().references(() => assessments.id),
  studentId: integer("student_id").notNull().references(() => students.id),
  courseId: integer("course_id").notNull().references(() => courses.id),
  obtainedMarks: numeric("obtained_marks", { precision: 5, scale: 2 }).notNull(),
  totalMarks: numeric("total_marks", { precision: 5, scale: 2 }).notNull(),
  gradedBy: varchar("graded_by", { length: 120 }).notNull(),
  gradedAt: timestamp("graded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const gpaRecords = pgTable("gpa_records", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id),
  semesterNumber: integer("semester_number").notNull(),
  semesterName: varchar("semester_name", { length: 80 }).notNull(),
  creditHours: integer("credit_hours").notNull(),
  qualityPoints: numeric("quality_points", { precision: 6, scale: 2 }).notNull(),
  gpa: numeric("gpa", { precision: 4, scale: 2 }).notNull(),
  cgpa: numeric("cgpa", { precision: 4, scale: 2 }).notNull(),
  courseBreakdown: jsonb("course_breakdown")
    .$type<{ code: string; name: string; creditHours: number; marks: number; grade: string; points: number }[]>()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const backlogs = pgTable("backlogs", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id),
  courseId: integer("course_id").notNull().references(() => courses.id),
  courseCode: varchar("course_code", { length: 30 }).notNull(),
  courseName: varchar("course_name", { length: 160 }).notNull(),
  programCode: varchar("program_code", { length: 20 }).notNull(),
  semesterNumber: integer("semester_number").notNull(),
  creditHours: integer("credit_hours").notNull().default(3),
  failedGrade: varchar("failed_grade", { length: 8 }).notNull().default("F"),
  attempts: integer("attempts").notNull().default(1),
  status: varchar("status", { length: 30 }).notNull().default("uncleared"), // uncleared | repeated | cleared
  clearedSemester: integer("cleared_semester"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const courseWithdrawals = pgTable("course_withdrawals", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id),
  courseId: integer("course_id").notNull().references(() => courses.id),
  courseCode: varchar("course_code", { length: 30 }).notNull(),
  courseName: varchar("course_name", { length: 160 }).notNull(),
  programCode: varchar("program_code", { length: 20 }).notNull(),
  semesterNumber: integer("semester_number").notNull(),
  creditHours: integer("credit_hours").notNull().default(3),
  withdrawalType: varchar("withdrawal_type", { length: 40 }).notNull(), // Official Withdrawal | Approved Drop | Rejected Request | Late Withdrawal | Admin Cancellation
  status: varchar("status", { length: 30 }).notNull().default("approved"), // approved | pending | rejected | cancelled
  reason: text("reason").notNull(),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  processedBy: varchar("processed_by", { length: 120 }).notNull().default("System Administrator"),
});

export const academicWarnings = pgTable("academic_warnings", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id),
  riskLevel: varchar("risk_level", { length: 30 }).notNull(), // Low Risk | Medium Risk | High Risk | Critical Risk
  riskScore: integer("risk_score").notNull(),
  reasons: jsonb("reasons").$type<string[]>().notNull().default([]),
  gpaTrigger: boolean("gpa_trigger").notNull().default(false),
  attendanceTrigger: boolean("attendance_trigger").notNull().default(false),
  backlogTrigger: boolean("backlog_trigger").notNull().default(false),
  withdrawalTrigger: boolean("withdrawal_trigger").notNull().default(false),
  status: varchar("status", { length: 30 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  roleTarget: varchar("role_target", { length: 30 }).notNull().default("all"),
  sectionId: integer("section_id"),
  title: varchar("title", { length: 180 }).notNull(),
  message: text("message").notNull(),
  category: varchar("category", { length: 40 }).notNull().default("Academic"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const academicRequests = pgTable("academic_requests", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id),
  studentName: varchar("student_name", { length: 120 }).notNull(),
  sectionId: integer("section_id").notNull().references(() => sections.id),
  sectionCode: varchar("section_code", { length: 30 }).notNull(),
  programCode: varchar("program_code", { length: 20 }).notNull(),
  requestType: varchar("request_type", { length: 50 }).notNull(), // Class Complaint | Academic Request | Classroom Issue | Timetable Conflict
  subject: varchar("subject", { length: 180 }).notNull(),
  description: text("description").notNull(),
  status: varchar("status", { length: 30 }).notNull().default("open"), // open | in_review | resolved | rejected
  submittedByCr: boolean("submitted_by_cr").notNull().default(false),
  responseNote: text("response_note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actor_user_id"),
  actorName: varchar("actor_name", { length: 120 }).notNull(),
  actorRole: varchar("actor_role", { length: 30 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 60 }).notNull(),
  entityId: varchar("entity_id", { length: 60 }).notNull(),
  details: text("details").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const gradingScale = pgTable("grading_scale", {
  id: serial("id").primaryKey(),
  letterGrade: varchar("letter_grade", { length: 8 }).notNull().unique(),
  minPercentage: integer("min_percentage").notNull(),
  maxPercentage: integer("max_percentage").notNull(),
  gradePoints: numeric("grade_points", { precision: 3, scale: 2 }).notNull(),
});

export const interventions = pgTable("interventions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id),
  authorId: integer("author_id").notNull().references(() => users.id),
  title: varchar("title", { length: 180 }).notNull(),
  type: varchar("type", { length: 60 }).notNull(),
  notes: text("notes").notNull(),
  status: varchar("status", { length: 25 }).notNull().default("scheduled"),
  dueDate: varchar("due_date", { length: 12 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
