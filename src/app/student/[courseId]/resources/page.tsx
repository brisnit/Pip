import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Notice,
  SectionHeading,
} from "@/components/ui/primitives";
import {
  CONTENT_TYPE_LABELS,
  SYLLABUS_ITEM_KINDS,
  SYLLABUS_ITEM_KIND_LABELS,
  type SyllabusItemKind,
} from "@/lib/domain/vocabulary";
import { formatFileSize } from "@/lib/format";
import {
  getSyllabus,
  listMaterials,
  listSyllabusItems,
} from "@/lib/repositories/content";
import {
  getCourse,
  listConcepts,
  listModules,
  listObjectives,
} from "@/lib/repositories/courses";
import { currentStudentInCourse } from "@/lib/role/role-context";

export const metadata: Metadata = { title: "Resources" };

/** Syllabus item kinds worth showing a student, in reading order. */
const STUDENT_SYLLABUS_KINDS: SyllabusItemKind[] = [
  "weekly_topic",
  "reading",
  "assignment",
  "exam",
  "important_date",
  "grading_category",
  "study_schedule",
];

export default async function StudentResourcesPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = getCourse(courseId);
  const student = await currentStudentInCourse(courseId);
  if (!course || !student) notFound();

  const modules = listModules(courseId);
  const objectives = listObjectives(courseId);
  const concepts = listConcepts(courseId);
  const materials = listMaterials(courseId, { studentVisibleOnly: true });

  const syllabus = getSyllabus(courseId);
  const syllabusItems =
    syllabus && syllabus.published_at
      ? listSyllabusItems(syllabus.id).filter((item) => item.approved === 1)
      : [];

  const grouped = [
    ...modules.map((module) => ({
      title: module.title,
      weekLabel: module.week_label,
      description: module.description,
      materials: materials.filter(
        (material) => material.module_id === module.id,
      ),
    })),
    {
      title: "Course-wide",
      weekLabel: null,
      description: null,
      materials: materials.filter((material) => !material.module_id),
    },
  ].filter((group) => group.materials.length > 0);

  return (
    <>
      <SectionHeading
        level={1}
        title="Resources"
        description="Everything your professor has published for this course, organised by module."
      />

      {materials.length === 0 && syllabusItems.length === 0 ? (
        <EmptyState
          title="No resources published yet"
          description="Readings, slides, study guides and links appear here as your professor adds them."
        />
      ) : null}

      {grouped.length > 0 ? (
        <div className="space-y-8">
          {grouped.map((group) => (
            <section key={group.title}>
              <h2 className="font-serif text-lg">
                {group.title}
                {group.weekLabel ? (
                  <span className="ml-2 text-[0.8rem] font-normal text-ink-400">
                    {group.weekLabel}
                  </span>
                ) : null}
              </h2>
              {group.description ? (
                <p className="mt-1 max-w-2xl text-sm text-ink-500">
                  {group.description}
                </p>
              ) : null}

              <ul className="mt-3 space-y-3">
                {group.materials.map((material) => (
                  <Card as="li" key={material.id}>
                    <CardBody className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="brand">
                          {CONTENT_TYPE_LABELS[material.content_type]}
                        </Badge>
                        {material.date_label ? (
                          <span className="text-[0.78rem] text-ink-400">
                            {material.date_label}
                          </span>
                        ) : null}
                        {material.objective_codes ? (
                          <span className="text-[0.78rem] text-ink-400">
                            {material.objective_codes}
                          </span>
                        ) : null}
                      </div>

                      <h3 className="mt-1.5 text-[0.98rem] font-semibold">
                        {material.url ? (
                          <a
                            href={material.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {material.title}
                            <span className="sr-only">
                              {" "}
                              (opens in a new tab)
                            </span>
                          </a>
                        ) : (
                          material.title
                        )}
                      </h3>

                      {material.description ? (
                        <p className="mt-1 text-[0.88rem] leading-relaxed text-ink-600">
                          {material.description}
                        </p>
                      ) : null}

                      {material.student_instructions ? (
                        <p className="mt-2 rounded border border-tan-100 bg-paper-100 px-3 py-2 text-[0.85rem] text-ink-700">
                          <span className="font-medium">
                            From {course.professor_name}:
                          </span>{" "}
                          {material.student_instructions}
                        </p>
                      ) : null}

                      {material.file_name ? (
                        <p className="mt-2 text-[0.8rem] text-ink-400">
                          {material.file_name}
                          {formatFileSize(material.file_size)
                            ? ` (${formatFileSize(material.file_size)})`
                            : ""}{" "}
                          — filenames are recorded but files are not stored here, so
                          there is nothing to download. Ask your professor for it.
                        </p>
                      ) : null}

                      {material.concept_names ? (
                        <p className="mt-1.5 text-[0.8rem] text-ink-500">
                          Concepts: {material.concept_names}
                        </p>
                      ) : null}
                    </CardBody>
                  </Card>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : null}

      {syllabusItems.length > 0 ? (
        <section className="mt-10">
          <SectionHeading
            title="From the syllabus"
            description="Published by your professor after review."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {STUDENT_SYLLABUS_KINDS.map((kind) => {
              const items = syllabusItems.filter((item) => item.kind === kind);
              if (items.length === 0) return null;
              return (
                <Card key={kind}>
                  <CardHeader
                    title={SYLLABUS_ITEM_KIND_LABELS[kind]}
                    level={3}
                  />
                  <CardBody className="p-0">
                    <ul className="divide-y divide-tan-100">
                      {items.map((item) => (
                        <li key={item.id} className="px-5 py-2.5">
                          <div className="flex flex-wrap items-baseline gap-2">
                            {item.week_label ? (
                              <span className="text-[0.75rem] font-medium text-ink-400">
                                {item.week_label}
                              </span>
                            ) : null}
                            {item.date_label ? (
                              <Badge tone="accent">{item.date_label}</Badge>
                            ) : null}
                          </div>
                          <p className="text-[0.88rem] text-ink-700">
                            {item.title}
                          </p>
                          {item.detail ? (
                            <p className="mt-0.5 text-[0.8rem] text-ink-500">
                              {item.detail}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </CardBody>
                </Card>
              );
            })}
          </div>
          <p className="mt-3 text-[0.8rem] text-ink-400">
            {SYLLABUS_ITEM_KINDS.length > 0
              ? "Extracted from the syllabus and reviewed by your professor before publishing."
              : null}
          </p>
        </section>
      ) : null}

      {objectives.length > 0 ? (
        <Card className="mt-10">
          <CardHeader
            title="Learning objectives"
            description="What the course is measuring — and what your readiness view is measured against."
          />
          <CardBody>
            <ul className="space-y-2">
              {objectives.map((objective) => (
                <li key={objective.id} className="flex gap-3 text-sm">
                  <span className="shrink-0 font-medium text-brand-600">
                    {objective.code}
                  </span>
                  <span className="text-ink-700">{objective.text}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[0.85rem]">
              <Link href={`/student/${courseId}/readiness`}>
                See where you stand on each →
              </Link>
            </p>
          </CardBody>
        </Card>
      ) : null}

      {concepts.length > 0 ? (
        <Card className="mt-6">
          <CardHeader
            title="Key theological terms"
            description="Your professor's definitions, with a note where traditions genuinely differ."
          />
          <CardBody>
            <dl className="space-y-4">
              {concepts.map((concept) => (
                <div key={concept.id}>
                  <dt className="text-[0.95rem] font-semibold">{concept.name}</dt>
                  {concept.definition ? (
                    <dd className="mt-0.5 text-[0.88rem] leading-relaxed text-ink-600">
                      {concept.definition}
                    </dd>
                  ) : null}
                  {concept.perspective ? (
                    <dd className="mt-1.5 rounded-md border border-accent-200 bg-accent-50 px-3 py-2 text-[0.82rem] leading-relaxed text-accent-700">
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

      <Notice tone="info" className="mt-8">
        Materials your professor marked as teaching notes are not shown here. This
        page lists only what has been made visible to students.
      </Notice>
    </>
  );
}
