import "server-only";

import { getDb } from "@/lib/db/client";
import {
  summariseLearning,
  type LearningSummary,
} from "@/lib/domain/health";
import type { ReadinessStatus } from "@/lib/domain/vocabulary";
import { getUpcomingAssessment } from "./assessments";
import { getCourse, type CourseSummary } from "./courses";
import { listStudentLectures } from "./lectures";
import { readinessFor } from "./readiness";

export type EnrolledCourse = {
  course: CourseSummary;
  /** The student's own record in that course. */
  studentId: string;
  status: ReadinessStatus;
  readiness: number | null;
  nextUp: { label: string; href: string } | null;
};

/**
 * Every course this person is enrolled in.
 *
 * Matched by name, which is exactly as weak as it sounds and is the same heuristic
 * `joinCourse` uses. There is no cross-course identity in this build because there is
 * no authentication — a person joining two courses creates two student rows. When SSO
 * lands, this becomes a join on the account id and nothing above it changes.
 */
export function enrolledCourses(
  studentId: string,
): EnrolledCourse[] {
  const db = getDb();

  const self = db
    .prepare<[string], { name: string }>("SELECT name FROM students WHERE id = ?")
    .get(studentId);
  if (!self) return [];

  const rows = db
    .prepare<[string], { student_id: string; course_id: string }>(
      `SELECT s.id AS student_id, e.course_id
       FROM students s
       JOIN course_entries e ON e.student_id = s.id
       WHERE LOWER(s.name) = LOWER(?)
       ORDER BY e.joined_at`,
    )
    .all(self.name);

  return rows.flatMap((row) => {
    const course = getCourse(row.course_id);
    if (!course) return [];

    const readiness = readinessFor(row.course_id, row.student_id);

    return [
      {
        course,
        studentId: row.student_id,
        status: readiness.status,
        readiness: readiness.score,
        nextUp: nextActionFor(row.course_id),
      },
    ];
  });
}

/** The most useful next thing in a course: a live lecture, then the newest one. */
function nextActionFor(
  courseId: string,
): { label: string; href: string } | null {
  const lectures = listStudentLectures(courseId);
  if (lectures.length === 0) {
    const assessment = getUpcomingAssessment(courseId);
    return assessment
      ? {
          label: assessment.title,
          href: `/student/${courseId}/assessments`,
        }
      : null;
  }

  const live = lectures.find((lecture) => lecture.status === "live");
  const lecture = live ?? lectures[lectures.length - 1];

  return {
    label: live ? `${lecture.title} — live now` : lecture.title,
    href: `/student/${courseId}/lecture/${lecture.id}`,
  };
}

export type StudentOverview = {
  learning: LearningSummary;
  courses: EnrolledCourse[];
  /** The single strongest call to action across every course. */
  continueWith: { label: string; href: string; why: string } | null;
};

export function studentOverview(
  courseId: string,
  studentId: string,
): StudentOverview {
  const readiness = readinessFor(courseId, studentId);
  const courses = enrolledCourses(studentId);

  // Priority: anything live, then the course most in need of attention, then the
  // course the student is currently in.
  const live = courses.find((row) => row.nextUp?.label.includes("live now"));
  const weakest = courses
    .filter((row) => row.status === "support_recommended")
    .sort((a, b) => (a.readiness ?? 1) - (b.readiness ?? 1))[0];
  const current = courses.find((row) => row.course.id === courseId);

  const chosen = live ?? weakest ?? current ?? courses[0] ?? null;

  return {
    learning: summariseLearning(readiness),
    courses,
    continueWith:
      chosen?.nextUp != null
        ? {
            label: chosen.nextUp.label,
            href: chosen.nextUp.href,
            why: live
              ? "Your professor is teaching right now."
              : weakest
                ? `${chosen.course.code} is where your recorded work suggests you would gain most.`
                : `Pick up where you left off in ${chosen.course.code}.`,
          }
        : null,
  };
}
