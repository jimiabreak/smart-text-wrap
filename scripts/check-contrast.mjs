// Checks every text/background pair in src/ui.html against WCAG 2 AA, in both Figma themes.
// Usage: node scripts/check-contrast.mjs   (exits 1 if any pair fails)
import { readFileSync } from "fs";

const css = readFileSync(new URL("../src/ui.html", import.meta.url), "utf8");

function tokens(selector) {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No "${selector} {" block in src/ui.html`);
  const block = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
}

const light = tokens(":root");
const dark = { ...light, ...tokens("html.figma-dark") };

// [foreground token, background token, minimum ratio, what it is]
const PAIRS = [
  ["text", "bg", 4.5, "heading on panel"],
  ["text-muted", "bg", 4.5, "subtitle, Reset label, caption on panel"],
  ["text", "bg-card", 4.5, "card title on card"],
  ["text-muted", "bg-card", 4.5, "card description on card, Reset label on hover"],
  ["badge-balance-fg", "badge-balance-bg", 4.5, "Headlines badge"],
  ["badge-pretty-fg", "badge-pretty-bg", 4.5, "Body text badge"],
  ["toast-success-fg", "toast-success-bg", 4.5, "success toast"],
  ["toast-error-fg", "toast-error-bg", 4.5, "error toast"],
  ["text", "bg-card", 4.5, "info toast"],
  ["accent-fg", "bg", 3, "focus ring on panel"],
  ["accent-fg", "bg-card", 3, "card icon on card"],
];

const channel = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

let failures = 0;
for (const [theme, values] of [["light", light], ["dark", dark]]) {
  for (const [fg, bg, min, label] of PAIRS) {
    if (!values[fg] || !values[bg]) throw new Error(`Missing --${fg} or --${bg} in the ${theme} theme`);
    const r = ratio(values[fg], values[bg]);
    const ok = r >= min;
    if (!ok) failures++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${theme.padEnd(5)}  ${r.toFixed(2).padStart(5)}:1 (min ${min})  --${fg} on --${bg}  ${label}`);
  }
}
console.log(failures === 0 ? "All pairs pass." : `${failures} pair(s) fail.`);
process.exit(failures === 0 ? 0 : 1);
