import { describe, it, expect } from "vitest";
import { wrapNodes, resetNodes, setText, type TextNodeLike, type WrapDeps } from "../src/process";

const NBSP = "\u00A0";

/**
 * A stand-in for Figma's TextNode. It tracks one style name per character the
 * way Figma tracks range styles: assigning `characters` resets every
 * character to "regular", while insertCharacters/deleteCharacters keep them.
 */
function makeNode(text: string, opts: { textAutoResize?: string; hasMissingFont?: boolean; styles?: string[] } = {}) {
  const data: Record<string, string> = {};
  let chars = text;
  let styles = opts.styles ?? text.split("").map(() => "regular");
  return {
    name: "Text",
    textAutoResize: opts.textAutoResize ?? "HEIGHT",
    hasMissingFont: opts.hasMissingFont ?? false,
    get characters() {
      return chars;
    },
    set characters(value: string) {
      chars = value;
      styles = value.split("").map(() => "regular");
    },
    get styles() {
      return styles;
    },
    getPluginData: (key: string) => data[key] ?? "",
    setPluginData: (key: string, value: string) => {
      data[key] = value;
    },
    insertCharacters(start: number, inserted: string, useStyle: "BEFORE" | "AFTER" = "BEFORE") {
      const copied = useStyle === "BEFORE" ? (styles[start - 1] ?? styles[start]) : (styles[start] ?? styles[start - 1]);
      chars = chars.slice(0, start) + inserted + chars.slice(start);
      styles = [...styles.slice(0, start), ...inserted.split("").map(() => copied), ...styles.slice(start)];
    },
    deleteCharacters(start: number, end: number) {
      chars = chars.slice(0, start) + chars.slice(end);
      styles = [...styles.slice(0, start), ...styles.slice(end)];
    },
  };
}

/** "Hello beautiful world" with "beautiful" in bold. */
function boldStyles(): string[] {
  return "Hello beautiful world".split("").map((_, i) => (i >= 6 && i <= 14 ? "bold" : "regular"));
}

/** Greedy word wrap at `width` characters per line, like a fixed-width text box. NBSP-joined words stay together. */
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

/** Test deps: fonts always load, and every layer is a text box `width` characters wide. */
function depsAt(width: number): WrapDeps {
  return {
    loadFonts: async () => {},
    countLines: (node: TextNodeLike) => wrapCount(node.characters, width),
    textHeight: (node: TextNodeLike) => wrapCount(node.characters, width),
  };
}

const deps = depsAt(30);

describe("edits during font loading", () => {
  for (const mode of ["pretty", "balance"] as const) {
    it(`keeps same-length edits made during ${mode}`, async () => {
      const node = makeNode("Hello beautiful world");
      let release!: () => void;
      const pending = new Promise<void>((resolve) => { release = resolve; });
      const action = wrapNodes([node], mode, { ...deps, loadFonts: () => pending });
      node.characters = "Hello beautiful earth";
      release();
      const result = await action;
      expect(node.characters).toBe("Hello beautiful earth");
      expect(result).toMatchObject({ changed: 0, failed: 0, skippedEdited: 1 });
      expect(node.getPluginData("originalText")).toBe("");
    });
  }

  it("keeps edits made while Reset loads fonts", async () => {
    const node = makeNode("Hello beautiful world");
    await wrapNodes([node], "pretty", deps);
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const action = resetNodes([node], { loadFonts: () => pending });
    node.characters = "Hello beautiful earth";
    release();
    expect(await action).toMatchObject({ changed: 0, failed: 0, skippedEdited: 1 });
    expect(node.characters).toBe("Hello beautiful earth");
    await resetNodes([node], deps);
    expect(node.characters).toBe("Hello beautiful earth");
  });

  it("does not overwrite recovery data changed by another action", async () => {
    const node = makeNode("Hello beautiful world");
    const result = await wrapNodes([node], "pretty", { ...deps, loadFonts: async () => {
      node.setPluginData("originalText", "New recovery text");
      node.setPluginData("appliedText", node.characters);
    } });
    expect(result.skippedEdited).toBe(1);
    expect(node.getPluginData("originalText")).toBe("New recovery text");
    expect(node.characters).toBe("Hello beautiful world");
  });
});

