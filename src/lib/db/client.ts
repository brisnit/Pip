import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema";
import { seedDemonstrationData } from "./seed";

export type Db = Database.Database;

declare global {
  // Reused across hot reloads in dev so we don't open a new handle per request.
  var __flcDb: Db | undefined;
}

/**
 * Where the prototype database lives. Confined to a `.data` directory under the
 * working directory unless `PROTOTYPE_DB_PATH` gives an absolute path, which keeps
 * the bundler's file tracing scoped rather than walking the whole project.
 */
function dbPath(): string {
  const configured = process.env.PROTOTYPE_DB_PATH;
  if (configured && isAbsolute(configured)) return configured;
  return join(process.cwd(), configured ?? ".data/prototype.db");
}

function open(): Db {
  const path = dbPath();
  mkdirSync(dirname(path), { recursive: true });

  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(SCHEMA_SQL);

  const current = db
    .prepare<[string], { value: string }>(
      "SELECT value FROM schema_meta WHERE key = ?",
    )
    .get("schema_version");

  if (!current) {
    db.prepare("INSERT INTO schema_meta (key, value) VALUES (?, ?)").run(
      "schema_version",
      String(SCHEMA_VERSION),
    );
  }

  return db;
}

/**
 * The prototype database handle.
 *
 * Server-only. Every call site is a server component, route handler or server
 * action — importing this from a client component is a build error, which is the
 * intended guard rail.
 */
export function getDb(): Db {
  if (!globalThis.__flcDb) {
    globalThis.__flcDb = open();
    ensureSeeded(globalThis.__flcDb);
  }
  return globalThis.__flcDb;
}

/**
 * Seeds demonstration data the first time the database is created. Idempotent:
 * a non-empty `professors` table is treated as already seeded.
 */
function ensureSeeded(db: Db) {
  const { n } = db
    .prepare<[], { n: number }>("SELECT COUNT(*) AS n FROM professors")
    .get()!;
  if (n > 0) return;

  seedDemonstrationData(db);
}

/** Wraps a set of writes in a transaction. */
export function transact<T>(fn: (db: Db) => T): T {
  const db = getDb();
  return db.transaction(() => fn(db))();
}

export function nowIso(): string {
  return new Date().toISOString();
}
