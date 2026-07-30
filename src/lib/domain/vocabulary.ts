/**
 * Shared vocabulary: the closed sets of values stored in the database, plus the
 * human-facing labels for each.
 *
 * Language rule for this product: nothing here describes a student as failing,
 * behind, or at fault. Statuses describe what the *system observed* and what
 * *support* is suggested — never a verdict about the person.
 */

// Readiness ------------------------------------------------------------------

export const READINESS_STATUSES = [
  "on_track",
  "needs_review",
  "support_recommended",
  "insufficient_data",
] as const;

export type ReadinessStatus = (typeof READINESS_STATUSES)[number];

type StatusPresentation = {
  /** Short label used in tables and pills. */
  label: string;
  /** Sentence shown to a student about themselves. */
  studentSentence: string;
  /** Sentence shown to a professor about a student. */
  professorSentence: string;
  /** Traffic-light band, for documentation and legends. */
  band: "green" | "yellow" | "red" | "grey";
  /** Non-colour redundant cue. Rendered as text, not as an image. */
  glyph: string;
  /** Accessible description of the glyph. */
  glyphLabel: string;
};

export const READINESS_PRESENTATION: Record<ReadinessStatus, StatusPresentation> =
  {
    on_track: {
      label: "On track",
      studentSentence:
        "Your work so far shows solid understanding of this material.",
      professorSentence:
        "Demonstrating adequate understanding and participation.",
      band: "green",
      glyph: "●",
      glyphLabel: "Filled circle: on track",
    },
    needs_review: {
      label: "Needs review",
      studentSentence:
        "A few topics look worth revisiting before the next assessment.",
      professorSentence:
        "Some gaps, low confidence, or uneven comprehension signals.",
      band: "yellow",
      glyph: "◐",
      glyphLabel: "Half-filled circle: needs review",
    },
    support_recommended: {
      label: "Support recommended",
      studentSentence:
        "It would help to work through this material with someone.",
      professorSentence:
        "Repeated gaps or an explicit request for help. Worth following up.",
      band: "red",
      glyph: "◆",
      glyphLabel: "Diamond: support recommended",
    },
    insufficient_data: {
      label: "Not enough information yet",
      studentSentence:
        "There isn't enough activity yet to say anything useful about your readiness.",
      professorSentence:
        "Not enough activity recorded to estimate readiness.",
      band: "grey",
      glyph: "○",
      glyphLabel: "Open circle: not enough information yet",
    },
  };

export const CONFIDENCE_LEVELS = ["low", "moderate", "high"] as const;
export type EstimateConfidence = (typeof CONFIDENCE_LEVELS)[number];

export const CONFIDENCE_COPY: Record<EstimateConfidence, string> = {
  low: "Low confidence — based on very little activity. Treat as a prompt to look closer, not a conclusion.",
  moderate:
    "Moderate confidence — based on a partial picture of this student's activity.",
  high: "Higher confidence — based on several independent signals across the course.",
};

// Course ---------------------------------------------------------------------

export const COURSE_FORMATS = [
  "in_person",
  "online",
  "hybrid",
  "intensive",
  "seminar",
  "lecture",
  "practicum",
] as const;
export type CourseFormat = (typeof COURSE_FORMATS)[number];

export const COURSE_FORMAT_LABELS: Record<CourseFormat, string> = {
  in_person: "In person",
  online: "Online",
  hybrid: "Hybrid",
  intensive: "Intensive",
  seminar: "Seminar",
  lecture: "Lecture",
  practicum: "Practicum",
};

export const COURSE_IMAGE_THEMES = [
  "parchment",
  "burgundy",
  "slate",
  "olive",
] as const;
export type CourseImageTheme = (typeof COURSE_IMAGE_THEMES)[number];

export const COURSE_IMAGE_THEME_LABELS: Record<CourseImageTheme, string> = {
  parchment: "Parchment",
  burgundy: "Burgundy",
  slate: "Slate",
  olive: "Olive",
};

// Materials ------------------------------------------------------------------

export const CONTENT_TYPES = [
  "syllabus",
  "lecture_notes",
  "teaching_notes",
  "slide_deck",
  "pdf",
  "reading_assignment",
  "scripture_reference",
  "book_chapter",
  "journal_article",
  "study_guide",
  "review_sheet",
  "assignment_instructions",
  "recorded_lecture",
  "live_lecture_link",
  "audio_recording",
  "supplemental_video",
  "external_website",
  "discussion_prompt",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  syllabus: "Syllabus",
  lecture_notes: "Lecture notes",
  teaching_notes: "Teaching notes",
  slide_deck: "Slide deck",
  pdf: "PDF",
  reading_assignment: "Reading assignment",
  scripture_reference: "Scripture reference",
  book_chapter: "Book chapter",
  journal_article: "Journal article",
  study_guide: "Study guide",
  review_sheet: "Review sheet",
  assignment_instructions: "Assignment instructions",
  recorded_lecture: "Recorded lecture",
  live_lecture_link: "Live lecture link",
  audio_recording: "Audio recording",
  supplemental_video: "Supplemental video",
  external_website: "External website",
  discussion_prompt: "Discussion prompt",
};

