import { after } from "next/server";
import { mkdirSync, rmSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, sep } from "node:path";
import { homedir, tmpdir } from "node:os";
import { openDatabase, openReconnecting, type Db } from "./driver";
import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema";
import { seedDemonstrationData } from "./seed";

export type { Db };

declare global {
  // Reused across hot reloads in dev so we don't open a new handle per request.
  var __flcDb: Db | undefined;
  // When the handle is an embedded replica, the last time it pulled from the
  // primary. See `syncReplica`.
  var __flcSyncedAt: number | undefined;
  // Set once seeding has been confirmed, so the check is not repeated per call.
  var __flcSeeded: boolean | undefined;
  // Inode of the file the cached handle was opened against, so a file swapped by a
  // sync client can be detected. See `sameFileAsOpenHandle`.
  var __flcInode: number | undefined;
  // Guards the one-time synced-folder warning.
  var __flcWarnedSync: boolean | undefined;
}

/**
 * Turso connection details, when the environment supplies them.
 *
 * The URL alone decides whether this is a hosted deployment. A URL without a token
 * is a misconfiguration worth failing loudly on rather than silently falling back
 * to a local file, which on a serverless host would mean every instance quietly
 * serving its own private copy of the data.
 */
function turso(): { url: string; authToken: string } | null {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (!url) return null;

  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!authToken) {
    throw new Error(
      "TURSO_DATABASE_URL is set but TURSO_AUTH_TOKEN is not. Both are required — " +
        "set the token, or unset the URL to use a local database file.",
    );
  }

  return { url, authToken };
}

/**
 * Where the prototype database lives.
 *
 * With Turso configured this is the *local replica*, not the source of truth: a
 * mirror libSQL keeps on disk so reads are answered locally at SQLite speed. It is
 * therefore disposable, and belongs in the temp directory on a host whose only
 * writable path is that. Without Turso it is the database itself, confined to a
 * `.data` directory under the working directory unless `PROTOTYPE_DB_PATH` gives an
 * absolute path, which keeps the bundler's file tracing scoped rather than walking
 * the whole project.
 *
 * The replica path carries the process id, because a replica cannot be shared. Two
 * processes pointed at one replica file corrupt each other's view of it through the
 * native layer, and the symptom is the server exiting without a JavaScript stack —
 * which is a miserable thing to debug. A serverless instance is one process, so this
 * costs nothing there; locally it means a dev server and a script each pull their
 * own copy, which at ~1MB is not worth optimising.
 */
function dbPath(): string {
  const configured = process.env.PROTOTYPE_DB_PATH;
  if (configured && isAbsolute(configured)) return configured;
  if (turso()) return join(tmpdir(), `flc-replica-${process.pid}.db`);
  return join(process.cwd(), configured ?? ".data/prototype.db");
}

/**
 * Warns once if the database sits in a directory a sync client is likely to touch.
 *
 * This is not hypothetical. A project kept on an iCloud-synced Desktop will have its
 * SQLite file and write-ahead log copied while they are open, producing truncated
 * duplicates like `prototype 2.db` and, worse, occasionally replacing the live file —
 * which breaks the open handle of any running server.
 */
function warnIfSynced(path: string) {
  if (globalThis.__flcWarnedSync) return;
  globalThis.__flcWarnedSync = true;

  const home = homedir();
  const risky = ["Desktop", "Documents", "Dropbox", "OneDrive", "Google Drive"];
  const inRiskyDir = risky.some((dir) =>
    path.startsWith(`${home}${sep}${dir}${sep}`),
  );
  if (!inRiskyDir) return;

  console.warn(
    `[flc] The prototype database is at ${path}, inside a folder that iCloud, ` +
      `Dropbox or OneDrive may sync. Sync clients copy and sometimes replace open ` +
      `SQLite files, which corrupts them and breaks a running server. Set ` +
      `PROTOTYPE_DB_PATH to somewhere outside the synced tree, for example ` +
      `PROTOTYPE_DB_PATH=/tmp/flc-prototype.db`,
  );
}

/**
 * True when the cached handle still refers to the file currently at `dbPath()`.
 *
 * A sync client that replaces the database leaves the running process holding an
 * unlinked inode: reads either return stale data or fail outright. Comparing inodes
 * costs one `stat` and turns a confusing server error into a transparent reopen.
 */
function sameFileAsOpenHandle(path: string): boolean {
  if (globalThis.__flcInode === undefined) return false;
  try {
    return statSync(path).ino === globalThis.__flcInode;
  } catch {
    return false; // deleted underneath us
  }
}

/**
 * How long a replica may serve reads before it pulls from the primary again.
 *
 * A replica sees its own writes immediately; this window is only about how quickly
 * it sees *other instances'* writes. Syncing is one network round trip, and getDb()
 * is called several times per request, so a couple of seconds collapses that to
 * roughly one sync per request while keeping a demo feeling live.
 */
