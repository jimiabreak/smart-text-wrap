import { describe, it, expect } from "vitest";
import { countLines, textHeight } from "../src/measure";

const LINE = 20;

/** Greedy word wrap at `width` characters per line. Line breaks always start a new line. */
function wrapCount(text: string, width: number): number {
  let lines = 0;
  for (const paragraph of text.split("\n")) {
    lines++;
    let lineLength = 0;
    for (const word of paragraph.split(" ")) {
      const next = lineLength === 0 ? word.length : lineLength + 1 + word.length;
      if (lineLength > 0 && next > width) {
        lines++;
        lineLength = word.length;
      } else {
        lineLength = next;
      }
    }
  }
  return lines;
}

/**
 * A stand-in for a Figma TextNode whose clones lay text out the way Figma does:
 * "HEIGHT" wraps at the layer's width, "WIDTH_AND_HEIGHT" never wraps, so only
 * line breaks start new lines. Each line is LINE px tall.
 */
function makeLayer(text: string, width: number, textAutoResize = "HEIGHT") {
  const probes: { textAutoResize: string; textTruncation: string; removed: boolean }[] = [];
  const layer = {
    characters: text,
    textAutoResize,
    clone() {
      const probe = {
        textAutoResize,
        textTruncation: "ENDING",
        removed: false,
        get height() {
          const lines = probe.textAutoResize === "WIDTH_AND_HEIGHT" ? text.split("\n").length : wrapCount(text, width);
          return lines * LINE;
        },
        remove() {
          probe.removed = true;
        },
      };
      probes.push(probe);
      return probe;
    },
  };
  return { layer: layer as any, probes };
}

describe("countLines", () => {
  it("counts the lines a paragraph wraps to", () => {
    const { layer } = makeLayer("The quick brown fox jumps over the lazy dog", 30);
    expect(countLines(layer)).toBe(2);
  });

  it("returns 1 for auto-width layers without cloning them", () => {
    const { layer, probes } = makeLayer("The quick brown fox", 10, "WIDTH_AND_HEIGHT");
    expect(countLines(layer)).toBe(1);
    expect(probes).toHaveLength(0);
  });
});

describe("textHeight", () => {
  it("includes line breaks in the height", () => {
    const { layer } = makeLayer("The quick brown fox\njumps over the lazy dog", 30);
    expect(textHeight(layer)).toBe(2 * LINE);
  });

  it("shows when a balanced split makes the text taller", () => {
    const source = makeLayer("aaaaaaaaa b cccccccc", 10).layer;
    const balanced = makeLayer("aaaaaaaaa b\ncccccccc", 10).layer;
    expect(textHeight(balanced)).toBeGreaterThan(textHeight(source));
  });
});

describe("probes", () => {
  it("turns off truncation and removes every clone", () => {
    const { layer, probes } = makeLayer("The quick brown fox jumps over the lazy dog", 30);
    countLines(layer);
    textHeight(layer);
    expect(probes).toHaveLength(2);
    expect(probes.every((p) => p.textTruncation === "DISABLED" && p.removed)).toBe(true);
  });
});
