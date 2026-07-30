import "server-only";

import { getDb, nowIso } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import {
  AUTO_SCORED_QUESTION_TYPES,
  type AssessmentQuestionType,
  type AssessmentType,
} from "@/lib/domain/vocabulary";
import type {
  AssessmentOptionRow,
  AssessmentQuestionRow,
  AssessmentResponseRow,
  AssessmentRow,
} from "./types";

export type AssessmentSummary = AssessmentRow & {
  question_count: number;
  objective_codes: string | null;
  response_count: number;
};

const ASSESSMENT_SQL = /* sql */ `
  SELECT a.*,
         (SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = a.id) AS question_count,
         (SELECT COUNT(DISTINCT student_id) FROM assessment_responses
            WHERE assessment_id = a.id) AS response_count,
         (SELECT GROUP_CONCAT(o.code, ', ') FROM assessment_objectives ao
            JOIN learning_objectives o ON o.id = ao.objective_id
            WHERE ao.assessment_id = a.id) AS objective_codes
  FROM assessments a
`;

export function listAssessments(
  courseId: string,
  opts: { publishedOnly?: boolean } = {},
): AssessmentSummary[] {
  return getDb()
    .prepare<[string], AssessmentSummary>(
      `${ASSESSMENT_SQL} WHERE a.course_id = ?${
        opts.publishedOnly ? " AND a.published = 1" : ""
      } ORDER BY COALESCE(a.scheduled_at, '9999'), a.created_at`,
    )
    .all(courseId);
}

export function getAssessment(assessmentId: string): AssessmentSummary | null {
  return (
    getDb()
      .prepare<[string], AssessmentSummary>(`${ASSESSMENT_SQL} WHERE a.id = ?`)
      .get(assessmentId) ?? null
  );
}

/** The next dated, non-practice assessment for a course. */
export function getUpcomingAssessment(courseId: string): AssessmentSummary | null {
  return (
    getDb()
      .prepare<[string], AssessmentSummary>(
        `${ASSESSMENT_SQL}
         WHERE a.course_id = ? AND a.is_practice = 0 AND a.published = 1
           AND a.scheduled_at IS NOT NULL
         ORDER BY a.scheduled_at LIMIT 1`,
      )
      .get(courseId) ?? null
  );
}

export function getPracticeAssessment(courseId: string): AssessmentSummary | null {
  return (
    getDb()
      .prepare<[string], AssessmentSummary>(
        `${ASSESSMENT_SQL}
         WHERE a.course_id = ? AND a.is_practice = 1 AND a.published = 1
         ORDER BY a.created_at LIMIT 1`,
      )
      .get(courseId) ?? null
  );
}

export type AssessmentQuestionWithOptions = AssessmentQuestionRow & {
  options: AssessmentOptionRow[];
  objective_text: string | null;
  objective_code: string | null;
  concept_name: string | null;
};

export function listAssessmentQuestions(
  assessmentId: string,
): AssessmentQuestionWithOptions[] {
  const db = getDb();
  const rows = db
    .prepare<[string], AssessmentQuestionRow & {
      objective_text: string | null;
      objective_code: string | null;
      concept_name: string | null;
    }>(
      `SELECT q.*, o.text AS objective_text, o.code AS objective_code,
              c.name AS concept_name
       FROM assessment_questions q
       LEFT JOIN learning_objectives o ON o.id = q.objective_id
       LEFT JOIN concepts c ON c.id = q.concept_id
       WHERE q.assessment_id = ?
       ORDER BY q.position`,
    )
    .all(assessmentId);

  const optionStmt = db.prepare<[string], AssessmentOptionRow>(
    "SELECT * FROM assessment_question_options WHERE question_id = ? ORDER BY position",
  );

  return rows.map((row) => ({ ...row, options: optionStmt.all(row.id) }));
}

export function listAssessmentResponses(
  studentId: string,
  assessmentId: string,
): AssessmentResponseRow[] {
  return getDb()
    .prepare<[string, string], AssessmentResponseRow>(
      "SELECT * FROM assessment_responses WHERE student_id = ? AND assessment_id = ?",
    )
    .all(studentId, assessmentId);
}

export type CreateAssessmentInput = {
  courseId: string;
  type: AssessmentType;
  title: string;
  description?: string | null;
  scheduledAt?: string | null;
  weightLabel?: string | null;
  professorGuidance?: string | null;
  studyResources?: string | null;
  isPractice?: boolean;
  objectiveIds?: string[];
  lectureIds?: string[];
  conceptIds?: string[];
  questions?: {
    type: AssessmentQuestionType;
    prompt: string;
    explanation?: string | null;
    objectiveId?: string | null;
    conceptId?: string | null;
    aiGenerated?: boolean;
    options?: { text: string; isCorrect: boolean }[];
  }[];
};

