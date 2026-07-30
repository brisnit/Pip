/**
 * Deterministic prototype "AI" provider.
 *
 * This provider does not call a language model. It restructures content the
 * professor already entered — segment headings, concept definitions, objectives,
 * transcript sentences — into the shapes the UI expects. That makes it useful for
 * demonstrating the workflow without ever implying a model is running.
 *
 * Every result it returns is marked `isSimulated: true`, and the UI renders that
 * as "Sample output — no AI provider configured".
 */
import type {
  AIProvider,
  AIResult,
  ExtractedConcept,
  Flashcard,
  GeneratedQuestion,
  LectureContext,
  OfficeHoursBrief,
  Provenance,
  ReadinessNarrative,
  ReadinessNarrativeInput,
  StudyGuideInput,
  StudyGuidePayload,
  SummaryPayload,
  SupportNarrative,
  SyllabusExtraction,
} from "./types";
import type { SyllabusItemKind } from "@/lib/domain/vocabulary";

const ID = "prototype-deterministic";
const LABEL = "Prototype sample output (no AI provider configured)";

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 24);
}

function wrap<T>(data: T, sourceNote: string): AIResult<T> {
  const provenance: Provenance = {
    providerId: ID,
    providerLabel: LABEL,
    isSimulated: true,
    model: null,
    generatedAt: new Date().toISOString(),
    sourceNote,
  };
  return { data, provenance };
}

export class PrototypeAIProvider implements AIProvider {
  readonly id = ID;
  readonly label = LABEL;
  readonly isSimulated = true;

  async generateSummary(
    input: LectureContext,
  ): Promise<AIResult<SummaryPayload>> {
    const bodyText = input.segments
      .map((s) => s.body ?? "")
      .join(" ")
      .trim();
    const source = bodyText || input.transcript || input.studentNotes || "";
    const picked = sentences(source).slice(0, 4);

    return wrap(
      {
        headline: `${input.lectureTitle}: outline and key claims`,
        paragraphs:
          picked.length > 0
            ? [picked.slice(0, 2).join(" "), picked.slice(2).join(" ")].filter(
                Boolean,
              )
            : [
                "No lecture body text has been entered yet, so there is nothing to summarise. Add student-facing notes or segment bodies and run this again.",
              ],
        keyPoints: [
          ...input.segments.slice(0, 6).map((s) => s.heading),
          ...input.concepts.slice(0, 3).map((c) => `Key term: ${c.name}`),
        ],
      },
      `Assembled from ${input.segments.length} lecture segment${
        input.segments.length === 1 ? "" : "s"
      } and ${input.concepts.length} professor-entered key term${
        input.concepts.length === 1 ? "" : "s"
      } in "${input.lectureTitle}".`,
    );
  }

  async extractConcepts(
    input: LectureContext,
  ): Promise<AIResult<ExtractedConcept[]>> {
    const fromConcepts: ExtractedConcept[] = input.concepts.map((concept) => ({
      name: concept.name,
      definition:
        concept.definition ??
        "No definition entered by the professor for this term yet.",
      sourceLabel: "Professor-entered key term",
      perspectiveNote: CONTESTED_TERMS[concept.name.toLowerCase()] ?? null,
    }));

    const fromHeadings: ExtractedConcept[] = input.segments
      .filter(
        (segment) =>
          !input.concepts.some((c) =>
            segment.heading.toLowerCase().includes(c.name.toLowerCase()),
          ),
      )
      .slice(0, 4)
      .map((segment) => ({
        name: segment.heading,
        definition:
          sentences(segment.body ?? "")[0] ??
          "Drawn from a lecture section heading; no body text was entered for this section.",
        sourceLabel: "Lecture section heading",
        perspectiveNote: null,
      }));

    return wrap(
      [...fromConcepts, ...fromHeadings],
      `Derived from professor-entered key terms and section headings in "${input.lectureTitle}". No model was called.`,
    );
  }

