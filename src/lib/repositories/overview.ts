import "server-only";

import {
  COURSE_HEALTH_PRESENTATION,
  courseHealth,
  summariseCohort,
  type CohortSummary,
  type CourseHealth,
} from "@/lib/domain/health";
import type { ReadinessResult } from "@/lib/domain/readiness";
import { listCourses, type CourseSummary } from "./courses";
import { classAggregate, readinessForCourse } from "./readiness";
import { listRoster } from "./students";

export type CourseOverview = {
  course: CourseSummary;
  health: CourseHealth;
  counts: {
    total: number;
    ready: number;
    developing: number;
    needsSupport: number;
    noData: number;
  };
};

export type FacultyOverview = {
  courses: CourseOverview[];
  /** Course counts by health band, for the course wheel. */
  courseHealthCounts: Record<CourseHealth, number>;
  /** Every student across every course, for the cohort wheel. */
  cohort: CohortSummary;
};

/**
 * Everything the professor dashboard needs, in one pass.
 *
 * Readiness is computed per student rather than read from a cache, so this is the
 * heaviest query path in the application — roughly nine statements per student. On a
 * 134-student faculty load that lands in the low tens of milliseconds with SQLite,
 * which is fine for a dashboard. If a real deployment grew to thousands of students
 * this is the first thing that would need a materialised summary; the snapshot table
 * already exists to build one from.
 */
export function facultyOverview(professorId: string): FacultyOverview {
  const courses = listCourses(professorId);

  const courseHealthCounts: Record<CourseHealth, number> = {
    healthy: 0,
    needs_review: 0,
    needs_attention: 0,
    no_data: 0,
  };

  const everyone: { studentId: string; result: ReadinessResult }[] = [];

  const overviews: CourseOverview[] = courses.map((course) => {
    const roster = listRoster(course.id);
    const results = readinessForCourse(
      course.id,
      roster.map((student) => student.id),
    );
    everyone.push(...results);

    const aggregate = classAggregate(course.id, results);
    const health = courseHealth(aggregate);
    courseHealthCounts[health] += 1;

    return {
      course,
      health,
      counts: {
        total: aggregate.total,
        ready: aggregate.counts.on_track,
        developing: aggregate.counts.needs_review,
        needsSupport: aggregate.counts.support_recommended,
        noData: aggregate.counts.insufficient_data,
      },
    };
  });

  // Worst first, so the courses that want attention lead the list.
  const order: CourseHealth[] = [
    "needs_attention",
    "needs_review",
    "no_data",
    "healthy",
  ];
  overviews.sort(
    (a, b) =>
      order.indexOf(a.health) - order.indexOf(b.health) ||
      a.course.code.localeCompare(b.course.code),
  );

  return {
    courses: overviews,
    courseHealthCounts,
    cohort: summariseCohort(everyone),
  };
}

/** Course titles in a health band, for the wheel's hover panel. */
export function coursesInBand(
  overview: FacultyOverview,
  band: CourseHealth,
): string[] {
  return overview.courses
    .filter((row) => row.health === band)
    .map((row) => `${row.course.code} — ${row.course.title}`);
}

export function courseHealthLabel(band: CourseHealth): string {
  return COURSE_HEALTH_PRESENTATION[band].label;
}
