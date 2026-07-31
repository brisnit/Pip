/**
 * Row shapes as they come back from SQLite.
 *
 * SQLite has no boolean type, so `0 | 1` columns are typed as `number` and
 * converted at the edges rather than pretended away.
 */
import type {
  AssessmentQuestionType,
  AssessmentType,
  ContentType,
  CourseFormat,
  CourseImageTheme,
  DeliveryMode,
  EntrySource,
  FollowUpStatus,
  InteractionType,
  LectureStatus,
  Marker,
  NoteKind,
  Priority,
  QuestionKind,
  QuestionStatus,
  ReadinessStatus,
  SupportPathway,
  SupportRequestKind,
  SupportStatus,
  SyllabusItemKind,
  Visibility,
} from "@/lib/domain/vocabulary";

export type ProfessorRow = {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  bio: string | null;
  is_demo: number;
  created_at: string;
  photo_url: string | null;
  department: string | null;
  office: string | null;
  phone: string | null;
  office_hours: string | null;
  academic_interests: string | null;
  research_areas: string | null;
  credentials: string | null;
  website: string | null;
  linkedin: string | null;
  teaching_philosophy: string | null;
  calendar_availability: string | null;
  profile_updated_at: string | null;
};

export type StudentRow = {
  id: string;
  name: string;
  email: string | null;
  student_id_number: string | null;
  is_demo: number;
  created_at: string;
  photo_url: string | null;
  preferred_name: string | null;
  legal_name: string | null;
  program: string | null;
  degree: string | null;
  year_of_study: string | null;
  expected_graduation: string | null;
  advisor: string | null;
  church: string | null;
  ministry: string | null;
  timezone: string | null;
  learning_preferences: string | null;
  accessibility_needs: string | null;
  notification_preferences: string | null;
  profile_updated_at: string | null;
};

export type CourseRow = {
  id: string;
  professor_id: string;
  title: string;
  code: string;
  description: string | null;
  term: string | null;
  meeting_days: string | null;
  meeting_time: string | null;
  location: string | null;
  format: CourseFormat;
  image_theme: CourseImageTheme;
  estimated_enrollment: number | null;
  start_date: string | null;
  end_date: string | null;
  is_demo: number;
  created_at: string;
  updated_at: string;
};

export type CourseCodeRow = {
  id: string;
  course_id: string;
  code: string;
  active: number;
  created_at: string;
};

export type ModuleRow = {
  id: string;
  course_id: string;
  position: number;
  title: string;
  description: string | null;
  week_label: string | null;
  created_at: string;
};

export type ObjectiveRow = {
  id: string;
  course_id: string;
  module_id: string | null;
  code: string;
  text: string;
  position: number;
  created_at: string;
};

export type ConceptRow = {
  id: string;
  course_id: string;
  name: string;
  definition: string | null;
  perspective: string | null;
  created_at: string;
};

export type SyllabusRow = {
  id: string;
  course_id: string;
  source_type: string;
  file_name: string | null;
  raw_text: string | null;
  extraction_state: "not_run" | "extracted" | "reviewed" | "published";
  extraction_note: string | null;
  provider_label: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  created_at: string;
};

export type SyllabusItemRow = {
  id: string;
  syllabus_id: string;
  kind: SyllabusItemKind;
  title: string;
  detail: string | null;
  week_label: string | null;
  date_label: string | null;
  position: number;
  ai_generated: number;
  approved: number;
  created_at: string;
};

export type MaterialRow = {
  id: string;
  course_id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  content_type: ContentType;
  url: string | null;
  file_name: string | null;
  file_size: number | null;
  storage_adapter: string | null;
  date_label: string | null;
  visibility: Visibility;
  professor_notes: string | null;
  student_instructions: string | null;
  position: number;
  is_demo: number;
  created_at: string;
};

export type LectureRow = {
  id: string;
  course_id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  scheduled_at: string | null;
  duration_minutes: number | null;
  delivery_mode: DeliveryMode;
  status: LectureStatus;
  video_provider: string | null;
  video_url: string | null;
  live_url: string | null;
  teaching_notes: string | null;
  student_notes: string | null;
  transcript_text: string | null;
  live_started_at: string | null;
  live_ended_at: string | null;
  current_topic: string | null;
  position: number;
  is_demo: number;
  created_at: string;
  updated_at: string;
};

export type SegmentRow = {
  id: string;
  lecture_id: string;
  position: number;
  start_seconds: number;
  end_seconds: number | null;
  heading: string;
  body: string | null;
  transcript_excerpt: string | null;
  created_at: string;
};

export type SlideRow = {
  id: string;
  lecture_id: string;
  position: number;
  title: string;
  notes: string | null;
  created_at: string;
};

export type ScriptureRow = {
  id: string;
  course_id: string;
  lecture_id: string | null;
  segment_id: string | null;
  reference: string;
  note: string | null;
  created_at: string;
};

export type InteractionRow = {
  id: string;
  lecture_id: string;
  type: InteractionType;
  prompt: string;
  body: string | null;
  explanation: string | null;
  at_seconds: number | null;
  segment_id: string | null;
  slide_id: string | null;
  concept_id: string | null;
  objective_id: string | null;
  position: number;
  published: number;
  published_at: string | null;
  ai_generated: number;
  created_at: string;
};

export type InteractionOptionRow = {
  id: string;
  interaction_id: string;
  position: number;
  text: string;
  is_correct: number;
};

