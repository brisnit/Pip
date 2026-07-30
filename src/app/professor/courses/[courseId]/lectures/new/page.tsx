import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui/primitives";
import {
  getCourse,
  listModules,
  listObjectives,
} from "@/lib/repositories/courses";
import { LectureForm } from "./lecture-form";

export const metadata: Metadata = { title: "Add a lecture" };

export default async function NewLecturePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = getCourse(courseId);
  if (!course) notFound();

  return (
    <>
      <p className="mb-2 text-[0.85rem]">
        <Link href={`/professor/courses/${courseId}/content`}>
          ← Content and lectures
        </Link>
      </p>
      <SectionHeading
        level={1}
        title="Add a lecture"
        description="Only the title is required. The outline and the comprehension questions are what make the lecture interactive, so they are worth the extra few minutes."
      />
      <LectureForm
        courseId={courseId}
        modules={listModules(courseId)}
        objectives={listObjectives(courseId)}
      />
    </>
  );
}
