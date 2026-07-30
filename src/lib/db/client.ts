import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema";
import { seedDemonstrationData } from "./seed";

export type Db = Database.Database;

declare global {
  // Reused across hot reloads in dev so we don't open a new handle per request.
  var __flcDb: Db | undefined;
  // Set once seeding has been confirmed, so the check is not repeated per call.
  var __flcSeeded: boolean | undefined;
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
  const cached = globalThis.__flcDb;
  if (cached) {
    // A handle cached against an unseeded database is useless, and caching one is
    // how a single transient seed failure used to break every later request. Cheap
    // re-check until seeding is confirmed, then never again.
    if (!globalThis.__flcSeeded) ensureSeeded(cached);
    return cached;
  }

  // Seed before publishing the handle: if seeding throws, the next call retries
  // with a fresh connection rather than serving an empty database forever.
  const db = open();
  ensureSeeded(db);
  globalThis.__flcDb = db;
  return db;
}

/**
 * Seeds demonstration data the first time the database is created.
 *
 * The emptiness check runs *inside* an IMMEDIATE transaction, which matters more
 * than it looks. `next build` collects page data across nine worker processes, and
 * a cold start can have several of them open the same new database at once. With
 * the check outside the transaction they all saw zero professors, all ran the seed,
 * and every process but the first died on
 * `UNIQUE constraint failed: course_codes.code` — surfacing as a 500 on whichever
 * route that worker was rendering.
 *
 * BEGIN IMMEDIATE takes the write lock up front, so the losers wait (up to
 * `busy_timeout`), then re-read a non-zero count and no-op.
 */
function ensureSeeded(db: Db) {
  const seed = db.transaction(() => {
    const { n } = db
      .prepare<[], { n: number }>("SELECT COUNT(*) AS n FROM professors")
      .get()!;
    if (n > 0) return false;
    seedDemonstrationData(db);
    return true;
  });

  seed.immediate();
  globalThis.__flcSeeded = true;
}

/**
 * Re-seeds if the database has been emptied underneath a running process.
 *
 * `getDb()` deliberately stops checking once seeding is confirmed, because it is
 * called several times per request and a COUNT on every call is wasted work. That
 * leaves one hole: a database emptied or replaced while the server is running — a
 * stray `db:reset`, or a sync service swapping the file — would 500 every request
 * until a restart.
 *
 * Callers that genuinely cannot proceed without seeded data invoke this before
 * giving up. Returns true if data is present afterwards.
 */
export function recoverIfEmpty(): boolean {
  const db = getDb();
  globalThis.__flcSeeded = false;
  try {
    ensureSeeded(db);
    return true;
  } catch (error) {
    console.error("[flc] re-seed after empty database failed:", error);
    return false;
  }
}

/** Wraps a set of writes in a transaction. */
export function transact<T>(fn: (db: Db) => T): T {
  const db = getDb();
  return db.transaction(() => fn(db))();
}

export function nowIso(): string {
  return new Date().toISOString();
}