const SYNC_INTERVAL_MS = Number(process.env.TURSO_SYNC_INTERVAL_MS ?? 2000);

/**
 * Pulls changes from the primary, at most once per `SYNC_INTERVAL_MS`.
 *
 * A failed sync here is deliberately not fatal. The replica already holds a good
 * copy of the data, so serving reads that are a few seconds stale is a far better
 * outcome than failing the request, and the next call tries again.
 *
 * This is only safe *after* the first sync has succeeded — see `open`.
 */
/**
 * How stale a replica may be and still serve a request before syncing.
 *
 * Past this, the sync happens in front of the response instead of after it. An
 * instance that has been busy synced moments ago and can defer; one that has sat idle
 * could be minutes behind, and serving from it first would bounce a student whose
 * session was created a moment ago on a different instance.
 */
const MAX_STALE_MS = Number(process.env.TURSO_MAX_STALE_MS ?? 15_000);

function syncReplica(db: Db) {
  const now = Date.now();
  const age = now - (globalThis.__flcSyncedAt ?? 0);
  if (age < SYNC_INTERVAL_MS) return;
  globalThis.__flcSyncedAt = now;

  const pull = () => {
    try {
      db.sync();
    } catch (error) {
      console.warn("[flc] replica sync failed, serving local data:", error);
    }
  };

  // Idle long enough to have missed other instances' writes that this request may
  // depend on — a join, a new session — so pay the round trip first.
  if (age > MAX_STALE_MS) {
    pull();
    return;
  }

  // Recently synced: after the response, not before it. The replica always sees its
  // own writes, so all a sync adds here is other instances' writes from the last few
  // seconds, which can arrive one request later without anyone noticing, where a
  // ~225ms round trip in front of every navigation is noticed.
  defer("replica sync", pull);
}

/**
 * Runs `task` after the current response has been sent, or immediately when there is
 * no response to wait for.
 *
 * Inside a request this hands the work to Next's `after()`, which on Vercel keeps the
 * function alive with `waitUntil` until it finishes. Outside one — `npm run verify`,
 * `db:reset`, `dev:session`, the seed-race workers — `after()` throws rather than
 * quietly dropping the task, and the work runs inline exactly as it always did, so
 * the scripts see the same writes in the same order and still fail loudly.
 *
 * A deferred task cannot fail the page it was deferred from, so its errors are
 * logged; an inline one propagates as before.
 */
export function defer(label: string, task: () => void) {
  try {
    after(() => {
      try {
        task();
      } catch (error) {
        console.error(`[flc] deferred ${label} failed:`, error);
      }
    });
  } catch {
    task();
  }
}

/** Everything libSQL writes for one replica: the mirror, its log, and its metadata. */
function replicaFiles(path: string): string[] {
  return [path, `${path}-info`, `${path}-wal`, `${path}-shm`];
}

function discardReplica(path: string) {
  for (const file of replicaFiles(path)) {
    try {
      rmSync(file);
    } catch {
      // absent already; nothing to remove
    }
  }
}

/**
 * Opens an embedded replica, rebuilding it from scratch if the existing one is
 * unusable.
 *
 * A replica records which primary it belongs to, and how far it has replayed, in
 * `<path>-info`. Point the same path at a *different* database — a redeploy with new
 * credentials, or switching databases in development — and the new primary rejects
 * that metadata with `InvalidLocalGeneration`. Every request then fails, opaquely
 * and permanently, until somebody knows to delete a file in the temp directory.
 *
 * The replica is a disposable mirror by definition, so the answer is simply to throw
 * it away and pull a fresh copy.
 *
 * The first sync is also the one failure that must not be tolerated: a new replica is
 * empty, so there is no last-good copy to fall back on, and carrying on would mean
 * serving an empty database and then trying to seed it — ~2,200 writes to a primary
 * that is not answering. Later syncs are soft; see `syncReplica`.
 */
function openReplica(path: string, url: string, authToken: string): Db {
  const attempt = () => {
    const db = openReconnecting(
      () => openDatabase(path, { syncUrl: url, authToken }),
      (error) =>
        console.warn(
          "[flc] the replica's remote stream expired; reconnected:",
          String((error as Error)?.message ?? error).slice(0, 200),
        ),
    );
    try {
      db.sync();
    } catch (error) {
      try {
        db.close();
      } catch {
        // already unusable
      }
      throw error;
    }
    globalThis.__flcSyncedAt = Date.now();
    return db;
  };

  try {
    return attempt();
  } catch (first) {
    console.warn(
      `[flc] the replica at ${path} could not sync; discarding it and pulling a ` +
        `fresh copy. Original error:`,
      first,
    );
    discardReplica(path);

    try {
      return attempt();
    } catch (second) {
      throw new Error(
        `Could not reach the Turso primary at ${url}. The local replica is empty, ` +
          `so there is nothing to serve. Check TURSO_DATABASE_URL and ` +
          `TURSO_AUTH_TOKEN.`,
        { cause: second },
      );
    }
  }
}