export type InteractionResponseRow = {
  id: string;
  interaction_id: string;
  student_id: string;
  option_id: string | null;
  text_response: string | null;
  confidence: number | null;
  is_correct: number | null;
  created_at: string;
};

export type NoteRow = {
  id: string;
  student_id: string;
  course_id: string;
  lecture_id: string | null;
  module_id: string | null;
  segment_id: string | null;
  concept_id: string | null;
  objective_id: string | null;
  assessment_id: string | null;
  kind: NoteKind;
  title: string | null;
  body: string;
  at_seconds: number | null;
  transcript_excerpt: string | null;
  scripture_reference: string | null;
  shared_with_professor: number;
  is_demo: number;
  created_at: string;
  updated_at: string;
};

export type BookmarkRow = {
  id: string;
  student_id: string;
  course_id: string;
  lecture_id: string;
  segment_id: string | null;
  at_seconds: number;
  label: string | null;
  transcript_excerpt: string | null;
  created_at: string;
};

export type MarkerRow = {
  id: string;
  student_id: string;
  course_id: string;
  lecture_id: string | null;
  segment_id: string | null;
  concept_id: string | null;
  objective_id: string | null;
  marker: Marker;
  at_seconds: number | null;
  transcript_excerpt: string | null;
  note: string | null;
  created_at: string;
};

export type ConfidenceRow = {
  id: string;
  student_id: string;
  course_id: string;
  lecture_id: string | null;
  objective_id: string | null;
  concept_id: string | null;
  level: number;
  context: string | null;
  created_at: string;
};

export type QuestionRow = {
  id: string;
  student_id: string;
  course_id: string;
  lecture_id: string | null;
  segment_id: string | null;
  concept_id: string | null;
  objective_id: string | null;
  kind: QuestionKind;
  body: string;
  at_seconds: number | null;
  transcript_excerpt: string | null;
  status: QuestionStatus;
  anonymous: number;
  is_demo: number;
  created_at: string;
};

export type AssessmentRow = {
  id: string;
  course_id: string;
  type: AssessmentType;
  title: string;
  description: string | null;
  scheduled_at: string | null;
  weight_label: string | null;
  professor_guidance: string | null;
  study_resources: string | null;
  is_practice: number;
  published: number;
  is_demo: number;
  created_at: string;
};

export type AssessmentQuestionRow = {
  id: string;
  assessment_id: string;
  position: number;
  type: AssessmentQuestionType;
  prompt: string;
  explanation: string | null;
  objective_id: string | null;
  concept_id: string | null;
  ai_generated: number;
  created_at: string;
};

export type AssessmentOptionRow = {
  id: string;
  question_id: string;
  position: number;
  text: string;
  is_correct: number;
};

export type AssessmentResponseRow = {
  id: string;
  assessment_id: string;
  question_id: string;
  student_id: string;
  option_id: string | null;
  text_response: string | null;
  is_correct: number | null;
  confidence: number | null;
  created_at: string;
};

export type SnapshotRow = {
  id: string;
  student_id: string;
  course_id: string;
  status: ReadinessStatus;
  score: number | null;
  confidence_level: string;
  evidence_count: number;
  computed_at: string;
};

export type OverrideRow = {
  id: string;
  student_id: string;
  course_id: string;
  status: ReadinessStatus;
  reason: string;
  set_by: string;
  created_at: string;
  cleared_at: string | null;
};

export type RecommendationRow = {
  id: string;
  course_id: string;
  student_id: string;
  objective_id: string | null;
  concept_id: string | null;
  lecture_id: string | null;
  material_id: string | null;
  pathway: SupportPathway;
  title: string;
  rationale: string;
  next_step: string;
  priority: Priority;
  source: "system" | "professor";
  created_by: string | null;
  status: SupportStatus;
  student_response: string | null;
  student_responded_at: string | null;
  professor_response: string | null;
  completed_at: string | null;
  position: number;
  is_demo: number;
  created_at: string;
};

export type SupportRequestRow = {
  id: string;
  recommendation_id: string | null;
  course_id: string;
  student_id: string;
  kind: SupportRequestKind;
  topics: string | null;
  preferred_time: string | null;
  message: string | null;
  prep_summary: string | null;
  status: "submitted" | "acknowledged" | "scheduled" | "closed";
  created_at: string;
};

export type SupportActionRow = {
  id: string;
  recommendation_id: string | null;
  request_id: string | null;
  actor_role: "student" | "professor" | "system" | "teaching_assistant";
  actor_name: string | null;
  action: string;
  note: string | null;
  created_at: string;
};

export type ProfessorNoteRow = {
  id: string;
  professor_id: string;
  course_id: string;
  student_id: string;
  body: string;
  follow_up_status: FollowUpStatus;
  resolved_at: string | null;
  created_at: string;
};

export type ActivityRow = {
  id: string;
  course_id: string;
  student_id: string | null;
  lecture_id: string | null;
  actor_role: string;
  type: string;
  summary: string;
  created_at: string;
};

export type EntryRow = {
  id: string;
  course_id: string;
  student_id: string;
  source: EntrySource;
  consent_at: string | null;
  joined_at: string;
};

export type AiArtifactRow = {
  id: string;
  course_id: string | null;
  lecture_id: string | null;
  student_id: string | null;
  kind: string;
  provider_id: string;
  provider_label: string;
  is_simulated: number;
  title: string | null;
  content: string;
  source_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved: number;
  created_at: string;
};

export const bool = (v: number | null | undefined): boolean => v === 1;
export const flag = (v: boolean): number => (v ? 1 : 0);
