import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { getDb } from "./index";
import {
  academicRequests,
  academicSessions,
  academicWarnings,
  assessmentResults,
  assessments,
  attendanceRecords,
  auditLogs,
  backlogs,
  buildings,
  classrooms,
  courses,
  courseWithdrawals,
  crAssignments,
  departments,
  enrollments,
  gpaRecords,
  gradingScale,
  interventions,
  notifications,
  programs,
  roles,
  sections,
  semesters,
  students,
  teacherAssignments,
  teachers,
  timetableEntries,
  users,
} from "./schema";
import { predictRisk } from "../lib/risk-model";
import { DEFAULT_GRADING_SCALE, calculateWeightedGpa, scoreToGrade } from "../lib/air-university";
import { warningCategory } from "../lib/types";

export type SeedResult = {
  seeded: boolean;
  students: number;
  users: number;
  interventions: number;
};

export function hashPassword(password: string): string {
  return createHash("sha256").update(`air-uni-salt:${password.trim()}`).digest("hex");
}

export function verifyPasswordHash(password: string, hash: string): boolean {
  if (!hash) return false;
  return hashPassword(password) === hash;
}

export async function getDataCounts() {
  const db = getDb();
  const [studentRow] = await db.select({ count: sql<number>`count(*)::int` }).from(students);
  const [userRow] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  const [planRow] = await db.select({ count: sql<number>`count(*)::int` }).from(interventions);
  return { students: studentRow?.count ?? 0, users: userRow?.count ?? 0, interventions: planRow?.count ?? 0 };
}

/**
 * 20 BSAI students (12 in BSAI-S3-A, 8 in BSAI-S1-A).
 * Index 0: Raza Mughal (Primary BSAI Demo Student — raza.student@demo.edu / Student@123, Semester 3)
 * Index 1: Abdul Hadi (CR of BSAI-S3-A)
 * Index 12: Farooq Ahmed (CR of BSAI-S1-A)
 */
const BSAI_STUDENTS = [
  { name: "Raza Mughal", email: "raza.student@demo.edu", sem: 3, sec: "BSAI-S3-A", isCr: false, eng: 42, quiz: 54, att: 64, late: 3, missed: 2 },
  { name: "Abdul Hadi", email: "abdul.hadi@students.au.edu.pk", sem: 3, sec: "BSAI-S3-A", isCr: true, eng: 93, quiz: 90, att: 96, late: 0, missed: 0 },
  { name: "Fazil Khan", email: "fazil.khan@students.au.edu.pk", sem: 3, sec: "BSAI-S3-A", isCr: false, eng: 60, quiz: 65, att: 72, late: 2, missed: 1 },
  { name: "Muzamil Tariq", email: "muzamil.tariq@students.au.edu.pk", sem: 3, sec: "BSAI-S3-A", isCr: false, eng: 38, quiz: 48, att: 56, late: 4, missed: 2 },
  { name: "Ali Hamza", email: "ali.hamza@students.au.edu.pk", sem: 3, sec: "BSAI-S3-A", isCr: false, eng: 85, quiz: 82, att: 89, late: 0, missed: 0 },
  { name: "Rehan Siddiqui", email: "rehan.siddiqui@students.au.edu.pk", sem: 3, sec: "BSAI-S3-A", isCr: false, eng: 63, quiz: 67, att: 75, late: 1, missed: 1 },
  { name: "Zainab Fatima", email: "zainab.fatima@students.au.edu.pk", sem: 3, sec: "BSAI-S3-A", isCr: false, eng: 91, quiz: 88, att: 94, late: 0, missed: 0 },
  { name: "Huzaifa Abbasi", email: "huzaifa.abbasi@students.au.edu.pk", sem: 3, sec: "BSAI-S3-A", isCr: false, eng: 45, quiz: 53, att: 60, late: 3, missed: 2 },
  { name: "Ayesha Noor", email: "ayesha.noor@students.au.edu.pk", sem: 3, sec: "BSAI-S3-A", isCr: false, eng: 88, quiz: 85, att: 92, late: 0, missed: 0 },
  { name: "Saad Bin Khalid", email: "saad.khalid@students.au.edu.pk", sem: 3, sec: "BSAI-S3-A", isCr: false, eng: 78, quiz: 76, att: 84, late: 0, missed: 0 },
  { name: "Talha Javed", email: "talha.javed@students.au.edu.pk", sem: 3, sec: "BSAI-S3-A", isCr: false, eng: 56, quiz: 60, att: 68, late: 2, missed: 1 },
  { name: "Fatima Zahra", email: "fatima.zahra@students.au.edu.pk", sem: 3, sec: "BSAI-S3-A", isCr: false, eng: 92, quiz: 89, att: 94, late: 0, missed: 0 },
  { name: "Farooq Ahmed", email: "farooq.ahmed@students.au.edu.pk", sem: 1, sec: "BSAI-S1-A", isCr: true, eng: 89, quiz: 86, att: 93, late: 0, missed: 0 },
  { name: "Usama Iqbal", email: "usama.iqbal@students.au.edu.pk", sem: 1, sec: "BSAI-S1-A", isCr: false, eng: 40, quiz: 47, att: 58, late: 4, missed: 2 },
  { name: "Haris Mehmood", email: "haris.mehmood@students.au.edu.pk", sem: 1, sec: "BSAI-S1-A", isCr: false, eng: 80, quiz: 77, att: 85, late: 0, missed: 0 },
  { name: "Maryam Bibi", email: "maryam.bibi@students.au.edu.pk", sem: 1, sec: "BSAI-S1-A", isCr: false, eng: 84, quiz: 81, att: 89, late: 0, missed: 0 },
  { name: "Zohaib Hassan", email: "zohaib.hassan@students.au.edu.pk", sem: 1, sec: "BSAI-S1-A", isCr: false, eng: 62, quiz: 64, att: 72, late: 1, missed: 1 },
  { name: "Areeba Sultana", email: "areeba.sultana@students.au.edu.pk", sem: 1, sec: "BSAI-S1-A", isCr: false, eng: 87, quiz: 84, att: 90, late: 0, missed: 0 },
  { name: "Faisal Kareem", email: "faisal.kareem@students.au.edu.pk", sem: 1, sec: "BSAI-S1-A", isCr: false, eng: 43, quiz: 51, att: 59, late: 3, missed: 2 },
  { name: "Danish Naeem", email: "danish.naeem@students.au.edu.pk", sem: 1, sec: "BSAI-S1-A", isCr: false, eng: 76, quiz: 74, att: 83, late: 0, missed: 0 },
];

const BSCS_NAMES = [
  "Ali Hassan", "Bilal Mustafa", "Umar Farooq", "Hassan Raza", "Hussain Tariq", "Zain Ul Abideen",
  "Abdullah Malik", "Ibrahim Qureshi", "Yousaf Chaudhry", "Mustafa Sheikh", "Ahmad Mirza", "Anas Siddiqui",
  "Hamza Shafiq", "Fahad Gondal", "Shahzaib Cheema", "Arslan Lodhi", "Kamran Niazi", "Waqas Kazmi",
  "Junaid Gillani", "Kashif Bukhari",
];

const BSDS_NAMES = [
  "Rehan Ahmed", "Sufyan Ansari", "Ammar Usmani", "Taimoor Saeed", "Subhan Hashmi", "Rayyan Abbasi",
  "Awais Javed", "Moiz Nawaz", "Shayan Raza", "Adnan Khan", "Imran Mughal", "Hafsa Noor",
  "Amina Tariq", "Komal Fatima", "Sana Malik", "Laiba Qureshi", "Mahnoor Sheikh", "Noor Ul Ain",
  "Iqra Siddiqui", "Momina Chaudhry",
];

