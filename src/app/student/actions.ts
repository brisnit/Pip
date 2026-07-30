"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  actionFailure,
  actionSuccess,
  type ActionState,
} from "@/lib/forms/action-state";
import { getAIProvider, saveArtifact } from "@/lib/ai";
import {
  MARKERS,
  NOTE_KINDS,
  QUESTION_KINDS,
  SUPPORT_REQUEST_KINDS,
  SUPPORT_STATUSES,
} from "@/lib/domain/vocabulary";
import { submitAssessmentResponse } from "@/lib/repositories/assessments";
import { getCourse, listConcepts, listObjectives } from "@/lib/repositories/courses";
import { listMaterials } from "@/lib/repositories/content";
import {
  createBookmark,
  createNote,
  createQuestion,
  deleteBookmark,
  deleteNote,
  listNotes,
  recordActivity,
  recordConfidence,
  setMarker,
  setNoteShared,
  toggleQuestionVote,
} from "@/lib/repositories/engagement";
import {
  getLecture,
  listLectureConcepts,
  listLectureObjectives,
  listSegments,
  recordInteractionResponse,
} from "@/lib/repositories/lectures";
import { readinessFor } from "@/lib/repositories/readiness";
import {
  createSupportRequest,
  respondToRecommendation,
} from "@/lib/repositories/support";
import { currentStudent } from "@/lib/role/role-context";

const fail = actionFailure;
const ok = actionSuccess;

/**
 * Resolves the acting student and asserts they belong to the course they are
 * writing to. Every student write goes through this — a form field can be forged,
 * so the course is taken from the session, never from the request body.
 */
async function actingStudent(courseId: string) {
  const student = await currentStudent();
  if (!student) return null;
  if (student.courseId !== courseId) return null;
  return student;
}

const NOT_IN_COURSE =
  "Your prototype session has expired or belongs to a different course. Rejoin from the course link.";

// Notes ----------------------------------------------------------------------

const noteSchema = z.object({
  kind: z.enum(NOTE_KINDS),
  body: z.string().trim().min(2, "Write something before saving the note."),
  title: z
    .string()
    .trim()
    .max(140)
    .transform((v) => (v === "" ? null : v)),
  atSeconds: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine(
      (v) => v === null || (Number.isFinite(v) && v >= 0),
      "That timestamp is not valid.",
    ),
});

export async function createNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const courseId = String(formData.get("courseId") ?? "");
  const student = await actingStudent(courseId);
  if (!student) return fail(NOT_IN_COURSE);

  const parsed = noteSchema.safeParse({
    kind: formData.get("kind"),
    body: formData.get("body"),
    title: formData.get("title") ?? "",
    atSeconds: formData.get("atSeconds") ?? "",
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "That note was not saved.");
  }

  const lectureId = (formData.get("lectureId") as string) || null;
  const segmentId = (formData.get("segmentId") as string) || null;
  const shared = formData.get("shared") === "on";

  createNote({
    studentId: student.studentId,
    courseId,
    lectureId,
    segmentId,
    objectiveId: (formData.get("objectiveId") as string) || null,
    conceptId: (formData.get("conceptId") as string) || null,
    kind: parsed.data.kind,
    title: parsed.data.title,
    body: parsed.data.body,
    atSeconds: parsed.data.atSeconds,
    transcriptExcerpt: (formData.get("transcriptExcerpt") as string) || null,
    scriptureReference: (formData.get("scriptureReference") as string) || null,
    shared,
  });

  recordActivity({
    courseId,
    studentId: student.studentId,
    lectureId,
    type: "took_note",
    summary: shared
      ? "Shared a note with the professor"
      : "Took a note (private)",
  });

  revalidatePath(`/student/${courseId}`, "layout");
  return ok(
    shared
      ? "Note saved and shared with your professor."
      : "Note saved. It stays private unless you share it.",
  );
}

export async function setNoteSharedAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const student = await actingStudent(courseId);
  if (!student) return;

  const noteId = String(formData.get("noteId") ?? "");
  setNoteShared(noteId, student.studentId, formData.get("shared") === "1");
  revalidatePath(`/student/${courseId}`, "layout");
}

export async function deleteNoteAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const student = await actingStudent(courseId);
  if (!student) return;

  deleteNote(String(formData.get("noteId") ?? ""), student.studentId);
  revalidatePath(`/student/${courseId}`, "layout");
}

// Markers and bookmarks ------------------------------------------------------

