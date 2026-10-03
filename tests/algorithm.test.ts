import { describe, it, expect } from "vitest";
import { applyPretty, balanceToLines, shouldSkip, MAX_BALANCE_LINES } from "../src/algorithm";

describe("applyPretty", () => {
  it("joins the last two words with a non-breaking space", () => {
    expect(applyPretty("The quick brown fox jumps over the lazy dog")).toBe(
      "The quick brown fox jumps over the lazy\u00A0dog"
    );
  });

  it("replaces only the last regular space", () => {
    expect(applyPretty("Hello beautiful world")).toBe("Hello beautiful\u00A0world");
  });

  it("joins last three words if last two combined exceed 20 chars", () => {
    expect(applyPretty("This is a extraordinarily sophisticated")).toBe(
      "This is a\u00A0extraordinarily\u00A0sophisticated"
    );
  });

  it("handles text with existing non-breaking space at end (no double-fix)", () => {
    expect(applyPretty("Hello beautiful\u00A0world")).toBe("Hello beautiful\u00A0world");
  });

  it("handles multi-paragraph text (newlines) — fixes each paragraph independently", () => {
    expect(applyPretty("First paragraph ends here\nSecond paragraph ends here")).toBe(
      "First paragraph ends\u00A0here\nSecond paragraph ends\u00A0here"
    );
  });

  it("returns single-word text unchanged", () => {
    expect(applyPretty("Hello")).toBe("Hello");
  });

  it("returns two-word text with non-breaking space", () => {
    expect(applyPretty("Hello world")).toBe("Hello\u00A0world");
  });

  it("still joins the last words when the line ends in a non-breaking space", () => {
    expect(applyPretty("Hello world\u00A0")).toBe("Hello\u00A0world\u00A0");
  });

  it("fixes the end of each Shift+Return line too", () => {
    expect(applyPretty("Our new product launch\u2028is here for everyone")).toBe(
      "Our new product\u00A0launch\u2028is here for\u00A0everyone"
    );
  });

  it("keeps leading and trailing whitespace", () => {
    expect(applyPretty("  indented line here  ")).toBe("  indented line\u00A0here  ");
  });

  it("never changes the length of the text", () => {
    const text = "  The quick brown fox\nThis is a extraordinarily sophisticated  ";
    expect(applyPretty(text)).toHaveLength(text.length);
  });
});

describe("balanceToLines", () => {
  it("splits text near the midpoint for two roughly equal lines", () => {
    expect(balanceToLines("The quick brown fox jumps", 2)).toBe("The quick brown\nfox jumps");
  });

  it("handles short two-word text", () => {
    expect(balanceToLines("Hello World", 2)).toBe("Hello\nWorld");
  });

  it("picks the split closest to the midpoint", () => {
    expect(balanceToLines("A BB CCCCCCCC", 2)).toBe("A BB\nCCCCCCCC");
  });

  it("splits into three lines of similar length", () => {
    expect(balanceToLines("one two three four five six", 3)).toBe("one two\nthree four\nfive six");
  });

  it("leaves text that fits on one line unchanged", () => {
    expect(balanceToLines("Our pricing", 1)).toBe("Our pricing");
  });

  it("returns single-word text unchanged", () => {
    expect(balanceToLines("Hello", 2)).toBe("Hello");
  });

  it("leaves text with too few spaces for the line count unchanged", () => {
    expect(balanceToLines("Hello world", 3)).toBe("Hello world");
  });

  it("leaves multi-paragraph text unchanged", () => {
    expect(balanceToLines("Hello beautiful world\nAnother short line", 4)).toBe("Hello beautiful world\nAnother short line");
  });

  it("leaves text with a soft line break (U+2028) unchanged", () => {
    expect(balanceToLines("Hello beautiful\u2028world again", 2)).toBe("Hello beautiful\u2028world again");
  });

  it(`leaves text longer than ${MAX_BALANCE_LINES} lines unchanged`, () => {
    const text = "one two three four five six seven eight nine ten";
    expect(balanceToLines(text, MAX_BALANCE_LINES + 1)).toBe(text);
  });

  it("keeps leading whitespace and the length of the text", () => {
    const text = "   indented heading text";
    expect(balanceToLines(text, 2)).toBe("   indented\nheading text");
    expect(balanceToLines(text, 2)).toHaveLength(text.length);
  });
});

describe("shouldSkip", () => {
  it("skips empty text", () => {
    expect(shouldSkip("", "FIXED")).toBe(true);
  });

  it("skips whitespace-only text", () => {
    expect(shouldSkip("   ", "FIXED")).toBe(true);
  });

  it("skips single-word text", () => {
    expect(shouldSkip("Hello", "FIXED")).toBe(true);
  });

  it("skips text with WIDTH_AND_HEIGHT auto-resize", () => {
    expect(shouldSkip("Hello world", "WIDTH_AND_HEIGHT")).toBe(true);
  });

  it("does not skip text already processed with NBSP (re-application allowed)", () => {
    expect(shouldSkip("Hello beautiful\u00A0world", "FIXED")).toBe(false);
  });

  it("does not skip normal multi-word text with fixed width", () => {
    expect(shouldSkip("Hello beautiful world", "FIXED")).toBe(false);
    expect(shouldSkip("Hello beautiful world", "NONE")).toBe(false);
  });

  it("does not skip text with HEIGHT auto-resize (fixed width)", () => {
    expect(shouldSkip("Hello beautiful world", "HEIGHT")).toBe(false);
  });

  it("does not skip text with TRUNCATE (fixed width)", () => {
    expect(shouldSkip("Hello beautiful world", "TRUNCATE")).toBe(false);
  });
});
