"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  actionFailure,
  actionSuccess,
  type ActionState,
} from "@/lib/forms/action-state";
import { getAIProvider, saveArtifact } from "@/lib/ai";
import {
  ASSESSMENT_TYPES,
  CONTENT_TYPES,
  COURSE_FORMATS,
  COURSE_IMAGE_THEMES,
  DELIVERY_MODES,
  FOLLOW_UP_STATUSES,
  LECTURE_STATUSES,
  PRIORITIES,
  QUESTION_STATUSES,
  READINESS_STATUSES,
  SUPPORT_PATHWAYS,
  VISIBILITIES,
} from "@/lib/domain/vocabulary";
import { parseClock } from "@/lib/domain/support";
import {
  createAssessment,
  getAssessment,
} from "@/lib/repositories/assessments";
import {
  createCourse,
  getCourse,
  issueCourseCode,
  listConcepts,
  listObjectives,
} from "@/lib/repositories/courses";
import {
  createMaterial,
  createSyllabus,
  deleteMaterial,
  getSyllabus,
  listSyllabusItems,
  publishSyllabus,
  replaceSyllabusItems,
  setMaterialVisibility,
  setSyllabusItemApproved,
} from "@/lib/repositories/content";
import {
  answerQuestion,
  recordActivity,
  setQuestionStatus,
} from "@/lib/repositories/engagement";
import {
  createLecture,
  getLecture,
  listLectureConcepts,
  listLectureObjectives,
  listSegments,
  setCurrentTopic,
  setInteractionPublished,
  setLectureStatus,
} from "@/lib/repositories/lectures";
import {
  clearStatusOverride,
  readinessFor,
  setStatusOverride,
} from "@/lib/repositories/readiness";
import {
  createProfessorNote,
  draftRecommendations,
  professorRespondToRecommendation,
  saveRecommendation,
  setFollowUpStatus,
  setSupportRequestStatus,
  syncRecommendations,
} from "@/lib/repositories/support";
import { requireProfessor } from "@/lib/role/role-context";

const fail = actionFailure;
const ok = actionSuccess;

function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  return issue ? issue.message : "That submission was not valid.";
}

const optionalText = z
  .string()
  .trim()
  .max(4000)
  .transform((v) => (v === "" ? null : v));

const lines = (value: FormDataEntryValue | null): string[] =>
  String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

// Courses --------------------------------------------------------------------

const courseSchema = z.object({
  title: z.string().trim().min(3, "Give the course a title of at least 3 characters."),
  code: z
    .string()
    .trim()
    .min(2, "Enter a course code, for example CH504.")
    .max(20, "Course codes are limited to 20 characters."),
  description: optionalText,
  term: optionalText,
  meetingDays: optionalText,
  meetingTime: optionalText,
  location: optionalText,
  format: z.enum(COURSE_FORMATS),
  imageTheme: z.enum(COURSE_IMAGE_THEMES),
  estimatedEnrollment: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine(
      (v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 2000),
      "Estimated enrolment must be a whole number between 0 and 2000.",
    ),
  startDate: optionalText,
  endDate: optionalText,
});

export async function createCourseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { professor } = requireProfessor();

  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    code: formData.get("code"),
    description: formData.get("description"),
    term: formData.get("term"),
    meetingDays: formData.get("meetingDays"),
    meetingTime: formData.get("meetingTime"),
    location: formData.get("location"),
    format: formData.get("format"),
    imageTheme: formData.get("imageTheme"),
    estimatedEnrollment: formData.get("estimatedEnrollment"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });

  if (!parsed.success) return fail(firstIssue(parsed.error));

  const data = parsed.data;
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    return fail("The end date cannot fall before the start date.");
  }

  const { courseId } = createCourse({
    professorId: professor.id,
    title: data.title,
    code: data.code.toUpperCase(),
    description: data.description,
    term: data.term,
    meetingDays: data.meetingDays,
    meetingTime: data.meetingTime,
    location: data.location,
    format: data.format,
    imageTheme: data.imageTheme,
    estimatedEnrollment: data.estimatedEnrollment,
    startDate: data.startDate,
    endDate: data.endDate,
    objectives: lines(formData.get("objectives")),
    modules: lines(formData.get("modules")),
  });

  revalidatePath("/professor/courses");
  revalidatePath("/professor/dashboard");
  redirect(`/professor/courses/${courseId}?created=1`);
}

