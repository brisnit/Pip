/**
 * Prototype schema (SQLite).
 *
 * Kept as a TypeScript string rather than a .sql file so it is bundled with the
 * server build and needs no filesystem path resolution at runtime.
 *
 * Conventions
 * -----------
 * - Every table has a stable text `id` (see `newId`), not an autoincrement.
 * - Real relationships are real columns and real join tables. JSON is used only
 *   for genuinely free-form payloads, never to hold a relationship.
 * - Timestamps are ISO-8601 strings in UTC.
 * - `is_demo` marks seeded demonstration rows so the UI can label them.
 */
export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = /* sql */ `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- People -------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS professors (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  title      TEXT,
  email      TEXT,
  bio        TEXT,
  is_demo    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  email             TEXT,
  student_id_number TEXT,
  is_demo           INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL
);

-- Courses ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS courses (
  id                   TEXT PRIMARY KEY,
  professor_id         TEXT NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  code                 TEXT NOT NULL,
  description          TEXT,
  term                 TEXT,
  meeting_days         TEXT,
  meeting_time         TEXT,
  location             TEXT,
  format               TEXT NOT NULL DEFAULT 'in_person',
  image_theme          TEXT NOT NULL DEFAULT 'parchment',
  estimated_enrollment INTEGER,
  start_date           TEXT,
  end_date             TEXT,
  is_demo              INTEGER NOT NULL DEFAULT 0,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_courses_professor ON courses(professor_id);

-- Access codes are a separate table so a course can rotate or retire a code
-- without losing the audit trail of how students joined.
CREATE TABLE IF NOT EXISTS course_codes (
  id         TEXT PRIMARY KEY,
  course_id  TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  code       TEXT NOT NULL UNIQUE,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_course_codes_course ON course_codes(course_id);

CREATE TABLE IF NOT EXISTS modules (
  id          TEXT PRIMARY KEY,
  course_id   TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  week_label  TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(course_id, position);

CREATE TABLE IF NOT EXISTS learning_objectives (
  id         TEXT PRIMARY KEY,
  course_id  TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id  TEXT REFERENCES modules(id) ON DELETE SET NULL,
  code       TEXT NOT NULL,
  text       TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_objectives_course ON learning_objectives(course_id, position);

-- Named theological concepts / key terms / exam topics. One table, because in
-- practice professors reuse the same named concept as a term, a topic and an
-- exam emphasis.
CREATE TABLE IF NOT EXISTS concepts (
  id          TEXT PRIMARY KEY,
  course_id   TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  definition  TEXT,
  perspective TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_concepts_course ON concepts(course_id);

CREATE TABLE IF NOT EXISTS course_entries (
  id         TEXT PRIMARY KEY,
  course_id  TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  source     TEXT NOT NULL DEFAULT 'link',
  consent_at TEXT,
  joined_at  TEXT NOT NULL,
  UNIQUE (course_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_entries_course ON course_entries(course_id);

CREATE TABLE IF NOT EXISTS student_sessions (
  id           TEXT PRIMARY KEY,
  student_id   TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id    TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at   TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_student ON student_sessions(student_id);

-- Syllabus -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS syllabi (
  id               TEXT PRIMARY KEY,
  course_id        TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  source_type      TEXT NOT NULL DEFAULT 'pasted_text',
  file_name        TEXT,
  raw_text         TEXT,
  extraction_state TEXT NOT NULL DEFAULT 'not_run',
  extraction_note  TEXT,
  provider_label   TEXT,
  reviewed_at      TEXT,
  published_at     TEXT,
  created_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_syllabi_course ON syllabi(course_id);

-- One row per extracted fact so a professor can approve or edit individually.
CREATE TABLE IF NOT EXISTS syllabus_items (
  id           TEXT PRIMARY KEY,
  syllabus_id  TEXT NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL,
  title        TEXT NOT NULL,
  detail       TEXT,
  week_label   TEXT,
  date_label   TEXT,
  position     INTEGER NOT NULL DEFAULT 0,
  ai_generated INTEGER NOT NULL DEFAULT 1,
  approved     INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_syllabus_items ON syllabus_items(syllabus_id, kind, position);

-- Materials ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS course_materials (
  id                   TEXT PRIMARY KEY,
  course_id            TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id            TEXT REFERENCES modules(id) ON DELETE SET NULL,
  title                TEXT NOT NULL,
  description          TEXT,
  content_type         TEXT NOT NULL,
  url                  TEXT,
  file_name            TEXT,
  file_size            INTEGER,
  storage_adapter      TEXT,
  date_label           TEXT,
  visibility           TEXT NOT NULL DEFAULT 'students',
  professor_notes      TEXT,
  student_instructions TEXT,
  position             INTEGER NOT NULL DEFAULT 0,
  is_demo              INTEGER NOT NULL DEFAULT 0,
  created_at           TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_materials_course ON course_materials(course_id, position);

CREATE TABLE IF NOT EXISTS material_objectives (
  material_id  TEXT NOT NULL REFERENCES course_materials(id) ON DELETE CASCADE,
  objective_id TEXT NOT NULL REFERENCES learning_objectives(id) ON DELETE CASCADE,
  PRIMARY KEY (material_id, objective_id)
);

CREATE TABLE IF NOT EXISTS material_concepts (
  material_id TEXT NOT NULL REFERENCES course_materials(id) ON DELETE CASCADE,
  concept_id  TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  PRIMARY KEY (material_id, concept_id)
);

-- Lectures -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS lectures (
  id               TEXT PRIMARY KEY,
  course_id        TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id        TEXT REFERENCES modules(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  scheduled_at     TEXT,
  duration_minutes INTEGER,
  delivery_mode    TEXT NOT NULL DEFAULT 'recorded',
  status           TEXT NOT NULL DEFAULT 'draft',
  video_provider   TEXT,
  video_url        TEXT,
  live_url         TEXT,
  teaching_notes   TEXT,
  student_notes    TEXT,
  transcript_text  TEXT,
  live_started_at  TEXT,
  live_ended_at    TEXT,
  current_topic    TEXT,
  position         INTEGER NOT NULL DEFAULT 0,
  is_demo          INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lectures_course ON lectures(course_id, position);

CREATE TABLE IF NOT EXISTS lecture_segments (
  id                 TEXT PRIMARY KEY,
  lecture_id         TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  position           INTEGER NOT NULL,
  start_seconds      INTEGER NOT NULL DEFAULT 0,
  end_seconds        INTEGER,
  heading            TEXT NOT NULL,
  body               TEXT,
  transcript_excerpt TEXT,
  created_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_segments_lecture ON lecture_segments(lecture_id, position);

CREATE TABLE IF NOT EXISTS slides (
  id         TEXT PRIMARY KEY,
  lecture_id TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  position   INTEGER NOT NULL,
  title      TEXT NOT NULL,
  notes      TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_slides_lecture ON slides(lecture_id, position);

CREATE TABLE IF NOT EXISTS scripture_references (
  id         TEXT PRIMARY KEY,
  course_id  TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lecture_id TEXT REFERENCES lectures(id) ON DELETE CASCADE,
  segment_id TEXT REFERENCES lecture_segments(id) ON DELETE SET NULL,
  reference  TEXT NOT NULL,
  note       TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scripture_lecture ON scripture_references(lecture_id);

CREATE TABLE IF NOT EXISTS lecture_concepts (
  lecture_id   TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  concept_id   TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  objective_id TEXT REFERENCES learning_objectives(id) ON DELETE SET NULL,
  PRIMARY KEY (lecture_id, concept_id)
);

CREATE TABLE IF NOT EXISTS lecture_objectives (
  lecture_id   TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  objective_id TEXT NOT NULL REFERENCES learning_objectives(id) ON DELETE CASCADE,
  PRIMARY KEY (lecture_id, objective_id)
);

CREATE TABLE IF NOT EXISTS lecture_resources (
  lecture_id  TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  material_id TEXT NOT NULL REFERENCES course_materials(id) ON DELETE CASCADE,
  relation    TEXT NOT NULL DEFAULT 'supplemental',
  PRIMARY KEY (lecture_id, material_id)
);

-- Interactive moments ------------------------------------------------------

CREATE TABLE IF NOT EXISTS interactions (
  id           TEXT PRIMARY KEY,
  lecture_id   TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  prompt       TEXT NOT NULL,
  body         TEXT,
  explanation  TEXT,
  at_seconds   INTEGER,
  segment_id   TEXT REFERENCES lecture_segments(id) ON DELETE SET NULL,
  slide_id     TEXT REFERENCES slides(id) ON DELETE SET NULL,
  concept_id   TEXT REFERENCES concepts(id) ON DELETE SET NULL,
  objective_id TEXT REFERENCES learning_objectives(id) ON DELETE SET NULL,
  position     INTEGER NOT NULL DEFAULT 0,
  published    INTEGER NOT NULL DEFAULT 1,
  published_at TEXT,
  ai_generated INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_interactions_lecture ON interactions(lecture_id, position);

CREATE TABLE IF NOT EXISTS interaction_options (
  id             TEXT PRIMARY KEY,
  interaction_id TEXT NOT NULL REFERENCES interactions(id) ON DELETE CASCADE,
  position       INTEGER NOT NULL,
  text           TEXT NOT NULL,
  is_correct     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_interaction_options ON interaction_options(interaction_id, position);

CREATE TABLE IF NOT EXISTS interaction_responses (
  id             TEXT PRIMARY KEY,
  interaction_id TEXT NOT NULL REFERENCES interactions(id) ON DELETE CASCADE,
  student_id     TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  option_id      TEXT REFERENCES interaction_options(id) ON DELETE SET NULL,
  text_response  TEXT,
  confidence     INTEGER,
  is_correct     INTEGER,
  created_at     TEXT NOT NULL,
  UNIQUE (interaction_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_interaction_responses_student ON interaction_responses(student_id);

-- Student activity ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS student_notes (
  id                     TEXT PRIMARY KEY,
  student_id             TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id              TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lecture_id             TEXT REFERENCES lectures(id) ON DELETE SET NULL,
  module_id              TEXT REFERENCES modules(id) ON DELETE SET NULL,
  segment_id             TEXT REFERENCES lecture_segments(id) ON DELETE SET NULL,
  concept_id             TEXT REFERENCES concepts(id) ON DELETE SET NULL,
  objective_id           TEXT REFERENCES learning_objectives(id) ON DELETE SET NULL,
  assessment_id          TEXT,
  kind                   TEXT NOT NULL DEFAULT 'free_form',
  title                  TEXT,
  body                   TEXT NOT NULL,
  at_seconds             INTEGER,
  transcript_excerpt     TEXT,
  scripture_reference    TEXT,
  shared_with_professor  INTEGER NOT NULL DEFAULT 0,
  is_demo                INTEGER NOT NULL DEFAULT 0,
  created_at             TEXT NOT NULL,
  updated_at             TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notes_student_course ON student_notes(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_notes_lecture ON student_notes(lecture_id);

CREATE TABLE IF NOT EXISTS bookmarks (
  id                 TEXT PRIMARY KEY,
  student_id         TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id          TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lecture_id         TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  segment_id         TEXT REFERENCES lecture_segments(id) ON DELETE SET NULL,
  at_seconds         INTEGER NOT NULL DEFAULT 0,
  label              TEXT,
  transcript_excerpt TEXT,
  created_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_student ON bookmarks(student_id, lecture_id);

-- clear | confusing | important | exam_likely
CREATE TABLE IF NOT EXISTS comprehension_markers (
  id                 TEXT PRIMARY KEY,
  student_id         TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id          TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lecture_id         TEXT REFERENCES lectures(id) ON DELETE CASCADE,
  segment_id         TEXT REFERENCES lecture_segments(id) ON DELETE SET NULL,
  concept_id         TEXT REFERENCES concepts(id) ON DELETE SET NULL,
  objective_id       TEXT REFERENCES learning_objectives(id) ON DELETE SET NULL,
  marker             TEXT NOT NULL,
  at_seconds         INTEGER,
  transcript_excerpt TEXT,
  note               TEXT,
  created_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_markers_student ON comprehension_markers(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_markers_segment ON comprehension_markers(segment_id);

CREATE TABLE IF NOT EXISTS confidence_responses (
  id           TEXT PRIMARY KEY,
  student_id   TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id    TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lecture_id   TEXT REFERENCES lectures(id) ON DELETE SET NULL,
  objective_id TEXT REFERENCES learning_objectives(id) ON DELETE SET NULL,
  concept_id   TEXT REFERENCES concepts(id) ON DELETE SET NULL,
  level        INTEGER NOT NULL,
  context      TEXT,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_confidence_student ON confidence_responses(student_id, course_id);

-- Questions ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS questions (
  id                 TEXT PRIMARY KEY,
  student_id         TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id          TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lecture_id         TEXT REFERENCES lectures(id) ON DELETE SET NULL,
  segment_id         TEXT REFERENCES lecture_segments(id) ON DELETE SET NULL,
  concept_id         TEXT REFERENCES concepts(id) ON DELETE SET NULL,
  objective_id       TEXT REFERENCES learning_objectives(id) ON DELETE SET NULL,
  kind               TEXT NOT NULL DEFAULT 'question',
  body               TEXT NOT NULL,
  at_seconds         INTEGER,
  transcript_excerpt TEXT,
  status             TEXT NOT NULL DEFAULT 'open',
  anonymous          INTEGER NOT NULL DEFAULT 0,
  is_demo            INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_questions_course ON questions(course_id, status);
CREATE INDEX IF NOT EXISTS idx_questions_lecture ON questions(lecture_id);

CREATE TABLE IF NOT EXISTS question_votes (
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  student_id  TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  PRIMARY KEY (question_id, student_id)
);

CREATE TABLE IF NOT EXISTS professor_answers (
  id           TEXT PRIMARY KEY,
  question_id  TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  professor_id TEXT NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
  body         TEXT NOT NULL,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_answers_question ON professor_answers(question_id);

-- Assessments --------------------------------------------------------------

CREATE TABLE IF NOT EXISTS assessments (
  id                 TEXT PRIMARY KEY,
  course_id          TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  type               TEXT NOT NULL,
  title              TEXT NOT NULL,
  description        TEXT,
  scheduled_at       TEXT,
  weight_label       TEXT,
  professor_guidance TEXT,
  study_resources    TEXT,
  is_practice        INTEGER NOT NULL DEFAULT 0,
  published          INTEGER NOT NULL DEFAULT 1,
  is_demo            INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assessments_course ON assessments(course_id);

CREATE TABLE IF NOT EXISTS assessment_objectives (
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  objective_id  TEXT NOT NULL REFERENCES learning_objectives(id) ON DELETE CASCADE,
  PRIMARY KEY (assessment_id, objective_id)
);

CREATE TABLE IF NOT EXISTS assessment_lectures (
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  lecture_id    TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  PRIMARY KEY (assessment_id, lecture_id)
);

CREATE TABLE IF NOT EXISTS assessment_concepts (
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  concept_id    TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  PRIMARY KEY (assessment_id, concept_id)
);

CREATE TABLE IF NOT EXISTS assessment_questions (
  id            TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL,
  type          TEXT NOT NULL,
  prompt        TEXT NOT NULL,
  explanation   TEXT,
  objective_id  TEXT REFERENCES learning_objectives(id) ON DELETE SET NULL,
  concept_id    TEXT REFERENCES concepts(id) ON DELETE SET NULL,
  ai_generated  INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_aq_assessment ON assessment_questions(assessment_id, position);

CREATE TABLE IF NOT EXISTS assessment_question_options (
  id          TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  text        TEXT NOT NULL,
  is_correct  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_aqo_question ON assessment_question_options(question_id, position);

CREATE TABLE IF NOT EXISTS assessment_responses (
  id            TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_id   TEXT NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  student_id    TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  option_id     TEXT REFERENCES assessment_question_options(id) ON DELETE SET NULL,
  text_response TEXT,
  is_correct    INTEGER,
  confidence    INTEGER,
  created_at    TEXT NOT NULL,
  UNIQUE (question_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_ar_student ON assessment_responses(student_id, assessment_id);

-- Readiness ----------------------------------------------------------------

-- A point-in-time snapshot written each time readiness is computed, so trend
-- lines are drawn from real recorded history rather than invented numbers.
CREATE TABLE IF NOT EXISTS readiness_snapshots (
  id               TEXT PRIMARY KEY,
  student_id       TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id        TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status           TEXT NOT NULL,
  score            REAL,
  confidence_level TEXT NOT NULL,
  evidence_count   INTEGER NOT NULL DEFAULT 0,
  computed_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_snapshots ON readiness_snapshots(course_id, student_id, computed_at);

-- Professor override of a computed status. Requires an explanation.
CREATE TABLE IF NOT EXISTS status_overrides (
  id           TEXT PRIMARY KEY,
  student_id   TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id    TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status       TEXT NOT NULL,
  reason       TEXT NOT NULL,
  set_by       TEXT NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
  created_at   TEXT NOT NULL,
  cleared_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_overrides ON status_overrides(course_id, student_id, cleared_at);

-- Support ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS support_recommendations (
  id                  TEXT PRIMARY KEY,
  course_id           TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id          TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  objective_id        TEXT REFERENCES learning_objectives(id) ON DELETE SET NULL,
  concept_id          TEXT REFERENCES concepts(id) ON DELETE SET NULL,
  lecture_id          TEXT REFERENCES lectures(id) ON DELETE SET NULL,
  material_id         TEXT REFERENCES course_materials(id) ON DELETE SET NULL,
  pathway             TEXT NOT NULL,
  title               TEXT NOT NULL,
  rationale           TEXT NOT NULL,
  next_step           TEXT NOT NULL,
  priority            TEXT NOT NULL DEFAULT 'medium',
  source              TEXT NOT NULL DEFAULT 'system',
  created_by          TEXT REFERENCES professors(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'recommended',
  student_response    TEXT,
  student_responded_at TEXT,
  professor_response  TEXT,
  completed_at        TEXT,
  position            INTEGER NOT NULL DEFAULT 0,
  is_demo             INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_support_student ON support_recommendations(course_id, student_id);

CREATE TABLE IF NOT EXISTS support_requests (
  id                TEXT PRIMARY KEY,
  recommendation_id TEXT REFERENCES support_recommendations(id) ON DELETE SET NULL,
  course_id         TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id        TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  kind              TEXT NOT NULL,
  topics            TEXT,
  preferred_time    TEXT,
  message           TEXT,
  prep_summary      TEXT,
  status            TEXT NOT NULL DEFAULT 'submitted',
  created_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_requests_course ON support_requests(course_id, status);

CREATE TABLE IF NOT EXISTS support_actions (
  id                TEXT PRIMARY KEY,
  recommendation_id TEXT REFERENCES support_recommendations(id) ON DELETE CASCADE,
  request_id        TEXT REFERENCES support_requests(id) ON DELETE CASCADE,
  actor_role        TEXT NOT NULL,
  actor_name        TEXT,
  action            TEXT NOT NULL,
  note              TEXT,
  created_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_actions_rec ON support_actions(recommendation_id, created_at);

CREATE TABLE IF NOT EXISTS professor_notes (
  id               TEXT PRIMARY KEY,
  professor_id     TEXT NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
  course_id        TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id       TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  body             TEXT NOT NULL,
  follow_up_status TEXT NOT NULL DEFAULT 'open',
  resolved_at      TEXT,
  created_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_profnotes ON professor_notes(course_id, student_id, created_at);

-- Activity + AI ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS activity_events (
  id         TEXT PRIMARY KEY,
  course_id  TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  lecture_id TEXT REFERENCES lectures(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL DEFAULT 'student',
  type       TEXT NOT NULL,
  summary    TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_course ON activity_events(course_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_student ON activity_events(student_id, created_at);

-- Persisted AI output, always labelled with the provider that produced it and
-- whether a human has reviewed it.
CREATE TABLE IF NOT EXISTS ai_artifacts (
  id             TEXT PRIMARY KEY,
  course_id      TEXT REFERENCES courses(id) ON DELETE CASCADE,
  lecture_id     TEXT REFERENCES lectures(id) ON DELETE SET NULL,
  student_id     TEXT REFERENCES students(id) ON DELETE SET NULL,
  kind           TEXT NOT NULL,
  provider_id    TEXT NOT NULL,
  provider_label TEXT NOT NULL,
  is_simulated   INTEGER NOT NULL DEFAULT 1,
  title          TEXT,
  content        TEXT NOT NULL,
  source_note    TEXT,
  reviewed_by    TEXT REFERENCES professors(id) ON DELETE SET NULL,
  reviewed_at    TEXT,
  approved       INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_course ON ai_artifacts(course_id, kind, created_at);
`;
