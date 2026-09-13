/**
 * Pulls the hosted Turso database down into an ordinary local SQLite file.
 *
 *   TURSO_DATABASE_URL=… TURSO_AUTH_TOKEN=… npm run db:pull [-- path/to/out.db]
 *
 * Read-only against the primary: it syncs an embedded replica into the temp directory
 * and copies the result, executing no statements. The copy leaves out the replica's
 * `-info` metadata, so it opens as a plain database rather than as a replica bound to
 * that primary.
 *
 * Its main use is compaction. A new embedded replica bootstraps by replaying the
 * primary's write history, so every write ever made slows every future cold start —
 * measured on the live database at 6.7–8.1 seconds to first sync, against 0.4–0.7
 * seconds for a database holding identical data created fresh from an export. Pull,
 * export, create a new database from the export, and point the deployment at it; see
 * "Keeping cold starts fast" in README.md.
 */
import { openDatabase } from "../src/lib/db/driver";
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
if (!url || !authToken) {
  console.error(
    "Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN for the database to pull. They are " +
      "not read from .env.local — scripts run through tsx do not load it.",
  );
  process.exit(1);
}

const target = resolve(process.argv[2] ?? ".data/pulled.db");
const replica = join(tmpdir(), `flc-pull-${process.pid}.db`);
const discard = (path: string, suffixes: string[]) => {
  for (const suffix of suffixes) {
    try {
      rmSync(`${path}${suffix}`);
    } catch {
      // absent already
    }
  }
};

discard(replica, ["", "-info", "-wal", "-shm"]);
const db = openDatabase(replica, { syncUrl: url, authToken });
db.sync();
db.close();

// The replica may still hold recent pages in its WAL, so the log travels with the
// file; `npm run db:export` reads through it.
mkdirSync(dirname(target), { recursive: true });
discard(target, ["", "-wal", "-shm"]);
for (const suffix of ["", "-wal", "-shm"]) {
  if (existsSync(`${replica}${suffix}`)) {
    copyFileSync(`${replica}${suffix}`, `${target}${suffix}`);
  }
}
discard(replica, ["", "-info", "-wal", "-shm"]);

console.log(`Pulled ${url} into ${target}`);
console.log(
  `\nNext: PROTOTYPE_DB_PATH=${target} npm run db:export -- .data/turso-import.db`,
);
