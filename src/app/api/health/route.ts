import { getPool, DatabaseConfigError } from "@/db";
import { checkSchema } from "@/db/migrate";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, unknown> = {
    databaseConfigured: Boolean(process.env.DATABASE_URL?.trim()),
    aiConfigured: Boolean(process.env.AI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim()),
  };
  try {
    const pool = getPool();
    await pool.query("select 1");
    const schema = await checkSchema();
    const { rows } = await pool.query<{ students: number; users: number; interventions: number }>(
      `SELECT
         (SELECT count(*)::int FROM students) AS students,
         (SELECT count(*)::int FROM portal_users) AS users,
         (SELECT count(*)::int FROM interventions) AS interventions`,
    );
    return Response.json({
      ok: schema.ready,
      ...checks,
      database: { reachable: true, schemaReady: schema.ready, missingTables: schema.missingTables, ...rows[0] },
      ai: { configured: checks.aiConfigured, mode: checks.aiConfigured ? "provider" : "local-guidance" },
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        ...checks,
        database: { reachable: false },
        error:
          error instanceof DatabaseConfigError
            ? error.message
            : "PostgreSQL is not reachable. Check DATABASE_URL and run `npm run db:migrate`.",
      },
      { status: 503 },
    );
  }
}