export async function rotateCourseCodeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  requireProfessor();
  const courseId = String(formData.get("courseId") ?? "");
  if (!getCourse(courseId)) return fail("That course no longer exists.");

  const code = issueCourseCode(courseId);
  revalidatePath(`/professor/courses/${courseId}`);
  return ok(
    `New course code issued: ${code}. The previous code no longer works, so re-display the QR code before your next class.`,
  );
}

// Syllabus -------------------------------------------------------------------

export async function saveSyllabusTextAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  requireProfessor();
  const courseId = String(formData.get("courseId") ?? "");
  const rawText = String(formData.get("rawText") ?? "").trim();
  const fileName = String(formData.get("fileName") ?? "").trim();

  if (rawText.length < 40) {
    return fail(
      "Paste the syllabus text — at least a few lines — so there is something to work with.",
    );
  }
  if (!getCourse(courseId)) return fail("That course no longer exists.");

  createSyllabus({
    courseId,
    sourceType: fileName ? "uploaded_file_metadata" : "pasted_text",
    rawText,
    fileName: fileName || null,
  });

  revalidatePath(`/professor/courses/${courseId}/syllabus`);
  return ok("Syllabus saved. Run the extraction to draft a course structure from it.");
}

export async function extractSyllabusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  requireProfessor();
  const courseId = String(formData.get("courseId") ?? "");
  const course = getCourse(courseId);
  const syllabus = getSyllabus(courseId);

  if (!course) return fail("That course no longer exists.");
  if (!syllabus?.raw_text) {
    return fail("Add the syllabus text first — there is nothing to extract from.");
  }

  const provider = getAIProvider();
  const result = await provider.extractSyllabus(syllabus.raw_text, course.title);

  replaceSyllabusItems(
    syllabus.id,
    result.data.items.map((item) => ({
      kind: item.kind,
      title: item.title,
      detail: item.detail,
      weekLabel: item.weekLabel,
      dateLabel: item.dateLabel,
      aiGenerated: true,
      approved: false,
    })),
    result.provenance.providerLabel,
    result.data.note,
  );

  saveArtifact({
    result,
    kind: "syllabus_extraction",
    courseId,
    title: `Syllabus extraction — ${course.code}`,
  });

  revalidatePath(`/professor/courses/${courseId}/syllabus`);
  return ok(
    `${result.data.items.length} draft item(s) extracted. Nothing is published until you approve it.`,
  );
}

export async function toggleSyllabusItemAction(formData: FormData) {
  requireProfessor();
  const itemId = String(formData.get("itemId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const approved = formData.get("approved") === "1";
  setSyllabusItemApproved(itemId, approved);
  revalidatePath(`/professor/courses/${courseId}/syllabus`);
}

export async function approveAllSyllabusItemsAction(formData: FormData) {
  requireProfessor();
  const courseId = String(formData.get("courseId") ?? "");
  const syllabus = getSyllabus(courseId);
  if (!syllabus) return;
  for (const item of listSyllabusItems(syllabus.id)) {
    setSyllabusItemApproved(item.id, true);
  }
  revalidatePath(`/professor/courses/${courseId}/syllabus`);
}

export async function publishSyllabusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  requireProfessor();
  const courseId = String(formData.get("courseId") ?? "");
  const syllabus = getSyllabus(courseId);
  if (!syllabus) return fail("Add a syllabus before publishing.");

  const approved = listSyllabusItems(syllabus.id).filter(
    (item) => item.approved === 1,
  );
  if (approved.length === 0) {
    return fail(
      "Approve at least one extracted item first. Nothing is published without review.",
    );
  }

  const counts = publishSyllabus(syllabus.id, courseId);
  revalidatePath(`/professor/courses/${courseId}`, "layout");

  const parts = [
    counts.objectives && `${counts.objectives} learning objective(s)`,
    counts.modules && `${counts.modules} module(s)`,
    counts.assessments && `${counts.assessments} assessment(s)`,
    counts.readings && `${counts.readings} reading(s)`,
  ].filter(Boolean);

  return ok(
    parts.length > 0
      ? `Published into the course structure: ${parts.join(", ")}.`
      : "Everything approved was already present in the course — nothing new to add.",
  );
}

// Materials ------------------------------------------------------------------

const materialSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().trim().min(3, "Give the material a title."),
  description: optionalText,
  contentType: z.enum(CONTENT_TYPES),
  moduleId: optionalText,
  url: optionalText,
  fileName: optionalText,
  dateLabel: optionalText,
  visibility: z.enum(VISIBILITIES),
  professorNotes: optionalText,
  studentInstructions: optionalText,
});