export async function seedDatabase(options: { force?: boolean; studentCount?: number } = {}): Promise<SeedResult> {
  const db = getDb();

  // Check if the 60-student enterprise dataset with admin@demo.edu and raza.student@demo.edu is already present
  const [demoAdmin] = await db.select({ id: users.id }).from(users).where(eq(users.email, "admin@demo.edu")).limit(1);
  const [demoRaza] = await db.select({ id: users.id }).from(users).where(eq(users.email, "raza.student@demo.edu")).limit(1);
  const existingCounts = await getDataCounts();
  if (demoAdmin && demoRaza && existingCounts.students === 60 && !options.force) {
    return { seeded: false, ...existingCounts };
  }

  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(98471235)`);

    const [already] = await tx.select({ id: users.id }).from(users).where(eq(users.email, "admin@demo.edu")).limit(1);
    const currentCount = (await tx.select({ count: sql<number>`count(*)::int` }).from(students))[0]?.count ?? 0;
    if (already && currentCount === 60 && !options.force) return;

    // Clear tables in reverse dependency order for clean 60-student initialization
    await tx.delete(auditLogs);
    await tx.delete(academicRequests);
    await tx.delete(notifications);
    await tx.delete(academicWarnings);
    await tx.delete(courseWithdrawals);
    await tx.delete(backlogs);
    await tx.delete(gpaRecords);
    await tx.delete(assessmentResults);
    await tx.delete(assessments);
    await tx.delete(attendanceRecords);
    await tx.delete(crAssignments);
    await tx.delete(timetableEntries);
    await tx.delete(enrollments);
    await tx.delete(teacherAssignments);
    await tx.delete(courses);
    await tx.delete(teachers);
    await tx.delete(sections);
    await tx.delete(semesters);
    await tx.delete(academicSessions);
    await tx.delete(programs);
    await tx.delete(departments);
    await tx.delete(classrooms);
    await tx.delete(buildings);
    await tx.delete(gradingScale);
    await tx.delete(roles);
    await tx.delete(interventions);
    await tx.delete(users);
    await tx.delete(students);

    // 1. Roles
    await tx.insert(roles).values([
      { code: "admin", name: "Administrator", permissions: ["all", "manage_users", "manage_timetables", "manage_crs", "manage_grades", "audit"] },
      { code: "teacher", name: "Teacher / Faculty", permissions: ["view_assigned_courses", "manage_attendance", "manage_marks", "create_interventions"] },
      { code: "student", name: "Student", permissions: ["view_own_record", "view_timetable", "use_what_if"] },
      { code: "cr", name: "Class Representative", permissions: ["view_own_record", "submit_class_requests", "report_room_issues", "report_timetable_conflicts"] },
    ]);

    // 2. Grading Scale (4.00 configurable scale)
    await tx.insert(gradingScale).values(
      DEFAULT_GRADING_SCALE.map((g) => ({
        letterGrade: g.letterGrade,
        minPercentage: g.minPercentage,
        maxPercentage: g.maxPercentage,
        gradePoints: g.gradePoints.toFixed(2),
      })),
    );

    // 3. Buildings & Classrooms (Digital Campus + Conflict-Free Scheduling)
    const insertedBuildings = await tx
      .insert(buildings)
      .values([
        { code: "BLD-AI", name: "Block B — AI & Creative Technologies", buildingType: "Academic", floors: 4, posX: "-18.00", posZ: "-10.00", color: "#1d6fa5", description: "Home of BSAI, AI Labs, and Faculty Offices" },
        { code: "BLD-CS", name: "Block C — Computer Science Complex", buildingType: "Academic", floors: 4, posX: "18.00", posZ: "-10.00", color: "#2d6a4f", description: "Home of BSCS, Systems Labs, and Lecture Halls" },
        { code: "BLD-DS", name: "Block D — Data Science & Analytics", buildingType: "Academic", floors: 3, posX: "-18.00", posZ: "14.00", color: "#6d597a", description: "Home of BSDS, Big Data & Analytics Labs" },
        { code: "BLD-LIB", name: "Central Digital Library", buildingType: "Library", floors: 3, posX: "0.00", posZ: "0.00", color: "#b5838d", description: "24/7 Research Library, Study Pods & Digital Archive" },
        { code: "BLD-ADM", name: "Administration & Auditorium Block", buildingType: "Administrative", floors: 3, posX: "18.00", posZ: "14.00", color: "#bc6c25", description: "Vice Chancellor Office, Registrar, Exam Cell & Auditorium" },
      ])
      .returning();

    const bldMap = Object.fromEntries(insertedBuildings.map((b) => [b.code, b.id]));

    const insertedRooms = await tx
      .insert(classrooms)
      .values([
        { code: "Room-B-117", name: "AI Lecture Hall B-117", buildingId: bldMap["BLD-AI"], roomType: "Lecture Hall", capacity: 45, floor: 1, hasMultimedia: true, hasLabPcs: false },
        { code: "Room-B-122", name: "AI Seminar Room B-122", buildingId: bldMap["BLD-AI"], roomType: "Lecture Hall", capacity: 40, floor: 1, hasMultimedia: true, hasLabPcs: false },
        { code: "Lab-B-001", name: "AI & Data Structures Lab B-001", buildingId: bldMap["BLD-AI"], roomType: "Computer Lab", capacity: 40, floor: 0, hasMultimedia: true, hasLabPcs: true },
        { code: "Room-B-105", name: "AI Foundation Hall B-105", buildingId: bldMap["BLD-AI"], roomType: "Lecture Hall", capacity: 40, floor: 1, hasMultimedia: true, hasLabPcs: false },
        { code: "Room-C-201", name: "CS Lecture Hall C-201", buildingId: bldMap["BLD-CS"], roomType: "Lecture Hall", capacity: 45, floor: 2, hasMultimedia: true, hasLabPcs: false },
        { code: "Room-C-202", name: "CS Systems Hall C-202", buildingId: bldMap["BLD-CS"], roomType: "Lecture Hall", capacity: 45, floor: 2, hasMultimedia: true, hasLabPcs: false },
        { code: "Room-C-105", name: "CS Foundation Hall C-105", buildingId: bldMap["BLD-CS"], roomType: "Lecture Hall", capacity: 40, floor: 1, hasMultimedia: true, hasLabPcs: false },
        { code: "Room-D-104", name: "DS Lecture Hall D-104", buildingId: bldMap["BLD-DS"], roomType: "Lecture Hall", capacity: 45, floor: 1, hasMultimedia: true, hasLabPcs: false },
        { code: "Room-D-105", name: "DS Analytics Hall D-105", buildingId: bldMap["BLD-DS"], roomType: "Lecture Hall", capacity: 40, floor: 1, hasMultimedia: true, hasLabPcs: false },
        { code: "Lab-D-102", name: "Data Science Computing Lab D-102", buildingId: bldMap["BLD-DS"], roomType: "Computer Lab", capacity: 40, floor: 1, hasMultimedia: true, hasLabPcs: true },
      ])
      .returning();

    const roomMap = Object.fromEntries(insertedRooms.map((r) => [r.code, r]));

    // 4. Departments & Programs (BSAI, BSCS, BSDS)
    const insertedDepts = await tx
      .insert(departments)
      .values([
        { code: "DAI", name: "Department of Artificial Intelligence", buildingCode: "BLD-AI", headName: "Dr. Humaira" },
        { code: "DCS", name: "Department of Computer Science", buildingCode: "BLD-CS", headName: "Dr. Tariq Mehmood" },
        { code: "DDS", name: "Department of Data Science", buildingCode: "BLD-DS", headName: "Dr. Saima Nawaz" },
      ])
      .returning();
    const deptMap = Object.fromEntries(insertedDepts.map((d) => [d.code, d]));

    const insertedPrograms = await tx
      .insert(programs)
      .values([
        { code: "BSAI", name: "Bachelor of Science in Artificial Intelligence", departmentId: deptMap["DAI"].id, degreeLevel: "BS", totalCredits: 132, durationYears: 4 },
        { code: "BSCS", name: "Bachelor of Science in Computer Science", departmentId: deptMap["DCS"].id, degreeLevel: "BS", totalCredits: 132, durationYears: 4 },
        { code: "BSDS", name: "Bachelor of Science in Data Science", departmentId: deptMap["DDS"].id, degreeLevel: "BS", totalCredits: 132, durationYears: 4 },
      ])
      .returning();
    const progMap = Object.fromEntries(insertedPrograms.map((p) => [p.code, p]));

    const [activeSession] = await tx
      .insert(academicSessions)
      .values([{ code: "SPRING-2026", name: "Spring 2026 Semester", startDate: "2026-02-02", endDate: "2026-06-15", isActive: true }])
      .returning();

    // 5. Semesters & 5 Active Sections across BSAI, BSCS, BSDS
    const insertedSemesters = await tx
      .insert(semesters)
      .values([
        { programId: progMap["BSAI"].id, semesterNumber: 1, name: "BSAI Semester 1", sessionId: activeSession.id },
        { programId: progMap["BSAI"].id, semesterNumber: 3, name: "BSAI Semester 3", sessionId: activeSession.id },
        { programId: progMap["BSCS"].id, semesterNumber: 1, name: "BSCS Semester 1", sessionId: activeSession.id },
        { programId: progMap["BSCS"].id, semesterNumber: 3, name: "BSCS Semester 3", sessionId: activeSession.id },
        { programId: progMap["BSDS"].id, semesterNumber: 3, name: "BSDS Semester 3", sessionId: activeSession.id },
      ])
      .returning();

    const findSem = (pCode: string, num: number) =>
      insertedSemesters.find((s) => s.programId === progMap[pCode].id && s.semesterNumber === num)!;

    const insertedSections = await tx
      .insert(sections)
      .values([
        { code: "BSAI-S3-A", name: "BSAI Sem 3 Section A", programId: progMap["BSAI"].id, programCode: "BSAI", semesterId: findSem("BSAI", 3).id, semesterNumber: 3, advisorName: "Dr. Humaira", capacity: 30 },
        { code: "BSAI-S1-A", name: "BSAI Sem 1 Section A", programId: progMap["BSAI"].id, programCode: "BSAI", semesterId: findSem("BSAI", 1).id, semesterNumber: 1, advisorName: "Ahmed Khan", capacity: 30 },
        { code: "BSCS-S3-A", name: "BSCS Sem 3 Section A", programId: progMap["BSCS"].id, programCode: "BSCS", semesterId: findSem("BSCS", 3).id, semesterNumber: 3, advisorName: "Dr. Tariq Mehmood", capacity: 30 },
        { code: "BSCS-S1-A", name: "BSCS Sem 1 Section A", programId: progMap["BSCS"].id, programCode: "BSCS", semesterId: findSem("BSCS", 1).id, semesterNumber: 1, advisorName: "Usman Ali", capacity: 30 },
        { code: "BSDS-S3-A", name: "BSDS Sem 3 Section A", programId: progMap["BSDS"].id, programCode: "BSDS", semesterId: findSem("BSDS", 3).id, semesterNumber: 3, advisorName: "Dr. Saima Nawaz", capacity: 30 },
      ])
      .returning();
    const secMap = Object.fromEntries(insertedSections.map((s) => [s.code, s]));

    // 6. Seed Exactly 60 Active Demo Students (20 BSAI, 20 BSCS, 20 BSDS)
    const colors = ["blue", "sage", "peach", "lavender", "sand", "pink"];
    const studentRows: (typeof students.$inferInsert)[] = [];

    // 20 BSAI Students
    for (let i = 0; i < 20; i++) {
      const item = BSAI_STUDENTS[i];
      const features = {
        engagement: item.eng,
        quizScore: item.quiz,
        attendance: item.att,
        lateSubmissions: item.late,
        missedAssessments: item.missed,
      };
      const riskScore = predictRisk(features);
      const sec = secMap[item.sec];
      const baseGpa = Math.max(1.65, Math.min(3.96, Number(((item.quiz * 0.025) + (item.att * 0.015) - item.late * 0.12).toFixed(2))));
      const baseCgpa = Math.max(1.75, Math.min(3.95, Number((baseGpa + (i === 0 ? -0.15 : 0.04)).toFixed(2))));
      studentRows.push({
        studentId: `AU-BSAI-${String(24001 + i)}`,
        name: item.name,
        email: item.email,
        course: "BSAI",
        year: item.sem === 3 ? 2 : 1,
        semesterNumber: item.sem,
        sectionCode: item.sec,
        programId: progMap["BSAI"].id,
        departmentId: deptMap["DAI"].id,
        semesterId: sec.semesterId,
        sectionId: sec.id,
        avatarColor: colors[i % colors.length],
        ...features,
        riskScore,
        gpa: baseGpa.toFixed(2),
        cgpa: baseCgpa.toFixed(2),
        earnedCredits: item.sem === 3 ? 34 : 15,
        isCr: item.isCr,
        warningLevel: warningCategory(riskScore),
        status: "active",
        lastActive: new Date(Date.now() - ((i % 8) + 1) * 3_600_000),
        weeklyActivity: Array.from({ length: 8 }, (_, w) => Math.max(20, Math.min(100, item.eng + (w - 4) * 2))),
      });
    }

    // 20 BSCS Students (12 in BSCS-S3-A, 8 in BSCS-S1-A)
    for (let i = 0; i < 20; i++) {
      const name = BSCS_NAMES[i];
      const sem = i < 12 ? 3 : 1;
      const secCode = i < 12 ? "BSCS-S3-A" : "BSCS-S1-A";
      const isCr = i === 0 || i === 12; // Ali Hassan (BSCS-S3-A) & Hamza Shafiq (BSCS-S1-A)
      const sec = secMap[secCode];
      const high = !isCr && i % 5 === 3;
      const moderate = !isCr && !high && i % 3 === 1;
      const features = isCr
        ? { engagement: 91, quizScore: 88, attendance: 94, lateSubmissions: 0, missedAssessments: 0 }
        : high
          ? { engagement: 39 + (i % 10), quizScore: 48 + (i % 10), attendance: 56 + (i % 10), lateSubmissions: 3, missedAssessments: 2 }
          : moderate
            ? { engagement: 59 + (i % 10), quizScore: 62 + (i % 10), attendance: 69 + (i % 10), lateSubmissions: 1, missedAssessments: 1 }
            : { engagement: 80 + (i % 14), quizScore: 78 + (i % 14), attendance: 86 + (i % 10), lateSubmissions: 0, missedAssessments: 0 };
      const riskScore = predictRisk(features);
      const baseGpa = Math.max(1.7, Math.min(3.95, Number(((features.quizScore * 0.025) + (features.attendance * 0.015) - features.lateSubmissions * 0.1).toFixed(2))));
      studentRows.push({
        studentId: `AU-BSCS-${String(24021 + i)}`,
        name,
        email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@students.au.edu.pk`,
        course: "BSCS",
        year: sem === 3 ? 2 : 1,
        semesterNumber: sem,
        sectionCode: secCode,
        programId: progMap["BSCS"].id,
        departmentId: deptMap["DCS"].id,
        semesterId: sec.semesterId,
        sectionId: sec.id,
        avatarColor: colors[(i + 2) % colors.length],
        ...features,
        riskScore,
        gpa: baseGpa.toFixed(2),
        cgpa: Math.max(1.8, Math.min(3.95, Number((baseGpa + 0.05).toFixed(2)))).toFixed(2),
        earnedCredits: sem === 3 ? 36 : 16,
        isCr,
        warningLevel: warningCategory(riskScore),
        status: "active",
        lastActive: new Date(Date.now() - ((i % 10) + 1) * 3_600_000),
        weeklyActivity: Array.from({ length: 8 }, (_, w) => Math.max(22, Math.min(100, features.engagement + (w - 4) * 2))),
      });
    }

    // 20 BSDS Students (all 20 in BSDS-S3-A)
    for (let i = 0; i < 20; i++) {
      const name = BSDS_NAMES[i];
      const sem = 3;
      const secCode = "BSDS-S3-A";
      const isCr = i === 0; // Rehan Ahmed (CR of BSDS-S3-A)
      const sec = secMap[secCode];
      const high = !isCr && i % 6 === 4;
      const moderate = !isCr && !high && i % 3 === 2;
      const features = isCr
        ? { engagement: 90, quizScore: 87, attendance: 95, lateSubmissions: 0, missedAssessments: 0 }
        : high
          ? { engagement: 41 + (i % 9), quizScore: 49 + (i % 9), attendance: 57 + (i % 9), lateSubmissions: 3, missedAssessments: 2 }
          : moderate
            ? { engagement: 60 + (i % 9), quizScore: 63 + (i % 9), attendance: 71 + (i % 9), lateSubmissions: 1, missedAssessments: 1 }
            : { engagement: 81 + (i % 12), quizScore: 79 + (i % 12), attendance: 87 + (i % 10), lateSubmissions: 0, missedAssessments: 0 };
      const riskScore = predictRisk(features);
      const baseGpa = Math.max(1.75, Math.min(3.94, Number(((features.quizScore * 0.025) + (features.attendance * 0.015) - features.lateSubmissions * 0.1).toFixed(2))));
      studentRows.push({
        studentId: `AU-BSDS-${String(24041 + i)}`,
        name,
        email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@students.au.edu.pk`,
        course: "BSDS",
        year: 2,
        semesterNumber: sem,
        sectionCode: secCode,
        programId: progMap["BSDS"].id,
        departmentId: deptMap["DDS"].id,
        semesterId: sec.semesterId,
        sectionId: sec.id,
        avatarColor: colors[(i + 4) % colors.length],
        ...features,
        riskScore,
        gpa: baseGpa.toFixed(2),
        cgpa: Math.max(1.85, Math.min(3.95, Number((baseGpa + 0.04).toFixed(2)))).toFixed(2),
        earnedCredits: 35,
        isCr,
        warningLevel: warningCategory(riskScore),
        status: "active",
        lastActive: new Date(Date.now() - ((i % 9) + 1) * 3_600_000),
        weeklyActivity: Array.from({ length: 8 }, (_, w) => Math.max(24, Math.min(100, features.engagement + (w - 4) * 2))),
      });
    }

    const insertedStudents = await tx.insert(students).values(studentRows).returning();

    // 7. Create Portal Users (Admin, Teachers, and all 60 Students) with hashed passwords
    const adminPasswordHash = hashPassword("Admin@123");
    const teacherPasswordHash = hashPassword("Teacher@123");
    const studentPasswordHash = hashPassword("Student@123");

    const staffUsers = await tx
      .insert(users)
      .values([
        {
          name: "System Administrator",
          email: "admin@demo.edu",
          passwordHash: adminPasswordHash,
          role: "admin",
          courses: ["BSAI", "BSCS", "BSDS"],
        },
        {
          name: "Ahmed Khan",
          email: "ahmed.teacher@demo.edu",
          passwordHash: teacherPasswordHash,
          role: "teacher",
          departmentId: deptMap["DAI"].id,
          courses: ["BSAI", "BSCS", "BSDS"],
        },
        {
          name: "Sara Ahmed",
          email: "sara.teacher@demo.edu",
          passwordHash: teacherPasswordHash,
          role: "teacher",
          departmentId: deptMap["DDS"].id,
          courses: ["BSAI", "BSCS", "BSDS"],
        },
        {
          name: "Usman Ali",
          email: "usman.teacher@demo.edu",
          passwordHash: teacherPasswordHash,
          role: "teacher",
          departmentId: deptMap["DCS"].id,
          courses: ["BSAI", "BSCS", "BSDS"],
        },
        {
          name: "Dr. Humaira",
          email: "humaira@au.edu.pk",
          passwordHash: teacherPasswordHash,
          role: "teacher",
          departmentId: deptMap["DAI"].id,
          courses: ["BSAI", "BSCS", "BSDS"],
        },
        {
          name: "Almas Ayesha",
          email: "almas.ayesha@au.edu.pk",
          passwordHash: teacherPasswordHash,
          role: "teacher",
          departmentId: deptMap["DCS"].id,
          courses: ["BSAI", "BSCS"],
        },
        {
          name: "Muneeba",
          email: "muneeba@au.edu.pk",
          passwordHash: teacherPasswordHash,
          role: "teacher",
          departmentId: deptMap["DAI"].id,
          courses: ["BSAI", "BSCS", "BSDS"],
        },
        {
          name: "Adeel Khan",
          email: "adeel.khan@au.edu.pk",
          passwordHash: teacherPasswordHash,
          role: "teacher",
          departmentId: deptMap["DAI"].id,
          courses: ["BSAI", "BSCS", "BSDS"],
        },
        {
          name: "Dr. Tariq Mehmood",
          email: "tariq.mehmood@au.edu.pk",
          passwordHash: teacherPasswordHash,
          role: "teacher",
          departmentId: deptMap["DCS"].id,
          courses: ["BSCS", "BSAI"],
        },
        {
          name: "Dr. Saima Nawaz",
          email: "saima.nawaz@au.edu.pk",
          passwordHash: teacherPasswordHash,
          role: "teacher",
          departmentId: deptMap["DDS"].id,
          courses: ["BSDS", "BSCS"],
        },
        {
          name: "Sohail Ahmed",
          email: "sohail.ahmed@au.edu.pk",
          passwordHash: teacherPasswordHash,
          role: "teacher",
          departmentId: deptMap["DCS"].id,
          courses: ["BSAI", "BSCS", "BSDS"],
        },
      ])
      .returning();

    const userByEmail = Object.fromEntries(staffUsers.map((u) => [u.email, u]));

    await tx.insert(users).values(
      insertedStudents.map((st) => ({
        name: st.name,
        email: st.email,
        passwordHash: studentPasswordHash,
        role: "student",
        isCr: st.isCr,
        studentId: st.id,
        departmentId: st.departmentId,
        courses: [st.course],
      })),
    );

    // 8. Teachers Table (Cross-department faculty records)
    const insertedTeachers = await tx
      .insert(teachers)
      .values([
        { userId: userByEmail["ahmed.teacher@demo.edu"].id, employeeId: "AU-FAC-101", name: "Ahmed Khan", email: "ahmed.teacher@demo.edu", designation: "Associate Professor", primaryDepartmentId: deptMap["DAI"].id, primaryDepartmentCode: "DAI", additionalDepartments: ["DCS", "DDS"], assignedPrograms: ["BSAI", "BSCS", "BSDS"], maxWeeklyHours: 18, officeRoom: "Room-B-104" },
        { userId: userByEmail["sara.teacher@demo.edu"].id, employeeId: "AU-FAC-102", name: "Sara Ahmed", email: "sara.teacher@demo.edu", designation: "Assistant Professor", primaryDepartmentId: deptMap["DDS"].id, primaryDepartmentCode: "DDS", additionalDepartments: ["DAI", "DCS"], assignedPrograms: ["BSAI", "BSCS", "BSDS"], maxWeeklyHours: 18, officeRoom: "Room-D-108" },
        { userId: userByEmail["usman.teacher@demo.edu"].id, employeeId: "AU-FAC-103", name: "Usman Ali", email: "usman.teacher@demo.edu", designation: "Assistant Professor", primaryDepartmentId: deptMap["DCS"].id, primaryDepartmentCode: "DCS", additionalDepartments: ["DAI", "DDS"], assignedPrograms: ["BSAI", "BSCS", "BSDS"], maxWeeklyHours: 18, officeRoom: "Room-C-210" },
        { userId: userByEmail["humaira@au.edu.pk"].id, employeeId: "AU-FAC-104", name: "Dr. Humaira", email: "humaira@au.edu.pk", designation: "Assistant Professor & BSAI Advisor", primaryDepartmentId: deptMap["DAI"].id, primaryDepartmentCode: "DAI", additionalDepartments: ["DCS", "DDS"], assignedPrograms: ["BSAI", "BSCS", "BSDS"], maxWeeklyHours: 18, officeRoom: "Room-B-117" },
        { userId: userByEmail["almas.ayesha@au.edu.pk"].id, employeeId: "AU-FAC-105", name: "Almas Ayesha", email: "almas.ayesha@au.edu.pk", designation: "Senior Lecturer", primaryDepartmentId: deptMap["DCS"].id, primaryDepartmentCode: "DCS", additionalDepartments: ["DAI"], assignedPrograms: ["BSAI", "BSCS"], maxWeeklyHours: 18, officeRoom: "Room-B-122" },
        { userId: userByEmail["muneeba@au.edu.pk"].id, employeeId: "AU-FAC-106", name: "Muneeba", email: "muneeba@au.edu.pk", designation: "Lecturer", primaryDepartmentId: deptMap["DAI"].id, primaryDepartmentCode: "DAI", additionalDepartments: ["DCS", "DDS"], assignedPrograms: ["BSAI", "BSCS", "BSDS"], maxWeeklyHours: 18, officeRoom: "Room-B-117" },
        { userId: userByEmail["adeel.khan@au.edu.pk"].id, employeeId: "AU-FAC-107", name: "Adeel Khan", email: "adeel.khan@au.edu.pk", designation: "Assistant Professor", primaryDepartmentId: deptMap["DAI"].id, primaryDepartmentCode: "DAI", additionalDepartments: ["DCS", "DDS"], assignedPrograms: ["BSAI", "BSCS", "BSDS"], maxWeeklyHours: 18, officeRoom: "Room-B-118" },
        { userId: userByEmail["tariq.mehmood@au.edu.pk"].id, employeeId: "AU-FAC-108", name: "Dr. Tariq Mehmood", email: "tariq.mehmood@au.edu.pk", designation: "Associate Professor & BSCS Advisor", primaryDepartmentId: deptMap["DCS"].id, primaryDepartmentCode: "DCS", additionalDepartments: ["DAI"], assignedPrograms: ["BSCS", "BSAI"], maxWeeklyHours: 18, officeRoom: "Room-C-201" },
        { userId: userByEmail["saima.nawaz@au.edu.pk"].id, employeeId: "AU-FAC-109", name: "Dr. Saima Nawaz", email: "saima.nawaz@au.edu.pk", designation: "Associate Professor & BSDS Advisor", primaryDepartmentId: deptMap["DDS"].id, primaryDepartmentCode: "DDS", additionalDepartments: ["DCS"], assignedPrograms: ["BSDS", "BSCS"], maxWeeklyHours: 18, officeRoom: "Room-D-104" },
        { userId: userByEmail["sohail.ahmed@au.edu.pk"].id, employeeId: "AU-FAC-110", name: "Sohail Ahmed", email: "sohail.ahmed@au.edu.pk", designation: "Assistant Professor", primaryDepartmentId: deptMap["DCS"].id, primaryDepartmentCode: "DCS", additionalDepartments: ["DAI", "DDS"], assignedPrograms: ["BSAI", "BSCS", "BSDS"], maxWeeklyHours: 18, officeRoom: "Room-B-119" },
      ])
      .returning();
    const teacherByName = Object.fromEntries(insertedTeachers.map((t) => [t.name, t]));

    // 9. Courses Catalog across BSAI, BSCS, BSDS
    const insertedCourses = await tx
      .insert(courses)
      .values([
        // BSAI Semester 3
        { code: "CS112", name: "Object Oriented Programming", programId: progMap["BSAI"].id, programCode: "BSAI", departmentId: deptMap["DAI"].id, semesterNumber: 3, creditHours: 3, courseType: "Core" },
        { code: "AI232", name: "Introduction to Artificial Intelligence", programId: progMap["BSAI"].id, programCode: "BSAI", departmentId: deptMap["DAI"].id, semesterNumber: 3, creditHours: 3, courseType: "Core" },
        { code: "CS216", name: "Data Structures and Algorithms", programId: progMap["BSAI"].id, programCode: "BSAI", departmentId: deptMap["DAI"].id, semesterNumber: 3, creditHours: 3, courseType: "Core" },
        { code: "MA205", name: "Linear Algebra", programId: progMap["BSAI"].id, programCode: "BSAI", departmentId: deptMap["DAI"].id, semesterNumber: 3, creditHours: 3, courseType: "Math" },
        { code: "MA301", name: "Probability and Statistics", programId: progMap["BSAI"].id, programCode: "BSAI", departmentId: deptMap["DAI"].id, semesterNumber: 3, creditHours: 3, courseType: "Math" },
        // BSAI Semester 1
        { code: "CS101-AI", name: "Programming Fundamentals", programId: progMap["BSAI"].id, programCode: "BSAI", departmentId: deptMap["DAI"].id, semesterNumber: 1, creditHours: 3, courseType: "Core" },
        { code: "MA110-AI", name: "Calculus", programId: progMap["BSAI"].id, programCode: "BSAI", departmentId: deptMap["DAI"].id, semesterNumber: 1, creditHours: 3, courseType: "Math" },
        { code: "AI105", name: "Foundations of AI", programId: progMap["BSAI"].id, programCode: "BSAI", departmentId: deptMap["DAI"].id, semesterNumber: 1, creditHours: 3, courseType: "Core" },
        { code: "CS112L", name: "Programming Lab", programId: progMap["BSAI"].id, programCode: "BSAI", departmentId: deptMap["DAI"].id, semesterNumber: 1, creditHours: 3, courseType: "Lab" },
        // BSCS Semester 3
        { code: "CS214", name: "Data Structures", programId: progMap["BSCS"].id, programCode: "BSCS", departmentId: deptMap["DCS"].id, semesterNumber: 3, creditHours: 3, courseType: "Core" },
        { code: "CS220", name: "Database Systems", programId: progMap["BSCS"].id, programCode: "BSCS", departmentId: deptMap["DCS"].id, semesterNumber: 3, creditHours: 3, courseType: "Core" },
        { code: "CS115", name: "Discrete Structures", programId: progMap["BSCS"].id, programCode: "BSCS", departmentId: deptMap["DCS"].id, semesterNumber: 3, creditHours: 3, courseType: "Core" },
        { code: "CS301", name: "Operating Systems", programId: progMap["BSCS"].id, programCode: "BSCS", departmentId: deptMap["DCS"].id, semesterNumber: 3, creditHours: 3, courseType: "Core" },
        { code: "CS310", name: "Software Engineering", programId: progMap["BSCS"].id, programCode: "BSCS", departmentId: deptMap["DCS"].id, semesterNumber: 3, creditHours: 3, courseType: "Core" },
        { code: "CS226", name: "Computer Architecture", programId: progMap["BSCS"].id, programCode: "BSCS", departmentId: deptMap["DCS"].id, semesterNumber: 3, creditHours: 3, courseType: "Core" },
        // BSCS Semester 1
        { code: "CS101-CS", name: "Programming Fundamentals", programId: progMap["BSCS"].id, programCode: "BSCS", departmentId: deptMap["DCS"].id, semesterNumber: 1, creditHours: 3, courseType: "Core" },
        { code: "CS105", name: "Introduction to Computing", programId: progMap["BSCS"].id, programCode: "BSCS", departmentId: deptMap["DCS"].id, semesterNumber: 1, creditHours: 3, courseType: "Core" },
        { code: "DS110", name: "Statistical Computing", programId: progMap["BSCS"].id, programCode: "BSCS", departmentId: deptMap["DCS"].id, semesterNumber: 1, creditHours: 3, courseType: "Math" },
        { code: "MA110-CS", name: "Calculus & Analytical Geometry", programId: progMap["BSCS"].id, programCode: "BSCS", departmentId: deptMap["DCS"].id, semesterNumber: 1, creditHours: 3, courseType: "Math" },
        // BSDS Semester 3
        { code: "DS201", name: "Introduction to Data Science", programId: progMap["BSDS"].id, programCode: "BSDS", departmentId: deptMap["DDS"].id, semesterNumber: 3, creditHours: 3, courseType: "Core" },
        { code: "DS210", name: "Programming for Data Science", programId: progMap["BSDS"].id, programCode: "BSDS", departmentId: deptMap["DDS"].id, semesterNumber: 3, creditHours: 3, courseType: "Core" },
        { code: "DS230", name: "Database Management", programId: progMap["BSDS"].id, programCode: "BSDS", departmentId: deptMap["DDS"].id, semesterNumber: 3, creditHours: 3, courseType: "Core" },
        { code: "DS240", name: "Probability and Statistics", programId: progMap["BSDS"].id, programCode: "BSDS", departmentId: deptMap["DDS"].id, semesterNumber: 3, creditHours: 3, courseType: "Math" },
        { code: "DS305", name: "Machine Learning", programId: progMap["BSDS"].id, programCode: "BSDS", departmentId: deptMap["DDS"].id, semesterNumber: 3, creditHours: 3, courseType: "Core" },
      ])
      .returning();

    const courseByCode = Object.fromEntries(insertedCourses.map((c) => [c.code, c]));

    // 10. Fixed 5-Day × 2-Session Conflict-Free Weekly Timetable (50 Scheduled Sessions)
    const rawSchedule: {
      day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
      slot: "SESSION_1" | "SESSION_2";
      sec: string;
      course: string;
      teacher: string;
      room: string;
    }[] = [
      // MONDAY SESSION 1 (08:40 AM – 11:40 AM)
      { day: "Monday", slot: "SESSION_1", sec: "BSAI-S3-A", course: "CS112", teacher: "Ahmed Khan", room: "Lab-B-001" },
      { day: "Monday", slot: "SESSION_1", sec: "BSAI-S1-A", course: "MA110-AI", teacher: "Adeel Khan", room: "Room-B-105" },
      { day: "Monday", slot: "SESSION_1", sec: "BSCS-S3-A", course: "CS214", teacher: "Muneeba", room: "Room-C-201" },
      { day: "Monday", slot: "SESSION_1", sec: "BSCS-S1-A", course: "CS105", teacher: "Dr. Tariq Mehmood", room: "Room-C-105" },
      { day: "Monday", slot: "SESSION_1", sec: "BSDS-S3-A", course: "DS201", teacher: "Dr. Saima Nawaz", room: "Room-D-104" },
      // MONDAY SESSION 2 (11:40 AM – 02:40 PM)
      { day: "Monday", slot: "SESSION_2", sec: "BSAI-S3-A", course: "AI232", teacher: "Dr. Humaira", room: "Room-B-117" },
      { day: "Monday", slot: "SESSION_2", sec: "BSAI-S1-A", course: "CS101-AI", teacher: "Almas Ayesha", room: "Room-B-105" },
      { day: "Monday", slot: "SESSION_2", sec: "BSCS-S3-A", course: "CS220", teacher: "Usman Ali", room: "Room-C-201" },
      { day: "Monday", slot: "SESSION_2", sec: "BSCS-S1-A", course: "MA110-CS", teacher: "Sohail Ahmed", room: "Room-C-105" },
      { day: "Monday", slot: "SESSION_2", sec: "BSDS-S3-A", course: "DS210", teacher: "Ahmed Khan", room: "Lab-D-102" },

      // TUESDAY SESSION 1 (08:40 AM – 11:40 AM)
      { day: "Tuesday", slot: "SESSION_1", sec: "BSAI-S3-A", course: "CS216", teacher: "Usman Ali", room: "Room-B-117" },
      { day: "Tuesday", slot: "SESSION_1", sec: "BSAI-S1-A", course: "CS101-AI", teacher: "Ahmed Khan", room: "Room-B-105" },
      { day: "Tuesday", slot: "SESSION_1", sec: "BSCS-S3-A", course: "CS115", teacher: "Sara Ahmed", room: "Room-C-202" },
      { day: "Tuesday", slot: "SESSION_1", sec: "BSCS-S1-A", course: "DS110", teacher: "Dr. Saima Nawaz", room: "Room-C-105" },
      { day: "Tuesday", slot: "SESSION_1", sec: "BSDS-S3-A", course: "DS305", teacher: "Muneeba", room: "Room-D-104" },
      // TUESDAY SESSION 2 (11:40 AM – 02:40 PM)
      { day: "Tuesday", slot: "SESSION_2", sec: "BSAI-S3-A", course: "MA205", teacher: "Sara Ahmed", room: "Room-B-122" },
      { day: "Tuesday", slot: "SESSION_2", sec: "BSAI-S1-A", course: "CS112L", teacher: "Almas Ayesha", room: "Room-B-105" },
      { day: "Tuesday", slot: "SESSION_2", sec: "BSCS-S3-A", course: "CS301", teacher: "Dr. Tariq Mehmood", room: "Room-C-202" },
      { day: "Tuesday", slot: "SESSION_2", sec: "BSCS-S1-A", course: "CS101-CS", teacher: "Ahmed Khan", room: "Room-C-105" },
      { day: "Tuesday", slot: "SESSION_2", sec: "BSDS-S3-A", course: "DS230", teacher: "Usman Ali", room: "Room-D-104" },

      // WEDNESDAY SESSION 1 (08:40 AM – 11:40 AM)
      { day: "Wednesday", slot: "SESSION_1", sec: "BSAI-S3-A", course: "CS112", teacher: "Ahmed Khan", room: "Lab-B-001" },
      { day: "Wednesday", slot: "SESSION_1", sec: "BSAI-S1-A", course: "AI105", teacher: "Dr. Humaira", room: "Room-B-105" },
      { day: "Wednesday", slot: "SESSION_1", sec: "BSCS-S3-A", course: "CS214", teacher: "Muneeba", room: "Room-C-201" },
      { day: "Wednesday", slot: "SESSION_1", sec: "BSCS-S1-A", course: "CS105", teacher: "Dr. Tariq Mehmood", room: "Room-C-105" },
      { day: "Wednesday", slot: "SESSION_1", sec: "BSDS-S3-A", course: "DS201", teacher: "Dr. Saima Nawaz", room: "Room-D-104" },
      // WEDNESDAY SESSION 2 (11:40 AM – 02:40 PM)
      { day: "Wednesday", slot: "SESSION_2", sec: "BSAI-S3-A", course: "MA301", teacher: "Adeel Khan", room: "Room-B-117" },
      { day: "Wednesday", slot: "SESSION_2", sec: "BSAI-S1-A", course: "MA110-AI", teacher: "Almas Ayesha", room: "Room-B-105" },
      { day: "Wednesday", slot: "SESSION_2", sec: "BSCS-S3-A", course: "CS220", teacher: "Usman Ali", room: "Room-C-201" },
      { day: "Wednesday", slot: "SESSION_2", sec: "BSCS-S1-A", course: "MA110-CS", teacher: "Sohail Ahmed", room: "Room-C-105" },
      { day: "Wednesday", slot: "SESSION_2", sec: "BSDS-S3-A", course: "DS240", teacher: "Sara Ahmed", room: "Room-D-105" },

      // THURSDAY SESSION 1 (08:40 AM – 11:40 AM)
      { day: "Thursday", slot: "SESSION_1", sec: "BSAI-S3-A", course: "CS216", teacher: "Usman Ali", room: "Room-B-117" },
      { day: "Thursday", slot: "SESSION_1", sec: "BSAI-S1-A", course: "CS101-AI", teacher: "Ahmed Khan", room: "Room-B-105" },
      { day: "Thursday", slot: "SESSION_1", sec: "BSCS-S3-A", course: "CS115", teacher: "Sara Ahmed", room: "Room-C-202" },
      { day: "Thursday", slot: "SESSION_1", sec: "BSCS-S1-A", course: "DS110", teacher: "Dr. Saima Nawaz", room: "Room-C-105" },
      { day: "Thursday", slot: "SESSION_1", sec: "BSDS-S3-A", course: "DS305", teacher: "Muneeba", room: "Room-D-104" },
      // THURSDAY SESSION 2 (11:40 AM – 02:40 PM)
      { day: "Thursday", slot: "SESSION_2", sec: "BSAI-S3-A", course: "AI232", teacher: "Dr. Humaira", room: "Room-B-117" },
      { day: "Thursday", slot: "SESSION_2", sec: "BSAI-S1-A", course: "CS112L", teacher: "Almas Ayesha", room: "Room-B-105" },
      { day: "Thursday", slot: "SESSION_2", sec: "BSCS-S3-A", course: "CS301", teacher: "Dr. Tariq Mehmood", room: "Room-C-202" },
      { day: "Thursday", slot: "SESSION_2", sec: "BSCS-S1-A", course: "MA110-CS", teacher: "Sohail Ahmed", room: "Room-C-105" },
      { day: "Thursday", slot: "SESSION_2", sec: "BSDS-S3-A", course: "DS210", teacher: "Ahmed Khan", room: "Lab-D-102" },

      // FRIDAY SESSION 1 (08:40 AM – 11:40 AM)
      { day: "Friday", slot: "SESSION_1", sec: "BSAI-S3-A", course: "MA301", teacher: "Adeel Khan", room: "Room-B-117" },
      { day: "Friday", slot: "SESSION_1", sec: "BSAI-S1-A", course: "AI105", teacher: "Dr. Humaira", room: "Room-B-105" },
      { day: "Friday", slot: "SESSION_1", sec: "BSCS-S3-A", course: "CS310", teacher: "Almas Ayesha", room: "Room-C-201" },
      { day: "Friday", slot: "SESSION_1", sec: "BSCS-S1-A", course: "MA110-CS", teacher: "Sohail Ahmed", room: "Room-C-105" },
      { day: "Friday", slot: "SESSION_1", sec: "BSDS-S3-A", course: "DS240", teacher: "Sara Ahmed", room: "Room-D-105" },
      // FRIDAY SESSION 2 (11:40 AM – 02:40 PM)
      { day: "Friday", slot: "SESSION_2", sec: "BSAI-S3-A", course: "MA205", teacher: "Sara Ahmed", room: "Room-B-122" },
      { day: "Friday", slot: "SESSION_2", sec: "BSAI-S1-A", course: "MA110-AI", teacher: "Sohail Ahmed", room: "Room-B-105" },
      { day: "Friday", slot: "SESSION_2", sec: "BSCS-S3-A", course: "CS226", teacher: "Almas Ayesha", room: "Room-C-201" },
      { day: "Friday", slot: "SESSION_2", sec: "BSCS-S1-A", course: "CS101-CS", teacher: "Ahmed Khan", room: "Room-C-105" },
      { day: "Friday", slot: "SESSION_2", sec: "BSDS-S3-A", course: "DS230", teacher: "Usman Ali", room: "Room-D-104" },
    ];

    const ttValues = rawSchedule.map((item) => {
      const sec = secMap[item.sec];
      const course = courseByCode[item.course];
      const teacher = teacherByName[item.teacher];
      const room = roomMap[item.room];
      return {
        programId: sec.programId,
        programCode: sec.programCode,
        semesterId: sec.semesterId,
        semesterNumber: sec.semesterNumber,
        sectionId: sec.id,
        sectionCode: sec.code,
        courseId: course.id,
        courseCode: course.code.replace(/-(AI|CS)$/, ""),
        courseName: course.name,
        teacherId: teacher.id,
        teacherName: teacher.name,
        classroomId: room.id,
        classroomCode: room.code,
        dayOfWeek: item.day,
        sessionSlot: item.slot,
        startTime: item.slot === "SESSION_1" ? "08:40 AM" : "11:40 AM",
        endTime: item.slot === "SESSION_1" ? "11:40 AM" : "02:40 PM",
        creditHours: course.creditHours,
        status: "scheduled",
      };
    });

    await tx.insert(timetableEntries).values(ttValues);

    // 11. Teacher Assignments (Unique course-section-teacher pairs)
    const seenPairs = new Set<string>();
    const taValues: (typeof teacherAssignments.$inferInsert)[] = [];
    for (const item of rawSchedule) {
      const key = `${item.sec}:${item.course}:${item.teacher}`;
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      const sec = secMap[item.sec];
      const course = courseByCode[item.course];
      const teacher = teacherByName[item.teacher];
      const room = roomMap[item.room];
      taValues.push({
        teacherId: teacher.id,
        courseId: course.id,
        programId: sec.programId,
        semesterId: sec.semesterId,
        sectionId: sec.id,
        classroomId: room.id,
        weeklySessions: 2,
      });
    }
    await tx.insert(teacherAssignments).values(taValues);

    // 12. CR Assignments (One active CR per configured section)
    const crs = insertedStudents.filter((s) => s.isCr);
    for (const cr of crs) {
      const sec = secMap[cr.sectionCode];
      await tx.insert(crAssignments).values({
        sectionId: sec.id,
        sectionCode: sec.code,
        programCode: cr.course,
        semesterNumber: cr.semesterNumber,
        studentId: cr.id,
        studentName: cr.name,
        studentRegNo: cr.studentId,
        assignedBy: "System Administrator",
        status: "active",
      });
      await tx.update(sections).set({ crStudentId: cr.id }).where(eq(sections.id, sec.id));
    }

    // 13. Enrollments, GPA/CGPA Records, Backlogs, Course Withdrawals, and Academic Warnings
    const enrollmentRows: (typeof enrollments.$inferInsert)[] = [];
    const gpaRows: (typeof gpaRecords.$inferInsert)[] = [];
    const backlogRows: (typeof backlogs.$inferInsert)[] = [];
    const withdrawalRows: (typeof courseWithdrawals.$inferInsert)[] = [];
    const warningRows: (typeof academicWarnings.$inferInsert)[] = [];

    for (const st of insertedStudents) {
      const secCourses = insertedCourses.filter(
        (c) => c.programCode === st.course && c.semesterNumber === st.semesterNumber,
      );
      const breakdown: { code: string; name: string; creditHours: number; marks: number; grade: string; points: number }[] = [];

      secCourses.forEach((c, idx) => {
        const shift = ((st.id * 5 + idx * 7) % 11) - 5;
        const att = Math.max(45, Math.min(100, st.attendance + shift));
        const quiz = Math.max(5, Math.min(15, Number(((st.quizScore / 100) * 15).toFixed(1))));
        const assign = Math.max(5, Math.min(15, Number(((st.engagement / 100) * 15).toFixed(1))));
        const mid = Math.max(10, Math.min(30, Number((((st.quizScore + shift) / 100) * 30).toFixed(1))));
        const fin = Math.max(12, Math.min(40, Number((((st.quizScore + st.engagement) / 200) * 40).toFixed(1))));
        const total = Math.max(38, Math.min(98, Math.round(quiz + assign + mid + fin)));
        const { letterGrade, gradePoints } = scoreToGrade(total);

        const assignedTeacher =
          taValues.find((ta) => ta.courseId === c.id && ta.sectionId === st.sectionId)?.teacherId ??
          insertedTeachers[0].id;

        enrollmentRows.push({
          studentId: st.id,
          courseId: c.id,
          sectionId: st.sectionId!,
          semesterNumber: st.semesterNumber,
          teacherId: assignedTeacher,
          attendancePct: att,
          quizMarks: quiz.toFixed(2),
          assignmentMarks: assign.toFixed(2),
          midtermMarks: mid.toFixed(2),
          finalMarks: fin.toFixed(2),
          totalMarks: total.toFixed(2),
          letterGrade,
          gradePoints: gradePoints.toFixed(2),
          status: "enrolled",
        });

        breakdown.push({
          code: c.code.replace(/-(AI|CS)$/, ""),
          name: c.name,
          creditHours: c.creditHours,
          marks: total,
          grade: letterGrade,
          points: gradePoints,
        });
      });

      const { totalCredits, qualityPoints, gpa } = calculateWeightedGpa(
        breakdown.map((b) => ({ creditHours: b.creditHours, gradePoints: b.points })),
      );
      const cgpa = Number(Math.max(1.65, Math.min(4.0, gpa + (st.name === "Raza Mughal" ? -0.12 : 0.03))).toFixed(2));

      gpaRows.push({
        studentId: st.id,
        semesterNumber: st.semesterNumber,
        semesterName: `Semester ${st.semesterNumber} (Spring 2026)`,
        creditHours: totalCredits,
        qualityPoints: qualityPoints.toFixed(2),
        gpa: gpa.toFixed(2),
        cgpa: cgpa.toFixed(2),
        courseBreakdown: breakdown,
      });

      // Backlogs & Withdrawals for realism and Raza Mughal
      const hasBacklog = st.riskScore >= 65 || st.name === "Raza Mughal";
      if (hasBacklog && secCourses[0]) {
        backlogRows.push({
          studentId: st.id,
          courseId: secCourses[0].id,
          courseCode: secCourses[0].code.replace(/-(AI|CS)$/, ""),
          courseName: secCourses[0].name,
          programCode: st.course,
          semesterNumber: Math.max(1, st.semesterNumber - 1),
          creditHours: 3,
          failedGrade: "F",
          attempts: st.riskScore >= 80 ? 2 : 1,
          status: st.riskScore >= 75 ? "uncleared" : "repeated",
          clearedSemester: null,
        });
      }

      if (st.name === "Raza Mughal" || st.id % 9 === 0) {
        const wCourse = secCourses[secCourses.length - 1] ?? insertedCourses[0];
        withdrawalRows.push({
          studentId: st.id,
          courseId: wCourse.id,
          courseCode: wCourse.code.replace(/-(AI|CS)$/, ""),
          courseName: wCourse.name,
          programCode: st.course,
          semesterNumber: st.semesterNumber,
          creditHours: 3,
          withdrawalType: st.name === "Raza Mughal" ? "Approved Drop" : "Official Withdrawal",
          status: "approved",
          reason: "Course load balancing approved by Class Advisor — not counted as academic failure.",
          processedBy: "System Administrator",
        });
      }

      const reasons: string[] = [];
      if (cgpa < 2.3) reasons.push(`Low CGPA (${cgpa.toFixed(2)})`);
      if (st.attendance < 75) reasons.push(`Poor attendance (${st.attendance}%)`);
      if (st.lateSubmissions >= 3) reasons.push(`${st.lateSubmissions} late lab/assignment submissions`);
      if (hasBacklog) reasons.push("Uncleared or repeated course backlog");
      if (!reasons.length) reasons.push("Consistent academic standing across enrolled courses");

      warningRows.push({
        studentId: st.id,
        riskLevel: warningCategory(st.riskScore),
        riskScore: st.riskScore,
        reasons,
        gpaTrigger: cgpa < 2.3,
        attendanceTrigger: st.attendance < 75,
        backlogTrigger: hasBacklog,
        withdrawalTrigger: st.name === "Raza Mughal" || st.id % 9 === 0,
        status: "active",
      });
    }

    await tx.insert(enrollments).values(enrollmentRows);
    await tx.insert(gpaRecords).values(gpaRows);
    if (backlogRows.length) await tx.insert(backlogs).values(backlogRows);
    if (withdrawalRows.length) await tx.insert(courseWithdrawals).values(withdrawalRows);
    await tx.insert(academicWarnings).values(warningRows);

    // 14. Seed CR Academic Requests & Notifications & Interventions
    const hadi = insertedStudents.find((s) => s.name === "Abdul Hadi") ?? insertedStudents[1];
    const raza = insertedStudents.find((s) => s.name === "Raza Mughal") ?? insertedStudents[0];
    const aliHassan = insertedStudents.find((s) => s.name === "Ali Hassan") ?? insertedStudents[20];
    const rehanAhmed = insertedStudents.find((s) => s.name === "Rehan Ahmed") ?? insertedStudents[40];

    await tx.insert(academicRequests).values([
      {
        studentId: hadi.id,
        studentName: hadi.name,
        sectionId: secMap["BSAI-S3-A"].id,
        sectionCode: "BSAI-S3-A",
        programCode: "BSAI",
        requestType: "Classroom Issue",
        subject: "Lab-B-001 GPU Workstation Update for CS112 & AI232",
        description: "CR Abdul Hadi requested CUDA toolkit verification on 4 workstations in Lab-B-001 before Monday Session 1.",
        status: "in_review",
        submittedByCr: true,
        responseNote: "IT Support scheduled update for Friday afternoon.",
      },
      {
        studentId: aliHassan.id,
        studentName: aliHassan.name,
        sectionId: secMap["BSCS-S3-A"].id,
        sectionCode: "BSCS-S3-A",
        programCode: "BSCS",
        requestType: "Academic Request",
        subject: "Extra Problem-Solving Session for CS214 Data Structures",
        description: "CR Ali Hassan requested a practice review sheet ahead of the midterm examination.",
        status: "open",
        submittedByCr: true,
        responseNote: "",
      },
      {
        studentId: rehanAhmed.id,
        studentName: rehanAhmed.name,
        sectionId: secMap["BSDS-S3-A"].id,
        sectionCode: "BSDS-S3-A",
        programCode: "BSDS",
        requestType: "Class Complaint",
        subject: "Projector Calibration in Room-D-104",
        description: "CR Rehan Ahmed reported low contrast on the main projector in Room-D-104 during Session 1.",
        status: "resolved",
        submittedByCr: true,
        responseNote: "Projector lamp replaced by Campus Facilities.",
      },
    ]);

    await tx.insert(notifications).values([
      { userId: null, roleTarget: "all", sectionId: null, title: "Fixed Two-Session Daily Schedule Active", message: "All BSAI, BSCS, and BSDS sections follow Session 1 (08:40 AM–11:40 AM) and Session 2 (11:40 AM–02:40 PM) Monday through Friday.", category: "Timetable" },
      { userId: null, roleTarget: "student", sectionId: secMap["BSAI-S3-A"].id, title: "BSAI-S3-A Advisory Check-in with Dr. Humaira", message: "Raza Mughal and BSAI Semester 3 students can review their GPA, attendance, and SHAP risk insights in the portal.", category: "Advisory" },
    ]);

    const ahmedUser = userByEmail["ahmed.teacher@demo.edu"];
    const humairaUser = userByEmail["humaira@au.edu.pk"];

    const flagged = insertedStudents.filter((s) => s.riskScore >= 40 || s.name === "Raza Mughal" || s.name === "Abdul Hadi");
    await tx.insert(interventions).values(
      flagged.slice(0, 24).map((st, idx) => ({
        studentId: st.id,
        authorId: idx % 2 === 0 ? ahmedUser.id : humairaUser.id,
        title:
          st.name === "Raza Mughal"
            ? "BSAI Semester 3 Academic Recovery & Backlog Plan"
            : st.name === "Abdul Hadi"
              ? "BSAI-S3-A CR Peer Study Coordination"
              : `Academic Check-in & Attendance Plan (${st.course})`,
        type: ["Academic check-in", "Study plan", "Academic support", "Mentoring"][idx % 4],
        notes:
          st.name === "Raza Mughal"
            ? "Meet Ahmed Khan and Dr. Humaira to review Object Oriented Programming (CS112) and AI232 quiz scores, clear pending backlog, and raise attendance above 75%."
            : "Weekly progress follow-up on quiz scores, attendance, and on-time lab submissions.",
        status: idx % 3 === 0 ? "in_progress" : "scheduled",
        dueDate: new Date(Date.now() + ((idx % 10) + 2) * 86_400_000).toISOString().slice(0, 10),
      })),
    );

    await tx.insert(auditLogs).values([
      {
        actorUserId: userByEmail["admin@demo.edu"].id,
        actorName: "System Administrator",
        actorRole: "admin",
        action: "SEED_ECOSYSTEM",
        entityType: "university",
        entityId: "AIR-UNI",
        details: "Initialized 60 active demo students (20 BSAI, 20 BSCS, 20 BSDS), 5 sections, 5 CRs, 10 teachers, and 50 conflict-free weekly class sessions.",
      },
    ]);
  });

  const finalCounts = await getDataCounts();
  return { seeded: true, ...finalCounts };
}

export async function findDemoUser(role: string) {
  const db = getDb();
  const emails: Record<string, string> = {
    admin: "admin@demo.edu",
    teacher: "ahmed.teacher@demo.edu",
    student: "raza.student@demo.edu",
  };
  const email = emails[role];
  if (!email) return undefined;
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user;
}