function open(): Db {
  const path = dbPath();
  const remote = turso();
  mkdirSync(dirname(path), { recursive: true });
  warnIfSynced(path);

  // An embedded replica keeps a local mirror of the primary: reads are answered
  // from `path` at SQLite speed, writes go to the primary and are applied locally.
  // That is what lets this run on a host with no durable disk without rewriting the
  // ~280 synchronous statements the repositories are built from, and without the
  // readiness gather — nine queries per student — becoming nine network round trips.
  const db = remote
    ? openReplica(path, remote.url, remote.authToken)
    : openDatabase(path);

  // Pragmas are advisory here. On a plain file they are how WAL and foreign keys get
  // switched on; against a replica libSQL owns the journal, so a rejected pragma is
  // expected rather than a fault.
  for (const pragma of [
    "journal_mode = WAL",
    "foreign_keys = ON",
    "busy_timeout = 5000",
  ]) {
    try {
      db.pragma(pragma);
    } catch (error) {
      if (!remote) throw error;
      console.warn(
        `[flc] pragma "${pragma}" not applied to the replica:`,
        error,
      );
    }
  }

  // Applying the DDL is nearly free against a local file and distinctly not free
  // against a replica, where every statement is a write forwarded to the primary —
  // 47 tables plus indexes would be a round trip each, on every cold start. The
  // schema is versioned, so read the version first (a local read on a replica) and
  // only apply the DDL when it is missing or behind.
  if (schemaVersion(db) !== SCHEMA_VERSION) {
    db.exec(SCHEMA_SQL);
    db.prepare<[string, string], void>(
      "INSERT OR REPLACE INTO schema_meta (key, value) VALUES (?, ?)",
    ).run("schema_version", String(SCHEMA_VERSION));
  }

  return db;
}

/** The recorded schema version, or null on a database that has no schema yet. */
function schemaVersion(db: Db): number | null {
  try {
    const row = db
      .prepare<[string], { value: string }>(
        "SELECT value FROM schema_meta WHERE key = ?",
      )
      .get("schema_version");
    return row ? Number(row.value) : null;
  } catch {
    // schema_meta itself does not exist — a brand new database.
    return null;
  }
}

/**
 * The prototype database handle.
 *
 * Server-only. Every call site is a server component, route handler or server
 * action — importing this from a client component is a build error, which is the
 * intended guard rail.
 */
export function getDb(): Db {
  const path = dbPath();
  const remote = turso();
  const cached = globalThis.__flcDb;

  // The inode check exists to catch a *sync client* replacing the file. A replica's
  // file is libSQL's to manage — it rewrites it during sync — so applying the check
  // there would read its normal behaviour as corruption and reopen on every call,
  // re-downloading the database each time.
  if (cached && (remote || sameFileAsOpenHandle(path))) {
    if (remote) syncReplica(cached);

    // A handle cached against an unseeded database is useless, and caching one is
    // how a single transient seed failure used to break every later request. Cheap
    // re-check until seeding is confirmed, then never again.
    if (!globalThis.__flcSeeded) ensureSeeded(cached);
    return cached;
  }

  if (cached) {
    // The file was replaced or removed underneath us — a sync client, or a
    // `db:reset` run against a live server. Drop the stale handle and reopen.
    console.warn(
      "[flc] the prototype database file changed underneath the open handle — reopening",
    );
    try {
      cached.close();
    } catch {
      // already unusable; nothing to salvage
    }
    globalThis.__flcDb = undefined;
    globalThis.__flcSeeded = false;
  }

  // Seed before publishing the handle: if seeding throws, the next call retries
  // with a fresh connection rather than serving an empty database forever.
  const db = open();
  ensureSeeded(db);
  globalThis.__flcDb = db;

  if (!remote) {
    try {
      globalThis.__flcInode = statSync(path).ino;
    } catch {
      globalThis.__flcInode = undefined;
    }
  }
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
  /*
    Fast path first: a plain read.

    The IMMEDIATE transaction below is the race guard, and it is only needed when the
    database might actually be empty. On a local file taking that lock is free. On an
    embedded replica it is not — IMMEDIATE is a write transaction, so libSQL forwards
    it to the primary, and a COUNT that answers in 0ms as a plain local read cost
    1–1.8 seconds wrapped in BEGIN IMMEDIATE, measured. That was paid on every cold
    start of every instance, against a database that was seeded long ago.

    Checking first and locking only on zero is safe: two openers that both see an
    empty database both fall through to the IMMEDIATE transaction, the second waits
    for the lock, re-reads a non-zero count inside it, and does nothing — exactly the
    behaviour the seed-race guard in `npm run verify` asserts.
  */
  const { n: existing } = db
    .prepare<[], { n: number }>("SELECT COUNT(*) AS n FROM professors")
    .get()!;
  if (existing > 0) {
    globalThis.__flcSeeded = true;
    return;
  }

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
