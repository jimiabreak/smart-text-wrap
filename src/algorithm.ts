const BALANCE_PATTERN = /\b(head|title|display|h[1-6])\b/i;

export type WrapMode = "balance" | "pretty";

export function detectMode(styleName: string | null, text: string): WrapMode {
  if (styleName) {
    return BALANCE_PATTERN.test(styleName) ? "balance" : "pretty";
  }
  return text.length < 50 ? "balance" : "pretty";
}
