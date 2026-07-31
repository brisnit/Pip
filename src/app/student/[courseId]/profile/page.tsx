import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileForm } from "@/components/profile/profile-form";
import { ProfileHeader, ProfileSection } from "@/components/profile/profile-shell";
import { Notice, SectionHeading } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/format";
import {
  completeness,
  getStudentProfile,
  STUDENT_FIELDS,
} from "@/lib/repositories/profiles";
import { currentStudentInCourse } from "@/lib/role/role-context";
import { saveStudentProfileAction } from "./actions";

export const metadata: Metadata = { title: "Your profile" };
export const dynamic = "force-dynamic";

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const session = await currentStudentInCourse(courseId);
  if (!session) notFound();

  const student = getStudentProfile(session.studentId);
  if (!student) notFound();

  const filled = completeness(
    student as unknown as Record<string, unknown>,
    STUDENT_FIELDS as never,
  );

  const values = Object.fromEntries(
    STUDENT_FIELDS.map((field) => [
      field.key,
      (student[field.key] as string | null) ?? "",
    ]),
  );

  const identityFields = STUDENT_FIELDS.filter((f) =>
    ["preferred_name", "legal_name", "email", "student_id_number", "timezone"].includes(f.key),
  );
  const studyFields = STUDENT_FIELDS.filter((f) =>
    ["program", "degree", "year_of_study", "expected_graduation", "advisor"].includes(f.key),
  );
  const contextFields = STUDENT_FIELDS.filter((f) =>
    ["church", "ministry", "learning_preferences", "accessibility_needs", "notification_preferences"].includes(f.key),
  );

  return (
    <>
      <ProfileHeader
        name={student.preferred_name?.trim() || student.name}
        subtitle={[student.program, student.year_of_study].filter(Boolean).join(" · ") || null}
        photoUrl={student.photo_url}
        completeness={filled}
      />

      <div className="mt-6 space-y-6">
        <ProfileSection
          title="About you"
          row={student as unknown as Record<string, unknown>}
          fields={identityFields as never}
        />
        <ProfileSection
          title="Your studies"
          row={student as unknown as Record<string, unknown>}
          fields={studyFields as never}
        />
        <ProfileSection
          title="Context and preferences"
          row={student as unknown as Record<string, unknown>}
          fields={contextFields as never}
        />
      </div>

      <section className="mt-10">
        <SectionHeading
          title="Edit profile"
          description="Everything is optional. Your name is what your professor sees on their roster; the rest is yours."
        />
        <div className="rounded-2xl border border-tan-100 bg-white p-6 shadow-[0_1px_3px_rgba(4,43,50,0.04)] sm:p-8">
          <ProfileForm
            action={saveStudentProfileAction}
            fields={STUDENT_FIELDS.map(({ key, label, hint, long, type }) => ({
              key,
              label,
              hint,
              long,
              type,
            }))}
            values={values}
            nameLabel="Name"
            nameValue={student.name}
          />
          {student.profile_updated_at ? (
            <p className="mt-4 text-[0.8rem] text-ink-400">
              Last updated {formatDateTime(student.profile_updated_at)}.
            </p>
          ) : null}
        </div>
      </section>

      <Notice tone="privacy" title="Who sees this" className="mt-8">
        Your professor sees your name and can see this profile alongside your
        coursework. Accessibility needs and learning preferences are read by a person,
        not fed into any automated decision — readiness is computed only from what you
        record in a course.
      </Notice>
    </>
  );
}
