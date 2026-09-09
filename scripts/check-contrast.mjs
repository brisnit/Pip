/**
 * Verifies every foreground/background pairing the app renders clears WCAG 2.2 AA.
 *
 * The palette is READ FROM src/app/globals.css rather than copied here. It used to be
 * a second hardcoded copy, which drifted the moment the design system was rebranded —
 * the script happily reported "all pairings pass" against colours the app no longer
 * used. Parsing the real tokens means this cannot pass for the wrong palette.
 *
 * Two constraints in this system need guarding:
 *   1. Light blue #A7C1FF is ~1.9:1 on white, so it can never carry text.
 *   2. The hairline border is deliberately below 3:1; interactive control
 *      boundaries therefore use a stronger slate, which WCAG 1.4.11 requires.
 *
 *   npm run check:contrast
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(here, "../src/app/globals.css"), "utf8");

/** Every `--color-<name>: <hex>` declared in the @theme block. */
const P = Object.fromEntries(
  [...css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)].map(
    ([, name, value]) => [name, value],
  ),
);

if (Object.keys(P).length === 0) {
  console.error(
    "No --color-* tokens found in globals.css. Has the @theme block moved?",
  );
  process.exit(1);
}

const hex = (h) => {
  const v = h.replace("#", "");
  const full = v.length === 3 ? [...v].map((c) => c + c).join("") : v;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};
const lin = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = (h) => {
  const [r, g, b] = hex(h);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

const c = (k) => {
  if (k.startsWith("#")) return k;
  const v = P[k];
  if (!v) {
    console.error(`Unknown token "${k}" — it is not declared in globals.css.`);
    process.exit(1);
  }
  return v;
};

// ── The five brand values, for reference ────────────────────────────────────
const BRAND = {
  ink: "#0B0D16",
  surface: "#FFFFFF",
  brand: "#2F5BFF",
  slate: "#6C7A95",
  "light blue": "#A7C1FF",
};

/**
 * Pairings the app really renders.
 *
 * `graphic` in a label marks something judged at 3:1 (WCAG 1.4.11 non-text) rather
 * than 4.5:1 — borders, focus rings, and the chart fills, which are never the only
 * carrier of meaning because every band also has a glyph, a label and a count.
 */
const PAIRS = [
  ["body text on canvas", "ink-900", "paper-100"],
  ["body text on white", "ink-900", "#ffffff"],
  ["secondary text on canvas", "ink-500", "paper-100"],
  ["secondary text on white", "ink-500", "#ffffff"],
  ["muted text on canvas", "ink-400", "paper-100"],
  ["muted text on white", "ink-400", "#ffffff"],
  ["muted text on tint", "ink-400", "paper-200"],
  ["heading", "ink-900", "paper-100"],

  ["link on white", "brand-700", "#ffffff"],
  ["link on canvas", "brand-700", "paper-100"],
  ["eyebrow on tint", "brand-700", "brand-50"],
  ["eyebrow on gradient card", "brand-700", "paper-300"],

  ["primary CTA label", "#ffffff", "ink-900"],
  ["primary CTA hover", "#ffffff", "ink-800"],
  ["brand button label", "#ffffff", "brand-600"],
  ["brand button hover", "#ffffff", "brand-700"],
  ["secondary button label", "ink-900", "paper-200"],
  ["secondary button hover", "ink-900", "paper-300"],
  ["active nav pill", "#ffffff", "ink-900"],
  ["inactive nav label", "ink-500", "paper-100"],

  ["neutral badge", "ink-600", "paper-200"],
  ["brand badge", "brand-700", "brand-50"],
  ["solid brand badge", "#ffffff", "brand-600"],

  ["on-track pill", "track-600", "track-50"],
  ["on-track text on white", "track-600", "#ffffff"],
  ["attention pill", "attention-600", "attention-50"],
  ["attention on white", "attention-600", "#ffffff"],
  ["concern pill", "concern-600", "concern-50"],
  ["concern on white", "concern-600", "#ffffff"],
  ["unknown pill", "unknown-600", "unknown-50"],
  ["unknown on white", "unknown-600", "#ffffff"],
  ["legend glyph on white", "track-500", "#ffffff"],
  ["legend glyph on white (amber)", "attention-500", "#ffffff"],
  ["legend glyph on white (rose)", "concern-500", "#ffffff"],

  ["graphic: focus ring vs canvas", "brand-600", "paper-100"],
  ["graphic: focus ring vs white", "brand-600", "#ffffff"],
  ["graphic: control border vs white", "slate-500", "#ffffff"],
  ["graphic: control border vs canvas", "slate-500", "paper-100"],
  ["graphic: track fill vs white", "track-400", "#ffffff"],
  ["graphic: attention fill vs white", "attention-400", "#ffffff"],
  ["graphic: concern fill vs white", "concern-400", "#ffffff"],
  ["graphic: brand fill vs white", "brand-500", "#ffffff"],
  ["graphic: progress bar vs track", "brand-600", "paper-300"],
];

console.log(
  "Pairing                             fg        bg        ratio  AA(4.5) 3:1",
);
console.log("─".repeat(84));
let fails = 0;
for (const [label, fg, bg] of PAIRS) {
  const r = ratio(c(fg), c(bg));
  const aa = r >= 4.5;
  const aaLarge = r >= 3;
  const nonText = label.startsWith("graphic:");
  const ok = nonText ? aaLarge : aa;
  if (!ok) fails += 1;
  console.log(
    `${label.padEnd(35)} ${c(fg).padEnd(9)} ${c(bg).padEnd(9)} ${r
      .toFixed(2)
      .padStart(5)}  ${aa ? "  ok  " : " FAIL "}  ${aaLarge ? "ok" : "FAIL"}${
      ok ? "" : "   <-- needs fixing"
    }`,
  );
}
console.log("─".repeat(84));
console.log(
  fails === 0
    ? `All ${PAIRS.length} pairings pass (${Object.keys(P).length} tokens read from globals.css).`
    : `${fails} pairing(s) need attention.`,
);
if (fails > 0) process.exitCode = 1;

console.log("\nBrand values as given:");
for (const [k, v] of Object.entries(BRAND)) {
  console.log(
    `  ${k.padEnd(12)} ${v}   on white ${ratio(v, "#ffffff")
      .toFixed(2)
      .padStart(
        5,
      )}   white on it ${ratio("#ffffff", v).toFixed(2).padStart(5)}`,
  );
}