export async function createMaterialAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  requireProfessor();

  const parsed = materialSchema.safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    description: formData.get("description"),
    contentType: formData.get("contentType"),
    moduleId: formData.get("moduleId"),
    url: formData.get("url"),
    fileName: formData.get("fileName"),
    dateLabel: formData.get("dateLabel"),
    visibility: formData.get("visibility"),
    professorNotes: formData.get("professorNotes"),
    studentInstructions: formData.get("studentInstructions"),
  });

  if (!parsed.success) return fail(firstIssue(parsed.error));
  const data = parsed.data;

  if (data.url) {
    try {
      const parsedUrl = new URL(data.url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return fail("Links must start with http:// or https://.");
      }
    } catch {
      return fail("That does not look like a valid URL.");
    }
  }

  if (!data.url && !data.fileName) {
    return fail(
      "Add either a link or a filename. This prototype stores file metadata only — no file is uploaded.",
    );
  }

  createMaterial({
    courseId: data.courseId,
    moduleId: data.moduleId,
    title: data.title,
    description: data.description,
    contentType: data.contentType,
    url: data.url,
    fileName: data.fileName,
    storageAdapter: data.fileName ? "local-metadata-only" : null,
    dateLabel: data.dateLabel,
    visibility: data.visibility,
    professorNotes: data.professorNotes,
    studentInstructions: data.studentInstructions,
    objectiveIds: formData.getAll("objectiveIds").map(String).filter(Boolean),
    conceptIds: formData.getAll("conceptIds").map(String).filter(Boolean),
  });

  revalidatePath(`/professor/courses/${data.courseId}/content`);
  return ok(
    data.fileName
      ? `"${data.title}" added. Filename and size are recorded; no file was uploaded because storage is not configured.`
      : `"${data.title}" added.`,
  );
}