export async function setMarkerAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const student = await actingStudent(courseId);
  if (!student) return;

  const parsed = z.enum(MARKERS).safeParse(formData.get("marker"));
  if (!parsed.success) return;

  const lectureId = (formData.get("lectureId") as string) || null;
  const segmentId = (formData.get("segmentId") as string) || null;

  const { created } = setMarker({
    studentId: student.studentId,
    courseId,
    lectureId,
    segmentId,
    objectiveId: (formData.get("objectiveId") as string) || null,
    conceptId: (formData.get("conceptId") as string) || null,
    marker: parsed.data,
    atSeconds: formData.get("atSeconds")
      ? Number(formData.get("atSeconds"))
      : null,
    transcriptExcerpt: (formData.get("transcriptExcerpt") as string) || null,
  });

  if (created && parsed.data === "confusing") {
    recordActivity({
      courseId,
      studentId: student.studentId,
      lectureId,
      type: "marked_confusing",
      summary: `Marked "${formData.get("segmentHeading") ?? "a lecture moment"}" as confusing`,
    });
  }

  revalidatePath(`/student/${courseId}`, "layout");
}

export async function createBookmarkAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const student = await actingStudent(courseId);
  if (!student) return;

  const lectureId = String(formData.get("lectureId") ?? "");
  if (!lectureId) return;

  createBookmark({
    studentId: student.studentId,
    courseId,
    lectureId,
    segmentId: (formData.get("segmentId") as string) || null,
    atSeconds: Number(formData.get("atSeconds") ?? 0),
    label: (formData.get("label") as string) || null,
    transcriptExcerpt: (formData.get("transcriptExcerpt") as string) || null,
  });

  revalidatePath(`/student/${courseId}`, "layout");
}

export async function deleteBookmarkAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const student = await actingStudent(courseId);
  if (!student) return;

  deleteBookmark(String(formData.get("bookmarkId") ?? ""), student.studentId);
  revalidatePath(`/student/${courseId}`, "layout");
}

// Questions ------------------------------------------------------------------

export async function askQuestionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const courseId = String(formData.get("courseId") ?? "");
  const student = await actingStudent(courseId);
  if (!student) return fail(NOT_IN_COURSE);

  const body = String(formData.get("body") ?? "").trim();
  const parsedKind = z.enum(QUESTION_KINDS).safeParse(formData.get("kind"));

  if (body.length < 5) {
    return fail("Write your question before submitting — at least a few words.");
  }
  if (!parsedKind.success) return fail("Choose what kind of question this is.");

  const lectureId = (formData.get("lectureId") as string) || null;

  createQuestion({
    studentId: student.studentId,
    courseId,
    lectureId,
    segmentId: (formData.get("segmentId") as string) || null,
    objectiveId: (formData.get("objectiveId") as string) || null,
    conceptId: (formData.get("conceptId") as string) || null,
    kind: parsedKind.data,
    body,
    atSeconds: formData.get("atSeconds")
      ? Number(formData.get("atSeconds"))
      : null,
    transcriptExcerpt: (formData.get("transcriptExcerpt") as string) || null,
    anonymous: formData.get("anonymous") === "on",
  });

  recordActivity({
    courseId,
    studentId: student.studentId,
    lectureId,
    type: "asked_question",
    summary: `Asked a question on "${formData.get("segmentHeading") ?? "the lecture"}"`,
  });

  revalidatePath(`/student/${courseId}`, "layout");
  revalidatePath(`/professor/courses/${courseId}`, "layout");
  return ok(
    "Question submitted. Your professor sees it with the exact lecture moment attached.",
  );
}

export async function voteQuestionAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const student = await actingStudent(courseId);
  if (!student) return;

  toggleQuestionVote(
    String(formData.get("questionId") ?? ""),
    student.studentId,
  );
  revalidatePath(`/student/${courseId}`, "layout");
}

// Interactions ---------------------------------------------------------------

export async function respondToInteractionAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const student = await actingStudent(courseId);
  if (!student) return;

  const interactionId = String(formData.get("interactionId") ?? "");
  if (!interactionId) return;

  const confidenceRaw = formData.get("confidence");
  const confidence = confidenceRaw ? Number(confidenceRaw) : null;

  recordInteractionResponse({
    interactionId,
    studentId: student.studentId,
    optionId: (formData.get("optionId") as string) || null,
    textResponse: ((formData.get("textResponse") as string) || "").trim() || null,
    confidence:
      confidence !== null && Number.isFinite(confidence) ? confidence : null,
  });

  const lectureId = (formData.get("lectureId") as string) || null;
  recordActivity({
    courseId,
    studentId: student.studentId,
    lectureId,
    type: "answered_check",
    summary: "Answered an interactive moment",
  });

  revalidatePath(`/student/${courseId}`, "layout");
  revalidatePath(`/professor/courses/${courseId}`, "layout");
}

