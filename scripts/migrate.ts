import "dotenv/config";
import { closePool, describeDatabaseTarget } from "../src/db/index";
import { checkSchema, runMigrations } from "../src/db/migrate";

async function main() {
  console.log(`[uplift] Applying migrations to ${describeDatabaseTarget()}`);
  const result = await runMigrations();
  for (const file of result.applied) console.log(`  ✓ applied ${file}`);
  for (const file of result.skipped) console.log(`  · already applied ${file}`);
  const schema = await checkSchema();
  if (!schema.ready) throw new Error(`Missing tables after migration: ${schema.missingTables.join(", ")}`);
  console.log("[uplift] Database schema is ready.");
}

main()
  .catch((error) => {
    console.error(`[uplift] Migration failed: ${(error as Error).message}`);
    process.exitCode = 1;
  })
  .finally(() => closePool());
