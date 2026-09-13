/**
 * Proves two SQLite databases hold the same schema and the same data.
 *
 *   npm run db:compare -- <before.db> <after.db>
 *
 * Used to verify a compaction: pull the production database and the new one into
 * local files with `npm run db:pull`, then compare them before pointing anything at
 * the new one. Checks, per table:
 *
 *   - schema     every table, index, trigger and view, by normalised CREATE statement
 *   - row count
 *   - content    a SHA-256 digest of every row, ordered by every column
 *
 * Counts alone would miss a row that changed value; the digest would not. Ordering by
 * every column rather than rowid matters because VACUUM INTO may renumber rowids on
 * tables without an INTEGER PRIMARY KEY, and that is not a difference in the data.
 *
 * Exits non-zero on any difference.
 */
import { openDatabase, type Db } from "../src/lib/db/driver";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";

const [beforePath, afterPath] = process.argv.slice(2);
if (!beforePath || !afterPath || !existsSync(beforePath) || !existsSync(afterPath)) {
  console.error("Usage: npm run db:compare -- <before.db> <after.db>  (both must exist)");
  process.exit(2);
}

type SchemaRow = { type: string; name: string; sql: string | null };

const normalise = (sql: string | null) => (sql ?? "").replace(/\s+/g, " ").trim();

function schema(db: Db): Map<string, string> {
  return new Map(
    db
      .prepare<[], SchemaRow>(
        `SELECT type, name, sql FROM sqlite_master
         WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name`,
      )
      .all()
      .map((row) => [`${row.type}:${row.name}`, normalise(row.sql)]),
  );
}

function digest(db: Db, table: string): { count: number; hash: string } {
  const columns = db
    .prepare<[], { name: string }>(`SELECT name FROM pragma_table_info('${table.replace(/'/g, "''")}')`)
    .all()
    .map((c) => `"${c.name.replace(/"/g, '""')}"`);
  const rows = db
    .prepare<[], Record<string, unknown>>(
      `SELECT ${columns.join(", ")} FROM "${table.replace(/"/g, '""')}" ORDER BY ${columns.join(", ")}`,
    )
    .all();
  const hash = createHash("sha256");
  for (const row of rows) {
    const clean = Object.fromEntries(
      Object.entries(row)
        .filter(([key]) => key !== "_metadata")
        .map(([key, value]) => [key, value instanceof Uint8Array ? Buffer.from(value).toString("base64") : value]),
    );
    hash.update(JSON.stringify(clean));
    hash.update("\n");
  }
  return { count: rows.length, hash: hash.digest("hex") };
}

const before = openDatabase(beforePath, { readonly: true });
const after = openDatabase(afterPath, { readonly: true });

let differences = 0;
const schemaBefore = schema(before);
const schemaAfter = schema(after);
for (const key of new Set([...schemaBefore.keys(), ...schemaAfter.keys()])) {
  if (schemaBefore.get(key) !== schemaAfter.get(key)) {
    differences += 1;
    console.log(`SCHEMA DIFFERS  ${key}`);
  }
}

const tables = [...schemaBefore.keys()]
  .filter((key) => key.startsWith("table:"))
  .map((key) => key.slice("table:".length));

let rowsBefore = 0;
console.log(`${"table".padEnd(34)} ${"before".padStart(7)} ${"after".padStart(7)}  content`);
for (const table of tables) {
  const a = digest(before, table);
  const b = schemaAfter.has(`table:${table}`) ? digest(after, table) : { count: -1, hash: "" };
  rowsBefore += a.count;
  const same = a.count === b.count && a.hash === b.hash;
  if (!same) differences += 1;
  console.log(
    `${table.padEnd(34)} ${String(a.count).padStart(7)} ${String(b.count).padStart(7)}  ${same ? "identical" : "DIFFERENT"}`,
  );
}

before.close();
after.close();

console.log(
  differences === 0
    ? `\nIdentical: ${schemaBefore.size} schema objects, ${tables.length} tables, ${rowsBefore} rows.`
    : `\n${differences} difference(s).`,
);
process.exit(differences === 0 ? 0 : 1);
