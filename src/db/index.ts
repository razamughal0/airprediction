import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

type DbGlobal = typeof globalThis & {
  __upliftPgPool?: Pool;
  __upliftDrizzle?: NodePgDatabase;
};

const globalForDb = globalThis as DbGlobal;

export class DatabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigError";
  }
}

/** Read and validate the connection string lazily so builds never require a live database. */
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new DatabaseConfigError(
      "DATABASE_URL is not set. Copy .env.example to .env and add your PostgreSQL connection string. " +
        "Windows setup: docs/WINDOWS_SETUP.md",
    );
  }
  if (!/^postgres(ql)?:\/\//i.test(url)) {
    throw new DatabaseConfigError(
      "DATABASE_URL must start with postgresql:// (or postgres://). Check your .env file and remove surrounding quotes.",
    );
  }
  return url;
}

function createPool(): Pool {
  const connectionString = getDatabaseUrl();
  const wantsSsl =
    process.env.DATABASE_SSL === "true" ||
    (/sslmode=(require|verify-ca|verify-full)/i.test(connectionString) && !/sslmode=disable/i.test(connectionString));
  const pool = new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX || 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: Number(process.env.DATABASE_CONNECT_TIMEOUT_MS || 10_000),
    // Hosted providers such as Supabase/Neon use managed certificates. Keep verification
    // configurable instead of disabling TLS checks by default.
    ...(wantsSsl
      ? { ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" } }
      : {}),
  });
  pool.on("error", (error) => {
    console.error("[uplift] Unexpected PostgreSQL pool error:", error.message);
  });
  return pool;
}

export function getPool(): Pool {
  globalForDb.__upliftPgPool ??= createPool();
  return globalForDb.__upliftPgPool;
}

export function getDb(): NodePgDatabase {
  globalForDb.__upliftDrizzle ??= drizzle(getPool());
  return globalForDb.__upliftDrizzle;
}

/**
 * Backwards-compatible lazy client. Nothing connects until the first query, so
 * `next build` and static analysis work without DATABASE_URL.
 */
export const db = new Proxy({} as NodePgDatabase, {
  get(_target, property) {
    const instance = getDb() as unknown as Record<PropertyKey, unknown>;
    const value = instance[property];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export async function closePool(): Promise<void> {
  if (globalForDb.__upliftPgPool) {
    await globalForDb.__upliftPgPool.end();
    globalForDb.__upliftPgPool = undefined;
    globalForDb.__upliftDrizzle = undefined;
  }
}

/** Friendly, non-secret diagnostics used by /api/health and setup errors. */
export function describeDatabaseTarget(): string {
  try {
    const url = new URL(getDatabaseUrl());
    return `${url.hostname}:${url.port || "5432"}${url.pathname}`;
  } catch {
    return "not configured";
  }
}
