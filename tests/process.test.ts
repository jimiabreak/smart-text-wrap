import { describe, it, expect } from "vitest";
import { wrapNodes, resetNodes, setText, type WrapDeps } from "../src/process";

const NBSP = "\u00A0";

/**
 * A stand-in for Figma's TextNode. It tracks one style name per character the
 * way Figma tracks range styles: assigning `characters` resets every
 * character to "regular", while insertCharacters/deleteCharacters keep them.
 */
function makeNode(text: string, opts: { textAutoResize?: string; styles?: string[] } = {}) {
  const data: Record<string, string> = {};
  let chars = text;
  let styles = opts.styles ?? text.split("").map(() => "regular");
  return {
    name: "Text",
    textAutoResize: opts.textAutoResize ?? "HEIGHT",
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

const deps: WrapDeps = { loadFonts: async () => {} };

describe("wrapNodes", () => {
  it("applies Pretty and stores the original text", async () => {
    const node = makeNode("The quick brown fox jumps over the lazy dog");
    const result = await wrapNodes([node], "pretty", deps);
    expect(node.characters).toBe(`The quick brown fox jumps over the lazy${NBSP}dog`);
    expect(result.changed).toBe(1);
    expect(node.getPluginData("originalText")).toBe("The quick brown fox jumps over the lazy dog");
  });

  it("applies Balance", async () => {
    const node = makeNode("The quick brown fox jumps");
    await wrapNodes([node], "balance", deps);
    expect(node.characters).toBe("The quick brown\nfox jumps");
  });

  it("switches from Balance to Pretty starting from the original text", async () => {
    const node = makeNode("The quick brown fox jumps over the lazy dog");
    await wrapNodes([node], "balance", deps);
    await wrapNodes([node], "pretty", deps);
    expect(node.characters).toBe(`The quick brown fox jumps over the lazy${NBSP}dog`);
  });

  it("does not double-apply when the same mode runs twice", async () => {
    const node = makeNode("The quick brown fox jumps");
    await wrapNodes([node], "balance", deps);
    await wrapNodes([node], "balance", deps);
    expect(node.characters).toBe("The quick brown\nfox jumps");
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
    const failing: WrapDeps = { loadFonts: async () => Promise.reject(new Error("font not available")) };
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

  it("keeps bold and other range styles when wrapping", async () => {
    const node = makeNode("Hello beautiful world", { styles: boldStyles() });
    await wrapNodes([node], "pretty", deps);
    expect(node.characters).toBe(`Hello beautiful${NBSP}world`);
    expect(node.styles).toEqual(boldStyles());
  });

  it("keeps range styles when switching from Balance to Pretty", async () => {
    const node = makeNode("Hello beautiful world", { styles: boldStyles() });
    await wrapNodes([node], "balance", deps);
    await wrapNodes([node], "pretty", deps);
    expect(node.styles).toEqual(boldStyles());
  });

  it("handles emoji next to the replaced space", async () => {
    const node = makeNode("Ship it today 🚀 friends");
    await wrapNodes([node], "pretty", deps);
    expect(node.characters).toBe(`Ship it today 🚀${NBSP}friends`);
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
