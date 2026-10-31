import { getDb } from "@/db";
import { students, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { currentUser, apiError } from "@/lib/server";
import { predictRisk } from "@/lib/risk-model";
import { COURSES } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (user.role !== "admin" && user.role !== "teacher") {
      return Response.json({ error: "Only administrators or faculty can add students." }, { status: 403 });
    }
    const b = await request.json();
    if (
      typeof b.name !== "string" ||
      b.name.trim().length < 2 ||
      b.name.length > 120 ||
      typeof b.email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email) ||
      b.email.length > 180 ||
      !COURSES.includes(b.course)
    ) {
      return Response.json({ error: "Please enter a name, a valid email, and a program (BSAI, BSCS, BSDS, BSSE, BSCYS)." }, { status: 400 });
    }
    const db = getDb();
    const [existing] = await db.select({ id: students.id }).from(students).where(eq(students.email, b.email.toLowerCase()));
    if (existing) return Response.json({ error: "A student with that email already exists." }, { status: 409 });

    const f = {
      engagement: Number(b.engagement ?? 85),
      quizScore: Number(b.quizScore ?? 78),
      attendance: Number(b.attendance ?? 90),
      lateSubmissions: Number(b.lateSubmissions ?? 0),
      missedAssessments: Number(b.missedAssessments ?? 0),
    };
    if (
      [f.engagement, f.quizScore, f.attendance].some((v) => !Number.isInteger(v) || v < 0 || v > 100) ||
      [f.lateSubmissions, f.missedAssessments].some((v) => !Number.isInteger(v) || v < 0 || v > 20)
    ) {
      return Response.json({ error: "Scores must be 0–100 and submission counts 0–20." }, { status: 400 });
    }

    const regId =
      typeof b.studentId === "string" && b.studentId.trim().length >= 5
        ? b.studentId.trim()
        : `AU-${b.course}-${Date.now().toString().slice(-5)}`;

    const [student] = await db
      .insert(students)
      .values({
        name: b.name.trim(),
        email: b.email.toLowerCase(),
        course: b.course,
        studentId: regId,
        year: Number.isInteger(Number(b.year)) && Number(b.year) >= 1 && Number(b.year) <= 4 ? Number(b.year) : 2,
        avatarColor: "blue",
        ...f,
        riskScore: predictRisk(f),
        lastActive: new Date(),
        weeklyActivity: Array(8).fill(f.engagement),
      })
      .returning();

    // Ensure the student can also log into the Student Portal with their email or registration ID
    const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, b.email.toLowerCase()));
    if (!existingUser) {
      await db.insert(users).values({
        name: student.name,
        email: student.email,
        role: "student",
        studentId: student.id,
        courses: [student.course],
      });
    }

    return Response.json(student, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
