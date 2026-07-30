/**
 * Verifies every foreground/background pairing the app renders clears WCAG 2.2 AA.
 *
 * The palette is derived from the six colours in the Fuller Seminary style guide, and
 * two of them cannot be used naively: the secondary cyan is 2.69:1 on white, and the
 * tan is 1.51:1. This script is what keeps that from being forgotten — it exits
 * non-zero if any pairing regresses.
 *
 * Values here mirror the @theme block in src/app/globals.css. Change one, change both.
 *
 *   npm run check:contrast
 */
const hex = (h) => {
  const v = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
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

// ── Brand, straight from the style guide ────────────────────────────────────
const BRAND = {
  primary: "#042B32",
  secondary: "#00ADC7",
  tan: "#D8D2C4",
  tertiary: "#005979",
  black: "#0C1821",
  white: "#ffffff",
};

// ── Proposed ramps ──────────────────────────────────────────────────────────
const P = {
  // brand teal
  "brand-50": "#eef4f5",
  "brand-100": "#d4e3e6",
  "brand-200": "#a6c5cb",
  "brand-300": "#6d9aa4",
  "brand-400": "#3c6f7c",
  "brand-500": "#0b4451",
  "brand-600": "#042B32",
  "brand-700": "#032228",
  "brand-800": "#02181c",
  "brand-900": "#010f12",

  // tertiary blue — the CTA colour
  "cta-400": "#0b7fa5",
  "cta-500": "#006b8c",
  "cta-600": "#005979",
  "cta-700": "#004761",

  // secondary cyan — graphics and accents
  "accent-50": "#e6f8fb",
  "accent-100": "#c1eff5",
  "accent-200": "#84dfeb",
  "accent-300": "#3ec9dc",
  "accent-400": "#00ADC7",
  "accent-500": "#008ba1",
  "accent-600": "#006b7d",
  "accent-700": "#00505e",

  // tan neutrals / paper
  "paper-50": "#fbfaf8",
  "paper-100": "#f6f4f0",
  "paper-200": "#efece5",
  "tan-100": "#e7e3d9",
  "tan-200": "#D8D2C4",
  "tan-300": "#c2bba8",
  "tan-400": "#8f877a",
  "tan-500": "#7d7566",

  // ink
  "ink-400": "#5a6b74",
  "ink-500": "#42545e",
  "ink-600": "#2a3c46",
  "ink-700": "#182a33",
  "ink-800": "#0C1821",
  "ink-900": "#060e14",

  // status
  "track-50": "#eaf4ef",
  "track-100": "#d2e8dc",
  "track-200": "#a3cbb7",
  "track-500": "#1e6b50",
  "track-600": "#14513c",
  "attention-50": "#fdf3e2",
  "attention-100": "#f8e6c4",
  "attention-200": "#e9c98a",
  "attention-500": "#8a5a00",
  "attention-600": "#6d4700",
  "concern-50": "#fceeec",
  "concern-100": "#f7dcd8",
  "concern-200": "#e6b3aa",
  "concern-500": "#a3342a",
  "concern-600": "#82271f",
  "unknown-50": "#eef1f3",
  "unknown-100": "#e0e5e8",
  "unknown-200": "#c3ccd1",
  "unknown-500": "#4a5c66",
  "unknown-600": "#394951",
};
const c = (k) => P[k] ?? k;

// ── Pairings the app really renders ─────────────────────────────────────────
const PAIRS = [
  ["body text", "ink-800", "paper-100"],
  ["body text on white", "ink-800", "#ffffff"],
  ["muted text", "ink-500", "paper-100"],
  ["muted text on white", "ink-500", "#ffffff"],
  ["subtle text", "ink-400", "paper-100"],
  ["subtle on white", "ink-400", "#ffffff"],
  ["heading", "ink-900", "paper-100"],
  ["link / brand text", "brand-600", "#ffffff"],
  ["link on paper", "brand-600", "paper-100"],
  ["primary CTA label", "#ffffff", "cta-600"],
  ["CTA hover label", "#ffffff", "cta-700"],
  ["brand button label", "#ffffff", "brand-600"],
  ["accent text (dark cyan)", "accent-700", "accent-50"],
  ["accent badge", "accent-700", "#ffffff"],
  ["tan divider text", "ink-600", "tan-200"],
  ["on-track pill", "track-600", "track-50"],
  ["on-track text on white", "track-600", "#ffffff"],
  ["attention pill", "attention-600", "attention-50"],
  ["attention on white", "attention-600", "#ffffff"],
  ["concern pill", "concern-600", "concern-50"],
  ["concern on white", "concern-600", "#ffffff"],
  ["unknown pill", "unknown-600", "unknown-50"],
  ["unknown on white", "unknown-600", "#ffffff"],
  ["banner text", "paper-200", "ink-800"],
  ["banner chip", "ink-800", "paper-200"],
  ["focus ring vs paper", "brand-500", "paper-100"],
  ["control border vs white", "tan-400", "#ffffff"],
  ["control border vs paper", "tan-400", "paper-100"],
  ["link vs paper", "cta-600", "paper-100"],
  ["link vs white", "cta-600", "#ffffff"],
];

console.log("Pairing                          fg        bg        ratio  AA(4.5) AA-large(3)");
console.log("─".repeat(84));
let fails = 0;
for (const [label, fg, bg] of PAIRS) {
  const r = ratio(c(fg), c(bg));
  const aa = r >= 4.5;
  const aaLarge = r >= 3;
  // Borders and rings only need 3:1 (non-text contrast).
  const nonText = /border|ring/.test(label);
  const ok = nonText ? aaLarge : aa;
  if (!ok) fails += 1;
  console.log(
    `${label.padEnd(32)} ${c(fg).padEnd(9)} ${c(bg).padEnd(9)} ${r.toFixed(2).padStart(5)}  ${
      aa ? "  ok  " : " FAIL "
    }  ${aaLarge ? "ok" : "FAIL"}${ok ? "" : "   <-- needs fixing"}`,
  );
}
console.log("─".repeat(84));
console.log(fails === 0 ? "All pairings pass." : `${fails} pairing(s) need attention.`);
if (fails > 0) process.exitCode = 1;

console.log("\nBrand colours as given (for reference):");
for (const [k, v] of Object.entries(BRAND)) {
  console.log(
    `  ${k.padEnd(10)} ${v}   on white ${ratio(v, "#ffffff").toFixed(2)}   white on it ${ratio("#ffffff", v).toFixed(2)}`,
  );
}
