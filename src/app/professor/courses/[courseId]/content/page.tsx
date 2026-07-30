import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteMaterialAction,
  setLectureStatusAction,
  setMaterialVisibilityAction,
} from "@/app/professor/actions";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  DemoBadge,
  EmptyState,
  Notice,
  SectionHeading,
} from "@/components/ui/primitives";
import { Select } from "@/components/ui/form";
import {
  CONTENT_TYPE_LABELS,
  DELIVERY_MODE_LABELS,
  INTERACTION_TYPE_LABELS,
  LECTURE_STATUS_LABELS,
  VISIBILITIES,
  VISIBILITY_LABELS,
  type ContentType,
} from "@/lib/domain/vocabulary";
import { formatClock } from "@/lib/domain/support";
import { formatDayMonth, formatFileSize, pluralize } from "@/lib/format";
import { listMaterials } from "@/lib/repositories/content";
import {
  getCourse,
  listConcepts,
  listModules,
  listObjectives,
} from "@/lib/repositories/courses";
import {
  listInteractions,
  listLectures,
  listSegments,
} from "@/lib/repositories/lectures";
import { MaterialForm } from "./material-form";

export const metadata: Metadata = { title: "Content and lectures" };

type Props = {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ lecture?: string; add?: string }>;
};

export default async function ContentPage({ params, searchParams }: Props) {
  const { courseId } = await params;
  const { lecture: highlightId, add } = await searchParams;

  const course = getCourse(courseId);
  if (!course) notFound();

  const modules = listModules(courseId);
  const objectives = listObjectives(courseId);
  const concepts = listConcepts(courseId);
  const materials = listMaterials(courseId);

  const lectures = listLectures(courseId).map((lecture) => {
    const interactions = listInteractions(lecture.id);
    return {
      ...lecture,
      segments: listSegments(lecture.id),
      interactions,
      checks: interactions.filter((i) => i.type === "comprehension_question"),
    };
  });

  const highlighted = highlightId
    ? lectures.find((lecture) => lecture.id === highlightId)
    : null;

  const defaultContentType = (
    add && add in CONTENT_TYPE_LABELS ? add : undefined
  ) as ContentType | undefined;

  return (
    <>
      <SectionHeading
        level={1}
        title="Content and lectures"
        description="Everything students can reach, plus the teaching material only you can see."
        action={
          <ButtonLink href={`/professor/courses/${courseId}/lectures/new`}>
            Add lecture
          </ButtonLink>
        }
      />

      {highlighted ? (
        <Notice tone="info" title="Lecture saved" className="mb-6">
          &ldquo;{highlighted.title}&rdquo; is{" "}
          {LECTURE_STATUS_LABELS[highlighted.status].toLowerCase()} with{" "}
          {pluralize(highlighted.segment_count, "section")} and{" "}
          {pluralize(highlighted.interaction_count, "interactive moment")}.
        </Notice>
      ) : null}

      <section className="mb-10">
        <SectionHeading title="Lectures" level={2} />

        {lectures.length === 0 ? (
          <EmptyState
            title="No lectures yet"
            description="A lecture is where students take timestamped notes, mark what is confusing, and answer comprehension checks. It is the core of the student experience."
            action={
              <ButtonLink href={`/professor/courses/${courseId}/lectures/new`}>
                Add your first lecture
              </ButtonLink>
            }
          />
        ) : (
          <ul className="space-y-4">
            {lectures.map((lecture) => {
              const { segments, interactions, checks } = lecture;

              return (
                <Card as="li" key={lecture.id}>
                  <CardBody>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-serif text-lg leading-snug">
                          {lecture.title}
                        </h3>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-[0.8rem] text-ink-500">
                          <Badge
                            tone={
                              lecture.status === "live"
                                ? "concern"
                                : lecture.status === "draft"
                                  ? "neutral"
                                  : "track"
                            }
                          >
                            {LECTURE_STATUS_LABELS[lecture.status]}
                          </Badge>
                          <span>
                            {DELIVERY_MODE_LABELS[lecture.delivery_mode]}
                          </span>
                          {lecture.module_title ? (
                            <span>· {lecture.module_title}</span>
                          ) : null}
                          {lecture.scheduled_at ? (
                            <span>· {formatDayMonth(lecture.scheduled_at)}</span>
                          ) : null}
                          {lecture.duration_minutes ? (
                            <span>· {lecture.duration_minutes} min</span>
                          ) : null}
                          {lecture.is_demo === 1 ? <DemoBadge /> : null}
                        </p>
                        {lecture.description ? (
                          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
                            {lecture.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <ButtonLink
                          href={`/professor/courses/${courseId}/lectures/${lecture.id}/live`}
                          variant={lecture.status === "live" ? "primary" : "secondary"}
                          size="sm"
                        >
                          {lecture.status === "live"
                            ? "Live console"
                            : "Open console"}
                        </ButtonLink>

                        <form action={setLectureStatusAction} className="flex gap-2">
                          <input type="hidden" name="courseId" value={courseId} />
                          <input type="hidden" name="lectureId" value={lecture.id} />
                          {lecture.status === "draft" ? (
                            <>
                              <input
                                type="hidden"
                                name="status"
                                value="published"
                              />
                              <Button type="submit" variant="ghost" size="sm">
                                Publish to students
                              </Button>
                            </>
                          ) : lecture.status === "live" ? (
                            <>
                              <input type="hidden" name="status" value="ended" />
                              <Button type="submit" variant="ghost" size="sm">
                                End live session
                              </Button>
                            </>
                          ) : (
                            <>
                              <input type="hidden" name="status" value="draft" />
                              <Button type="submit" variant="ghost" size="sm">
                                Unpublish
                              </Button>
                            </>
                          )}
                        </form>
                      </div>
                    </div>

                    <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-tan-100 pt-3 text-[0.82rem] text-ink-500">
                      <div className="flex gap-1.5">
                        <dt>Sections</dt>
                        <dd className="font-medium text-ink-700">
                          {segments.length}
                        </dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt>Interactive moments</dt>
                        <dd className="font-medium text-ink-700">
                          {interactions.length}
                        </dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt>Comprehension checks</dt>
                        <dd className="font-medium text-ink-700">
                          {checks.length}
                        </dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt>Student questions</dt>
                        <dd className="font-medium text-ink-700">
                          {lecture.question_count}
                        </dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt>Recording</dt>
                        <dd className="font-medium text-ink-700">
                          {lecture.video_url ? lecture.video_provider : "none"}
                        </dd>
                      </div>
                    </dl>

                    {segments.length > 0 ? (
                      <details className="mt-4 border-t border-tan-100 pt-3">
                        <summary className="cursor-pointer text-sm font-medium text-brand-700">
                          Outline and interactive moments
                        </summary>
                        <ol className="mt-3 space-y-3">
                          {segments.map((segment) => {
                            const moments = interactions.filter(
                              (i) => i.segment_id === segment.id,
                            );
                            return (
                              <li key={segment.id} className="text-sm">
                                <p className="font-medium text-ink-800">
                                  <span className="mr-2 font-mono text-[0.8rem] text-ink-400">
                                    {formatClock(segment.start_seconds)}
                                  </span>
                                  {segment.heading}
                                </p>
                                {moments.length > 0 ? (
                                  <ul className="mt-1 space-y-1 pl-4">
                                    {moments.map((moment) => (
                                      <li
                                        key={moment.id}
                                        className="text-[0.82rem] text-ink-500"
                                      >
                                        <span className="text-accent-700">
                                          {INTERACTION_TYPE_LABELS[moment.type]}
                                        </span>
                                        {" — "}
                                        {moment.prompt}
                                      </li>
                                    ))}
                                  </ul>
                                ) : null}
                              </li>
                            );
                          })}
                        </ol>
                      </details>
                    ) : null}
                  </CardBody>
                </Card>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <SectionHeading
          title="Course materials"
          level={2}
          description={`${materials.length} item(s). Teaching notes marked "professor only" are never sent to a student view.`}
        />

        {materials.length === 0 ? (
          <EmptyState
            title="No materials yet"
            description="Add readings, slide decks, study guides and links. Tagging them to an objective is what lets the support recommender point a student at the right one."
          />
        ) : (
          <Card>
            <CardBody className="p-0">
              <ul className="divide-y divide-tan-100">
                {materials.map((material) => (
                  <li key={material.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="brand">
                            {CONTENT_TYPE_LABELS[material.content_type]}
                          </Badge>
                          {material.visibility !== "students" ? (
                            <Badge tone="attention">
                              {VISIBILITY_LABELS[material.visibility]}
                            </Badge>
                          ) : null}
                          {material.module_title ? (
                            <span className="text-[0.78rem] text-ink-400">
                              {material.module_title}
                            </span>
                          ) : null}
                          {material.date_label ? (
                            <span className="text-[0.78rem] text-ink-400">
                              {material.date_label}
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-1.5 text-sm font-medium text-ink-800">
                          {material.url ? (
                            <a
                              href={material.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {material.title}
                              <span className="sr-only"> (opens in a new tab)</span>
                            </a>
                          ) : (
                            material.title
                          )}
                        </p>

                        {material.description ? (
                          <p className="mt-1 text-[0.85rem] leading-snug text-ink-500">
                            {material.description}
                          </p>
                        ) : null}

                        {material.file_name ? (
                          <p className="mt-1.5 text-[0.8rem] text-ink-400">
                            File: {material.file_name}
                            {formatFileSize(material.file_size)
                              ? ` (${formatFileSize(material.file_size)})`
                              : ""}{" "}
                            — metadata only, no file is stored
                          </p>
                        ) : null}

                        {material.objective_codes ? (
                          <p className="mt-1.5 text-[0.8rem] text-ink-500">
                            Objectives: {material.objective_codes}
                          </p>
                        ) : null}
                        {material.concept_names ? (
                          <p className="text-[0.8rem] text-ink-500">
                            Concepts: {material.concept_names}
                          </p>
                        ) : null}
                        {material.student_instructions ? (
                          <p className="mt-1.5 rounded border border-tan-100 bg-paper-100 px-2 py-1 text-[0.8rem] text-ink-600">
                            For students: {material.student_instructions}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <form
                          action={setMaterialVisibilityAction}
                          className="flex items-center gap-2"
                        >
                          <input type="hidden" name="courseId" value={courseId} />
                          <input
                            type="hidden"
                            name="materialId"
                            value={material.id}
                          />
                          <label
                            htmlFor={`vis-${material.id}`}
                            className="sr-only"
                          >
                            Visibility for {material.title}
                          </label>
                          <Select
                            id={`vis-${material.id}`}
                            name="visibility"
                            defaultValue={material.visibility}
                            className="w-auto py-1 text-[0.82rem]"
                          >
                            {VISIBILITIES.map((visibility) => (
                              <option key={visibility} value={visibility}>
                                {VISIBILITY_LABELS[visibility]}
                              </option>
                            ))}
                          </Select>
                          <Button type="submit" variant="secondary" size="sm">
                            Set
                          </Button>
                        </form>

                        <form action={deleteMaterialAction}>
                          <input type="hidden" name="courseId" value={courseId} />
                          <input
                            type="hidden"
                            name="materialId"
                            value={material.id}
                          />
                          <Button type="submit" variant="ghost" size="sm">
                            Remove
                          </Button>
                        </form>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </section>

      <section>
        <Card>
          <CardHeader
            title="Add material"
            description="Syllabi, notes, slides, readings, scripture, recordings, links and discussion prompts."
          />
          <CardBody>
            <MaterialForm
              courseId={courseId}
              modules={modules}
              objectives={objectives}
              concepts={concepts}
              defaultContentType={defaultContentType}
            />
          </CardBody>
        </Card>

        <p className="mt-4 text-[0.85rem] text-ink-500">
          Looking for the syllabus workflow?{" "}
          <Link href={`/professor/courses/${courseId}/syllabus`}>
            Open syllabus intelligence
          </Link>
          .
        </p>
      </section>
    </>
  );
}
