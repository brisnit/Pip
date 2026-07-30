import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Badge,
  Card,
  CardBody,
  EmptyState,
  SectionHeading,
} from "@/components/ui/primitives";
import {
  DELIVERY_MODE_LABELS,
  LECTURE_STATUS_LABELS,
} from "@/lib/domain/vocabulary";
import { formatDayMonth, pluralize } from "@/lib/format";
import { getCourse, listModules } from "@/lib/repositories/courses";
import { listMarkers, listNotes } from "@/lib/repositories/engagement";
import {
  listInteractionResponses,
  listInteractions,
  listStudentLectures,
} from "@/lib/repositories/lectures";
import { currentStudentInCourse } from "@/lib/role/role-context";

export const metadata: Metadata = { title: "Lectures" };

export default async function StudentLectureListPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = getCourse(courseId);
  const student = await currentStudentInCourse(courseId);
  if (!course || !student) notFound();

  const modules = listModules(courseId);
  const allNotes = listNotes(student.studentId, courseId);
  const allMarkers = listMarkers(student.studentId, courseId);

  const lectures = listStudentLectures(courseId).map((lecture) => {
    const checks = listInteractions(lecture.id, { publishedOnly: true }).filter(
      (interaction) => interaction.type === "comprehension_question",
    );
    const answered = listInteractionResponses(student.studentId, lecture.id);
    return {
      ...lecture,
      checkCount: checks.length,
      answeredCount: answered.filter((response) =>
        checks.some((check) => check.id === response.interaction_id),
      ).length,
      noteCount: allNotes.filter((note) => note.lecture_id === lecture.id).length,
      confusingCount: allMarkers.filter(
        (marker) => marker.lecture_id === lecture.id && marker.marker === "confusing",
      ).length,
    };
  });

  const grouped = [
    ...modules.map((module) => ({
      title: module.title,
      weekLabel: module.week_label,
      lectures: lectures.filter((lecture) => lecture.module_id === module.id),
    })),
    {
      title: "Not assigned to a module",
      weekLabel: null,
      lectures: lectures.filter((lecture) => !lecture.module_id),
    },
  ].filter((group) => group.lectures.length > 0);

  return (
    <>
      <SectionHeading
        level={1}
        title="Lectures"
        description="Open a lecture to take notes anchored to the moment, mark what is and is not landing, and answer the comprehension checks."
      />

      {lectures.length === 0 ? (
        <EmptyState
          title="No lectures published yet"
          description="Your professor has not published a lecture for this course. This page fills in as soon as one appears."
        />
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <section key={group.title}>
              <h2 className="mb-3 font-serif text-lg">
                {group.title}
                {group.weekLabel ? (
                  <span className="ml-2 text-[0.8rem] font-normal text-ink-400">
                    {group.weekLabel}
                  </span>
                ) : null}
              </h2>
              <ul className="space-y-3">
                {group.lectures.map((lecture) => (
                  <Card as="li" key={lecture.id}>
                    <CardBody>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {lecture.status === "live" ? (
                              <Badge tone="concern">Live now</Badge>
                            ) : (
                              <Badge>{LECTURE_STATUS_LABELS[lecture.status]}</Badge>
                            )}
                            <span className="text-[0.8rem] text-ink-500">
                              {DELIVERY_MODE_LABELS[lecture.delivery_mode]}
                            </span>
                            {lecture.scheduled_at ? (
                              <span className="text-[0.8rem] text-ink-500">
                                · {formatDayMonth(lecture.scheduled_at)}
                              </span>
                            ) : null}
                          </div>

                          <h3 className="mt-1.5 font-serif text-lg leading-snug">
                            <Link
                              href={`/student/${courseId}/lecture/${lecture.id}`}
                              className="no-underline hover:underline"
                            >
                              {lecture.title}
                            </Link>
                          </h3>

                          {lecture.description ? (
                            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-600">
                              {lecture.description}
                            </p>
                          ) : null}
                        </div>

                        <dl className="shrink-0 space-y-0.5 text-right text-[0.8rem] text-ink-500">
                          {lecture.checkCount > 0 ? (
                            <div>
                              <dt className="inline">Checks </dt>
                              <dd className="inline font-medium text-ink-700">
                                {lecture.answeredCount} / {lecture.checkCount}
                              </dd>
                            </div>
                          ) : null}
                          {lecture.noteCount > 0 ? (
                            <div>
                              <dt className="inline">Your notes </dt>
                              <dd className="inline font-medium text-ink-700">
                                {lecture.noteCount}
                              </dd>
                            </div>
                          ) : null}
                          {lecture.confusingCount > 0 ? (
                            <div>
                              <dt className="inline">Marked confusing </dt>
                              <dd className="inline font-medium text-attention-600">
                                {lecture.confusingCount}
                              </dd>
                            </div>
                          ) : null}
                          <div>
                            <dt className="inline">Sections </dt>
                            <dd className="inline font-medium text-ink-700">
                              {lecture.segment_count}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <p className="mt-3 text-[0.82rem] text-ink-400">
                        {pluralize(lecture.interaction_count, "interactive moment")}
                        {lecture.question_count > 0
                          ? ` · ${pluralize(lecture.question_count, "class question")}`
                          : ""}
                      </p>
                    </CardBody>
                  </Card>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