export async function recordConfidenceAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const student = await actingStudent(courseId);
  if (!student) return;

  const level = Number(formData.get("level") ?? 0);
  if (!Number.isFinite(level) || level < 1 || level > 5) return;

  recordConfidence({
    studentId: student.studentId,
    courseId,
    lectureId: (formData.get("lectureId") as string) || null,
    objectiveId: (formData.get("objectiveId") as string) || null,
    conceptId: (formData.get("conceptId") as string) || null,
    level,
    context: (formData.get("context") as string) || null,
  });

  revalidatePath(`/student/${courseId}`, "layout");
}

// Assessments ----------------------------------------------------------------

export async function submitAssessmentResponseAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const student = await actingStudent(courseId);
  if (!student) return;

  const assessmentId = String(formData.get("assessmentId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  if (!assessmentId || !questionId) return;

  const confidenceRaw = formData.get("confidence");
  const confidence = confidenceRaw ? Number(confidenceRaw) : null;

  submitAssessmentResponse({
    assessmentId,
    questionId,
    studentId: student.studentId,
    optionId: (formData.get("optionId") as string) || null,
    textResponse: ((formData.get("textResponse") as string) || "").trim() || null,
    confidence:
      confidence !== null && Number.isFinite(confidence) ? confidence : null,
  });

  recordActivity({
    courseId,
    studentId: student.studentId,
    type: "practice_attempt",
    summary: "Answered a practice or assessment question",
  });

  revalidatePath(`/student/${courseId}`, "layout");
  revalidatePath(`/professor/courses/${courseId}`, "layout");
}

// Support --------------------------------------------------------------------

export async function respondToRecommendationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const courseId = String(formData.get("courseId") ?? "");
  const student = await actingStudent(courseId);
  if (!student) return fail(NOT_IN_COURSE);

  const parsed = z.enum(SUPPORT_STATUSES).safeParse(formData.get("status"));
  if (!parsed.success) return fail("That response was not recognised.");

  const note = String(formData.get("note") ?? "").trim();
  if (parsed.data === "declined" && note.length < 3) {
    return fail(
      "Add a short note about why this does not fit, so your professor can suggest something better.",
    );
  }

  respondToRecommendation({
    recommendationId: String(formData.get("recommendationId") ?? ""),
    studentId: student.studentId,
    status: parsed.data,
    note: note || null,
    actorName: student.studentName,
  });

  recordActivity({
    courseId,
    studentId: student.studentId,
    type: `support_${parsed.data}`,
    summary: `Marked a support recommendation as ${parsed.data.replace(/_/g, " ")}`,
  });

  revalidatePath(`/student/${courseId}`, "layout");
  revalidatePath(`/professor/courses/${courseId}`, "layout");

  return ok(
    parsed.data === "completed"
      ? "Marked complete. Your readiness view updates as you work through the material."
      : parsed.data === "declined"
        ? "Declined. Your professor sees your note and can suggest an alternative."
        : "Saved.",
  );
}

export async function createSupportRequestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const courseId = String(formData.get("courseId") ?? "");
  const student = await actingStudent(courseId);
  if (!student) return fail(NOT_IN_COURSE);

  const parsed = z.enum(SUPPORT_REQUEST_KINDS).safeParse(formData.get("kind"));
  if (!parsed.success) return fail("Choose the kind of support you would like.");

  const topics = String(formData.get("topics") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (topics.length < 3) {
    return fail(
      "Name at least one topic. A request with specific topics gets a much more useful response.",
    );
  }

  // Build a preparation summary from recorded signals — never from private notes.
  const readiness = readinessFor(courseId, student.studentId);
  const brief = await getAIProvider().prepareOfficeHours({
    studentName: student.studentName,
    topics: topics.split(/[;,]/).map((t) => t.trim()).filter(Boolean),
    reasons: readiness.reasons,
  });

  const prepSummary = [
    "For you:",
    ...brief.data.forStudent.map((line) => `  • ${line}`),
    "",
    "For your professor or tutor:",
    ...brief.data.forProfessor.map((line) => `  • ${line}`),
  ].join("\n");

  saveArtifact({
    result: brief,
    kind: "support_brief",
    courseId,
    studentId: student.studentId,
    title: `Preparation summary — ${student.studentName}`,
  });

  createSupportRequest({
    courseId,
    studentId: student.studentId,
    recommendationId: (formData.get("recommendationId") as string) || null,
    kind: parsed.data,
    topics,
    preferredTime: (formData.get("preferredTime") as string) || null,
    message: message || null,
    prepSummary,
  });

  recordActivity({
    courseId,
    studentId: student.studentId,
    type: "requested_support",
    summary: `${student.studentName} requested support`,
  });

  revalidatePath(`/student/${courseId}`, "layout");
  revalidatePath(`/professor/courses/${courseId}`, "layout");

  return ok(
    "Request recorded, with a preparation summary for both sides. Note that this prototype does not send email or book a calendar — your professor sees it in their support view.",
  );
}

