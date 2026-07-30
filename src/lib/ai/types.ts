/**
 * AI provider abstraction.
 *
 * Nothing in the application calls a model directly. Every feature that could be
 * model-assisted goes through this interface, so a real provider can be dropped
 * in without touching feature code — see docs/ai-integration-plan.md.
 *
 * Two invariants:
 *  1. Every result carries provenance, including whether it was actually produced
 *     by a model. The UI renders that provenance; it never claims live AI.
 *  2. Course-wide output is a *draft* until a professor approves it.
 */
import type { SyllabusItemKind } from "@/lib/domain/vocabulary";

export type Provenance = {
  providerId: string;
  providerLabel: string;
  /** True when the text was produced by deterministic prototype logic, not a model. */
  isSimulated: boolean;
  model: string | null;
  generatedAt: string;
  /** What the output was derived from, shown to the user. */
  sourceNote: string;
};

export type AIResult<T> = {
  data: T;
  provenance: Provenance;
};

// Payload shapes -------------------------------------------------------------

export type SummaryPayload = {
  headline: string;
  paragraphs: string[];
  keyPoints: string[];
};

export type ExtractedConcept = {
  name: string;
  definition: string;
  /** Where the concept came from, e.g. a segment heading. */
  sourceLabel: string;
  /** Set when a claim is contested across traditions, so the UI can say so. */
  perspectiveNote: string | null;
};

export type GeneratedQuestion = {
  prompt: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  options: { text: string; isCorrect: boolean }[];
  explanation: string;
  objectiveCode: string | null;
  sourceLabel: string;
};

export type Flashcard = {
  front: string;
  back: string;
  sourceLabel: string;
};

export type StudyGuideSection = {
  heading: string;
  body: string;
  sourceLabel: string;
};

export type StudyGuidePayload = {
  title: string;
  intro: string;
  sections: StudyGuideSection[];
  reviewQuestions: string[];
};

export type SyllabusExtraction = {
  items: {
    kind: SyllabusItemKind;
    title: string;
    detail: string | null;
    weekLabel: string | null;
    dateLabel: string | null;
  }[];
  note: string;
};

export type ReadinessNarrative = {
  headline: string;
  comfortableWith: string[];
  reviewNeeded: string[];
  why: string[];
  caveat: string;
};

export type SupportNarrative = {
  intro: string;
  steps: string[];
  caveat: string;
};

export type OfficeHoursBrief = {
  forStudent: string[];
  forProfessor: string[];
  topics: string[];
};

// Inputs ---------------------------------------------------------------------

export type LectureContext = {
  courseTitle: string;
  lectureTitle: string;
  segments: { heading: string; body: string | null }[];
  transcript: string | null;
  studentNotes: string | null;
  concepts: { name: string; definition: string | null }[];
  objectives: { code: string; text: string }[];
  scripture: string[];
};

export type ReadinessNarrativeInput = {
  studentName: string;
  courseTitle: string;
  strengths: string[];
  gaps: string[];
  reasons: string[];
  statusLabel: string;
  confidenceCopy: string;
};

export type StudyGuideInput = {
  courseTitle: string;
  focus: string;
  objectives: { code: string; text: string }[];
  concepts: { name: string; definition: string | null }[];
  segments: { heading: string; body: string | null }[];
  studentNoteExcerpts: string[];
};

// The interface --------------------------------------------------------------

export interface AIProvider {
  readonly id: string;
  readonly label: string;
  /** False only when a real model is configured and reachable. */
  readonly isSimulated: boolean;

  generateSummary(input: LectureContext): Promise<AIResult<SummaryPayload>>;
  extractConcepts(input: LectureContext): Promise<AIResult<ExtractedConcept[]>>;
  generateQuestions(
    input: LectureContext,
    count: number,
  ): Promise<AIResult<GeneratedQuestion[]>>;
  generateFlashcards(
    input: LectureContext,
    count: number,
  ): Promise<AIResult<Flashcard[]>>;
  generateStudyGuide(
    input: StudyGuideInput,
  ): Promise<AIResult<StudyGuidePayload>>;
  extractSyllabus(
    rawText: string,
    courseTitle: string,
  ): Promise<AIResult<SyllabusExtraction>>;
  analyzeReadiness(
    input: ReadinessNarrativeInput,
  ): Promise<AIResult<ReadinessNarrative>>;
  recommendSupport(
    input: ReadinessNarrativeInput & { pathwayTitles: string[] },
  ): Promise<AIResult<SupportNarrative>>;
  prepareOfficeHours(input: {
    studentName: string;
    topics: string[];
    reasons: string[];
  }): Promise<AIResult<OfficeHoursBrief>>;
}