export async function setMaterialVisibilityAction(formData: FormData) {
  requireProfessor();
  const materialId = String(formData.get("materialId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const visibility = formData.get("visibility");
  const parsed = z.enum(VISIBILITIES).safeParse(visibility);
  if (!parsed.success) return;
  setMaterialVisibility(materialId, parsed.data);
  revalidatePath(`/professor/courses/${courseId}/content`);
}

export async function deleteMaterialAction(formData: FormData) {
  requireProfessor();
  const materialId = String(formData.get("materialId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  deleteMaterial(materialId);
  revalidatePath(`/professor/courses/${courseId}/content`);
}

// Lectures -------------------------------------------------------------------

const lectureSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().trim().min(3, "Give the lecture a title."),
  description: optionalText,
  moduleId: optionalText,
  deliveryMode: z.enum(DELIVERY_MODES),
  status: z.enum(LECTURE_STATUSES),
  scheduledAt: optionalText,
  durationMinutes: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine(
      (v) => v === null || (Number.isFinite(v) && v > 0 && v <= 600),
      "Duration must be between 1 and 600 minutes.",
    ),
  videoUrl: optionalText,
  liveUrl: optionalText,
  teachingNotes: optionalText,
  studentNotes: optionalText,
  transcriptText: optionalText,
});

export async function createLectureAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  requireProfessor();

  const parsed = lectureSchema.safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    description: formData.get("description"),
    moduleId: formData.get("moduleId"),
    deliveryMode: formData.get("deliveryMode"),
    status: formData.get("status"),
    scheduledAt: formData.get("scheduledAt"),
    durationMinutes: formData.get("durationMinutes"),
    videoUrl: formData.get("videoUrl"),
    liveUrl: formData.get("liveUrl"),
    teachingNotes: formData.get("teachingNotes"),
    studentNotes: formData.get("studentNotes"),
    transcriptText: formData.get("transcriptText"),
  });

  if (!parsed.success) return fail(firstIssue(parsed.error));
  const data = parsed.data;

  for (const [label, value] of [
    ["recording link", data.videoUrl],
    ["live link", data.liveUrl],
  ] as const) {
    if (!value) continue;
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    } catch {
      return fail(`The ${label} must be a valid http:// or https:// URL.`);
    }
  }

  // Segments: one per line as "mm:ss | Heading | optional body".
  const segments = lines(formData.get("segments")).map((line, index) => {
    const [clock, heading, body] = line.split("|").map((part) => part.trim());
    return {
      startSeconds: parseClock(clock ?? "") ?? index * 300,
      heading: heading || clock || `Section ${index + 1}`,
      body: body || null,
    };
  });

  // Comprehension questions: "Prompt || correct option || wrong || wrong".
  const comprehensionQuestions = lines(formData.get("questions")).map((line) => {
    const parts = line.split("||").map((part) => part.trim()).filter(Boolean);
    const [prompt, ...options] = parts;
    return {
      prompt,
      options: options.map((text, index) => ({ text, isCorrect: index === 0 })),
      objectiveId: null as string | null,
    };
  });

  const badQuestion = comprehensionQuestions.find(
    (question) => !question.prompt || question.options.length < 2,
  );
  if (badQuestion) {
    return fail(
      "Each comprehension question needs a prompt and at least two options, separated by ||. The first option is treated as correct.",
    );
  }

  const objectiveIds = formData
    .getAll("objectiveIds")
    .map(String)
    .filter(Boolean);

  // Attach every question to the first selected objective so the readiness engine
  // has something to attribute the answer to.
  const primaryObjective = objectiveIds[0] ?? null;
  for (const question of comprehensionQuestions) {
    question.objectiveId = primaryObjective;
  }

  const scripture = lines(formData.get("scripture")).map((line) => {
    const [reference, note] = line.split("|").map((part) => part.trim());
    return { reference, note: note || null };
  });

  const concepts = lines(formData.get("concepts")).map((line) => {
    const [name, definition] = line.split("|").map((part) => part.trim());
    return { name, definition: definition || null };
  });

  const lectureId = createLecture({
    courseId: data.courseId,
    moduleId: data.moduleId,
    title: data.title,
    description: data.description,
    scheduledAt: data.scheduledAt,
    durationMinutes: data.durationMinutes,
    deliveryMode: data.deliveryMode,
    status: data.status,
    videoUrl: data.videoUrl,
    liveUrl: data.liveUrl,
    teachingNotes: data.teachingNotes,
    studentNotes: data.studentNotes,
    transcriptText: data.transcriptText,
    objectiveIds,
    segments,
    scripture,
    concepts,
    comprehensionQuestions,
  });

  recordActivity({
    courseId: data.courseId,
    actorRole: "professor",
    type: data.status === "draft" ? "drafted_lecture" : "published_lecture",
    summary: `${data.status === "draft" ? "Drafted" : "Published"} "${data.title}"`,
  });

  revalidatePath(`/professor/courses/${data.courseId}`, "layout");
  redirect(`/professor/courses/${data.courseId}/content?lecture=${lectureId}`);
}

