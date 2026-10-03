import { describe, it, expect, vi } from "vitest";
import { hasParagraphFormatting, measureHeight, measureLines } from "../src/measure";

const MIXED = Symbol("mixed");
vi.stubGlobal("figma", { mixed: MIXED });

const LINE = 20;
/** With vertical trim ("CAP_HEIGHT"), the first line is only cap-height tall. */
const CAP = 10;

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

type Probe = {
  characters: string;
  name: string;
  textAutoResize: string;
  textTruncation: string;
  leadingTrim: string;
  removed: boolean;
  readonly height: number;
  insertCharacters(start: number, characters: string): void;
  deleteCharacters(start: number, end: number): void;
  remove(): void;
};

/**
 * A stand-in for a Figma TextNode whose clones lay text out the way Figma does:
 * "HEIGHT" wraps at the layer's width, "WIDTH_AND_HEIGHT" never wraps, so only
 * line breaks start new lines. Each line is LINE px tall.
 */
function makeLayer(text: string, width: number, textAutoResize = "HEIGHT", leadingTrim = "NONE") {
  const probes: Probe[] = [];
  let edits = 0;
  const layer = {
    name: "Layer",
    characters: text,
    textAutoResize,
    leadingTrim,
    insertCharacters() {
      edits++;
    },
    deleteCharacters() {
      edits++;
    },
    clone() {
      const probe: Probe = {
        name: "Layer",
        characters: layer.characters,
        textAutoResize,
        textTruncation: "ENDING",
        leadingTrim,
        removed: false,
        get height() {
          const t = probe.characters;
          const lines = probe.textAutoResize === "WIDTH_AND_HEIGHT" ? t.split("\n").length : wrapCount(t, width);
          return probe.leadingTrim === "CAP_HEIGHT" ? (lines - 1) * LINE + CAP : lines * LINE;
        },
        insertCharacters(start: number, inserted: string) {
          probe.characters = probe.characters.slice(0, start) + inserted + probe.characters.slice(start);
        },
        deleteCharacters(start: number, end: number) {
          probe.characters = probe.characters.slice(0, start) + probe.characters.slice(end);
        },
        remove() {
          probe.removed = true;
        },
      };
      probes.push(probe);
      return probe;
    },
  };
  return { layer: layer as any, probes, edits: () => edits };
}

describe("measureLines", () => {
  it("counts the lines a paragraph wraps to, and its height", () => {
    const text = "The quick brown fox jumps over the lazy dog";
    const { layer } = makeLayer(text, 30);
    expect(measureLines(layer, text)).toEqual({ lines: 2, height: 2 * LINE });
  });

  it("measures the given text, not what the layer shows", () => {
    // The layer currently shows a balanced version; the measurement is for the unbroken source
    const { layer } = makeLayer("The quick brown fox\njumps over the lazy dog", 50);
    expect(measureLines(layer, "The quick brown fox jumps over the lazy dog")).toEqual({ lines: 1, height: LINE });
  });

  it("counts correctly when the text uses vertical trim", () => {
    const text = "The quick brown fox jumps over the lazy dog";
    const { layer } = makeLayer(text, 30, "HEIGHT", "CAP_HEIGHT");
    expect(measureLines(layer, text).lines).toBe(2);
  });

  it("refuses text with line breaks, where a line count would be wrong", () => {
    const { layer, probes } = makeLayer("The quick brown fox jumps over the lazy dog", 30);
    expect(() => measureLines(layer, "The quick brown fox\njumps over the lazy dog")).toThrow(/without line breaks/);
    expect(probes).toHaveLength(0);
  });
});

describe("measureHeight", () => {
  it("includes line breaks in the height", () => {
    const { layer } = makeLayer("The quick brown fox jumps over the lazy dog", 30);
    expect(measureHeight(layer, "The quick brown fox\njumps over the lazy dog")).toBe(2 * LINE);
  });

  it("shows when a balanced split makes the text taller", () => {
    const { layer } = makeLayer("aaaaaaaaa b cccccccc", 10);
    expect(measureHeight(layer, "aaaaaaaaa b\ncccccccc")).toBeGreaterThan(measureHeight(layer, "aaaaaaaaa b cccccccc"));
  });
});

describe("probes", () => {
  it("turn off truncation and trim, are always removed, and never edit the layer", () => {
    const text = "The quick brown fox jumps over the lazy dog";
    const { layer, probes, edits } = makeLayer(text, 30, "HEIGHT", "CAP_HEIGHT");
    measureLines(layer, text);
    measureHeight(layer, text);
    expect(probes).toHaveLength(2);
    expect(probes.every((p) => p.textTruncation === "DISABLED" && p.leadingTrim === "NONE" && p.removed)).toBe(true);
    expect(edits()).toBe(0);
    expect(layer.characters).toBe(text);
  });

  it("are removed even when measuring fails", () => {
    const { layer, probes } = makeLayer("Hello world", 30);
    expect(() => measureHeight(layer, "Hello")).toThrow(/length would change/);
    expect(probes[0].removed).toBe(true);
  });
});

describe("hasParagraphFormatting", () => {
  const ranges: number[][] = [];
  const layer = (paragraphIndent: number, list: unknown, characters = "Hello world") =>
    ({
      characters,
      paragraphIndent,
      getRangeListOptions: (start: number, end: number) => {
        ranges.push([start, end]);
        return list;
      },
    }) as any;

  it("is false for plain paragraphs, checking the whole text", () => {
    ranges.length = 0;
    expect(hasParagraphFormatting(layer(0, { type: "NONE" }))).toBe(false);
    expect(ranges).toEqual([[0, "Hello world".length]]);
  });

  it("is false for empty text without asking for an empty range", () => {
    ranges.length = 0;
    expect(hasParagraphFormatting(layer(0, { type: "UNORDERED" }, ""))).toBe(false);
    expect(ranges).toEqual([]);
  });

  it("is true for bulleted, numbered or mixed lists", () => {
    expect(hasParagraphFormatting(layer(0, { type: "UNORDERED" }))).toBe(true);
    expect(hasParagraphFormatting(layer(0, { type: "ORDERED" }))).toBe(true);
    expect(hasParagraphFormatting(layer(0, MIXED))).toBe(true);
  });

  it("is true for an indented paragraph", () => {
    expect(hasParagraphFormatting(layer(12, { type: "NONE" }))).toBe(true);
  });
});