  async generateQuestions(
    input: LectureContext,
    count: number,
  ): Promise<AIResult<GeneratedQuestion[]>> {
    const questions: GeneratedQuestion[] = [];

    for (const concept of input.concepts) {
      if (questions.length >= count) break;
      const objective = input.objectives[questions.length % Math.max(1, input.objectives.length)];
      questions.push({
        prompt: `In this course, which statement best describes ${concept.name}?`,
        type: "multiple_choice",
        options: [
          {
            text:
              concept.definition ??
              `The definition given in ${input.lectureTitle}.`,
            isCorrect: true,
          },
          {
            text: `A later development that ${input.courseTitle} treats as a separate question.`,
            isCorrect: false,
          },
          {
            text: "A term used only in secondary literature, not in the primary sources.",
            isCorrect: false,
          },
        ],
        explanation: concept.definition
          ? `Drawn directly from the professor's definition of ${concept.name}.`
          : `No definition has been entered for ${concept.name}. A professor should replace this draft before publishing it.`,
        objectiveCode: objective?.code ?? null,
        sourceLabel: `Key term: ${concept.name}`,
      });
    }

    for (const segment of input.segments) {
      if (questions.length >= count) break;
      questions.push({
        prompt: `True or false: "${segment.heading}" is treated in this lecture as central rather than incidental.`,
        type: "true_false",
        options: [
          { text: "True", isCorrect: true },
          { text: "False", isCorrect: false },
        ],
        explanation: `"${segment.heading}" is one of the numbered sections of ${input.lectureTitle}. This is a placeholder draft and should be rewritten by the professor.`,
        objectiveCode: input.objectives[0]?.code ?? null,
        sourceLabel: `Section: ${segment.heading}`,
      });
    }

    return wrap(
      questions.slice(0, count),
      `Templated from ${input.concepts.length} key term${
        input.concepts.length === 1 ? "" : "s"
      } and ${input.segments.length} section${
        input.segments.length === 1 ? "" : "s"
      }. These are drafts for professor review, not finished questions.`,
    );
  }

  async generateFlashcards(
    input: LectureContext,
    count: number,
  ): Promise<AIResult<Flashcard[]>> {
    const cards: Flashcard[] = [
      ...input.concepts.map((concept) => ({
        front: concept.name,
        back:
          concept.definition ??
          "No definition entered yet — check your lecture notes.",
        sourceLabel: `Key term in ${input.lectureTitle}`,
      })),
      ...input.scripture.map((reference) => ({
        front: reference,
        back: `Referenced in ${input.lectureTitle}. Read the passage and note how the lecture used it.`,
        sourceLabel: "Scripture reference",
      })),
      ...input.segments.map((segment) => ({
        front: `What is the main claim of "${segment.heading}"?`,
        back:
          sentences(segment.body ?? "")[0] ??
          "Add your own answer from your notes for this section.",
        sourceLabel: `Section: ${segment.heading}`,
      })),
    ];

    return wrap(
      cards.slice(0, count),
      `Built from key terms, scripture references and section headings in "${input.lectureTitle}".`,
    );
  }