// AI study tools -------------------------------------------------------------

/** Builds a study guide from the student's own notes plus published material. */
export async function generateMyStudyGuideAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const courseId = String(formData.get("courseId") ?? "");
  const student = await actingStudent(courseId);
  if (!student) return fail(NOT_IN_COURSE);

  const course = getCourse(courseId);
  if (!course) return fail("That course no longer exists.");

  const notes = listNotes(student.studentId, courseId);
  const readiness = readinessFor(courseId, student.studentId);

  const focus =
    readiness.gaps[0]?.objective.text ?? `${course.code} review`;

  const result = await getAIProvider().generateStudyGuide({
    courseTitle: course.title,
    focus,
    objectives: listObjectives(courseId).map((o) => ({
      code: o.code,
      text: o.text,
    })),
    concepts: listConcepts(courseId).map((c) => ({
      name: c.name,
      definition: c.definition,
    })),
    segments: [],
    studentNoteExcerpts: notes
      .filter((note) => note.kind === "question" || note.kind === "exam_review")
      .map((note) => note.body)
      .slice(0, 5),
  });

  saveArtifact({
    result,
    kind: "student_study_guide",
    courseId,
    studentId: student.studentId,
    title: result.data.title,
  });

  revalidatePath(`/student/${courseId}/notes`);
  return ok("Study guide built from your course material and your own notes.");
}

export async function generateFlashcardsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const courseId = String(formData.get("courseId") ?? "");
  const lectureId = String(formData.get("lectureId") ?? "");
  const student = await actingStudent(courseId);
  if (!student) return fail(NOT_IN_COURSE);

  const course = getCourse(courseId);
  const lecture = lectureId ? getLecture(lectureId) : null;
  if (!course || !lecture) {
    return fail("Choose a lecture to build flashcards from.");
  }

  const result = await getAIProvider().generateFlashcards(
    {
      courseTitle: course.title,
      lectureTitle: lecture.title,
      segments: listSegments(lectureId).map((s) => ({
        heading: s.heading,
        body: s.body,
      })),
      transcript: lecture.transcript_text,
      studentNotes: lecture.student_notes,
      concepts: listLectureConcepts(lectureId).map((c) => ({
        name: c.name,
        definition: c.definition,
      })),
      objectives: listLectureObjectives(lectureId).map((o) => ({
        code: o.code,
        text: o.text,
      })),
      scripture: [],
    },
    12,
  );

  saveArtifact({
    result,
    kind: "flashcards",
    courseId,
    lectureId,
    studentId: student.studentId,
    title: `Flashcards — ${lecture.title}`,
  });

  revalidatePath(`/student/${courseId}/notes`);
  return ok(`${result.data.length} flashcards built from this lecture.`);
}

/** Not used for grading — a readable restatement of the readiness signals. */
export async function generateReadinessNarrativeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const courseId = String(formData.get("courseId") ?? "");
  const student = await actingStudent(courseId);
  if (!student) return fail(NOT_IN_COURSE);

  const course = getCourse(courseId);
  if (!course) return fail("That course no longer exists.");

  const readiness = readinessFor(courseId, student.studentId);
  const result = await getAIProvider().analyzeReadiness({
    studentName: student.studentName,
    courseTitle: course.title,
    statusLabel: readiness.status,
    strengths: readiness.strengths.map((s) => s.objective.text),
    gaps: readiness.gaps.map((g) => g.objective.text),
    reasons: readiness.reasons,
    confidenceCopy: readiness.confidenceCopy,
  });

  saveArtifact({
    result,
    kind: "readiness_narrative",
    courseId,
    studentId: student.studentId,
    title: "Readiness summary",
  });

  void listMaterials;
  revalidatePath(`/student/${courseId}/readiness`);
  return ok("Summary generated.");
}
