import { describe, it, expect } from "vitest";
import { detectMode } from "../src/algorithm";

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
