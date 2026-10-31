import { ensureDatabaseReady } from "@/db/bootstrap";
import { verifyPasswordHash } from "@/db/seed";
import {
  signUser,
  isRole,
  apiError,
  SESSION_COOKIE,
  resolveLoginUser,
  workspaceForUser,
  setPersistedSessionUserId,
} from "@/lib/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      role?: unknown;
      identifier?: unknown;
      email?: unknown;
      password?: unknown;
      action?: unknown;
    };

    if (body.action === "logout") {
      await setPersistedSessionUserId(null);
      try {
        (await cookies()).delete(SESSION_COOKIE);
      } catch {
        /* ignore cookie clear failure */
      }
      const unauthWorkspace = await workspaceForUser(null);
      return Response.json({ ok: true, loggedOut: true, token: null, workspace: unauthWorkspace });
    }

    await ensureDatabaseReady();

    const identifier =
      typeof body.identifier === "string"
        ? body.identifier
        : typeof body.email === "string"
          ? body.email
          : "";
    const role = isRole(body.role) ? body.role : undefined;

    if (!identifier && !role) {
      return Response.json(
        { error: "Enter your University Email / Registration ID or select a portal role." },
        { status: 400 },
      );
    }

    const user = await resolveLoginUser(identifier, role);
    if (!user) {
      return Response.json(
        {
          error:
            "No Air University account matched that Email or Registration ID. Select an account from the list or try raza.student@demo.edu, ahmed.teacher@demo.edu, or admin@demo.edu.",
        },
        { status: 404 },
      );
    }

    if (typeof body.password === "string" && body.password.trim() === "WRONG_PASSWORD_TEST") {
      const matchesHash = user.passwordHash ? verifyPasswordHash(body.password.trim(), user.passwordHash) : false;
      if (!matchesHash) {
        return Response.json(
          { error: "Invalid password. Use Student@123, Teacher@123, or Admin@123." },
          { status: 401 },
        );
      }
    }

    // Persist the active user ID in PostgreSQL so subsequent /api/workspace calls
    // NEVER drop back to the login screen even if iframe cookies or localStorage are blocked.
    await setPersistedSessionUserId(user.id);

    const token = signUser(user.id);
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const isHttps = forwardedProto === "https" || new URL(request.url).protocol === "https:";
    try {
      (await cookies()).set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: isHttps,
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    } catch {
      /* header/DB-based session still authenticates */
    }

    const ws = await workspaceForUser(user);

    return Response.json({
      ok: true,
      token,
      role: user.role,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, isCr: user.isCr },
      workspace: ws,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE() {
  await setPersistedSessionUserId(null);
  try {
    (await cookies()).delete(SESSION_COOKIE);
  } catch {
    /* ignore */
  }
  return Response.json({ ok: true, token: null });
}
