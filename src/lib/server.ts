import { getDb, getPool, DatabaseConfigError } from "@/db";
import { ensureDatabaseReady, getDataCounts } from "@/db/bootstrap";
import {
  academicRequests,
  academicWarnings,
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
  sections,
  students,
  teachers,
  timetableEntries,
  users,
} from "@/db/schema";
import { and, desc, eq, inArray, ilike, or } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { LoginDirectory, Role, Workspace } from "./types";

const COOKIE_NAME = "uplift_session";

type ServerAuthGlobal = typeof globalThis & {
  __airActiveUserId?: number | null;
  __airSessionTableReady?: boolean;
};
const globalForAuth = globalThis as ServerAuthGlobal;

async function ensureActiveSessionTable() {
  if (globalForAuth.__airSessionTableReady) return;
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS portal_active_session (
      id integer PRIMARY KEY DEFAULT 1,
      user_id integer,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    INSERT INTO portal_active_session (id, user_id)
    VALUES (1, NULL)
    ON CONFLICT (id) DO NOTHING;
  `);
  globalForAuth.__airSessionTableReady = true;
}

export async function setPersistedSessionUserId(userId: number | null) {
  globalForAuth.__airActiveUserId = userId;
  try {
    await ensureActiveSessionTable();
    await getPool().query(
      `UPDATE portal_active_session SET user_id = $1, updated_at = now() WHERE id = 1`,
      [userId],
    );
  } catch (err) {
    console.warn("[air-portal] Failed to persist active session user:", (err as Error).message);
  }
}

export async function getPersistedSessionUserId(): Promise<number | null> {
  if (typeof globalForAuth.__airActiveUserId === "number") {
    return globalForAuth.__airActiveUserId;
  }
  try {
    await ensureActiveSessionTable();
    const { rows } = await getPool().query<{ user_id: number | null }>(
      `SELECT user_id FROM portal_active_session WHERE id = 1 LIMIT 1`,
    );
    const uid = rows[0]?.user_id ?? null;
    globalForAuth.__airActiveUserId = uid;
    return uid;
  } catch {
    return null;
  }
}

/**
 * Deterministic session signing key across all Next.js workers and route bundles.
 */
function sessionSecret(): string {
  const raw =
    process.env.SESSION_SECRET?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "air-university-portal-secret";
  return createHmac("sha256", "air-university-session-key-v1").update(raw).digest("hex");
}

export function signUser(id: number) {
  const signature = createHmac("sha256", sessionSecret()).update(String(id)).digest("hex");
  return `${id}.${signature}`;
}

export function verifySession(value: string): number | undefined {
  const [rawId, signature] = value.trim().split(".");
  if (!rawId || !signature || !/^\d+$/.test(rawId)) return undefined;
  const expected = signUser(Number(rawId)).split(".")[1];
  if (!expected || signature.length !== expected.length) return undefined;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? Number(rawId) : undefined;
}

/**
 * Reads the authenticated user from:
 * 1) `x-air-session` request header,
 * 2) `uplift_session` HTTP cookie, or
 * 3) `portal_active_session` in PostgreSQL (so iframe cookie/storage restrictions never drop a logged-in session).
 */
export async function getAuthenticatedUser() {
  await ensureDatabaseReady();
  const db = getDb();

  let hdrToken: string | undefined;
  try {
    const hdr = (await headers()).get("x-air-session")?.trim();
    if (hdr === "logout") return null;
    if (hdr && hdr !== "null" && hdr !== "undefined") {
      hdrToken = hdr;
    }
  } catch {
    /* headers() unavailable outside request context */
  }

  let cookieToken: string | undefined;
  try {
    cookieToken = (await cookies()).get(COOKIE_NAME)?.value;
  } catch {
    /* cookies() unavailable outside request context */
  }

  const headerId = hdrToken ? verifySession(hdrToken) : undefined;
  const cookieId = cookieToken ? verifySession(cookieToken) : undefined;
  const persistedId = await getPersistedSessionUserId();

  const id = headerId ?? cookieId ?? persistedId ?? undefined;
  if (!id) return null;
  const [byId] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return byId ?? null;
}

export async function currentUser() {
  const loggedIn = await getAuthenticatedUser();
  if (loggedIn) return loggedIn;
  const db = getDb();
  const [defaultAdmin] = await db
    .select()
    .from(users)
    .where(or(eq(users.email, "admin@demo.edu"), eq(users.role, "admin")))
    .limit(1);
  if (!defaultAdmin) {
    throw new Error("The AIR University portal user could not be found. Run `npm run db:seed` to initialize records.");
  }
  return defaultAdmin;
}

async function findStudentAccount(lookup: string) {
  const db = getDb();
  const [matchedStudent] = await db
    .select()
    .from(students)
    .where(
      or(
        ilike(students.studentId, lookup),
        ilike(students.studentId, `AU-${lookup}`),
        ilike(students.studentId, `%-${lookup}`),
        ilike(students.email, lookup),
        ilike(students.email, `${lookup}@%`),
        ilike(students.name, lookup),
        ilike(students.name, `%${lookup}%`),
      ),
    )
    .limit(1);

  if (!matchedStudent) return undefined;

  const [existingStudentUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.studentId, matchedStudent.id), eq(users.role, "student")))
    .limit(1);
  if (existingStudentUser) return existingStudentUser;

  const [byStudentEmail] = await db.select().from(users).where(ilike(users.email, matchedStudent.email)).limit(1);
  if (byStudentEmail) {
    const [updated] = await db
      .update(users)
      .set({
        role: "student",
        studentId: matchedStudent.id,
        isCr: matchedStudent.isCr,
        courses: [matchedStudent.course],
      })
      .where(eq(users.id, byStudentEmail.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(users)
    .values({
      name: matchedStudent.name,
      email: matchedStudent.email,
      role: "student",
      isCr: matchedStudent.isCr,
      studentId: matchedStudent.id,
      courses: [matchedStudent.course],
    })
    .returning();
  return created;
}

async function findTeacherAccount(lookup: string) {
  const db = getDb();
  const [matchedTeacher] = await db
    .select()
    .from(teachers)
    .where(
      or(
        ilike(teachers.email, lookup),
        ilike(teachers.email, `${lookup}@%`),
        ilike(teachers.employeeId, lookup),
        ilike(teachers.name, lookup),
        ilike(teachers.name, `%${lookup}%`),
      ),
    )
    .limit(1);

  if (matchedTeacher) {
    const [teacherUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "teacher"), ilike(users.email, matchedTeacher.email)))
      .limit(1);
    if (teacherUser) return teacherUser;
  }

  const [byTeacherUser] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.role, "teacher"),
        or(ilike(users.email, lookup), ilike(users.email, `${lookup}@%`), ilike(users.name, `%${lookup}%`)),
      ),
    )
    .limit(1);
  return byTeacherUser;
}

async function findAdminAccount(lookup: string) {
  const db = getDb();
  const [byAdminUser] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.role, "admin"),
        or(ilike(users.email, lookup), ilike(users.email, `${lookup}@%`), ilike(users.name, `%${lookup}%`)),
      ),
    )
    .limit(1);
  return byAdminUser;
}

export async function resolveLoginUser(identifier: string, roleHint?: Role) {
  await ensureDatabaseReady();
  const db = getDb();
  const clean = identifier.trim();

  const aliasMap: Record<string, string> = {
    "admin": "admin@demo.edu",
    "admin@au.edu.pk": "admin@demo.edu",
    "sarah@uplift.edu": "admin@demo.edu",
    "teacher": "ahmed.teacher@demo.edu",
    "daniel@uplift.edu": "ahmed.teacher@demo.edu",
    "student": "raza.student@demo.edu",
    "emma@uplift.edu": "raza.student@demo.edu",
    "raza.mughal@students.au.edu.pk": "raza.student@demo.edu",
  };
  const lookup = aliasMap[clean.toLowerCase()] ?? clean;

  if (lookup) {
    if (roleHint === "student") {
      const stu = await findStudentAccount(lookup);
      if (stu) return stu;
    } else if (roleHint === "teacher") {
      const tch = await findTeacherAccount(lookup);
      if (tch) return tch;
    } else if (roleHint === "admin") {
      const adm = await findAdminAccount(lookup);
      if (adm) return adm;
    }

    const [directUser] = await db.select().from(users).where(ilike(users.email, lookup)).limit(1);
    if (directUser) {
      if (directUser.role === "student") {
        return (await findStudentAccount(directUser.email)) ?? directUser;
      }
      return directUser;
    }

    const stuAny = await findStudentAccount(lookup);
    if (stuAny) return stuAny;

    const tchAny = await findTeacherAccount(lookup);
    if (tchAny) return tchAny;

    const admAny = await findAdminAccount(lookup);
    if (admAny) return admAny;

    return undefined;
  }

  if (roleHint) {
    const defaultEmails: Record<Role, string> = {
      admin: "admin@demo.edu",
      teacher: "ahmed.teacher@demo.edu",
      student: "raza.student@demo.edu",
    };
    const [byRoleEmail] = await db.select().from(users).where(eq(users.email, defaultEmails[roleHint])).limit(1);
    if (byRoleEmail) return byRoleEmail;
    const [byRole] = await db.select().from(users).where(eq(users.role, roleHint)).limit(1);
    if (byRole) return byRole;
  }

  return undefined;
}

export async function canAccessStudent(user: Awaited<ReturnType<typeof currentUser>>, id: number) {
  if (user.role === "admin") return true;
  if (user.role === "student") return user.studentId === id;
  const db = getDb();
  const [student] = await db.select({ course: students.course }).from(students).where(eq(students.id, id));
  return !!student && (user.courses.includes(student.course) || user.courses.length === 0);
}

export async function buildLoginDirectory(): Promise<LoginDirectory> {
  const db = getDb();
  const [allStudents, allTeachers, allAdmins] = await Promise.all([
    db
      .select({
        id: students.id,
        studentId: students.studentId,
        name: students.name,
        email: students.email,
        course: students.course,
        semesterNumber: students.semesterNumber,
        sectionCode: students.sectionCode,
        isCr: students.isCr,
      })
      .from(students)
      .orderBy(students.id),
    db
      .select({
        id: teachers.id,
        employeeId: teachers.employeeId,
        name: teachers.name,
        email: teachers.email,
        designation: teachers.designation,
        assignedPrograms: teachers.assignedPrograms,
      })
      .from(teachers)
      .orderBy(teachers.id),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.role, "admin"))
      .orderBy(users.id),
  ]);
  return { students: allStudents, teachers: allTeachers, admins: allAdmins };
}

export async function workspaceForUser(
  authUser: typeof users.$inferSelect | null,
): Promise<Workspace> {
  await ensureDatabaseReady();
  const db = getDb();
  const loginDirectory = await buildLoginDirectory();

  if (!authUser) {
    return JSON.parse(
      JSON.stringify({
        authenticated: false,
        loginDirectory,
        user: {
          id: 0,
          name: "Guest",
          email: "",
          role: "student",
          isCr: false,
          studentId: null,
          courses: [],
          notificationsEnabled: true,
          weeklyDigest: true,
          createdAt: new Date().toISOString(),
        },
        students: [],
        interventions: [],
        users: [],
        stats: { total: 0, high: 0, moderate: 0, low: 0, active: 0, engagement: 0 },
      }),
    ) as Workspace;
  }

  const user = authUser;

  const [
    allDepts,
    allPrograms,
    allSections,
    allTeachers,
    allCourses,
    allBuildings,
    allClassrooms,
    allTimetable,
    allCrs,
    allGrading,
    allNotifs,
    allUsers,
  ] = await Promise.all([
    db.select().from(departments).orderBy(departments.id),
    db.select().from(programs).orderBy(programs.id),
    db.select().from(sections).orderBy(sections.id),
    db.select().from(teachers).orderBy(teachers.id),
    db.select().from(courses).orderBy(courses.id),
    db.select().from(buildings).orderBy(buildings.id),
    db.select().from(classrooms).orderBy(classrooms.id),
    db.select().from(timetableEntries).orderBy(timetableEntries.id),
    db.select().from(crAssignments).orderBy(crAssignments.id),
    db.select().from(gradingScale).orderBy(gradingScale.minPercentage),
    db.select().from(notifications).orderBy(desc(notifications.id)).limit(20),
    db.select().from(users).orderBy(users.id),
  ]);

  let roster: (typeof students.$inferSelect)[] = [];
  let scopedSections = allSections;
  let scopedCourses = allCourses;
  let scopedTeachers = allTeachers;
  let scopedTimetable = allTimetable;
  let scopedCrs = allCrs;

  if (user.role === "student") {
    if (user.studentId) {
      roster = await db.select().from(students).where(eq(students.id, user.studentId)).orderBy(students.id);
    }
    if (!roster.length && user.email) {
      roster = await db.select().from(students).where(ilike(students.email, user.email)).limit(1);
    }
    const me = roster[0];
    if (me) {
      scopedSections = allSections.filter((s) => s.code === me.sectionCode);
      scopedCourses = allCourses.filter((c) => c.programCode === me.course && c.semesterNumber === me.semesterNumber);
      scopedTimetable = allTimetable.filter((t) => t.sectionCode === me.sectionCode);
      scopedCrs = allCrs.filter((c) => c.sectionCode === me.sectionCode);
      const myTeacherIds = new Set(scopedTimetable.map((t) => t.teacherId));
      scopedTeachers = allTeachers.filter((t) => myTeacherIds.has(t.id));
    } else {
      scopedSections = [];
      scopedCourses = [];
      scopedTimetable = [];
      scopedCrs = [];
      scopedTeachers = [];
    }
  } else if (user.role === "teacher") {
    const teacherRecord = allTeachers.find((t) => t.email.toLowerCase() === user.email.toLowerCase());
    const teacherSlots = teacherRecord
      ? allTimetable.filter((t) => t.teacherId === teacherRecord.id)
      : allTimetable.filter((t) => user.courses.includes(t.programCode));
    const taughtSectionCodes = new Set(teacherSlots.map((t) => t.sectionCode));
    const taughtPrograms = user.courses.length ? user.courses : teacherRecord?.assignedPrograms ?? ["BSAI"];

    const allProgramStudents = await db
      .select()
      .from(students)
      .where(inArray(students.course, taughtPrograms))
      .orderBy(students.id);

    const sectionFiltered = allProgramStudents.filter((s) => taughtSectionCodes.has(s.sectionCode));
    roster = sectionFiltered.length > 0 ? sectionFiltered : allProgramStudents;

    scopedSections = allSections.filter((s) => taughtSectionCodes.has(s.code) || taughtPrograms.includes(s.programCode));
    scopedCourses = allCourses.filter((c) => taughtPrograms.includes(c.programCode));
    scopedTimetable = allTimetable.filter(
      (t) => (teacherRecord && t.teacherId === teacherRecord.id) || taughtSectionCodes.has(t.sectionCode),
    );
    scopedCrs = allCrs.filter((c) => taughtSectionCodes.has(c.sectionCode) || taughtPrograms.includes(c.programCode));
  } else {
    roster = await db.select().from(students).orderBy(students.id);
  }

  const ids = roster.map((student) => student.id);

  const plans = ids.length
    ? await db.select().from(interventions).where(inArray(interventions.studentId, ids)).orderBy(interventions.dueDate)
    : [];
  const scopedEnrollments = ids.length
    ? await db.select().from(enrollments).where(inArray(enrollments.studentId, ids)).orderBy(enrollments.id)
    : [];
  const scopedGpa = ids.length
    ? await db.select().from(gpaRecords).where(inArray(gpaRecords.studentId, ids)).orderBy(gpaRecords.id)
    : [];
  const scopedBacklogs = ids.length
    ? await db.select().from(backlogs).where(inArray(backlogs.studentId, ids)).orderBy(backlogs.id)
    : [];
  const scopedWithdrawals = ids.length
    ? await db.select().from(courseWithdrawals).where(inArray(courseWithdrawals.studentId, ids)).orderBy(courseWithdrawals.id)
    : [];
  const scopedWarnings = ids.length
    ? await db.select().from(academicWarnings).where(inArray(academicWarnings.studentId, ids)).orderBy(academicWarnings.id)
    : [];

  const scopedRequests =
    user.role === "student" && roster[0]?.sectionId
      ? await db
          .select()
          .from(academicRequests)
          .where(eq(academicRequests.sectionId, roster[0].sectionId))
          .orderBy(desc(academicRequests.id))
      : await db.select().from(academicRequests).orderBy(desc(academicRequests.id));

  const recentAudits =
    user.role === "admin" ? await db.select().from(auditLogs).orderBy(desc(auditLogs.id)).limit(30) : [];

  const team =
    user.role === "admin"
      ? allUsers.filter((u) => u.role !== "student" || u.isCr || u.email === "raza.student@demo.edu")
      : user.role === "teacher"
        ? allUsers.filter((u) => u.role === "teacher" || u.role === "admin" || u.id === user.id)
        : allUsers.filter((u) => u.id === user.id);

  const avgGpa =
    roster.length > 0
      ? Number((roster.reduce((sum, s) => sum + Number(s.gpa || 3.0), 0) / roster.length).toFixed(2))
      : 0;
  const avgCgpa =
    roster.length > 0
      ? Number((roster.reduce((sum, s) => sum + Number(s.cgpa || 3.0), 0) / roster.length).toFixed(2))
      : 0;

  const unclearedBacklogs = scopedBacklogs.filter((b) => b.status !== "cleared").length;
  const approvedDrops = scopedWithdrawals.filter((w) => w.status !== "rejected").length;
  const passedEnrollments = scopedEnrollments.filter((e) => e.letterGrade !== "F").length;
  const passRate = scopedEnrollments.length > 0 ? Math.round((passedEnrollments / scopedEnrollments.length) * 100) : 100;

  const stats = {
    total: roster.length,
    high: roster.filter((student) => student.riskScore >= 65).length,
    moderate: roster.filter((student) => student.riskScore >= 40 && student.riskScore < 65).length,
    low: roster.filter((student) => student.riskScore < 40).length,
    critical: roster.filter((student) => student.riskScore >= 80).length,
    active: plans.filter((plan) => plan.status !== "completed").length,
    engagement: Math.round(roster.reduce((sum, student) => sum + student.engagement, 0) / Math.max(1, roster.length)),
    avgGpa,
    avgCgpa,
    totalTeachers: scopedTeachers.length,
    totalCourses: scopedCourses.length,
    totalSections: scopedSections.length,
    totalCrs: scopedCrs.filter((c) => c.status === "active").length,
    weeklyScheduledClasses: scopedTimetable.length,
    unclearedBacklogs,
    approvedDrops,
    passRate,
  };

  return JSON.parse(
    JSON.stringify({
      authenticated: true,
      loginDirectory,
      user,
      students: roster,
      interventions: plans,
      users: team,
      departments: allDepts,
      programs: allPrograms,
      sections: scopedSections,
      teachers: scopedTeachers,
      courses: scopedCourses,
      buildings: allBuildings,
      classrooms: allClassrooms,
      timetableEntries: scopedTimetable,
      crAssignments: scopedCrs,
      enrollments: scopedEnrollments,
      gpaRecords: scopedGpa,
      backlogs: scopedBacklogs,
      withdrawals: scopedWithdrawals,
      warnings: scopedWarnings,
      requests: scopedRequests,
      notifications: allNotifs,
      gradingScale: allGrading,
      auditLogs: recentAudits,
      stats,
    }),
  ) as Workspace;
}

export async function workspace(): Promise<Workspace> {
  const authUser = await getAuthenticatedUser();
  return workspaceForUser(authUser);
}

export function isRole(value: unknown): value is Role {
  return ["admin", "teacher", "student"].includes(String(value));
}

export const SESSION_COOKIE = COOKIE_NAME;
export { getDataCounts };

export function isSetupError(error: unknown): boolean {
  if (error instanceof DatabaseConfigError) return true;
  const code = (error as { code?: string }).code;
  const message = (error as Error).message || "";
  return (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT" ||
    code === "42P01" ||
    code === "3D000" ||
    code === "28P01" ||
    /DATABASE_URL|password authentication failed|does not exist|connect ECONNREFUSED/i.test(message)
  );
}

export function setupMessage(error: unknown): string {
  if (error instanceof DatabaseConfigError) return error.message;
  const code = (error as { code?: string }).code;
  if (code === "28P01") return "PostgreSQL rejected the username or password in DATABASE_URL.";
  if (code === "3D000") return "The database in DATABASE_URL does not exist. Create it, then run `npm run db:migrate`.";
  if (code === "42P01") return "Database tables are missing. Run `npm run db:migrate && npm run db:seed`.";
  if (code === "ECONNREFUSED") return "PostgreSQL is not reachable. Is the service running and is DATABASE_URL correct?";
  if (code === "ENOTFOUND") return "The PostgreSQL host could not be resolved. Check DATABASE_URL.";
  return "The database could not be reached. Check DATABASE_URL and run `npm run db:migrate`.";
}

export function apiError(error: unknown) {
  console.error("[air-portal] API error:", error);
  if (isSetupError(error)) {
    return Response.json({ error: setupMessage(error), setupRequired: true }, { status: 503 });
  }
  return Response.json({ error: "We couldn't complete that request. Please try again." }, { status: 500 });
}
