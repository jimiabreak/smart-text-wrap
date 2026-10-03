const NBSP = "\u00A0";

/**
 * Replace the character at `index` with `char`. Callers only ever replace a
 * regular space, so the length of the text never changes.
 */
function replaceAt(text: string, index: number, char: string): string {
  return text.slice(0, index) + char + text.slice(index + 1);
}

/** [start, end) of `line` without its leading and trailing whitespace. */
function contentBounds(line: string): [number, number] {
  const start = line.length - line.replace(/^\s+/, "").length;
  const end = line.replace(/\s+$/, "").length;
  return [start, end];
}

/** Indices of the regular spaces between words, ignoring leading and trailing whitespace. */
function innerSpaces(line: string): number[] {
  const [start, end] = contentBounds(line);
  const spaces: number[] = [];
  for (let i = start; i < end; i++) {
    if (line[i] === " ") spaces.push(i);
  }
  return spaces;
}

function applyPrettyToLine(line: string): string {
  const spaces = innerSpaces(line);
  if (spaces.length === 0) return line;

  const last = spaces[spaces.length - 1];

  // Already fixed — the final words are already joined by an NBSP
  if (line.lastIndexOf(NBSP) > last) return line;

  // If the last two words combined are > 20 chars, join the last three
  if (spaces.length >= 2) {
    const secondLast = spaces[spaces.length - 2];
    const [, end] = contentBounds(line);
    const secondLastWord = line.slice(secondLast + 1, last);
    const lastWord = line.slice(last + 1, end);
    if ((secondLastWord + lastWord).length > 20) {
      return replaceAt(replaceAt(line, secondLast, NBSP), last, NBSP);
    }
  }

  return replaceAt(line, last, NBSP);
}

export function applyPretty(text: string): string {
  return text.split("\n").map(applyPrettyToLine).join("\n");
}

function balanceLine(line: string): string {
  const spaces = innerSpaces(line);
  if (spaces.length === 0) return line;

  const [start, end] = contentBounds(line);
  const midpoint = start + (end - start) / 2;

  // First space at or after the midpoint, else the last space before it
  let split = spaces[spaces.length - 1];
  for (const i of spaces) {
    if (i >= Math.ceil(midpoint)) {
      split = i;
      break;
    }
  }

  return replaceAt(line, split, "\n");
}

export function applyBalance(text: string): string {
  return text.split("\n").map(balanceLine).join("\n");
}

export function shouldSkip(text: string, textAutoResize: string): boolean {
  const trimmed = text.trim();

  // Empty or whitespace
  if (!trimmed) return true;

  // Single word
  if (!trimmed.includes(" ")) return true;

  // Auto-width container — no orphan possible
  if (textAutoResize === "WIDTH_AND_HEIGHT") return true;

  return false;
}
