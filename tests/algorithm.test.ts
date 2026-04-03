import { describe, it, expect } from "vitest";
import { applyPretty, applyBalance, shouldSkip, resetText } from "../src/algorithm";

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
      "This is\u00A0a\u00A0extraordinarily\u00A0sophisticated"
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
});

describe("applyBalance", () => {
  it("splits text near the midpoint for two roughly equal lines", () => {
    const result = applyBalance("The quick brown fox jumps");
    expect(result).toBe("The quick brown\nfox jumps");
  });

  it("handles short two-word text", () => {
    expect(applyBalance("Hello World")).toBe("Hello\nWorld");
  });

  it("returns single-word text unchanged", () => {
    expect(applyBalance("Hello")).toBe("Hello");
  });

  it("picks the split closest to the midpoint", () => {
    expect(applyBalance("A BB CCCCCCCC")).toBe("A BB\nCCCCCCCC");
  });

  it("handles multi-paragraph text — balances each paragraph independently", () => {
    expect(applyBalance("Hello beautiful world\nAnother short line")).toBe(
      "Hello beautiful\nworld\nAnother short\nline"
    );
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

describe("resetText", () => {
  it("replaces non-breaking spaces with regular spaces", () => {
    expect(resetText("Hello\u00A0world")).toBe("Hello world");
  });

  it("handles multiple non-breaking spaces", () => {
    expect(resetText("one\u00A0two\u00A0three")).toBe("one two three");
  });

  it("removes newlines inserted by balance (restores from original)", () => {
    expect(resetText("The quick brown\nfox jumps", "The quick brown fox jumps")).toBe(
      "The quick brown fox jumps"
    );
  });

  it("returns original text when provided", () => {
    expect(resetText("modified\u00A0text", "original text here")).toBe("original text here");
  });

  it("strips NBSP when no original provided", () => {
    expect(resetText("Hello\u00A0beautiful\u00A0world")).toBe("Hello beautiful world");
  });

  it("returns unchanged text if no NBSP and no original", () => {
    expect(resetText("Hello world")).toBe("Hello world");
  });
});
