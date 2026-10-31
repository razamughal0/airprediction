import { checkSchema, runMigrations } from "./migrate";
import { seedDatabase, getDataCounts } from "./seed";

type BootstrapGlobal = typeof globalThis & { __upliftBootstrap?: Promise<void> };
const globalForBootstrap = globalThis as BootstrapGlobal;

async function bootstrap(): Promise<void> {
  const schema = await checkSchema();
  if (!schema.ready) {
    if (process.env.DB_AUTO_SETUP === "false") {
      throw new Error(
        `Database tables are missing (${schema.missingTables.join(", ")}). Run "npm run db:migrate" and "npm run db:seed".`,
      );
    }
    console.info("[uplift] Applying database migrations…");
    await runMigrations();
  }
  if (process.env.DB_AUTO_SEED !== "false") {
    const result = await seedDatabase();
    if (result.seeded) console.info(`[uplift] Demo data seeded: ${result.students} students, ${result.users} users.`);
  }
  const finalSchema = await checkSchema();
  if (!finalSchema.ready) {
    throw new Error(`Database setup incomplete; missing tables: ${finalSchema.missingTables.join(", ")}.`);
  }
}

/**
 * Ensures a fresh local/Supabase database is migrated and seeded once per
 * server process. Migrations and seeding are idempotent and never delete data.
 */
export function ensureDatabaseReady(): Promise<void> {
  globalForBootstrap.__upliftBootstrap ??= bootstrap().catch((error) => {
    globalForBootstrap.__upliftBootstrap = undefined;
    throw error;
  });
  return globalForBootstrap.__upliftBootstrap;
}

export { getDataCounts, seedDatabase, runMigrations, checkSchema };
