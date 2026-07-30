import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createBookmarkAction,
  deleteBookmarkAction,
  setMarkerAction,
  voteQuestionAction,
} from "@/app/student/actions";
import { InteractionCard } from "@/components/lecture/interaction-card";
import { RichText, Transcript } from "@/components/lecture/rich-text";
import {
  SegmentNoteForm,
  SegmentQuestionForm,
  type SegmentContext,
} from "@/components/lecture/segment-controls";
import { VideoArea } from "@/components/lecture/video-area";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Notice,
  SectionHeading,
} from "@/components/ui/primitives";
import {
  DELIVERY_MODE_LABELS,
  LECTURE_STATUS_LABELS,
  MARKERS,
  MARKER_GLYPHS,
  MARKER_LABELS,
  NOTE_KIND_LABELS,
  QUESTION_KIND_LABELS,
  QUESTION_STATUS_LABELS,
  type Marker,
} from "@/lib/domain/vocabulary";
import { formatClock } from "@/lib/domain/support";
import { formatDayMonth, relativeTime } from "@/lib/format";
import { getCourse } from "@/lib/repositories/courses";
import {
  listBookmarks,
  listMarkers,
  listNotes,
  listQuestions,
  listVotedQuestionIds,
} from "@/lib/repositories/engagement";
import {
  getLecture,
  listInteractionResponses,
  listInteractions,
  listLectureConcepts,
  listLectureObjectives,
  listLectureResources,
  listLectureScripture,
  listSegments,
} from "@/lib/repositories/lectures";
import { currentStudentInCourse } from "@/lib/role/role-context";

type Props = {
  params: Promise<{ courseId: string; lectureId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lectureId } = await params;
  const lecture = getLecture(lectureId);
  return { title: lecture?.title ?? "Lecture" };
}