  async generateStudyGuide(
    input: StudyGuideInput,
  ): Promise<AIResult<StudyGuidePayload>> {
    const sections: StudyGuidePayload["sections"] = [];

    for (const objective of input.objectives) {
      const related = input.segments.find((segment) =>
        overlaps(segment.heading, objective.text),
      );
      sections.push({
        heading: `${objective.code} — ${objective.text}`,
        body: related
          ? `Covered in the lecture section "${related.heading}". ${
              sentences(related.body ?? "")[0] ??
              "Re-read your notes for this section and write a two-sentence answer in your own words."
            }`
          : "No lecture section is currently tagged to this objective. Check the course materials list for a related reading.",
        sourceLabel: related
          ? `Lecture section: ${related.heading}`
          : "Course objective (no tagged section yet)",
      });
    }

    for (const concept of input.concepts.slice(0, 6)) {
      sections.push({
        heading: concept.name,
        body:
          concept.definition ??
          "No definition entered. Write your own from the lecture, then check it against the professor's notes.",
        sourceLabel: "Professor-entered key term",
      });
    }

    return wrap(
      {
        title: `Study guide: ${input.focus}`,
        intro: `Assembled from ${input.objectives.length} learning objective${
          input.objectives.length === 1 ? "" : "s"
        } and ${input.concepts.length} key term${
          input.concepts.length === 1 ? "" : "s"
        } in ${input.courseTitle}. Nothing here is new content — it is your course material regrouped for review.`,
        sections,
        reviewQuestions: [
          ...input.objectives.map(
            (objective) =>
              `Can you explain "${objective.text}" in two sentences without looking at your notes?`,
          ),
          ...input.concepts
            .slice(0, 4)
            .map((concept) => `How would you define ${concept.name} to a classmate?`),
          ...input.studentNoteExcerpts
            .slice(0, 3)
            .map((excerpt) => `You noted: "${truncate(excerpt, 120)}" — is that resolved now?`),
        ],
      },
      `Regrouped from professor-published objectives, key terms and lecture sections${
        input.studentNoteExcerpts.length > 0
          ? ", plus your own notes"
          : ""
      }. No model was called.`,
    );
  }

  async extractSyllabus(
    rawText: string,
    courseTitle: string,
  ): Promise<AIResult<SyllabusExtraction>> {
    const items: SyllabusExtraction["items"] = [];
    const lines = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    let currentKind: SyllabusItemKind | null = null;

    const headingMap: { pattern: RegExp; kind: SyllabusItemKind }[] = [
      { pattern: /^(course )?description|^overview/i, kind: "description" },
      {
        pattern: /^(learning )?(objectives|outcomes|goals)/i,
        kind: "objective",
      },
      { pattern: /^(weekly )?(schedule|topics|calendar|outline)/i, kind: "weekly_topic" },
      { pattern: /^(required )?(readings|texts|bibliography)/i, kind: "reading" },
      { pattern: /^assignments?/i, kind: "assignment" },
      { pattern: /^(exams?|assessments?)/i, kind: "exam" },
      { pattern: /^(important )?dates/i, kind: "important_date" },
      { pattern: /^grading|^evaluation/i, kind: "grading_category" },
    ];

    for (const line of lines) {
      const isHeading =
        /^[A-Z][A-Za-z \-/&]{2,40}:?$/.test(line) || /:$/.test(line);
      if (isHeading) {
        const match = headingMap.find((h) => h.pattern.test(line.replace(/:$/, "")));
        if (match) {
          currentKind = match.kind;
          continue;
        }
      }

      const weekMatch = /^(week\s*\d+|unit\s*\d+|module\s*\d+)[\s.:—-]*(.*)$/i.exec(
        line,
      );
      if (weekMatch && weekMatch[2]) {
        items.push({
          kind: "weekly_topic",
          title: weekMatch[2].trim(),
          detail: null,
          weekLabel: weekMatch[1].trim(),
          dateLabel: null,
        });
        continue;
      }

      const bullet = /^[-•*\d]+[.)]?\s+(.*)$/.exec(line);
      const text = bullet ? bullet[1].trim() : line;

      if (!currentKind) continue;
      if (text.length < 8) continue;

      const dateMatch =
        /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}\b/i.exec(
          text,
        );