export async function setLectureStatusAction(formData: FormData) {
  requireProfessor();
  const lectureId = String(formData.get("lectureId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const parsed = z.enum(LECTURE_STATUSES).safeParse(formData.get("status"));
  if (!parsed.success) return;

  const lecture = getLecture(lectureId);
  if (!lecture) return;

  setLectureStatus(lectureId, parsed.data);
  recordActivity({
    courseId,
    lectureId,
    actorRole: "professor",
    type: `lecture_${parsed.data}`,
    summary:
      parsed.data === "live"
        ? `Started the live session for "${lecture.title}"`
        : parsed.data === "ended"
          ? `Ended the live session for "${lecture.title}"`
          : `Set "${lecture.title}" to ${parsed.data}`,
  });

  revalidatePath(`/professor/courses/${courseId}`, "layout");
  revalidatePath(`/student/${courseId}`, "layout");
}

export async function setCurrentTopicAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  requireProfessor();
  const lectureId = String(formData.get("lectureId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const topic = String(formData.get("topic") ?? "").trim();

  if (!topic) return fail("Enter the topic you are on so students can follow.");

  setCurrentTopic(lectureId, topic);
  revalidatePath(`/professor/courses/${courseId}/lectures/${lectureId}/live`);
  revalidatePath(`/student/${courseId}/lecture/${lectureId}`);
  return ok(`Students now see: "${topic}".`);
}

export async function setInteractionPublishedAction(formData: FormData) {
  requireProfessor();
  const interactionId = String(formData.get("interactionId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const lectureId = String(formData.get("lectureId") ?? "");
  setInteractionPublished(interactionId, formData.get("published") === "1");
  revalidatePath(`/professor/courses/${courseId}/lectures/${lectureId}/live`);
  revalidatePath(`/student/${courseId}/lecture/${lectureId}`);
}

// Questions ------------------------------------------------------------------

export async function answerQuestionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { professor } = requireProfessor();
  const questionId = String(formData.get("questionId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (body.length < 3) return fail("Write an answer before submitting.");

  answerQuestion(questionId, professor.id, body);
  recordActivity({
    courseId,
    actorRole: "professor",
    type: "answered_question",
    summary: "Answered a student question",
  });

  revalidatePath(`/professor/courses/${courseId}`, "layout");
  revalidatePath(`/student/${courseId}`, "layout");
  return ok("Answer posted. The student sees it on the lecture page.");
}

export async function setQuestionStatusAction(formData: FormData) {
  requireProfessor();
  const questionId = String(formData.get("questionId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const parsed = z.enum(QUESTION_STATUSES).safeParse(formData.get("status"));
  if (!parsed.success) return;
  setQuestionStatus(questionId, parsed.data);
  revalidatePath(`/professor/courses/${courseId}`, "layout");
  revalidatePath(`/student/${courseId}`, "layout");
}

// Assessments ----------------------------------------------------------------

const assessmentSchema = z.object({
  courseId: z.string().min(1),
  type: z.enum(ASSESSMENT_TYPES),
  title: z.string().trim().min(3, "Give the assessment a title."),
  description: optionalText,
  scheduledAt: optionalText,
  weightLabel: optionalText,
  professorGuidance: optionalText,
  studyResources: optionalText,
});

export async function createAssessmentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  requireProfessor();

  const parsed = assessmentSchema.safeParse({
    courseId: formData.get("courseId"),
    type: formData.get("type"),
    title: formData.get("title"),
    description: formData.get("description"),
    scheduledAt: formData.get("scheduledAt"),
    weightLabel: formData.get("weightLabel"),
    professorGuidance: formData.get("professorGuidance"),
    studyResources: formData.get("studyResources"),
  });

  if (!parsed.success) return fail(firstIssue(parsed.error));
  const data = parsed.data;

  const questions = lines(formData.get("questions")).map((line) => {
    const parts = line.split("||").map((part) => part.trim()).filter(Boolean);
    const [prompt, ...options] = parts;
    return {
      type:
        options.length === 0
          ? ("short_answer" as const)
          : options.length === 2 &&
              options.every((o) => /^(true|false)$/i.test(o))
            ? ("true_false" as const)
            : ("multiple_choice" as const),
      prompt,
      objectiveId: formData.getAll("objectiveIds").map(String)[0] ?? null,
      options: options.map((text, index) => ({
        text,
        isCorrect: index === 0,
      })),
    };
  });

  if (questions.some((question) => !question.prompt)) {
    return fail("Every question line needs a prompt.");
  }

  const assessmentId = createAssessment({
    courseId: data.courseId,
    type: data.type,
    title: data.title,
    description: data.description,
    scheduledAt: data.scheduledAt,
    weightLabel: data.weightLabel,
    professorGuidance: data.professorGuidance,
    studyResources: data.studyResources,
    isPractice: formData.get("isPractice") === "on",
    objectiveIds: formData.getAll("objectiveIds").map(String).filter(Boolean),
    lectureIds: formData.getAll("lectureIds").map(String).filter(Boolean),
    questions,
  });

  revalidatePath(`/professor/courses/${data.courseId}`, "layout");
  revalidatePath(`/student/${data.courseId}`, "layout");
  void assessmentId;
  return ok(
    `"${data.title}" created with ${questions.length} question(s). Short-answer responses are stored for you to read, never auto-marked.`,
  );
}

/** Drafts comprehension questions from a lecture, for professor review. */
export async function generateLectureQuestionsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  requireProfessor();
  const courseId = String(formData.get("courseId") ?? "");
  const lectureId = String(formData.get("lectureId") ?? "");

  const course = getCourse(courseId);
  const lecture = getLecture(lectureId);
  if (!course || !lecture) return fail("That lecture no longer exists.");

  const provider = getAIProvider();
  const result = await provider.generateQuestions(
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
    5,
  );

  saveArtifact({
    result,
    kind: "question_drafts",
    courseId,
    lectureId,
    title: `Question drafts — ${lecture.title}`,
  });

  revalidatePath(`/professor/courses/${courseId}/assessments`);
  return ok(
    `${result.data.length} draft question(s) generated for review. Nothing was added to an assessment — drafts need your edits first.`,
  );
}

/** Generates a course-wide study guide draft for professor review. */
export async function generateStudyGuideAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  requireProfessor();
  const courseId = String(formData.get("courseId") ?? "");
  const assessmentId = String(formData.get("assessmentId") ?? "");

  const course = getCourse(courseId);
  if (!course) return fail("That course no longer exists.");
  const assessment = assessmentId ? getAssessment(assessmentId) : null;

  const provider = getAIProvider();
  const result = await provider.generateStudyGuide({
    courseTitle: course.title,
    focus: assessment?.title ?? course.title,
    objectives: listObjectives(courseId).map((o) => ({
      code: o.code,
      text: o.text,
    })),
    concepts: listConcepts(courseId).map((c) => ({
      name: c.name,
      definition: c.definition,
    })),
    segments: [],
    studentNoteExcerpts: [],
  });

  saveArtifact({
    result,
    kind: "study_guide",
    courseId,
    title: result.data.title,
  });

  revalidatePath(`/professor/courses/${courseId}/assessments`);
  return ok(
    "Study guide draft created. Review and edit it before publishing anything to students.",
  );
}

// Students -------------------------------------------------------------------

export async function setStatusOverrideAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { professor } = requireProfessor();
  const courseId = String(formData.get("courseId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const parsed = z.enum(READINESS_STATUSES).safeParse(formData.get("status"));

  if (!parsed.success) return fail("Choose a status.");
  if (reason.length < 10) {
    return fail(
      "Explain why you are setting this status. The explanation is shown wherever the status appears.",
    );
  }

  setStatusOverride({
    courseId,
    studentId,
    professorId: professor.id,
    status: parsed.data,
    reason,
  });

  revalidatePath(`/professor/courses/${courseId}`, "layout");
  revalidatePath(`/student/${courseId}`, "layout");
  return ok("Status set manually. Your explanation is shown alongside it.");
}

export async function clearStatusOverrideAction(formData: FormData) {
  requireProfessor();
  const courseId = String(formData.get("courseId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  clearStatusOverride(courseId, studentId);
  revalidatePath(`/professor/courses/${courseId}`, "layout");
  revalidatePath(`/student/${courseId}`, "layout");
}

export async function createProfessorNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { professor } = requireProfessor();
  const courseId = String(formData.get("courseId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (body.length < 5) return fail("Write a note before saving.");

  createProfessorNote({
    professorId: professor.id,
    courseId,
    studentId,
    body,
  });

  revalidatePath(`/professor/courses/${courseId}/students/${studentId}`);
  return ok("Note saved. Professor notes are visible to you, not to the student.");
}

export async function setFollowUpAction(formData: FormData) {
  requireProfessor();
  const noteId = String(formData.get("noteId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const parsed = z.enum(FOLLOW_UP_STATUSES).safeParse(formData.get("status"));
  if (!parsed.success) return;
  setFollowUpStatus(noteId, parsed.data);
  revalidatePath(`/professor/courses/${courseId}/students/${studentId}`);
}

// Support --------------------------------------------------------------------

/** Persists the current computed plan for one student. */
export async function syncRecommendationsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  requireProfessor();
  const courseId = String(formData.get("courseId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");

  const readiness = readinessFor(courseId, studentId);
  const { created } = syncRecommendations(courseId, studentId, readiness);

  revalidatePath(`/professor/courses/${courseId}`, "layout");
  revalidatePath(`/student/${courseId}`, "layout");

  return ok(
    created === 0
      ? "No new recommendations — everything the model suggests is already on this student's plan."
      : `${created} recommendation(s) added to this student's support plan.`,
  );
}

/** Assigns one specific drafted recommendation. */
export async function assignRecommendationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { professor } = requireProfessor();
  const courseId = String(formData.get("courseId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const index = Number(formData.get("index") ?? -1);

  const readiness = readinessFor(courseId, studentId);
  const drafts = draftRecommendations(courseId, readiness);
  const draft = drafts[index];

  if (!draft) {
    return fail("That recommendation is no longer in the current plan. Refresh and try again.");
  }

  saveRecommendation({
    ...draft,
    courseId,
    studentId,
    source: "professor",
    createdBy: professor.id,
  });

  revalidatePath(`/professor/courses/${courseId}`, "layout");
  revalidatePath(`/student/${courseId}`, "layout");
  return ok(`Assigned: ${draft.title}. The student sees it on their support plan.`);
}

const customRecommendationSchema = z.object({
  courseId: z.string().min(1),
  studentId: z.string().min(1),
  pathway: z.enum(SUPPORT_PATHWAYS),
  priority: z.enum(PRIORITIES),
  title: z.string().trim().min(5, "Give the recommendation a clear title."),
  rationale: z
    .string()
    .trim()
    .min(10, "Say why you are recommending this — the student sees this text."),
  nextStep: z
    .string()
    .trim()
    .min(10, "Describe the concrete next step the student should take."),
});

export async function createCustomRecommendationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { professor } = requireProfessor();

  const parsed = customRecommendationSchema.safeParse({
    courseId: formData.get("courseId"),
    studentId: formData.get("studentId"),
    pathway: formData.get("pathway"),
    priority: formData.get("priority"),
    title: formData.get("title"),
    rationale: formData.get("rationale"),
    nextStep: formData.get("nextStep"),
  });

  if (!parsed.success) return fail(firstIssue(parsed.error));
  const data = parsed.data;

  saveRecommendation({
    courseId: data.courseId,
    studentId: data.studentId,
    pathway: data.pathway,
    priority: data.priority,
    title: data.title,
    rationale: data.rationale,
    nextStep: data.nextStep,
    objectiveId: (formData.get("objectiveId") as string) || null,
    conceptId: null,
    lectureId: (formData.get("lectureId") as string) || null,
    materialId: (formData.get("materialId") as string) || null,
    position: 0,
    source: "professor",
    createdBy: professor.id,
  });

  revalidatePath(`/professor/courses/${data.courseId}`, "layout");
  revalidatePath(`/student/${data.courseId}`, "layout");
  return ok("Recommendation added to the student's support plan.");
}

export async function professorRespondAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { professor } = requireProfessor();
  const courseId = String(formData.get("courseId") ?? "");
  const recommendationId = String(formData.get("recommendationId") ?? "");
  const response = String(formData.get("response") ?? "").trim();

  if (response.length < 3) return fail("Write a response before submitting.");

  professorRespondToRecommendation({
    recommendationId,
    professorName: professor.name,
    response,
  });

  revalidatePath(`/professor/courses/${courseId}`, "layout");
  revalidatePath(`/student/${courseId}`, "layout");
  return ok("Response added. The student sees it on their support plan.");
}

export async function setSupportRequestStatusAction(formData: FormData) {
  requireProfessor();
  const requestId = String(formData.get("requestId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const parsed = z
    .enum(["submitted", "acknowledged", "scheduled", "closed"])
    .safeParse(formData.get("status"));
  if (!parsed.success) return;
  setSupportRequestStatus(requestId, parsed.data);
  revalidatePath(`/professor/courses/${courseId}/support`);
  revalidatePath(`/student/${courseId}/support`);
}
