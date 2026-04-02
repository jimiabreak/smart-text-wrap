import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadFontsForNode, resetFontCache } from "../src/fonts";

const mockLoadFontAsync = vi.fn().mockResolvedValue(undefined);
const MIXED = Symbol("mixed");

vi.stubGlobal("figma", {
  mixed: MIXED,
  loadFontAsync: mockLoadFontAsync,
});

describe("loadFontsForNode", () => {
  beforeEach(() => {
    mockLoadFontAsync.mockClear();
    resetFontCache();
  });

  it("loads a single font for a text node", async () => {
    const node = {
      fontName: { family: "Inter", style: "Regular" },
      characters: "Hello world",
    } as any;

    await loadFontsForNode(node);
    expect(mockLoadFontAsync).toHaveBeenCalledWith({ family: "Inter", style: "Regular" });
    expect(mockLoadFontAsync).toHaveBeenCalledTimes(1);
  });

  it("loads all fonts for a mixed-font text node", async () => {
    const node = {
      fontName: MIXED,
      characters: "Hello world",
      getRangeAllFontNames: vi.fn().mockReturnValue([
        { family: "Inter", style: "Regular" },
        { family: "Inter", style: "Bold" },
      ]),
    } as any;

    await loadFontsForNode(node);
    expect(mockLoadFontAsync).toHaveBeenCalledWith({ family: "Inter", style: "Regular" });
    expect(mockLoadFontAsync).toHaveBeenCalledWith({ family: "Inter", style: "Bold" });
    expect(mockLoadFontAsync).toHaveBeenCalledTimes(2);
  });
});
