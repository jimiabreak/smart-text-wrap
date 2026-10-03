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
  const [, end] = contentBounds(line);

  // Already fixed — the final words are already joined by an NBSP (trailing whitespace doesn't count)
  if (line.lastIndexOf(NBSP, end - 1) > last) return line;

  // If the last two words combined are > 20 chars, join the last three
  if (spaces.length >= 2) {
    const secondLast = spaces[spaces.length - 2];
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

/** Chromium stops balancing text that runs past this many lines; longer text is left alone. */
export const MAX_BALANCE_LINES = 6;

/** True when `text` already has a line break: "\n" (new paragraph) or U+2028 (Figma's Shift+Enter line break). */
export function hasLineBreak(text: string): boolean {
  return /[\n\u2028]/.test(text);
}

/**
 * Break `text` into `lineCount` lines of roughly equal length by turning
 * `lineCount - 1` regular spaces into line breaks.
 *
 * Returns `text` unchanged when there is nothing to balance: fewer than two
 * lines, more than MAX_BALANCE_LINES, text that already contains line breaks,
 * or too few spaces to break at.
 */
export function balanceToLines(text: string, lineCount: number): string {
  if (lineCount < 2 || lineCount > MAX_BALANCE_LINES || hasLineBreak(text)) return text;

  const spaces = innerSpaces(text);
  if (spaces.length < lineCount - 1) return text;

  const [start, end] = contentBounds(text);
  let result = text;
  let from = 0;

  for (let k = 1; k < lineCount; k++) {
    const target = start + ((end - start) * k) / lineCount;
    // Leave enough spaces after this break for the breaks still to come
    const lastAllowed = spaces.length - (lineCount - k);
    let best = from;
    for (let s = from + 1; s <= lastAllowed; s++) {
      // On a tie, prefer the later space so earlier lines run slightly longer
      if (Math.abs(spaces[s] - target) <= Math.abs(spaces[best] - target)) best = s;
    }
    result = replaceAt(result, spaces[best], "\n");
    from = best + 1;
  }

  return result;
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