describe("recovery data failures", () => {
  it("leaves oversized text unchanged when its original cannot be stored", async () => {
    const source = "a".repeat(110_000) + " last words";
    const node = makeNode(source);
    const write = node.setPluginData;
    node.setPluginData = (key, value) => {
      if (new TextEncoder().encode(value).length > 100_000) throw new Error("Plugin data exceeds 100 kB");
      write(key, value);
    };
    expect(await wrapNodes([node], "pretty", deps)).toMatchObject({ changed: 0, failed: 1 });
    expect(node.characters).toBe(source);
    expect(node.getPluginData("originalText")).toBe("");
  });

  it("restores a previous wrap when writing the second metadata entry fails", async () => {
    const node = makeNode("The quick brown fox jumps over the lazy dog");
    await wrapNodes([node], "pretty", deps);
    const before = node.characters;
    const original = node.getPluginData("originalText");
    const write = node.setPluginData;
    node.setPluginData = (key, value) => {
      if (key === "appliedText" && value.includes("\n")) throw new Error("Storage write failed");
      write(key, value);
    };
    expect(await wrapNodes([node], "balance", deps)).toMatchObject({ changed: 0, failed: 1 });
    expect(node.characters).toBe(before);
    expect(node.getPluginData("originalText")).toBe(original);
    expect(node.getPluginData("appliedText")).toBe(before);
    expect((await resetNodes([node], deps)).changed).toBe(1);
    expect(node.characters).toBe(original);
  });

  it("keeps Reset available when clearing the second entry fails", async () => {
    const node = makeNode("Hello beautiful world");
    await wrapNodes([node], "pretty", deps);
    const before = node.characters;
    const write = node.setPluginData;
    node.setPluginData = (key, value) => {
      if (key === "appliedText" && value === "") throw new Error("Storage write failed");
      write(key, value);
    };
    expect(await resetNodes([node], deps)).toMatchObject({ changed: 0, failed: 1 });
    expect(node.characters).toBe(before);
    expect(node.getPluginData("originalText")).toBe("Hello beautiful world");
    expect(node.getPluginData("appliedText")).toBe(before);
    node.setPluginData = write;
    expect((await resetNodes([node], deps)).changed).toBe(1);
  });
});

