/**
 * Writes a copy of the local database that Turso will actually import.
 *
 *   npm run db:export
 *
 * The reason this exists: the prototype runs SQLite in WAL mode, and
 * `turso db create --from-file` silently imports NOTHING from a WAL-mode file. It
 * reports "Uploaded data in 0 seconds", creates the database, and leaves it empty —
 * no error, no warning. You find out when the first page 500s with
 * `no such table: professors`.
 *
 * VACUUM INTO produces a clean, defragmented copy, and setting `journal_mode =
 * DELETE` on it flips the header out of WAL. The result imports correctly.
 *
 * This also sidesteps a second trap: a live WAL file can hold committed data that is
 * not yet in the .db file, so copying the .db alone can lose recent writes. VACUUM
 * reads through the WAL, so the export is always complete.
 */
import { openDatabase } from "../src/lib/db/driver";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

const source = (() => {
  const configured = process.env.PROTOTYPE_DB_PATH;
  if (configured && isAbsolute(configured)) return configured;
  return join(process.cwd(), configured ?? ".data/prototype.db");
})();

const target = resolve(process.argv[2] ?? ".data/turso-import.db");

if (!existsSync(source)) {
  console.error(
    `No database at ${source}. Run \`npm run db:reset\` first — the export is a copy ` +
      `of the seeded local database, not a way to create one.`,
  );
  process.exit(1);
}

// VACUUM INTO refuses to overwrite, so clear the way first.
for (const suffix of ["", "-wal", "-shm"]) {
  try {
    rmSync(`${target}${suffix}`);
  } catch {
    // nothing to clean up
  }
}
mkdirSync(dirname(target), { recursive: true });

const db = openDatabase(source, { readonly: true });
db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
db.close();

// The copy inherits WAL mode from its source; this is the step that matters.
const copy = openDatabase(target);
copy.pragma("journal_mode = DELETE");

const tables = copy
  .prepare<[], { name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
  )
  .all();
const rows = tables.reduce(
  (total, table) =>
    total +
    copy
      .prepare<[], { n: number }>(`SELECT COUNT(*) AS n FROM "${table.name}"`)
      .get()!.n,
  0,
);
copy.close();

console.log(`Exported ${tables.length} tables, ${rows} rows to ${target}`);
console.log(
  `\nturso db create <name> --from-file ${target}\n` +
    `\nIf the database already exists, destroy it first — Turso imports only at\n` +
    `creation. Destroying invalidates its tokens, so issue a new one and update it\n` +
    `wherever it is set.`,
);
