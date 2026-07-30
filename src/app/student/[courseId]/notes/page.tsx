import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteNoteAction, setNoteSharedAction } from "@/app/student/actions";
import { AIProvenance } from "@/components/ui/ai-label";
import { StandaloneNoteForm } from "@/components/lecture/segment-controls";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Notice,
  SectionHeading,
} from "@/components/ui/primitives";
import {
  NOTE_KINDS,
  NOTE_KIND_LABELS,
  type NoteKind,
} from "@/lib/domain/vocabulary";
import { formatClock } from "@/lib/domain/support";
import { formatDateTime } from "@/lib/format";
import { listArtifacts, parseArtifact } from "@/lib/ai";
import type { Flashcard, StudyGuidePayload } from "@/lib/ai/types";
import { getCourse, listModules } from "@/lib/repositories/courses";
import {
  listBookmarks,
  listNotes,
  listQuestions,
} from "@/lib/repositories/engagement";
import { listStudentLectures } from "@/lib/repositories/lectures";
import { readinessFor } from "@/lib/repositories/readiness";
import { currentStudentInCourse } from "@/lib/role/role-context";
import { FlashcardForm, StudyGuideForm } from "./study-tools";

export const metadata: Metadata = { title: "Notes" };

type Props = {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ kind?: string; lecture?: string; module?: string }>;
};