      items.push({
        kind: currentKind,
        title: truncate(text, 160),
        detail: text.length > 160 ? text : null,
        weekLabel: null,
        dateLabel: dateMatch ? dateMatch[0] : null,
      });
    }

    if (items.length > 0) {
      items.push({
        kind: "study_schedule",
        title: "Suggested review rhythm",
        detail:
          "Review each week's material within 48 hours, then again in the week before each exam. Generated from the weekly topics found above, not from the syllabus text itself.",
        weekLabel: null,
        dateLabel: null,
      });
    }

    return wrap(
      {
        items,
        note:
          items.length === 0
            ? `No structured sections were recognised in the pasted text for ${courseTitle}. This prototype extractor matches common syllabus headings ("Learning Objectives", "Weekly Schedule", "Readings", "Exams") — it does not understand prose. Add the information manually, or connect a real AI provider.`
            : `Recognised ${items.length} item${
                items.length === 1 ? "" : "s"
              } by pattern-matching common syllabus headings in ${courseTitle}. This is rule-based text parsing, not model comprehension — review every row before publishing.`,
      },
      "Rule-based parsing of the pasted syllabus text. No model was called.",
    );
  }

  async analyzeReadiness(
    input: ReadinessNarrativeInput,
  ): Promise<AIResult<ReadinessNarrative>> {
    return wrap(
      {
        headline: input.statusLabel,
        comfortableWith:
          input.strengths.length > 0
            ? input.strengths
            : ["Nothing has enough supporting evidence to list here yet."],
        reviewNeeded:
          input.gaps.length > 0
            ? input.gaps
            : ["No specific gaps stand out in the recorded activity."],
        why: input.reasons,
        caveat: `${input.confidenceCopy} This summary restates the recorded signals; it is not a grade and not a judgement about ${input.studentName}.`,
      },
      "Restated directly from the readiness engine's recorded signals. No model was called.",
    );
  }

  async recommendSupport(
    input: ReadinessNarrativeInput & { pathwayTitles: string[] },
  ): Promise<AIResult<SupportNarrative>> {
    return wrap(
      {
        intro:
          input.gaps.length > 0
            ? `Based on ${input.courseTitle} activity, these steps target ${input.gaps
                .slice(0, 2)
                .join(" and ")}.`
            : `There are no specific gaps to target in ${input.courseTitle} yet. These steps are about building a clearer picture.`,
        steps: input.pathwayTitles,
        caveat:
          "These steps come from a rule-based recommender working over your professor's published material. Your professor can add, change, or remove any of them.",
      },
      "Ordered by the deterministic support recommender. No model was called.",
    );
  }

  async prepareOfficeHours(input: {
    studentName: string;
    topics: string[];
    reasons: string[];
  }): Promise<AIResult<OfficeHoursBrief>> {
    return wrap(
      {
        topics: input.topics,
        forStudent: [
          "Bring your notes for the sections you marked confusing.",
          ...input.topics.map(
            (topic) => `Write one sentence on what specifically is unclear about ${topic}.`,
          ),
          "Note any reading you have already tried, so you don't repeat it.",
        ],
        forProfessor: [
          `${input.studentName} requested this meeting about ${
            input.topics.length
          } topic${input.topics.length === 1 ? "" : "s"}.`,
          ...input.reasons.slice(0, 4),
          "Recorded signals only. This is not a summary of the student's private notes.",
        ],
      },
      "Assembled from the topics the student selected and the readiness engine's recorded signals.",
    );
  }
}

/**
 * Terms where presenting a single definition as settled would misrepresent the
 * field. The UI surfaces this note next to the definition.
 */
const CONTESTED_TERMS: Record<string, string> = {
  justification:
    "Lutheran, Reformed, Catholic and more recent readings of Paul differ substantially here. Treat any single definition as one position among several, and check which one this course is teaching.",
  "sola fide":
    "The scope of this formula — and whether it excludes or reframes works — is read differently across traditions.",
  "real presence":
    "Lutheran, Reformed, Anabaptist and Catholic accounts of eucharistic presence differ sharply.",
  predestination:
    "Reformed, Lutheran, Arminian and Catholic traditions each frame this differently.",
  sacrament:
    "Traditions differ on the number of sacraments and on what a sacrament effects.",
  "law and gospel":
    "The Lutheran distinction and the Reformed covenantal framing are not interchangeable.",
};

function overlaps(a: string, b: string): boolean {
  const words = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 4),
    );
  const wa = words(a);
  for (const word of words(b)) if (wa.has(word)) return true;
  return false;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}
