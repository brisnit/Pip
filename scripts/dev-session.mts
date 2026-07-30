/**
 * Prints a prototype student-session cookie so a demo (or a curl-based smoke test)
 * can enter the student portal as one of the seeded students without retyping a
 * name.
 *
 *   npm run dev:session -- "Noor Haddad"
 *
 * Then set the printed cookie in your browser, or pass it to curl with -b.
 */
import { getDb } from "../src/lib/db/client";
import { getActiveProfessor, listCourses } from "../src/lib/repositories/courses";
import { joinCourse, listRoster } from "../src/lib/repositories/students";
import { STUDENT_SESSION_COOKIE } from "../src/lib/role/role-context";

const wanted = process.argv.slice(2).join(" ").trim();

getDb();
const professor = getActiveProfessor();
const course = listCourses(professor.id)[0];

if (!course) {
  console.error("No course found. Run npm run db:reset first.");
  process.exit(1);
}

const roster = listRoster(course.id);
const student =
  roster.find((s) => s.name.toLowerCase() === wanted.toLowerCase()) ?? roster[0];

if (!student) {
  console.error(`No students in ${course.code}.`);
  process.exit(1);
}

const { sessionId } = joinCourse({
  courseId: course.id,
  name: student.name,
  source: "link",
  consented: true,
});

console.log(`course:   ${course.code} — ${course.title}`);
console.log(`courseId: ${course.id}`);
console.log(`student:  ${student.name}`);
console.log(`cookie:   ${STUDENT_SESSION_COOKIE}=${sessionId}`);
console.log(`url:      /student/${course.id}`);

if (wanted && student.name.toLowerCase() !== wanted.toLowerCase()) {
  console.log(
    `\nNote: "${wanted}" was not on the roster, so the first student was used.`,
  );
  console.log(`Roster: ${roster.map((s) => s.name).join(", ")}`);
}
