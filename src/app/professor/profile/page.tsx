import type { Metadata } from "next";
import { ProfessorShell } from "@/components/layout/shells";
import { ProfileForm } from "@/components/profile/profile-form";
import { ProfileHeader, ProfileSection } from "@/components/profile/profile-shell";
import { SectionHeading } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/format";
import { completeness, PROFESSOR_FIELDS } from "@/lib/repositories/profiles";
import { requireProfessor } from "@/lib/role/role-context";
import { saveProfessorProfileAction } from "./actions";

export const metadata: Metadata = { title: "Your profile" };
export const dynamic = "force-dynamic";

export default async function ProfessorProfilePage() {
  const { professor } = requireProfessor();
  const filled = completeness(
    professor as unknown as Record<string, unknown>,
    PROFESSOR_FIELDS as never,
  );

  const values = Object.fromEntries(
    PROFESSOR_FIELDS.map((field) => [
      field.key,
      (professor[field.key] as string | null) ?? "",
    ]),
  );

  const contactFields = PROFESSOR_FIELDS.filter((f) =>
    ["title", "department", "email", "office", "phone", "office_hours", "website", "linkedin"].includes(f.key),
  );
  const academicFields = PROFESSOR_FIELDS.filter((f) =>
    ["bio", "credentials", "academic_interests", "research_areas"].includes(f.key),
  );
  const teachingFields = PROFESSOR_FIELDS.filter((f) =>
    ["teaching_philosophy", "calendar_availability"].includes(f.key),
  );

  return (
    <ProfessorShell professorName={professor.name}>
      <ProfileHeader
        name={professor.name}
        subtitle={[professor.title, professor.department].filter(Boolean).join(" · ") || null}
        photoUrl={professor.photo_url}
        completeness={filled}
      />

      <div className="mt-6 space-y-6">
        <ProfileSection
          title="Contact"
          row={professor as unknown as Record<string, unknown>}
          fields={contactFields as never}
        />
        <ProfileSection
          title="Academic background"
          row={professor as unknown as Record<string, unknown>}
          fields={academicFields as never}
        />
        <ProfileSection
          title="Teaching"
          row={professor as unknown as Record<string, unknown>}
          fields={teachingFields as never}
        />
      </div>

      <section className="mt-10">
        <SectionHeading
          title="Edit profile"
          description="Everything is optional. Your name and title appear to students on every course you teach; the rest is context for colleagues and, in time, for AI assistance you approve."
        />
        <div className="rounded-2xl border border-tan-100 bg-white p-6 shadow-[0_1px_3px_rgba(4,43,50,0.04)] sm:p-8">
          <ProfileForm
            action={saveProfessorProfileAction}
            fields={PROFESSOR_FIELDS.map(({ key, label, hint, long, type }) => ({
              key,
              label,
              hint,
              long,
              type,
            }))}
            values={values}
            nameLabel="Full name"
            nameValue={professor.name}
          />
          {professor.profile_updated_at ? (
            <p className="mt-4 text-[0.8rem] text-ink-400">
              Last updated {formatDateTime(professor.profile_updated_at)}.
            </p>
          ) : null}
        </div>
      </section>
    </ProfessorShell>
  );
}