export function createAssessment(input: CreateAssessmentInput): string {
  const db = getDb();
  const id = newId("asm");
  const now = nowIso();

  db.transaction(() => {
    db.prepare(
      `INSERT INTO assessments (
         id, course_id, type, title, description, scheduled_at, weight_label,
         professor_guidance, study_resources, is_practice, published, is_demo, created_at
       ) VALUES (?,?,?,?,?,?,?,?,?,?,1,0,?)`,
    ).run(
      id,
      input.courseId,
      input.type,
      input.title,
      input.description ?? null,
      input.scheduledAt ?? null,
      input.weightLabel ?? null,
      input.professorGuidance ?? null,
      input.studyResources ?? null,
      input.isPractice ? 1 : 0,
      now,
    );

    for (const objectiveId of input.objectiveIds ?? []) {
      db.prepare(
        "INSERT OR IGNORE INTO assessment_objectives (assessment_id, objective_id) VALUES (?,?)",
      ).run(id, objectiveId);
    }
    for (const lectureId of input.lectureIds ?? []) {
      db.prepare(
        "INSERT OR IGNORE INTO assessment_lectures (assessment_id, lecture_id) VALUES (?,?)",
      ).run(id, lectureId);
    }
    for (const conceptId of input.conceptIds ?? []) {
      db.prepare(
        "INSERT OR IGNORE INTO assessment_concepts (assessment_id, concept_id) VALUES (?,?)",
      ).run(id, conceptId);
    }

    (input.questions ?? []).forEach((question, index) => {
      const questionId = newId("aq");
      db.prepare(
        `INSERT INTO assessment_questions
           (id, assessment_id, position, type, prompt, explanation, objective_id,
            concept_id, ai_generated, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
      ).run(
        questionId,
        id,
        index + 1,
        question.type,
        question.prompt,
        question.explanation ?? null,
        question.objectiveId ?? null,
        question.conceptId ?? null,
        question.aiGenerated ? 1 : 0,
        now,
      );

      (question.options ?? []).forEach((option, optionIndex) => {
        db.prepare(
          `INSERT INTO assessment_question_options
             (id, question_id, position, text, is_correct)
           VALUES (?,?,?,?,?)`,
        ).run(
          newId("aqo"),
          questionId,
          optionIndex + 1,
          option.text,
          option.isCorrect ? 1 : 0,
        );
      });
    });
  })();

  return id;
}

export type SubmitResponseInput = {
  assessmentId: string;
  questionId: string;
  studentId: string;
  optionId?: string | null;
  textResponse?: string | null;
  confidence?: number | null;
};

/**
 * Records a response. Only multiple-choice and true/false are scored — short
 * answers are stored verbatim for a human to read, and never auto-marked.
 */
export function submitAssessmentResponse(
  input: SubmitResponseInput,
): { isCorrect: boolean | null; autoScored: boolean } {
  const db = getDb();

  const question = db
    .prepare<[string], AssessmentQuestionRow>(
      "SELECT * FROM assessment_questions WHERE id = ?",
    )
    .get(input.questionId);
  if (!question) throw new Error(`Unknown assessment question ${input.questionId}`);

  const autoScored = AUTO_SCORED_QUESTION_TYPES.includes(question.type);
  let isCorrect: boolean | null = null;

  if (autoScored && input.optionId) {
    const option = db
      .prepare<[string], AssessmentOptionRow>(
        "SELECT * FROM assessment_question_options WHERE id = ?",
      )
      .get(input.optionId);
    if (option) isCorrect = option.is_correct === 1;
  }

  db.prepare(
    `INSERT INTO assessment_responses
       (id, assessment_id, question_id, student_id, option_id, text_response,
        is_correct, confidence, created_at)
     VALUES (?,?,?,?,?,?,?,?,?)
     ON CONFLICT (question_id, student_id) DO UPDATE SET
       option_id = excluded.option_id,
       text_response = excluded.text_response,
       is_correct = excluded.is_correct,
       confidence = excluded.confidence,
       created_at = excluded.created_at`,
  ).run(
    newId("ares"),
    input.assessmentId,
    input.questionId,
    input.studentId,
    input.optionId ?? null,
    input.textResponse ?? null,
    isCorrect === null ? null : isCorrect ? 1 : 0,
    input.confidence ?? null,
    nowIso(),
  );

  return { isCorrect, autoScored };
}

/** Per-question class results, for the professor assessment view. */
export type QuestionResult = {
  questionId: string;
  prompt: string;
  type: AssessmentQuestionType;
  objectiveCode: string | null;
  responses: number;
  correct: number;
  autoScored: boolean;
};

export function assessmentResults(assessmentId: string): QuestionResult[] {
  const questions = listAssessmentQuestions(assessmentId);
  const db = getDb();

  return questions.map((question) => {
    const rows = db
      .prepare<[string], AssessmentResponseRow>(
        "SELECT * FROM assessment_responses WHERE question_id = ?",
      )
      .all(question.id);

    return {
      questionId: question.id,
      prompt: question.prompt,
      type: question.type,
      objectiveCode: question.objective_code,
      responses: rows.length,
      correct: rows.filter((r) => r.is_correct === 1).length,
      autoScored: AUTO_SCORED_QUESTION_TYPES.includes(question.type),
    };
  });
}

export function studentAssessmentProgress(
  studentId: string,
  assessmentId: string,
): { answered: number; total: number; correct: number; scorable: number } {
  const db = getDb();
  const total = db
    .prepare<[string], { n: number }>(
      "SELECT COUNT(*) AS n FROM assessment_questions WHERE assessment_id = ?",
    )
    .get(assessmentId)!.n;

  const rows = db
    .prepare<[string, string], AssessmentResponseRow>(
      "SELECT * FROM assessment_responses WHERE student_id = ? AND assessment_id = ?",
    )
    .all(studentId, assessmentId);

  return {
    answered: rows.length,
    total,
    correct: rows.filter((r) => r.is_correct === 1).length,
    scorable: rows.filter((r) => r.is_correct !== null).length,
  };
}
