import { describe, it, expect } from "vitest";
import { detectMode, applyPretty } from "../src/algorithm";

describe("detectMode", () => {
  it("returns 'balance' for style names containing 'heading'", () => {
    expect(detectMode("Heading/H1", "Some text here")).toBe("balance");
  });

  it("returns 'balance' for style names containing 'title' (case-insensitive)", () => {
    expect(detectMode("Page Title", "Some text here")).toBe("balance");
  });

  it("returns 'balance' for style names containing 'display'", () => {
    expect(detectMode("Display Large", "Some text here")).toBe("balance");
  });

  it("returns 'balance' for style names containing h1-h6", () => {
    expect(detectMode("H2", "Some text here")).toBe("balance");
    expect(detectMode("h3/bold", "Some text here")).toBe("balance");
  });

  it("returns 'pretty' for body style names", () => {
    expect(detectMode("Body/Regular", "Some longer text content here")).toBe("pretty");
  });

  it("returns 'pretty' for style names like 'paragraph' or 'caption'", () => {
    expect(detectMode("Paragraph", "Some text here that is fairly long")).toBe("pretty");
  });

  it("falls back to character count when no style name provided", () => {
    expect(detectMode(null, "Short headline text")).toBe("balance");
    expect(detectMode(null, "This is a much longer body text paragraph that has more than fifty characters in total")).toBe("pretty");
  });

  it("uses 50 char threshold for heuristic", () => {
    const exactly49 = "a".repeat(49);
    const exactly50 = "a".repeat(50);
    expect(detectMode(null, exactly49)).toBe("balance");
    expect(detectMode(null, exactly50)).toBe("pretty");
  });
});

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
