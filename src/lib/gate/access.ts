/**
 * Shared-password gate for hosted demos.
 *
 * This is **not authentication.** It is one password shared by everyone who has the
 * link, with no identity, no roles and no audit trail. Its only job is to stop a
 * public URL being stumbled upon, forwarded onward, or indexed — because the
 * professor portal has no login and shows student-shaped records.
 *
 * Real authentication is described in docs/future-authentication-plan.md and remains
 * a prerequisite for any use with real student data. Nothing here changes that.
 *
 * Disabled entirely when `DEMO_ACCESS_PASSWORD` is unset, so local development and
 * the test suites are unaffected.
 */

export const GATE_COOKIE = "flc_demo_access";

/** The configured password, or null when the gate is off. */
export function gatePassword(): string | null {
  const value = process.env.DEMO_ACCESS_PASSWORD?.trim();
  return value ? value : null;
}

export function gateEnabled(): boolean {
  return gatePassword() !== null;
}

/**
 * The cookie value proving the password was entered.
 *
 * A SHA-256 digest of the password plus a fixed application label, so the cookie is
 * not the password in plaintext and rotating the password invalidates every existing
 * cookie. Uses Web Crypto, which is available in both the Edge middleware runtime
 * and the Node server runtime.
 */
export async function gateToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(
    `fuller-learning-companion:demo-gate:v1:${password}`,
  );
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Length-independent, constant-time-ish string comparison. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export const gateCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
  secure: process.env.NODE_ENV === "production",
};
