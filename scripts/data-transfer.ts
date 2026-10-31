import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import { getPool, closePool } from "../src/db/index";

type Row = Record<string, unknown>;
type Bundle = {
  format: "uplift-portable-data";
  version: 1;
  exportedAt: string;
  tables: Record<string, Row[]>;
};

// Parent tables must be restored before their children.
const TABLES = ["students", "portal_users", "interventions"] as const;
const SEQUENCES: Record<string, string> = {
  students: "students_id_seq",
  portal_users: "portal_users_id_seq",
  interventions: "interventions_id_seq",
};

async function exportData(file: string) {
  const pool = getPool();
  const tables: Record<string, Row[]> = {};
  for (const table of TABLES) {
    const { rows } = await pool.query<Row>(`SELECT * FROM ${table} ORDER BY id`);
    tables[table] = rows;
  }
  const bundle: Bundle = { format: "uplift-portable-data", version: 1, exportedAt: new Date().toISOString(), tables };
  await writeFile(file, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  console.log(`[uplift] Exported ${TABLES.map((t) => `${tables[t].length} ${t}`).join(", ")} to ${file}`);
}

function quoteIdent(value: string) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(value)) throw new Error(`Unsafe identifier: ${value}`);
  return `"${value}"`;
}

async function importData(file: string) {
  const bundle = JSON.parse(await readFile(file, "utf8")) as Bundle;
  if (bundle.format !== "uplift-portable-data" || !bundle.tables) throw new Error("Not a valid uplift export file.");
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let inserted = 0;
    for (const table of TABLES) {
      const rows = bundle.tables[table] ?? [];
      for (const row of rows) {
        const columns = Object.keys(row);
        if (!columns.length) continue;
        const values = columns.map((column) => {
          const value = row[column];
          // pg maps jsonb to JS objects/arrays; they must be re-serialized as
          // JSON text on insert, otherwise PostgreSQL receives an array literal.
          if (value !== null && typeof value === "object" && !(value instanceof Date)) return JSON.stringify(value);
          return value;
        });
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
        const sql = `INSERT INTO ${quoteIdent(table)} (${columns.map(quoteIdent).join(", ")})
                     VALUES (${placeholders})
                     ON CONFLICT (id) DO NOTHING`;
        const result = await client.query(sql, values as unknown[]);
        inserted += result.rowCount ?? 0;
      }
      // Keep future inserts from colliding with restored explicit IDs.
      const sequence = SEQUENCES[table];
      await client.query(
        `SELECT setval('${sequence}', COALESCE((SELECT MAX(id) FROM ${quoteIdent(table)}), 0) + 1, false)`,
      );
    }
    await client.query("COMMIT");
    console.log(`[uplift] Imported ${inserted} rows from ${file}. Existing IDs were left untouched.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

const command = process.argv[2];
const file = process.argv[3] || "uplift-data.json";

async function main() {
  if (command === "export") return exportData(file);
  if (command === "import") return importData(file);
  throw new Error('Usage: tsx scripts/data-transfer.ts <export|import> [file] (default "uplift-data.json")');
}

main()
  .catch((error) => {
    console.error(`[uplift] Data transfer failed: ${(error as Error).message}`);
    process.exitCode = 1;
  })
  .finally(() => closePool());
