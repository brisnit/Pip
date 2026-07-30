/**
 * One worker in the concurrent-seeding regression check.
 *
 * Opens the database named by PROTOTYPE_DB_PATH, which triggers `ensureSeeded`, and
 * prints the resulting row counts. Several of these are run at once by
 * `verify-prototype.mts` to reproduce the condition that `next build` creates with
 * its nine page-data workers.
 *
 * Exits non-zero if seeding throws — which is exactly the regression being guarded.
 */
import { getDb } from "../src/lib/db/client";

try {
  const db = getDb();
  const professors = db
    .prepare<[], { n: number }>("SELECT COUNT(*) AS n FROM professors")
    .get()!.n;
  const codes = db
    .prepare<[], { n: number }>("SELECT COUNT(*) AS n FROM course_codes")
    .get()!.n;
  console.log(`ok professors=${professors} codes=${codes}`);
} catch (error) {
  console.error(`fail ${(error as Error).message}`);
  process.exit(1);
}