describe("wrapNodes", () => {
  it("applies Pretty and stores the original text", async () => {
    const node = makeNode("The quick brown fox jumps over the lazy dog");
    const result = await wrapNodes([node], "pretty", deps);
    expect(node.characters).toBe(`The quick brown fox jumps over the lazy${NBSP}dog`);
    expect(result.changed).toBe(1);
    expect(node.getPluginData("originalText")).toBe("The quick brown fox jumps over the lazy dog");
  });

  it("switches from Balance to Pretty starting from the original text", async () => {
    const node = makeNode("The quick brown fox jumps over the lazy dog");
    await wrapNodes([node], "balance", deps);
    await wrapNodes([node], "pretty", deps);
    expect(node.characters).toBe(`The quick brown fox jumps over the lazy${NBSP}dog`);
  });

  it("skips single-word and auto-width text", async () => {
    const word = makeNode("Hello");
    const autoWidth = makeNode("Hello world", { textAutoResize: "WIDTH_AND_HEIGHT" });
    const result = await wrapNodes([word, autoWidth], "pretty", deps);
    expect(result.changed).toBe(0);
    expect(word.getPluginData("originalText")).toBe("");
    expect(autoWidth.characters).toBe("Hello world");
  });

  it("counts a layer whose fonts fail to load as failed and leaves it unchanged", async () => {
    const node = makeNode("Hello beautiful world");
    const failing: WrapDeps = { ...deps, loadFonts: async () => Promise.reject(new Error("font not available")) };
    const result = await wrapNodes([node], "pretty", failing);
    expect(result.failed).toBe(1);
    expect(result.changed).toBe(0);
    expect(node.characters).toBe("Hello beautiful world");
  });

  it("reports no change when the same mode is applied twice", async () => {
    const node = makeNode("The quick brown fox jumps over the lazy dog");
    await wrapNodes([node], "pretty", deps);
    const second = await wrapNodes([node], "pretty", deps);
    expect(second.changed).toBe(0);
    expect(node.characters).toBe(`The quick brown fox jumps over the lazy${NBSP}dog`);
  });

  it("keeps text the designer edited after wrapping when wrapping again", async () => {
    const node = makeNode("The quick brown fox jumps over the lazy dog");
    await wrapNodes([node], "pretty", deps);
    node.characters = "A completely rewritten paragraph by the designer";
    await wrapNodes([node], "pretty", deps);
    expect(node.characters).toBe(`A completely rewritten paragraph by the${NBSP}designer`);
    expect(node.getPluginData("originalText")).toBe("A completely rewritten paragraph by the designer");
  });

  it("skips layers with missing fonts without touching them", async () => {
    const node = makeNode("Hello beautiful world", { hasMissingFont: true });
    const result = await wrapNodes([node], "pretty", deps);
    expect(result.skippedMissingFont).toBe(1);
    expect(result.changed).toBe(0);
    expect(node.characters).toBe("Hello beautiful world");
  });

  it("keeps bold and other range styles when wrapping", async () => {
    const node = makeNode("Hello beautiful world", { styles: boldStyles() });
    await wrapNodes([node], "pretty", deps);
    expect(node.characters).toBe(`Hello beautiful${NBSP}world`);
    expect(node.styles).toEqual(boldStyles());
  });

  it("keeps range styles when switching from Balance to Pretty", async () => {
    const node = makeNode("Hello beautiful world", { styles: boldStyles() });
    await wrapNodes([node], "balance", depsAt(16));
    await wrapNodes([node], "pretty", depsAt(16));
    expect(node.styles).toEqual(boldStyles());
  });

  it("handles emoji next to the replaced space", async () => {
    const node = makeNode("Ship it today 🚀 friends");
    await wrapNodes([node], "pretty", deps);
    expect(node.characters).toBe(`Ship it today 🚀${NBSP}friends`);
  });
});

