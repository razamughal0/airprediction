import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getPool } from "./index";

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");
const TRACKING_TABLE = "schema_migrations";

export type MigrationResult = { applied: string[]; skipped: string[] };

export async function runMigrations(): Promise<MigrationResult> {
  const pool = getPool();
  const client = await pool.connect();
  const result: MigrationResult = { applied: [], skipped: [] };
  try {
    await client.query("BEGIN");
    await client.query(
      `CREATE TABLE IF NOT EXISTS ${TRACKING_TABLE} (
         filename text PRIMARY KEY,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`,
    );
    await client.query("COMMIT");

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const already = await client.query(`SELECT 1 FROM ${TRACKING_TABLE} WHERE filename = $1`, [file]);
      if (already.rowCount) {
        result.skipped.push(file);
        continue;
      }
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(`INSERT INTO ${TRACKING_TABLE} (filename) VALUES ($1)`, [file]);
        await client.query("COMMIT");
        result.applied.push(file);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
      }
    }
    return result;
  } finally {
    client.release();
  }
}

export async function checkSchema(): Promise<{ ready: boolean; missingTables: string[] }> {
  const pool = getPool();
  const expected = [
    "students",
    "portal_users",
    "interventions",
    "roles",
    "departments",
    "programs",
    "academic_sessions",
    "semesters",
    "sections",
    "buildings",
    "classrooms",
    "teachers",
    "courses",
    "teacher_assignments",
    "enrollments",
    "timetable_entries",
    "cr_assignments",
    "attendance_records",
    "assessments",
    "assessment_results",
    "gpa_records",
    "backlogs",
    "course_withdrawals",
    "academic_warnings",
    "notifications",
    "academic_requests",
    "audit_logs",
    "grading_scale",
  ];
  const { rows } = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
    [expected],
  );
  const found = new Set(rows.map((row) => row.table_name));
  const missingTables = expected.filter((table) => !found.has(table));
  return { ready: missingTables.length === 0, missingTables };
}