/** Content types whose primary payload is a URL rather than a file. */
export const URL_CONTENT_TYPES: ContentType[] = [
  "recorded_lecture",
  "live_lecture_link",
  "supplemental_video",
  "external_website",
  "journal_article",
  "audio_recording",
];

/** Content types where "teaching notes" visibility is the sensible default. */
export const PROFESSOR_ONLY_CONTENT_TYPES: ContentType[] = ["teaching_notes"];

export const VISIBILITIES = ["students", "professor_only", "draft"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  students: "Visible to students",
  professor_only: "Professor only",
  draft: "Draft — not yet visible",
};

// Lectures -------------------------------------------------------------------

export const DELIVERY_MODES = ["recorded", "live", "hybrid"] as const;
export type DeliveryMode = (typeof DELIVERY_MODES)[number];

export const DELIVERY_MODE_LABELS: Record<DeliveryMode, string> = {
  recorded: "Recorded",
  live: "Live",
  hybrid: "Live + recorded",
};

export const LECTURE_STATUSES = [
  "draft",
  "scheduled",
  "live",
  "ended",
  "published",
] as const;
export type LectureStatus = (typeof LECTURE_STATUSES)[number];

export const LECTURE_STATUS_LABELS: Record<LectureStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  live: "Live now",
  ended: "Lecture ended",
  published: "Published",
};

// Interactive moments --------------------------------------------------------

export const INTERACTION_TYPES = [
  "reflection_question",
  "comprehension_question",
  "poll",
  "important_concept",
  "scripture_reference",
  "definition",
  "discussion_prompt",
  "application_question",
  "historical_context",
  "theological_perspective",
  "recommended_reading",
  "exam_emphasis",
  "pause_and_reflect",
  "ask_a_question",
  "confidence_rating",
] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number];

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  reflection_question: "Reflection question",
  comprehension_question: "Comprehension question",
  poll: "Poll",
  important_concept: "Important concept",
  scripture_reference: "Scripture reference",
  definition: "Definition",
  discussion_prompt: "Discussion prompt",
  application_question: "Application question",
  historical_context: "Historical context",
  theological_perspective: "Theological perspective",
  recommended_reading: "Recommended reading",
  exam_emphasis: "Exam emphasis",
  pause_and_reflect: "Pause and reflect",
  ask_a_question: "Ask a question",
  confidence_rating: "Confidence rating",
};

/** Interaction types that produce a scoreable response. */
export const SCORED_INTERACTION_TYPES: InteractionType[] = [
  "comprehension_question",
];

/** Interaction types that ask for a written response. */
export const WRITTEN_INTERACTION_TYPES: InteractionType[] = [
  "reflection_question",
  "application_question",
  "discussion_prompt",
  "pause_and_reflect",
];

/** Interaction types that are informational only — no response expected. */
export const INFORMATIONAL_INTERACTION_TYPES: InteractionType[] = [
  "important_concept",
  "scripture_reference",
  "definition",
  "historical_context",
  "theological_perspective",
  "recommended_reading",
  "exam_emphasis",
];

// Notes ----------------------------------------------------------------------

export const NOTE_KINDS = [
  "free_form",
  "timestamped",
  "scripture",
  "quote",
  "question",
  "key_concept",
  "reflection",
  "ministry_application",
  "exam_review",
  "action_item",
] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

export const NOTE_KIND_LABELS: Record<NoteKind, string> = {
  free_form: "Note",
  timestamped: "Timestamped note",
  scripture: "Scripture note",
  quote: "Quote",
  question: "Question",
  key_concept: "Key concept",
  reflection: "Personal reflection",
  ministry_application: "Ministry application",
  exam_review: "Exam review",
  action_item: "Action item",
};

// Markers --------------------------------------------------------------------

export const MARKERS = [
  "clear",
  "confusing",
  "important",
  "exam_likely",
] as const;
export type Marker = (typeof MARKERS)[number];

export const MARKER_LABELS: Record<Marker, string> = {
  clear: "This is clear",
  confusing: "This is confusing",
  important: "Important",
  exam_likely: "Possible exam content",
};

export const MARKER_GLYPHS: Record<Marker, string> = {
  clear: "✓",
  confusing: "?",
  important: "★",
  exam_likely: "✎",
};

// Questions ------------------------------------------------------------------

export const QUESTION_KINDS = [
  "question",
  "request_example",
  "request_simpler",
  "connect_previous",
  "exam_check",
] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

export const QUESTION_KIND_LABELS: Record<QuestionKind, string> = {
  question: "Question",
  request_example: "Asked for an example",
  request_simpler: "Asked for a simpler explanation",
  connect_previous: "Connecting to an earlier lecture",
  exam_check: "Asked whether this is on the exam",
};

export const QUESTION_STATUSES = ["open", "answered", "addressed"] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export const QUESTION_STATUS_LABELS: Record<QuestionStatus, string> = {
  open: "Awaiting response",
  answered: "Answered",
  addressed: "Addressed in class",
};

// Assessments ----------------------------------------------------------------

