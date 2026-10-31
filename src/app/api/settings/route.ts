import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { currentUser, apiError } from "@/lib/server";
export async function PATCH(request: Request) {
  try {
    const user = await currentUser();
    const b = await request.json();
    const updates: { name?: string; notificationsEnabled?: boolean; weeklyDigest?: boolean } = {};
    if (typeof b.name === "string" && b.name.trim().length >= 2 && b.name.length <= 120) updates.name = b.name.trim();
    if (typeof b.notificationsEnabled === "boolean") updates.notificationsEnabled = b.notificationsEnabled;
    if (typeof b.weeklyDigest === "boolean") updates.weeklyDigest = b.weeklyDigest;
    if (!Object.keys(updates).length) return Response.json({ error: "No valid preferences supplied." }, { status: 400 });
    await getDb().update(users).set(updates).where(eq(users.id, user.id));
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}