describe("wrapNodes — Balance", () => {
  it("balances a two-line heading into two even lines", async () => {
    const node = makeNode("The quick brown fox jumps");
    await wrapNodes([node], "balance", depsAt(20));
    expect(node.characters).toBe("The quick brown\nfox jumps");
  });

  it("does not double-apply when Balance runs twice", async () => {
    const node = makeNode("The quick brown fox jumps");
    await wrapNodes([node], "balance", depsAt(20));
    const second = await wrapNodes([node], "balance", depsAt(20));
    expect(node.characters).toBe("The quick brown\nfox jumps");
    expect(second.changed).toBe(0);
  });

  it("leaves text that fits on one line alone", async () => {
    const node = makeNode("Our pricing");
    const result = await wrapNodes([node], "balance", depsAt(40));
    expect(node.characters).toBe("Our pricing");
    expect(result.changed).toBe(0);
  });

  it("balances a three-line heading into three lines", async () => {
    const node = makeNode("Smart Text Wrap prevents orphans and balances text in Figma");
    await wrapNodes([node], "balance", depsAt(25));
    expect(node.characters.split("\n")).toHaveLength(3);
  });

  it("keeps the original when balancing would add a line", async () => {
    // At 10 chars wide this wraps to 2 lines, but the midpoint split gives an 11-char first line that wraps again
    const node = makeNode("aaaaaaaaa b cccccccc");
    const result = await wrapNodes([node], "balance", depsAt(10));
    expect(node.characters).toBe("aaaaaaaaa b cccccccc");
    expect(result.changed).toBe(0);
    expect(node.getPluginData("originalText")).toBe("");
  });

  it("rejects a taller result even when line counts of broken text are unreliable", async () => {
    // Figma's one-line pass can't count lines once "\n" is present; only textHeight may judge the result
    const deps: WrapDeps = {
      ...depsAt(10),
      countLines: (node: TextNodeLike) => (node.characters.includes("\n") ? 1 : wrapCount(node.characters, 10)),
    };
    const node = makeNode("aaaaaaaaa b cccccccc");
    await wrapNodes([node], "balance", deps);
    expect(node.characters).toBe("aaaaaaaaa b cccccccc");
  });

  it("puts the text back when measuring fails", async () => {
    const node = makeNode("The quick brown fox jumps");
    await wrapNodes([node], "balance", depsAt(20));
    const failing: WrapDeps = {
      ...depsAt(20),
      countLines: () => {
        throw new Error("clone failed");
      },
    };
    const result = await wrapNodes([node], "balance", failing);
    expect(result.failed).toBe(1);
    expect(node.characters).toBe("The quick brown\nfox jumps");
    expect(node.getPluginData("appliedText")).toBe("The quick brown\nfox jumps");
  });

  it("leaves multi-paragraph text alone", async () => {
    const node = makeNode("First paragraph is here\nSecond paragraph is here");
    await wrapNodes([node], "balance", depsAt(10));
    expect(node.characters).toBe("First paragraph is here\nSecond paragraph is here");
  });
});

describe("resetNodes", () => {
  it("restores the original text and clears the stored data", async () => {
    const node = makeNode("The quick brown fox jumps over the lazy dog");
    await wrapNodes([node], "balance", deps);
    const result = await resetNodes([node], deps);
    expect(node.characters).toBe("The quick brown fox jumps over the lazy dog");
    expect(result.changed).toBe(1);
    expect(node.getPluginData("originalText")).toBe("");
    expect(node.getPluginData("appliedText")).toBe("");
  });

  it("keeps text the designer edited after wrapping", async () => {
    const node = makeNode("Welcome to our product");
    await wrapNodes([node], "pretty", deps);
    node.characters = "Welcome to our new product";
    const result = await resetNodes([node], deps);
    expect(node.characters).toBe("Welcome to our new product");
    expect(result.skippedEdited).toBe(1);
    expect(result.changed).toBe(0);
  });

  it("leaves layers the plugin never touched alone, including their NBSPs", async () => {
    const node = makeNode(`Set in 16${NBSP}px type`);
    const result = await resetNodes([node], deps);
    expect(node.characters).toBe(`Set in 16${NBSP}px type`);
    expect(result.changed).toBe(0);
  });

  it("skips resetting layers with missing fonts", async () => {
    const node = makeNode("Hello beautiful world");
    await wrapNodes([node], "pretty", deps);
    node.hasMissingFont = true;
    const result = await resetNodes([node], deps);
    expect(result.skippedMissingFont).toBe(1);
    expect(node.characters).toBe(`Hello beautiful${NBSP}world`);
  });

  it("keeps range styles when resetting", async () => {
    const node = makeNode("Hello beautiful world", { styles: boldStyles() });
    await wrapNodes([node], "pretty", deps);
    await resetNodes([node], deps);
    expect(node.characters).toBe("Hello beautiful world");
    expect(node.styles).toEqual(boldStyles());
  });
});

describe("setText", () => {
  it("refuses a change in length instead of resetting styles", () => {
    const node = makeNode("Hello world");
    expect(() => setText(node, "Hello")).toThrow(/length would change/);
    expect(node.characters).toBe("Hello world");
  });
});
