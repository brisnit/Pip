import { randomUUID } from "node:crypto";

/**
 * Stable, prefixed identifiers. The prefix makes IDs self-describing in logs and
 * URLs, and makes it obvious when the wrong kind of ID is threaded somewhere.
 */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1

/**
 * Short human-readable course access code. Case-insensitive on lookup and free
 * of characters that are easy to misread when written on a whiteboard.
 */
export function newCourseCode(length = 6): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

export function normalizeCourseCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
