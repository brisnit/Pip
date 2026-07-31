/**
 * Course- and cohort-level health, for the dashboard visualisations.
 *
 * Pure, like the rest of `lib/domain`. Everything here is derived from readiness
 * results that were themselves derived from recorded activity — no dashboard figure
 * is ever a literal typed into a component.
 *
 * The wheels on the dashboards are decoration. The numbers and labels beside them
 * carry the meaning, and both come from here.
 */
import type { ClassAggregate, ReadinessResult } from "./readiness";
import type { ReadinessStatus } from "./vocabulary";

// Course health ---------------------------------------------------------------

export const COURSE_HEALTH_BANDS = [
  "healthy",
  "needs_review",
  "needs_attention",
  "no_data",
] as const;

export type CourseHealth = (typeof COURSE_HEALTH_BANDS)[number];

export const COURSE_HEALTH_PRESENTATION: Record<
  CourseHealth,
  { label: string; glyph: string; tone: "track" | "attention" | "concern" | "unknown" }
> = {
  healthy: { label: "Healthy", glyph: "●", tone: "track" },
  needs_review: { label: "Needs review", glyph: "◐", tone: "attention" },
  needs_attention: { label: "Needs attention", glyph: "◆", tone: "concern" },
  no_data: { label: "Not enough activity yet", glyph: "○", tone: "unknown" },
};

/**
 * Thresholds for classifying a whole course.
 *
 * Deliberately conservative about "needs attention": one struggling student in a
 * small seminar is a conversation, not a course-level alarm. It takes either two
 * students or a meaningful share of the class before a course is flagged, so the
 * red band stays worth looking at.
 */
export const COURSE_HEALTH_THRESHOLDS = {
  /** Students needing support, as a share of those with enough data. */
  attentionShare: 0.18,
  /** …or this many outright, whichever comes first. */
  attentionCount: 3,
  /** Support share above which the course itself is worth a second look. */
  reviewSupportShare: 0.1,
  /** Combined support + review share that reads as a course-level drift. */
  reviewCombinedShare: 0.4,
  /** Below this many students with usable data, we decline to classify. */
  minimumAssessed: 2,
} as const;

export function courseHealth(aggregate: ClassAggregate): CourseHealth {
  const assessed = aggregate.total - aggregate.counts.insufficient_data;
  if (assessed < COURSE_HEALTH_THRESHOLDS.minimumAssessed) return "no_data";

  const support = aggregate.counts.support_recommended;
  const review = aggregate.counts.needs_review;

  if (
    support >= COURSE_HEALTH_THRESHOLDS.attentionCount ||
    support / assessed >= COURSE_HEALTH_THRESHOLDS.attentionShare
  ) {
    return "needs_attention";
  }

  // A single student needing support in a class of seventeen is a conversation with
  // that student, not a problem with the course. The course only reads as amber when
  // a meaningful share is drifting — otherwise every course is amber and the wheel
  // stops carrying information.
  if (
    support / assessed >= COURSE_HEALTH_THRESHOLDS.reviewSupportShare ||
    (support + review) / assessed >= COURSE_HEALTH_THRESHOLDS.reviewCombinedShare
  ) {
    return "needs_review";
  }

  return "healthy";
}

// Cohort health ---------------------------------------------------------------

/**
 * How a student's readiness status reads at cohort level.
 *
 * Note the fourth band. The brief sketched three — ready, developing, needs
 * support — but folding students with too little recorded activity into any of them
 * would be a fabrication: "ready" would flatter them, "needs support" would malign
 * them. They get their own quiet segment instead.
 */
export const COHORT_BANDS = [
  "ready",
  "developing",
  "needs_support",
  "no_data",
] as const;

export type CohortBand = (typeof COHORT_BANDS)[number];

export const COHORT_PRESENTATION: Record<
  CohortBand,
  { label: string; glyph: string; tone: "track" | "attention" | "concern" | "unknown" }
> = {
  ready: { label: "Ready", glyph: "●", tone: "track" },
  developing: { label: "Developing", glyph: "◐", tone: "attention" },
  needs_support: { label: "Needs support", glyph: "◆", tone: "concern" },
  no_data: { label: "Not enough data yet", glyph: "○", tone: "unknown" },
};