export default async function StudentNotesPage({ params, searchParams }: Props) {
  const { courseId } = await params;
  const query = await searchParams;

  const course = getCourse(courseId);
  const student = await currentStudentInCourse(courseId);
  if (!course || !student) notFound();

  const lectures = listStudentLectures(courseId);
  const modules = listModules(courseId);

  const kindFilter = NOTE_KINDS.includes(query.kind as NoteKind)
    ? (query.kind as NoteKind)
    : undefined;

  const notes = listNotes(student.studentId, courseId, {
    kind: kindFilter,
    lectureId: query.lecture,
    moduleId: query.module,
  });
  const allNotes = listNotes(student.studentId, courseId);
  const bookmarks = listBookmarks(student.studentId, courseId);
  const myQuestions = listQuestions(courseId, { studentId: student.studentId });
  const readiness = readinessFor(courseId, student.studentId);

  const openQuestions = myQuestions.filter(
    (question) => question.status === "open",
  );
  const questionNotes = allNotes.filter((note) => note.kind === "question");

  const studyGuides = listArtifacts({
    courseId,
    studentId: student.studentId,
    kind: "student_study_guide",
    limit: 2,
  });
  const flashcardSets = listArtifacts({
    courseId,
    studentId: student.studentId,
    kind: "flashcards",
    limit: 2,
  });

  const kindCounts = NOTE_KINDS.map((kind) => ({
    kind,
    count: allNotes.filter((note) => note.kind === kind).length,
  })).filter((row) => row.count > 0);

  function href(next: Partial<{ kind: string; lecture: string; module: string }>) {
    const search = new URLSearchParams();
    const merged = { ...query, ...next };
    for (const [key, value] of Object.entries(merged)) {
      if (value) search.set(key, value);
    }
    const qs = search.toString();
    return `/student/${courseId}/notes${qs ? `?${qs}` : ""}`;
  }

  return (
    <>
      <SectionHeading
        level={1}
        title="Your notes"
        description="Private by default. Your professor sees only the notes you explicitly share."
      />

      <Notice tone="privacy" className="mb-6">
        Nothing on this page is visible to your professor unless it carries a{" "}
        <strong>Shared</strong> label. You can share or unshare any note at any
        time.
      </Notice>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {allNotes.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/student/${courseId}/notes`}
                aria-current={
                  !kindFilter && !query.lecture && !query.module
                    ? "true"
                    : undefined
                }
                className={`inline-flex rounded-full border px-3 py-1 text-[0.82rem] no-underline ${
                  !kindFilter && !query.lecture && !query.module
                    ? "border-brand-600 bg-brand-600 font-medium text-paper-50"
                    : "border-tan-200 bg-white text-ink-600"
                }`}
              >
                All ({allNotes.length})
              </Link>
              {kindCounts.map((row) => (
                <Link
                  key={row.kind}
                  href={href({ kind: row.kind })}
                  aria-current={kindFilter === row.kind ? "true" : undefined}
                  className={`inline-flex rounded-full border px-3 py-1 text-[0.82rem] no-underline ${
                    kindFilter === row.kind
                      ? "border-brand-600 bg-brand-600 font-medium text-paper-50"
                      : "border-tan-200 bg-white text-ink-600"
                  }`}
                >
                  {NOTE_KIND_LABELS[row.kind]} ({row.count})
                </Link>
              ))}
            </div>
          ) : null}

          {notes.length === 0 ? (
            <EmptyState
              title={
                allNotes.length === 0 ? "No notes yet" : "No notes match this filter"
              }
              description={
                allNotes.length === 0
                  ? "Notes you take inside a lecture keep the section, timestamp and transcript excerpt with them, so you never have to reconstruct what you were reacting to."
                  : "Try clearing the filter above."
              }
              action={
                allNotes.length === 0 && lectures.length > 0 ? (
                  <Link href={`/student/${courseId}/lecture/${lectures[0].id}`}>
                    Open a lecture →
                  </Link>
                ) : null
              }
            />
          ) : (
            <ul className="space-y-3">
              {notes.map((note) => (
                <Card as="li" key={note.id}>
                  <CardBody className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge>{NOTE_KIND_LABELS[note.kind]}</Badge>
                          {note.shared_with_professor === 1 ? (
                            <Badge tone="accent">Shared with professor</Badge>
                          ) : (
                            <span className="text-[0.75rem] text-ink-400">
                              private
                            </span>
                          )}
                          {note.at_seconds !== null ? (
                            <span className="font-mono text-[0.75rem] text-ink-400">
                              {formatClock(note.at_seconds)}
                            </span>
                          ) : null}
                          {note.scripture_reference ? (
                            <Badge tone="brand">
                              {note.scripture_reference}
                            </Badge>
                          ) : null}
                        </div>

                        {note.title ? (
                          <h2 className="mt-1.5 text-[0.95rem] font-semibold">
                            {note.title}
                          </h2>
                        ) : null}
                        <p className="mt-1 whitespace-pre-line text-[0.9rem] leading-relaxed text-ink-700">
                          {note.body}
                        </p>

                        <p className="mt-2 text-[0.78rem] text-ink-400">
                          {[
                            note.lecture_title,
                            note.segment_heading
                              ? `"${note.segment_heading}"`
                              : null,
                            note.module_title,
                            note.objective_text?.slice(0, 50),
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Not tied to a lecture"}
                          {" · "}
                          {formatDateTime(note.created_at)}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col gap-1.5">
                        <form action={setNoteSharedAction}>
                          <input type="hidden" name="courseId" value={courseId} />
                          <input type="hidden" name="noteId" value={note.id} />
                          <input
                            type="hidden"
                            name="shared"
                            value={note.shared_with_professor === 1 ? "0" : "1"}
                          />
                          <Button type="submit" variant="secondary" size="sm">
                            {note.shared_with_professor === 1
                              ? "Make private"
                              : "Share"}
                          </Button>
                        </form>
                        <form action={deleteNoteAction}>
                          <input type="hidden" name="courseId" value={courseId} />
                          <input type="hidden" name="noteId" value={note.id} />
                          <Button type="submit" variant="ghost" size="sm">
                            Delete
                          </Button>
                        </form>
                      </div>
                    </div>

                    {note.lecture_id && note.segment_id ? (
                      <p className="mt-2 border-t border-tan-100 pt-2 text-[0.8rem]">
                        <Link
                          href={`/student/${courseId}/lecture/${note.lecture_id}#segment-${note.segment_id}`}
                        >
                          Back to this moment in the lecture →
                        </Link>
                      </p>
                    ) : null}
                  </CardBody>
                </Card>
              ))}
            </ul>
          )}

          <Card>
            <CardHeader
              title="Write a note"
              description="For anything not tied to a specific lecture moment."
            />
            <CardBody>
              <StandaloneNoteForm
                courseId={courseId}
                lectures={lectures.map((lecture) => ({
                  id: lecture.id,
                  title: lecture.title,
                }))}
              />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Study tools"
              description="Built from your course material and your own notes, and labelled as such."
              level={3}
            />
            <CardBody className="space-y-5">
              <StudyGuideForm courseId={courseId} />
              <div className="border-t border-tan-100 pt-4">
                <FlashcardForm
                  courseId={courseId}
                  lectures={lectures.map((lecture) => ({
                    id: lecture.id,
                    title: lecture.title,
                  }))}
                />
              </div>
            </CardBody>
          </Card>

          {readiness.gaps.length > 0 ? (
            <Card>
              <CardHeader
                title="Possible knowledge gaps"
                description="From your recorded activity, not from reading your notes."
                level={3}
              />
              <CardBody>
                <ul className="space-y-2">
                  {readiness.gaps.map((gap) => (
                    <li key={gap.objective.id} className="text-[0.85rem]">
                      <span className="text-ink-700">{gap.objective.text}</span>
                      {gap.confusingConcepts.length > 0 ? (
                        <span className="mt-0.5 block text-[0.8rem] text-attention-600">
                          {gap.confusingConcepts.join("; ")}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[0.8rem]">
                  <Link href={`/student/${courseId}/readiness`}>
                    See the full picture →
                  </Link>
                </p>
              </CardBody>
            </Card>
          ) : null}

          {openQuestions.length > 0 || questionNotes.length > 0 ? (
            <Card>
              <CardHeader
                title="Still unanswered"
                description="Your open questions and the notes you flagged as questions."
                level={3}
              />
              <CardBody className="space-y-3">
                {openQuestions.length > 0 ? (
                  <div>
                    <h4 className="text-[0.8rem] font-semibold uppercase tracking-wide text-ink-400">
                      Submitted, awaiting a response
                    </h4>
                    <ul className="mt-1.5 space-y-1.5">
                      {openQuestions.map((question) => (
                        <li key={question.id} className="text-[0.85rem] text-ink-700">
                          {question.body}
                          {question.lecture_id ? (
                            <Link
                              href={`/student/${courseId}/lecture/${question.lecture_id}`}
                              className="ml-1 text-[0.8rem]"
                            >
                              (lecture)
                            </Link>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {questionNotes.length > 0 ? (
                  <div className="border-t border-tan-100 pt-3">
                    <h4 className="text-[0.8rem] font-semibold uppercase tracking-wide text-ink-400">
                      In your own notes, not yet asked
                    </h4>
                    <ul className="mt-1.5 space-y-1.5">
                      {questionNotes.map((note) => (
                        <li key={note.id} className="text-[0.85rem] text-ink-700">
                          {note.title ?? note.body.slice(0, 90)}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[0.8rem] text-ink-500">
                      These stay private. Submit one as a question from the lecture
                      page if you want an answer.
                    </p>
                  </div>
                ) : null}
              </CardBody>
            </Card>
          ) : null}

          {bookmarks.length > 0 ? (
            <Card>
              <CardHeader title="Bookmarks" level={3} />
              <CardBody className="p-0">
                <ul className="divide-y divide-tan-100">
                  {bookmarks.map((bookmark) => (
                    <li key={bookmark.id} className="px-4 py-2">
                      <Link
                        href={`/student/${courseId}/lecture/${bookmark.lecture_id}${
                          bookmark.segment_id
                            ? `#segment-${bookmark.segment_id}`
                            : ""
                        }`}
                        className="text-[0.85rem]"
                      >
                        {bookmark.label ?? formatClock(bookmark.at_seconds)}
                      </Link>
                      <span className="ml-2 font-mono text-[0.72rem] text-ink-400">
                        {formatClock(bookmark.at_seconds)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}

          {modules.length > 0 && allNotes.length > 0 ? (
            <Card>
              <CardHeader title="Group by module" level={3} />
              <CardBody className="p-0">
                <ul className="divide-y divide-tan-100">
                  {modules.map((module) => {
                    const count = allNotes.filter(
                      (note) => note.module_title === module.title,
                    ).length;
                    return (
                      <li key={module.id} className="px-4 py-2">
                        <Link
                          href={href({ module: module.id, kind: undefined })}
                          className="flex items-baseline justify-between gap-2 text-[0.85rem] no-underline"
                        >
                          <span className="min-w-0 text-ink-700">
                            {module.title}
                          </span>
                          <span className="shrink-0 tabular-nums text-ink-400">
                            {count}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>

      {studyGuides.length > 0 || flashcardSets.length > 0 ? (
        <section className="mt-8 space-y-6">
          <SectionHeading
            title="Generated study material"
            description="Clearly labelled, and always pointing back at the course material it came from."
          />

          {studyGuides.map((artifact) => {
            const guide = parseArtifact<StudyGuidePayload>(artifact);
            return (
              <Card key={artifact.id}>
                <CardHeader
                  title={guide.title}
                  description={formatDateTime(artifact.created_at)}
                />
                <CardBody className="space-y-4">
                  <AIProvenance
                    provenance={{
                      providerId: artifact.provider_id,
                      providerLabel: artifact.provider_label,
                      isSimulated: artifact.is_simulated === 1,
                      model: null,
                      generatedAt: artifact.created_at,
                      sourceNote: artifact.source_note ?? "",
                    }}
                  />
                  <p className="text-sm text-ink-600">{guide.intro}</p>
                  <ul className="space-y-3">
                    {guide.sections.map((section, index) => (
                      <li key={index}>
                        <h3 className="text-[0.92rem] font-semibold">
                          {section.heading}
                        </h3>
                        <p className="mt-0.5 text-[0.88rem] leading-relaxed text-ink-600">
                          {section.body}
                        </p>
                        <p className="mt-0.5 text-[0.78rem] text-ink-400">
                          Source: {section.sourceLabel}
                        </p>
                      </li>
                    ))}
                  </ul>
                  {guide.reviewQuestions.length > 0 ? (
                    <div className="border-t border-tan-100 pt-4">
                      <h3 className="text-[0.92rem] font-semibold">
                        Questions to test yourself
                      </h3>
                      <ol className="mt-2 space-y-1.5">
                        {guide.reviewQuestions.map((question, index) => (
                          <li key={index} className="text-[0.88rem] text-ink-600">
                            {question}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                </CardBody>
              </Card>
            );
          })}

          {flashcardSets.map((artifact) => {
            const cards = parseArtifact<Flashcard[]>(artifact);
            return (
              <Card key={artifact.id}>
                <CardHeader
                  title={artifact.title ?? "Flashcards"}
                  description={`${cards.length} cards · ${formatDateTime(artifact.created_at)}`}
                />
                <CardBody className="space-y-4">
                  <AIProvenance
                    provenance={{
                      providerId: artifact.provider_id,
                      providerLabel: artifact.provider_label,
                      isSimulated: artifact.is_simulated === 1,
                      model: null,
                      generatedAt: artifact.created_at,
                      sourceNote: artifact.source_note ?? "",
                    }}
                  />
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {cards.map((card, index) => (
                      <li
                        key={index}
                        className="rounded-md border border-tan-100 bg-paper-50 p-3"
                      >
                        <details>
                          <summary className="cursor-pointer text-[0.9rem] font-medium text-ink-800">
                            {card.front}
                          </summary>
                          <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-600">
                            {card.back}
                          </p>
                          <p className="mt-1 text-[0.75rem] text-ink-400">
                            {card.sourceLabel}
                          </p>
                        </details>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            );
          })}
        </section>
      ) : null}
    </>
  );
}
