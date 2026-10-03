import { describe, it, expect } from "vitest";
import { wrapNodes, resetNodes, type WrapDeps } from "../src/process";

const NBSP = "\u00A0";

/** A stand-in for Figma's TextNode with just the fields src/process.ts uses. */
function makeNode(text: string, opts: { textAutoResize?: string } = {}) {
  const data: Record<string, string> = {};
  return {
    name: "Text",
    characters: text,
    textAutoResize: opts.textAutoResize ?? "HEIGHT",
    getPluginData: (key: string) => data[key] ?? "",
    setPluginData: (key: string, value: string) => {
      data[key] = value;
    },
  };
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
});

describe("resetNodes", () => {
  it("restores the original text and clears the stored original", async () => {
    const node = makeNode("The quick brown fox jumps over the lazy dog");
    await wrapNodes([node], "balance", deps);
    const result = await resetNodes([node], deps);
    expect(node.characters).toBe("The quick brown fox jumps over the lazy dog");
    expect(result.changed).toBe(1);
    expect(node.getPluginData("originalText")).toBe("");
  });
});