export const ASSESSMENT_TYPES = [
  "quiz",
  "midterm",
  "final_exam",
  "oral_examination",
  "essay",
  "reflection_paper",
  "reading_assessment",
  "practice_test",
  "comprehension_check",
] as const;
export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

export const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  quiz: "Quiz",
  midterm: "Midterm",
  final_exam: "Final exam",
  oral_examination: "Oral examination",
  essay: "Essay",
  reflection_paper: "Reflection paper",
  reading_assessment: "Reading assessment",
  practice_test: "Practice test",
  comprehension_check: "Comprehension check",
};

/**
 * Assessment types this prototype deliberately does not attempt to score. Long
 * theological writing is read by a human; the app will not imply otherwise.
 */
export const HUMAN_GRADED_ASSESSMENT_TYPES: AssessmentType[] = [
  "essay",
  "reflection_paper",
  "oral_examination",
];

export const QUESTION_TYPES = [
  "multiple_choice",
  "true_false",
  "short_answer",
  "confidence_rating",
  "self_assessment",
] as const;
export type AssessmentQuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<AssessmentQuestionType, string> = {
  multiple_choice: "Multiple choice",
  true_false: "True or false",
  short_answer: "Short answer",
  confidence_rating: "Confidence rating",
  self_assessment: "Self-assessment",
};

/** Question types the prototype scores automatically. */
export const AUTO_SCORED_QUESTION_TYPES: AssessmentQuestionType[] = [
  "multiple_choice",
  "true_false",
];

// Support --------------------------------------------------------------------

export const SUPPORT_PATHWAYS = [
  "curriculum",
  "teaching_assistant",
  "tutoring",
  "office_hours",
  "peer_study",
] as const;
export type SupportPathway = (typeof SUPPORT_PATHWAYS)[number];

export const SUPPORT_PATHWAY_LABELS: Record<SupportPathway, string> = {
  curriculum: "Curriculum support",
  teaching_assistant: "Teaching-assistant support",
  tutoring: "Tutoring",
  office_hours: "Professor office visit",
  peer_study: "Peer study",
};

export const SUPPORT_PATHWAY_DESCRIPTIONS: Record<SupportPathway, string> = {
  curriculum:
    "Revisit a specific piece of course material — a lecture section, a reading, or a short practice set.",
  teaching_assistant:
    "Bring a specific question to the teaching assistant, or join a review session.",
  tutoring:
    "Work through the material with a tutor who receives a summary of the topics to cover.",
  office_hours:
    "Meet with the professor about a named set of topics, with a short preparation summary for both sides.",
  peer_study:
    "Work through a concept with classmates in a study group or discussion.",
};

export const SUPPORT_STATUSES = [
  "recommended",
  "accepted",
  "in_progress",
  "completed",
  "declined",
  "alternative_requested",
] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  recommended: "Recommended",
  accepted: "Accepted",
  in_progress: "In progress",
  completed: "Completed",
  declined: "Declined",
  alternative_requested: "Another option requested",
};

export const PRIORITIES = ["high", "medium", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: "Start here",
  medium: "Worth doing",
  low: "Optional",
};

export const SUPPORT_REQUEST_KINDS = [
  "teaching_assistant",
  "tutoring",
  "office_hours",
  "peer_study",
] as const;
export type SupportRequestKind = (typeof SUPPORT_REQUEST_KINDS)[number];

export const SUPPORT_REQUEST_KIND_LABELS: Record<SupportRequestKind, string> = {
  teaching_assistant: "Teaching-assistant question",
  tutoring: "Tutoring session",
  office_hours: "Office-hours meeting",
  peer_study: "Study group",
};

// Misc -----------------------------------------------------------------------

export const FOLLOW_UP_STATUSES = ["open", "complete"] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const SYLLABUS_ITEM_KINDS = [
  "description",
  "objective",
  "weekly_topic",
  "reading",
  "assignment",
  "exam",
  "important_date",
  "grading_category",
  "study_schedule",
] as const;
export type SyllabusItemKind = (typeof SYLLABUS_ITEM_KINDS)[number];

export const SYLLABUS_ITEM_KIND_LABELS: Record<SyllabusItemKind, string> = {
  description: "Course description",
  objective: "Learning objective",
  weekly_topic: "Weekly topic",
  reading: "Reading assignment",
  assignment: "Major assignment",
  exam: "Exam",
  important_date: "Important date",
  grading_category: "Grading category",
  study_schedule: "Recommended study schedule",
};

export const ENTRY_SOURCES = ["qr", "link", "code"] as const;
export type EntrySource = (typeof ENTRY_SOURCES)[number];

export const ENTRY_SOURCE_LABELS: Record<EntrySource, string> = {
  qr: "Scanned QR code",
  link: "Opened course link",
  code: "Entered course code",
};

/** Narrow an untrusted string to a member of a closed set, or return a fallback. */
export function oneOf<T extends readonly string[]>(
  values: T,
  input: unknown,
  fallback: T[number],
): T[number] {
  return typeof input === "string" && (values as readonly string[]).includes(input)
    ? (input as T[number])
    : fallback;
}
