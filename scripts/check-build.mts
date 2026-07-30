/**
 * Pre-start sanity check for `npm run start`.
 *
 * `next start` serves whatever `next build` last produced, and it reads route chunks
 * from `.next` lazily — so a build that is missing, incomplete, or older than the
 * source will not fail at startup. It fails later, on the first navigation to a route
 * whose chunks are absent, as an opaque server error on that page only. That is
 * genuinely hard to diagnose from the browser, so it is worth a few milliseconds here.
 *
 * Warns rather than exits: a stale build is sometimes exactly what you want to serve.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const buildDir = join(root, ".next");

function newestMtime(dir: string, ignore: string[] = []): number {
  let newest = 0;
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (ignore.includes(entry.name)) continue;
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        const { mtimeMs } = statSync(full);
        if (mtimeMs > newest) newest = mtimeMs;
      }
    }
  };
  try {
    walk(dir);
  } catch {
    return 0;
  }
  return newest;
}

if (!existsSync(buildDir)) {
  console.error(
    "\n[flc] There is no .next directory, so there is nothing for `next start` to " +
      "serve.\n      Run `npm run build` first, or use `npm run dev`.\n",
  );
  process.exit(1);
}

if (!existsSync(join(buildDir, "BUILD_ID"))) {
  console.error(
    "\n[flc] .next exists but has no BUILD_ID, so the build is incomplete or was " +
      "deleted part-way.\n      Run `npm run build` again.\n",
  );
  process.exit(1);
}

const builtAt = statSync(join(buildDir, "BUILD_ID")).mtimeMs;
const sourceChangedAt = Math.max(
  newestMtime(join(root, "src")),
  newestMtime(join(root, "public")),
);

if (sourceChangedAt > builtAt) {
  const minutes = Math.round((sourceChangedAt - builtAt) / 60_000);
  console.warn(
    `\n[flc] Source files changed ${minutes} minute(s) after the last build, so ` +
      `\`next start\` will serve stale code.\n      Run \`npm run build\` to pick up ` +
      `your changes, or use \`npm run dev\`.\n`,
  );
}
