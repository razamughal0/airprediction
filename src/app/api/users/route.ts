import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { currentUser, isRole, apiError } from "@/lib/server";
import { COURSES } from "@/lib/types";
export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (user.role !== "admin") return Response.json({ error: "Administrator access required." }, { status: 403 });
    const b = await request.json();
    if (typeof b.name !== "string" || b.name.trim().length < 2 || b.name.length > 120 || typeof b.email !== "string" || b.email.length > 180 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email) || !isRole(b.role) || b.role === "student") return Response.json({ error: "Enter a valid name, email, and staff role. Students are added in the student directory." }, { status: 400 });
    const [existing] = await getDb().select({ id: users.id }).from(users).where(eq(users.email, b.email.toLowerCase()));
    if (existing) return Response.json({ error: "A team member with this email already exists." }, { status: 409 });
    const [created] = await getDb().insert(users).values({ name: b.name.trim(), email: b.email.toLowerCase(), role: b.role, courses: b.role === "teacher" && COURSES.includes(b.course) ? [b.course] : [] }).returning();
    return Response.json(created, { status: 201 });
  } catch (error) { return apiError(error); }
}