export function cohortBandFor(status: ReadinessStatus): CohortBand {
  switch (status) {
    case "on_track":
      return "ready";
    case "needs_review":
      return "developing";
    case "support_recommended":
      return "needs_support";
    case "insufficient_data":
      return "no_data";
  }
}

export type CohortSummary = {
  total: number;
  counts: Record<CohortBand, number>;
  /** Mean self-reported confidence, 1–5, across students who reported any. */
  averageConfidence: number | null;
  /** Mean composite readiness across students who have one. */
  averageReadiness: number | null;
  /** Objectives most often weak, most common first. */
  commonStruggles: { label: string; students: number }[];
  /** Concepts most often marked confusing. */
  confusingConcepts: { name: string; count: number }[];
};

export function summariseCohort(
  results: { studentId: string; result: ReadinessResult }[],
): CohortSummary {
  const counts: Record<CohortBand, number> = {
    ready: 0,
    developing: 0,
    needs_support: 0,
    no_data: 0,
  };

  const confidences: number[] = [];
  const scores: number[] = [];
  const struggles = new Map<string, number>();
  const concepts = new Map<string, number>();

  for (const { result } of results) {
    counts[cohortBandFor(result.status)] += 1;

    if (result.score !== null) scores.push(result.score);

    const confidence = result.signals.find((s) => s.kind === "self_confidence");
    if (confidence?.value != null) confidences.push(confidence.value * 4 + 1);

    for (const row of result.objectives) {
      if (row.standing === "needs_review") {
        struggles.set(
          row.objective.text,
          (struggles.get(row.objective.text) ?? 0) + 1,
        );
      }
      for (const concept of row.confusingConcepts) {
        concepts.set(concept, (concepts.get(concept) ?? 0) + 1);
      }
    }
  }

  const mean = (xs: number[]) =>
    xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;

  return {
    total: results.length,
    counts,
    averageConfidence: mean(confidences),
    averageReadiness: mean(scores),
    commonStruggles: Array.from(struggles.entries())
      .map(([label, students]) => ({ label, students }))
      .sort((a, b) => b.students - a.students),
    confusingConcepts: Array.from(concepts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
  };
}

// A single student's own learning health ---------------------------------------

export const LEARNING_BANDS = ["strong", "developing", "needs_review"] as const;
export type LearningBand = (typeof LEARNING_BANDS)[number];

export const LEARNING_PRESENTATION: Record<
  LearningBand,
  { label: string; glyph: string; tone: "track" | "attention" | "concern" }
> = {
  strong: { label: "Strong", glyph: "●", tone: "track" },
  developing: { label: "Developing", glyph: "◐", tone: "attention" },
  needs_review: { label: "Needs review", glyph: "◆", tone: "concern" },
};

export type LearningSummary = {
  /** Composite readiness, 0–1, or null when there is too little evidence. */
  readiness: number | null;
  counts: Record<LearningBand, number>;
  topics: Record<LearningBand, string[]>;
  /** Objectives with no evidence either way — shown separately, never as weakness. */
  unassessed: string[];
};

export function summariseLearning(result: ReadinessResult): LearningSummary {
  const counts: Record<LearningBand, number> = {
    strong: 0,
    developing: 0,
    needs_review: 0,
  };
  const topics: Record<LearningBand, string[]> = {
    strong: [],
    developing: [],
    needs_review: [],
  };

  for (const row of result.objectives) {
    if (row.standing === "understood") {
      counts.strong += 1;
      topics.strong.push(row.objective.text);
    } else if (row.standing === "developing") {
      counts.developing += 1;
      topics.developing.push(row.objective.text);
    } else if (row.standing === "needs_review") {
      counts.needs_review += 1;
      // Name the specific confusing concept where there is one — it is more use
      // than the objective title.
      topics.needs_review.push(
        row.confusingConcepts[0] ?? row.objective.text,
      );
    }
  }

  return {
    readiness: result.score,
    counts,
    topics,
    unassessed: result.objectives
      .filter((row) => row.standing === "unknown")
      .map((row) => row.objective.text),
  };
}
