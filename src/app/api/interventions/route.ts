import { getDb } from "@/db";
import { interventions, students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { currentUser, canAccessStudent, apiError } from "@/lib/server";
export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (user.role === "student") return Response.json({ error: "Only advisors can create interventions." }, { status: 403 });
    const body = await request.json();
    const studentId = Number(body.studentId);
    if (!Number.isInteger(studentId) || !await canAccessStudent(user, studentId)) return Response.json({ error: "Student is outside your workspace." }, { status: 403 });
    const [student] = await getDb().select({ id: students.id }).from(students).where(eq(students.id, studentId));
    if (!student) return Response.json({ error: "Student not found." }, { status: 404 });
    if (typeof body.title !== "string" || body.title.trim().length < 3 || body.title.length > 180 || typeof body.notes !== "string" || body.notes.trim().length < 3 || body.notes.length > 4000 || typeof body.type !== "string" || body.type.length > 60 || !/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate) || !Number.isFinite(Date.parse(body.dueDate))) return Response.json({ error: "Please add a title, valid date, and a short support plan." }, { status: 400 });
    const [plan] = await getDb().insert(interventions).values({ studentId, authorId: user.id, title: body.title.trim(), type: body.type, notes: body.notes.trim(), dueDate: body.dueDate, status: "scheduled" }).returning();
    return Response.json(plan, { status: 201 });
  } catch (error) { return apiError(error); }
}
export async function PATCH(request: Request) {
  try {
    const user = await currentUser();
    const { id, status } = await request.json();
    if (!Number.isInteger(id) || !["scheduled", "in_progress", "completed"].includes(status)) return Response.json({ error: "Invalid intervention update." }, { status: 400 });
    const [plan] = await getDb().select().from(interventions).where(eq(interventions.id, id));
    if (!plan) return Response.json({ error: "Intervention not found." }, { status: 404 });
    if (!await canAccessStudent(user, plan.studentId) || (user.role === "student" && status !== "completed")) return Response.json({ error: "You don't have permission to update this plan." }, { status: 403 });
    await getDb().update(interventions).set({ status }).where(eq(interventions.id, id));
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}
