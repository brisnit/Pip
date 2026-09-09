import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Play, Radio } from "lucide-react";
import { LessonRow } from "@/components/ui/cards";
import { ProgressBar } from "@/components/ui/progress";
import { Badge, EmptyState, SectionHeading } from "@/components/ui/primitives";
import { DELIVERY_MODE_LABELS } from "@/lib/domain/vocabulary";
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
      noteCount: allNotes.filter((note) => note.lecture_id === lecture.id)
        .length,
      confusingCount: allMarkers.filter(
        (marker) =>
          marker.lecture_id === lecture.id && marker.marker === "confusing",
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
        <div className="space-y-6">
          {grouped.map((group, groupIndex) => {
            /*
              Progress across the module, from the checks actually answered. Only
              shown where there are checks to answer — a 0% bar on a module with no
              questions would read as failure rather than as absence.
            */
            const checks = group.lectures.reduce((n, l) => n + l.checkCount, 0);
            const answered = group.lectures.reduce(
              (n, l) => n + l.answeredCount,
              0,
            );

            return (
              <section
                key={group.title}
                className="rounded-[1.5rem] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 px-1">
                  <div className="min-w-0">
                    <p className="text-[0.8rem] text-ink-400">
                      Module {groupIndex + 1}
                      {group.weekLabel ? ` · ${group.weekLabel}` : ""}
                    </p>
                    <h2 className="mt-1 text-[1.3rem] font-medium tracking-[-0.022em]">
                      {group.title}
                    </h2>
                  </div>

                  {checks > 0 ? (
                    <div className="w-40 shrink-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[0.8rem] text-ink-400">
                          Checks
                        </span>
                        <span className="text-[0.9rem] font-medium tabular-nums text-ink-900">
                          {answered}/{checks}
                        </span>
                      </div>
                      <ProgressBar
                        className="mt-1.5"
                        value={answered / checks}
                        label={`${group.title}: comprehension checks answered`}
                        tone="brand"
                      />
                    </div>
                  ) : null}
                </div>

                <ul className="mt-4 space-y-0.5">
                  {group.lectures.map((lecture, index) => (
                    <li key={lecture.id}>
                      <LessonRow
                        index={index + 1}
                        href={`/student/${courseId}/lecture/${lecture.id}`}
                        active={lecture.status === "live"}
                        leading={
                          lecture.status === "live" ? (
                            <Radio size={17} strokeWidth={1.75} />
                          ) : (
                            <Play
                              size={16}
                              strokeWidth={2}
                              fill="currentColor"
                            />
                          )
                        }
                        title={
                          <>
                            {lecture.title}
                            {lecture.status === "live" ? (
                              <Badge
                                tone="accent"
                                className="ml-2 align-middle"
                              >
                                Live now
                              </Badge>
                            ) : null}
                          </>
                        }
                        description={
                          <>
                            {DELIVERY_MODE_LABELS[lecture.delivery_mode]}
                            {lecture.scheduled_at
                              ? ` · ${formatDayMonth(lecture.scheduled_at)}`
                              : ""}
                            {` · ${pluralize(lecture.segment_count, "section")}`}
                            {lecture.noteCount > 0
                              ? ` · ${pluralize(lecture.noteCount, "note")}`
                              : ""}
                            {lecture.confusingCount > 0
                              ? ` · ${lecture.confusingCount} marked confusing`
                              : ""}
                          </>
                        }
                        trailing={
                          lecture.checkCount > 0
                            ? `${lecture.answeredCount}/${lecture.checkCount}`
                            : undefined
                        }
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
