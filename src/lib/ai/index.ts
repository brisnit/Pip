import "server-only";

import { getDb, nowIso } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import { PrototypeAIProvider } from "./prototype-provider";
import type { AIProvider, AIResult } from "./types";
import type { AiArtifactRow } from "@/lib/repositories/types";

export * from "./types";

let cached: AIProvider | null = null;

/**
 * Resolves the configured AI provider.
 *
 * No real provider is wired up in this prototype. When `AI_PROVIDER` names one
 * that has not been implemented, we fall back to the deterministic provider and
 * say so, rather than failing at request time or silently pretending.
 *
 * Adding a real provider means implementing the `AIProvider` interface and adding
 * one branch here. See docs/ai-integration-plan.md.
 */
export function getAIProvider(): AIProvider {
  if (cached) return cached;

  const requested = process.env.AI_PROVIDER?.trim().toLowerCase();

  switch (requested) {
    case undefined:
    case "":
    case "prototype":
      cached = new PrototypeAIProvider();
      break;
    default:
      console.warn(
        `[ai] AI_PROVIDER="${requested}" is not implemented in this prototype. ` +
          `Falling back to deterministic sample output. See docs/ai-integration-plan.md.`,
      );
      cached = new PrototypeAIProvider();
  }

  return cached;
}

export function aiStatus(): {
  configured: boolean;
  providerLabel: string;
  requested: string | null;
} {
  const provider = getAIProvider();
  return {
    configured: !provider.isSimulated,
    providerLabel: provider.label,
    requested: process.env.AI_PROVIDER?.trim() || null,
  };
}

// Persistence ----------------------------------------------------------------

export type SaveArtifactInput<T> = {
  result: AIResult<T>;
  kind: string;
  courseId?: string | null;
  lectureId?: string | null;
  studentId?: string | null;
  title?: string | null;
};

/** Stores an AI result with its provenance so the UI can always label it. */
export function saveArtifact<T>(input: SaveArtifactInput<T>): string {
  const id = newId("ai");
  const { provenance } = input.result;

  getDb()
    .prepare(
      `INSERT INTO ai_artifacts (
         id, course_id, lecture_id, student_id, kind, provider_id, provider_label,
         is_simulated, title, content, source_note, approved, created_at
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,0,?)`,
    )
    .run(
      id,
      input.courseId ?? null,
      input.lectureId ?? null,
      input.studentId ?? null,
      input.kind,
      provenance.providerId,
      provenance.providerLabel,
      provenance.isSimulated ? 1 : 0,
      input.title ?? null,
      JSON.stringify(input.result.data),
      provenance.sourceNote,
      nowIso(),
    );

  return id;
}

export function listArtifacts(
  filters: {
    courseId?: string;
    lectureId?: string;
    studentId?: string;
    kind?: string;
    limit?: number;
  } = {},
): AiArtifactRow[] {
  const clauses: string[] = ["1 = 1"];
  const params: (string | number)[] = [];

  if (filters.courseId) {
    clauses.push("course_id = ?");
    params.push(filters.courseId);
  }
  if (filters.lectureId) {
    clauses.push("lecture_id = ?");
    params.push(filters.lectureId);
  }
  if (filters.studentId) {
    clauses.push("student_id = ?");
    params.push(filters.studentId);
  }
  if (filters.kind) {
    clauses.push("kind = ?");
    params.push(filters.kind);
  }
  params.push(filters.limit ?? 20);

  return getDb()
    .prepare<(string | number)[], AiArtifactRow>(
      `SELECT * FROM ai_artifacts WHERE ${clauses.join(" AND ")}
       ORDER BY created_at DESC LIMIT ?`,
    )
    .all(...params);
}

export function getArtifact(id: string): AiArtifactRow | null {
  return (
    getDb()
      .prepare<[string], AiArtifactRow>("SELECT * FROM ai_artifacts WHERE id = ?")
      .get(id) ?? null
  );
}

export function parseArtifact<T>(row: AiArtifactRow): T {
  return JSON.parse(row.content) as T;
}

export function approveArtifact(id: string, professorId: string) {
  getDb()
    .prepare(
      `UPDATE ai_artifacts SET approved = 1, reviewed_by = ?, reviewed_at = ?
       WHERE id = ?`,
    )
    .run(professorId, nowIso(), id);
}