export default async function StudentLecturePage({ params }: Props) {
  const { courseId, lectureId } = await params;
  const course = getCourse(courseId);
  const student = await currentStudentInCourse(courseId);
  const lecture = getLecture(lectureId);

  if (!course || !student || !lecture || lecture.course_id !== courseId) {
    notFound();
  }
  // Drafts are not student-visible.
  if (lecture.status === "draft") notFound();

  const segments = listSegments(lectureId);
  const interactions = listInteractions(lectureId, { publishedOnly: true });
  const responses = listInteractionResponses(student.studentId, lectureId);
  const objectives = listLectureObjectives(lectureId);
  const concepts = listLectureConcepts(lectureId);
  const scripture = listLectureScripture(lectureId);
  const resources = listLectureResources(lectureId);

  const notes = listNotes(student.studentId, courseId, { lectureId });
  const markers = listMarkers(student.studentId, courseId, lectureId);
  const bookmarks = listBookmarks(student.studentId, courseId, lectureId);
  const questions = listQuestions(courseId, { lectureId });
  const votedIds = new Set(listVotedQuestionIds(student.studentId, courseId));

  const responseByInteraction = new Map(
    responses.map((response) => [response.interaction_id, response]),
  );
  const markersBySegment = new Map<string, Set<Marker>>();
  for (const marker of markers) {
    if (!marker.segment_id) continue;
    const set = markersBySegment.get(marker.segment_id) ?? new Set<Marker>();
    set.add(marker.marker);
    markersBySegment.set(marker.segment_id, set);
  }
  const notesBySegment = new Map<string, typeof notes>();
  for (const note of notes) {
    if (!note.segment_id) continue;
    notesBySegment.set(note.segment_id, [
      ...(notesBySegment.get(note.segment_id) ?? []),
      note,
    ]);
  }

  const unanchoredInteractions = interactions.filter(
    (interaction) => !interaction.segment_id,
  );
  const primaryObjectiveId = objectives[0]?.id ?? null;

  const answeredChecks = interactions.filter(
    (interaction) =>
      interaction.type === "comprehension_question" &&
      responseByInteraction.has(interaction.id),
  ).length;
  const totalChecks = interactions.filter(
    (interaction) => interaction.type === "comprehension_question",
  ).length;

  return (
    <>
      <p className="mb-2 text-[0.85rem]">
        <Link href={`/student/${courseId}/lecture`}>← All lectures</Link>
      </p>

      <SectionHeading
        level={1}
        title={lecture.title}
        description={lecture.description ?? undefined}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2 text-[0.82rem] text-ink-500">
        {lecture.status === "live" ? (
          <Badge tone="concern">Live now</Badge>
        ) : (
          <Badge>{LECTURE_STATUS_LABELS[lecture.status]}</Badge>
        )}
        <span>{DELIVERY_MODE_LABELS[lecture.delivery_mode]}</span>
        {lecture.module_title ? <span>· {lecture.module_title}</span> : null}
        {lecture.scheduled_at ? (
          <span>· {formatDayMonth(lecture.scheduled_at)}</span>
        ) : null}
        {lecture.duration_minutes ? (
          <span>· {lecture.duration_minutes} min</span>
        ) : null}
        {totalChecks > 0 ? (
          <span>
            · {answeredChecks} of {totalChecks} comprehension checks answered
          </span>
        ) : null}
      </div>

      {lecture.status === "live" && lecture.current_topic ? (
        <Notice tone="caution" title="Your professor is currently on" className="mb-6">
          {lecture.current_topic}
        </Notice>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="video-heading">
            <h2 id="video-heading" className="sr-only">
              Lecture video
            </h2>
            <VideoArea
              videoUrl={lecture.video_url}
              liveUrl={lecture.live_url}
              isLive={lecture.status === "live"}
              title={lecture.title}
              hasTranscript={Boolean(lecture.transcript_text)}
            />
          </section>

          {unanchoredInteractions.length > 0 ? (
            <section aria-labelledby="general-moments">
              <h2 id="general-moments" className="mb-3 font-serif text-lg">
                From your professor
              </h2>
              <div className="space-y-3">
                {unanchoredInteractions.map((interaction) => (
                  <InteractionCard
                    key={interaction.id}
                    interaction={interaction}
                    response={responseByInteraction.get(interaction.id)}
                    courseId={courseId}
                    lectureId={lectureId}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section aria-labelledby="outline-heading">
            <h2 id="outline-heading" className="mb-1 font-serif text-xl">
              Lecture outline
            </h2>
            <p className="mb-4 text-sm text-ink-500">
              Every control below attaches itself to the section you are in — the
              timestamp, the transcript excerpt and the objective travel with it.
            </p>

            {segments.length === 0 ? (
              <Notice tone="info">
                This lecture has no outline yet. You can still take notes and ask
                questions from the panel on the right.
              </Notice>
            ) : (
              <ol className="space-y-5">
                {segments.map((segment, index) => {
                  const segmentMarkers =
                    markersBySegment.get(segment.id) ?? new Set<Marker>();
                  const segmentNotes = notesBySegment.get(segment.id) ?? [];
                  const segmentInteractions = interactions.filter(
                    (interaction) => interaction.segment_id === segment.id,
                  );
                  const bookmark = bookmarks.find(
                    (b) => b.segment_id === segment.id,
                  );

                  const context: SegmentContext = {
                    courseId,
                    lectureId,
                    segmentId: segment.id,
                    segmentHeading: segment.heading,
                    atSeconds: segment.start_seconds,
                    transcriptExcerpt: segment.transcript_excerpt,
                    objectiveId: primaryObjectiveId,
                  };

                  return (
                    <li key={segment.id} id={`segment-${segment.id}`}>
                      <Card>
                        <CardBody>
                          <div className="flex flex-wrap items-baseline justify-between gap-3">
                            <h3 className="min-w-0 font-serif text-lg leading-snug">
                              <span className="mr-2 font-sans text-[0.78rem] font-medium text-ink-400">
                                {index + 1}
                              </span>
                              {segment.heading}
                            </h3>
                            <span className="shrink-0 font-mono text-[0.8rem] text-burgundy-500">
                              {formatClock(segment.start_seconds)}
                            </span>
                          </div>

                          {segment.body ? (
                            <p className="mt-2 text-[0.92rem] leading-relaxed text-ink-600">
                              {segment.body}
                            </p>
                          ) : null}

                          {segment.transcript_excerpt ? (
                            <blockquote className="mt-3 border-l-2 border-gold-300 pl-3 text-[0.85rem] italic text-ink-500">
                              {segment.transcript_excerpt}
                            </blockquote>
                          ) : null}

                          <div className="mt-4 border-t border-sand-100 pt-3">
                            <p
                              className="mb-2 text-[0.78rem] font-medium uppercase tracking-wide text-ink-400"
                              id={`marks-${segment.id}`}
                            >
                              How is this landing?
                            </p>
                            <div
                              className="flex flex-wrap gap-2"
                              role="group"
                              aria-labelledby={`marks-${segment.id}`}
                            >
                              {MARKERS.map((marker) => {
                                const active = segmentMarkers.has(marker);
                                return (
                                  <form
                                    key={marker}
                                    action={setMarkerAction}
                                    className="contents"
                                  >
                                    <input
                                      type="hidden"
                                      name="courseId"
                                      value={courseId}
                                    />
                                    <input
                                      type="hidden"
                                      name="lectureId"
                                      value={lectureId}
                                    />
                                    <input
                                      type="hidden"
                                      name="segmentId"
                                      value={segment.id}
                                    />
                                    <input
                                      type="hidden"
                                      name="segmentHeading"
                                      value={segment.heading}
                                    />
                                    <input
                                      type="hidden"
                                      name="objectiveId"
                                      value={primaryObjectiveId ?? ""}
                                    />
                                    <input
                                      type="hidden"
                                      name="atSeconds"
                                      value={segment.start_seconds}
                                    />
                                    <input
                                      type="hidden"
                                      name="transcriptExcerpt"
                                      value={segment.transcript_excerpt ?? ""}
                                    />
                                    <input
                                      type="hidden"
                                      name="marker"
                                      value={marker}
                                    />
                                    <Button
                                      type="submit"
                                      variant="secondary"
                                      size="sm"
                                      aria-pressed={active}
                                      className={
                                        active
                                          ? marker === "confusing"
                                            ? "border-attention-500 bg-attention-50 text-attention-600"
                                            : marker === "clear"
                                              ? "border-track-500 bg-track-50 text-track-600"
                                              : "border-burgundy-400 bg-burgundy-50 text-burgundy-700"
                                          : undefined
                                      }
                                    >
                                      <span aria-hidden="true">
                                        {MARKER_GLYPHS[marker]}
                                      </span>
                                      {MARKER_LABELS[marker]}
                                      {active ? (
                                        <span className="sr-only">
                                          {" "}
                                          — currently marked, press again to remove
                                        </span>
                                      ) : null}
                                    </Button>
                                  </form>
                                );
                              })}

                              {bookmark ? (
                                <form action={deleteBookmarkAction}>
                                  <input
                                    type="hidden"
                                    name="courseId"
                                    value={courseId}
                                  />
                                  <input
                                    type="hidden"
                                    name="bookmarkId"
                                    value={bookmark.id}
                                  />
                                  <Button
                                    type="submit"
                                    variant="secondary"
                                    size="sm"
                                    className="border-gold-400 bg-gold-100 text-gold-600"
                                    aria-pressed
                                  >
                                    <span aria-hidden="true">⚑</span> Bookmarked
                                    <span className="sr-only">
                                      {" "}
                                      — press to remove
                                    </span>
                                  </Button>
                                </form>
                              ) : (
                                <form action={createBookmarkAction}>
                                  <input
                                    type="hidden"
                                    name="courseId"
                                    value={courseId}
                                  />
                                  <input
                                    type="hidden"
                                    name="lectureId"
                                    value={lectureId}
                                  />
                                  <input
                                    type="hidden"
                                    name="segmentId"
                                    value={segment.id}
                                  />
                                  <input
                                    type="hidden"
                                    name="atSeconds"
                                    value={segment.start_seconds}
                                  />
                                  <input
                                    type="hidden"
                                    name="label"
                                    value={segment.heading}
                                  />
                                  <input
                                    type="hidden"
                                    name="transcriptExcerpt"
                                    value={segment.transcript_excerpt ?? ""}
                                  />
                                  <Button
                                    type="submit"
                                    variant="secondary"
                                    size="sm"
                                    aria-pressed={false}
                                  >
                                    <span aria-hidden="true">⚐</span> Bookmark
                                  </Button>
                                </form>
                              )}
                            </div>
                          </div>

                          {segmentInteractions.length > 0 ? (
                            <div className="mt-4 space-y-3 border-t border-sand-100 pt-4">
                              {segmentInteractions.map((interaction) => (
                                <InteractionCard
                                  key={interaction.id}
                                  interaction={interaction}
                                  response={responseByInteraction.get(
                                    interaction.id,
                                  )}
                                  courseId={courseId}
                                  lectureId={lectureId}
                                />
                              ))}
                            </div>
                          ) : null}

                          <div className="mt-4 space-y-2 border-t border-sand-100 pt-4">
                            <details>
                              <summary className="cursor-pointer text-sm font-medium text-burgundy-700">
                                Take a note here
                                {segmentNotes.length > 0
                                  ? ` (${segmentNotes.length} saved)`
                                  : ""}
                              </summary>
                              <div className="mt-3">
                                <SegmentNoteForm context={context} />
                              </div>
                            </details>

                            <details>
                              <summary className="cursor-pointer text-sm font-medium text-burgundy-700">
                                Ask about this section
                              </summary>
                              <div className="mt-3">
                                <SegmentQuestionForm context={context} />
                              </div>
                            </details>
                          </div>

                          {segmentNotes.length > 0 ? (
                            <ul className="mt-4 space-y-2 border-t border-sand-100 pt-3">
                              {segmentNotes.map((note) => (
                                <li
                                  key={note.id}
                                  className="rounded border border-sand-100 bg-cream-100 px-3 py-2"
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge>{NOTE_KIND_LABELS[note.kind]}</Badge>
                                    {note.shared_with_professor === 1 ? (
                                      <Badge tone="gold">Shared</Badge>
                                    ) : (
                                      <span className="text-[0.72rem] text-ink-400">
                                        private
                                      </span>
                                    )}
                                    {note.at_seconds !== null ? (
                                      <span className="font-mono text-[0.75rem] text-ink-400">
                                        {formatClock(note.at_seconds)}
                                      </span>
                                    ) : null}
                                  </div>
                                  {note.title ? (
                                    <p className="mt-1 text-[0.85rem] font-medium text-ink-800">
                                      {note.title}
                                    </p>
                                  ) : null}
                                  <p className="mt-0.5 text-[0.85rem] leading-relaxed text-ink-600">
                                    {note.body}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </CardBody>
                      </Card>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {lecture.student_notes ? (
            <section aria-labelledby="notes-heading">
              <Card>
                <CardHeader
                  title="Teaching notes from your professor"
                  id="notes-heading"
                />
                <CardBody>
                  <RichText source={lecture.student_notes} />
                </CardBody>
              </Card>
            </section>
          ) : null}

          {lecture.transcript_text ? (
            <section aria-labelledby="transcript-heading">
              <Card>
                <CardHeader
                  title="Transcript"
                  id="transcript-heading"
                  description="Provided by your professor. Use your browser's find command to search it."
                />
                <CardBody>
                  <Transcript source={lecture.transcript_text} />
                </CardBody>
              </Card>
            </section>
          ) : null}

          <section aria-labelledby="questions-heading">
            <Card>
              <CardHeader
                title="Questions from the class"
                id="questions-heading"
                description="Upvote a question to tell your professor it matters to you too."
              />
              <CardBody className="p-0">
                {questions.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-ink-500">
                    No questions yet on this lecture. Ask the first one from any
                    section above.
                  </p>
                ) : (
                  <ul className="divide-y divide-sand-100">
                    {questions.map((question) => {
                      const mine = question.student_id === student.studentId;
                      const voted = votedIds.has(question.id);
                      return (
                        <li key={question.id} className="px-5 py-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge tone="burgundy">
                                  {QUESTION_KIND_LABELS[question.kind]}
                                </Badge>
                                <Badge
                                  tone={
                                    question.status === "open"
                                      ? "attention"
                                      : "track"
                                  }
                                >
                                  {QUESTION_STATUS_LABELS[question.status]}
                                </Badge>
                                {mine ? (
                                  <span className="text-[0.75rem] text-ink-400">
                                    yours
                                  </span>
                                ) : null}
                                {question.at_seconds !== null ? (
                                  <span className="font-mono text-[0.75rem] text-ink-400">
                                    {formatClock(question.at_seconds)}
                                  </span>
                                ) : null}
                              </div>

                              <p className="mt-1.5 text-[0.9rem] text-ink-800">
                                {question.body}
                              </p>
                              <p className="mt-1 text-[0.78rem] text-ink-400">
                                {question.anonymous === 1
                                  ? "Anonymous"
                                  : question.student_name}
                                {question.segment_heading
                                  ? ` · on "${question.segment_heading}"`
                                  : ""}
                                {" · "}
                                {relativeTime(question.created_at)}
                              </p>

                              {question.answer_body ? (
                                <div className="mt-2 rounded-md border border-track-200 bg-track-50 px-3 py-2">
                                  <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-track-600">
                                    {course.professor_name} answered
                                  </p>
                                  <p className="mt-1 text-[0.88rem] leading-relaxed text-ink-700">
                                    {question.answer_body}
                                  </p>
                                </div>
                              ) : null}
                            </div>

                            {mine ? null : (
                              <form action={voteQuestionAction} className="shrink-0">
                                <input
                                  type="hidden"
                                  name="courseId"
                                  value={courseId}
                                />
                                <input
                                  type="hidden"
                                  name="questionId"
                                  value={question.id}
                                />
                                <Button
                                  type="submit"
                                  variant="secondary"
                                  size="sm"
                                  aria-pressed={voted}
                                  className={
                                    voted
                                      ? "border-burgundy-400 bg-burgundy-50 text-burgundy-700"
                                      : undefined
                                  }
                                >
                                  <span aria-hidden="true">▲</span>{" "}
                                  {question.votes}
                                  <span className="sr-only">
                                    {voted
                                      ? " upvotes — you upvoted this, press to undo"
                                      : " upvotes — press to upvote"}
                                  </span>
                                </Button>
                              </form>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardBody>
            </Card>
          </section>
        </div>

        <aside className="min-w-0 space-y-6">
          {segments.length > 0 ? (
            <Card>
              <CardHeader title="Timeline" level={3} />
              <CardBody className="p-0">
                <ol className="divide-y divide-sand-100">
                  {segments.map((segment) => {
                    const set = markersBySegment.get(segment.id);
                    const noteCount = (notesBySegment.get(segment.id) ?? []).length;
                    return (
                      <li key={segment.id}>
                        <a
                          href={`#segment-${segment.id}`}
                          className="block px-4 py-2.5 no-underline hover:bg-cream-100"
                        >
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="min-w-0 text-[0.85rem] text-ink-700">
                              {segment.heading}
                            </span>
                            <span className="shrink-0 font-mono text-[0.72rem] text-ink-400">
                              {formatClock(segment.start_seconds)}
                            </span>
                          </span>
                          {set || noteCount > 0 ? (
                            <span className="mt-1 flex flex-wrap gap-1.5 text-[0.72rem]">
                              {set?.has("clear") ? (
                                <span className="text-track-600">✓ clear</span>
                              ) : null}
                              {set?.has("confusing") ? (
                                <span className="text-attention-600">
                                  ? confusing
                                </span>
                              ) : null}
                              {set?.has("important") ? (
                                <span className="text-burgundy-600">
                                  ★ important
                                </span>
                              ) : null}
                              {set?.has("exam_likely") ? (
                                <span className="text-gold-600">✎ exam</span>
                              ) : null}
                              {noteCount > 0 ? (
                                <span className="text-ink-500">
                                  {noteCount} note{noteCount === 1 ? "" : "s"}
                                </span>
                              ) : null}
                            </span>
                          ) : null}
                        </a>
                      </li>
                    );
                  })}
                </ol>
              </CardBody>
            </Card>
          ) : null}

          {objectives.length > 0 ? (
            <Card>
              <CardHeader title="What this lecture teaches" level={3} />
              <CardBody>
                <ul className="space-y-2">
                  {objectives.map((objective) => (
                    <li key={objective.id} className="text-[0.85rem]">
                      <span className="font-medium text-burgundy-600">
                        {objective.code}
                      </span>{" "}
                      <span className="text-ink-600">{objective.text}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}

          {concepts.length > 0 ? (
            <Card>
              <CardHeader title="Key terms" level={3} />
              <CardBody>
                <dl className="space-y-3">
                  {concepts.map((concept) => (
                    <div key={concept.concept_id}>
                      <dt className="text-[0.88rem] font-medium text-ink-800">
                        {concept.name}
                      </dt>
                      {concept.definition ? (
                        <dd className="mt-0.5 text-[0.82rem] leading-relaxed text-ink-600">
                          {concept.definition}
                        </dd>
                      ) : null}
                      {concept.perspective ? (
                        <dd className="mt-1 rounded border border-gold-200 bg-gold-100 px-2 py-1.5 text-[0.78rem] leading-relaxed text-gold-600">
                          <span className="font-semibold">
                            Traditions differ here.
                          </span>{" "}
                          {concept.perspective}
                        </dd>
                      ) : null}
                    </div>
                  ))}
                </dl>
              </CardBody>
            </Card>
          ) : null}

          {scripture.length > 0 ? (
            <Card>
              <CardHeader title="Scripture" level={3} />
              <CardBody>
                <ul className="space-y-2">
                  {scripture.map((reference) => (
                    <li key={reference.id} className="text-[0.85rem]">
                      <span className="font-medium text-ink-800">
                        {reference.reference}
                      </span>
                      {reference.note ? (
                        <span className="block text-[0.8rem] text-ink-500">
                          {reference.note}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}

          {resources.length > 0 ? (
            <Card>
              <CardHeader title="Supplemental resources" level={3} />
              <CardBody>
                <ul className="space-y-2.5">
                  {resources.map((resource) => (
                    <li key={resource.material_id} className="text-[0.85rem]">
                      {resource.url ? (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {resource.title}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      ) : (
                        <span className="text-ink-800">{resource.title}</span>
                      )}
                      {resource.description ? (
                        <span className="mt-0.5 block text-[0.8rem] text-ink-500">
                          {resource.description}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}

          {bookmarks.length > 0 ? (
            <Card>
              <CardHeader title="Your bookmarks" level={3} />
              <CardBody className="p-0">
                <ul className="divide-y divide-sand-100">
                  {bookmarks.map((bookmark) => (
                    <li key={bookmark.id} className="px-4 py-2">
                      <a
                        href={
                          bookmark.segment_id
                            ? `#segment-${bookmark.segment_id}`
                            : "#outline-heading"
                        }
                        className="text-[0.85rem]"
                      >
                        {bookmark.label ?? formatClock(bookmark.at_seconds)}
                      </a>
                      <span className="ml-2 font-mono text-[0.72rem] text-ink-400">
                        {formatClock(bookmark.at_seconds)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Your work here" level={3} />
            <CardBody>
              <dl className="space-y-1.5 text-[0.85rem]">
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-500">Notes</dt>
                  <dd className="font-medium text-ink-800">{notes.length}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-500">Marked confusing</dt>
                  <dd className="font-medium text-ink-800">
                    {markers.filter((m) => m.marker === "confusing").length}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-500">Marked clear</dt>
                  <dd className="font-medium text-ink-800">
                    {markers.filter((m) => m.marker === "clear").length}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-500">Checks answered</dt>
                  <dd className="font-medium text-ink-800">
                    {answeredChecks} / {totalChecks}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-[0.8rem]">
                <Link href={`/student/${courseId}/readiness`}>
                  See what this adds up to →
                </Link>
              </p>
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}
