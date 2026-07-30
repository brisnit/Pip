/**
 * Deletes the prototype database and re-seeds it.
 *
 *   npm run db:reset
 */
import { readdirSync, rmSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";

const path = resolve(process.env.PROTOTYPE_DB_PATH ?? ".data/prototype.db");

for (const suffix of ["", "-wal", "-shm"]) {
  try {
    rmSync(`${path}${suffix}`);
    console.log(`removed ${path}${suffix}`);
  } catch {
    // nothing to remove
  }
}

/**
 * Clear file-copy duplicates such as `prototype 2.db` / `prototype 3.db-wal`.
 *
 * A folder synced by iCloud Drive, Dropbox or similar will duplicate a SQLite
 * database and its write-ahead log while they are open, leaving these behind. They
 * are stale, they are confusing when debugging, and a stale `-wal` next to a fresh
 * database is a corruption risk — so the reset removes them.
 */
const stem = basename(path, extname(path));
const duplicate = new RegExp(`^${stem} \\d+\\.`);

try {
  for (const entry of readdirSync(dirname(path))) {
    if (!duplicate.test(entry)) continue;
    const victim = join(dirname(path), entry);
    rmSync(victim);
    console.log(`removed sync duplicate ${victim}`);
  }
} catch {
  // directory does not exist yet
}

const { getDb } = await import("../src/lib/db/client");
const { getActiveProfessor, listCourses } = await import(
  "../src/lib/repositories/courses"
);

getDb();
const professor = getActiveProfessor();
const course = listCourses(professor.id)[0];

console.log(`\nRe-seeded ${path}`);
console.log(`  professor:   ${professor.name}`);
console.log(`  course:      ${course.code} — ${course.title}`);
console.log(`  access code: ${course.access_code}`);
console.log(`  students:    ${course.student_count}\n`);
