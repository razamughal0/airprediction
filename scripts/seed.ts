import "dotenv/config";
import { closePool, describeDatabaseTarget } from "../src/db/index";
import { seedDatabase, getDataCounts } from "../src/db/seed";

async function main() {
  const studentsArg = process.argv.find((arg) => arg.startsWith("--students="));
  const requested = studentsArg ? Number(studentsArg.split("=")[1]) : undefined;
  console.log(`[uplift] Seeding demo data into ${describeDatabaseTarget()}`);
  const result = await seedDatabase({ studentCount: Number.isFinite(requested) ? requested : undefined });
  if (!result.seeded) {
    console.log("[uplift] Existing data found — nothing was changed or deleted.");
  }
  const counts = await getDataCounts();
  console.log(`[uplift] students=${counts.students} users=${counts.users} interventions=${counts.interventions}`);
}

main()
  .catch((error) => {
    console.error(`[uplift] Seed failed: ${(error as Error).message}`);
    process.exitCode = 1;
  })
  .finally(() => closePool());
