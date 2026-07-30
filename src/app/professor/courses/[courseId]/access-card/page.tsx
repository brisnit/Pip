import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintableAccessCard } from "@/components/course/course-access";
import { getCourse } from "@/lib/repositories/courses";

export const metadata: Metadata = { title: "Course access card" };

export default async function AccessCardPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = getCourse(courseId);
  if (!course?.access_code) notFound();

  return (
    <div className="py-2">
      <p className="mb-6 text-[0.85rem] no-print">
        <Link href={`/professor/courses/${courseId}`}>← Course overview</Link>
        {" · "}
        Use your browser&rsquo;s print command to print or save this card.
      </p>
      <PrintableAccessCard
        courseCode={course.code}
        courseTitle={course.title}
        professorName={course.professor_name}
        term={course.term}
        accessCode={course.access_code}
      />
    </div>
  );
}
