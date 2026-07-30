import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  approveAllSyllabusItemsAction,
  toggleSyllabusItemAction,
} from "@/app/professor/actions";
import { AIGeneratedTag } from "@/components/ui/ai-label";
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
  SYLLABUS_ITEM_KINDS,
  SYLLABUS_ITEM_KIND_LABELS,
  type SyllabusItemKind,
} from "@/lib/domain/vocabulary";
import { aiStatus } from "@/lib/ai";
import { formatDate } from "@/lib/format";
import { getSyllabus, listSyllabusItems } from "@/lib/repositories/content";
import { getCourse } from "@/lib/repositories/courses";
import {
  ExtractSyllabusForm,
  PublishSyllabusForm,
  SyllabusTextForm,
} from "./syllabus-forms";

export const metadata: Metadata = { title: "Syllabus" };

export default async function SyllabusPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = getCourse(courseId);
  if (!course) notFound();

  const syllabus = getSyllabus(courseId);
  const items = syllabus ? listSyllabusItems(syllabus.id) : [];
  const ai = aiStatus();

  const grouped = SYLLABUS_ITEM_KINDS.map((kind) => ({
    kind,
    items: items.filter((item) => item.kind === kind),
  })).filter((group) => group.items.length > 0);

  const approvedCount = items.filter((item) => item.approved === 1).length;

  return (
    <>
      <SectionHeading
        level={1}
        title="Syllabus"
        description="The syllabus becomes the organising structure of the course, not just a file to download."
      />

      <Notice tone="ai" title="How this extraction works" className="mb-6">
        <p>
          {ai.configured
            ? `Extraction runs through ${ai.providerLabel}.`
            : "No AI provider is configured, so extraction is rule-based: it pattern-matches common syllabus headings and bullet structures. It does not read prose."}
        </p>
        <p className="mt-2">
          Either way, every extracted row is a <strong>draft</strong>. Nothing
          reaches your course structure or your students until you approve it.
        </p>
      </Notice>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Syllabus source"
            description={
              syllabus
                ? `Added ${formatDate(syllabus.created_at)} · ${syllabus.source_type.replace(/_/g, " ")}`
                : "Paste the text of your syllabus to get started."
            }
          />
          <CardBody>
            <SyllabusTextForm
              courseId={courseId}
              defaultText={syllabus?.raw_text}
              defaultFileName={syllabus?.file_name}
            />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Extract a draft structure" level={3} />
            <CardBody className="space-y-4">
              {syllabus?.raw_text ? (
                <ExtractSyllabusForm courseId={courseId} />
              ) : (
                <p className="text-sm text-ink-500">
                  Save the syllabus text first.
                </p>
              )}
              {syllabus?.extraction_note ? (
                <p className="rounded-md border border-tan-100 bg-paper-100 px-3 py-2 text-[0.82rem] text-ink-600">
                  {syllabus.extraction_note}
                </p>
              ) : null}
            </CardBody>
          </Card>

          {items.length > 0 ? (
            <Card>
              <CardHeader
                title="Publish"
                description={`${approvedCount} of ${items.length} draft items approved.`}
                level={3}
              />
              <CardBody>
                <PublishSyllabusForm courseId={courseId} />
                {syllabus?.published_at ? (
                  <p className="mt-3 text-[0.82rem] text-track-600">
                    Last published {formatDate(syllabus.published_at)}.
                  </p>
                ) : null}
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>

      <section className="mt-8">
        <SectionHeading
          title="Extracted items"
          description="Review each row. Approve the ones that are right, and edit the syllabus text and re-extract if something is wrong."
          action={
            items.length > 0 ? (
              <form action={approveAllSyllabusItemsAction}>
                <input type="hidden" name="courseId" value={courseId} />
                <Button type="submit" variant="secondary" size="sm">
                  Approve all
                </Button>
              </form>
            ) : null
          }
        />

        {items.length === 0 ? (
          <EmptyState
            title="Nothing extracted yet"
            description="Save your syllabus text and run the extraction. Each recognised item appears here for review before anything is published."
          />
        ) : (
          <div className="space-y-6">
            {grouped.map((group) => (
              <Card key={group.kind}>
                <CardHeader
                  title={SYLLABUS_ITEM_KIND_LABELS[group.kind as SyllabusItemKind]}
                  description={`${group.items.length} item(s)`}
                  level={3}
                />
                <CardBody className="p-0">
                  <ul className="divide-y divide-tan-100">
                    {group.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-start justify-between gap-3 px-5 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {item.week_label ? (
                              <Badge>{item.week_label}</Badge>
                            ) : null}
                            {item.date_label ? (
                              <Badge tone="accent">{item.date_label}</Badge>
                            ) : null}
                            {item.ai_generated === 1 ? <AIGeneratedTag /> : null}
                            {item.approved === 1 ? (
                              <Badge tone="track">
                                <span aria-hidden="true">✓</span> Approved
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-1.5 text-sm text-ink-800">
                            {item.title}
                          </p>
                          {item.detail ? (
                            <p className="mt-1 text-[0.82rem] text-ink-500">
                              {item.detail}
                            </p>
                          ) : null}
                        </div>
                        <form action={toggleSyllabusItemAction} className="shrink-0">
                          <input type="hidden" name="itemId" value={item.id} />
                          <input type="hidden" name="courseId" value={courseId} />
                          <input
                            type="hidden"
                            name="approved"
                            value={item.approved === 1 ? "0" : "1"}
                          />
                          <Button
                            type="submit"
                            variant={item.approved === 1 ? "ghost" : "secondary"}
                            size="sm"
                          >
                            {item.approved === 1 ? "Withdraw approval" : "Approve"}
                          </Button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
