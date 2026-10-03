import { describe, it, expect } from "vitest";
import { clampWindowHeight, describeResult, isAction } from "../src/messages";

const result = (changes: Partial<{ changed: number; failed: number; skippedEdited: number; skippedMissingFont: number; interrupted: number; skippedFormatting: number }>) => ({
  changed: 0,
  failed: 0,
  skippedEdited: 0,
  skippedMissingFont: 0,
  interrupted: 0,
  skippedFormatting: 0,
  ...changes,
});

describe("describeResult", () => {
  it("names each action's outcome with its own verb", () => {
    expect(describeResult("balance", result({ changed: 3 }))).toEqual({ type: "success", message: "Balanced 3 text layers" });
    expect(describeResult("pretty", result({ changed: 1 }))).toEqual({ type: "success", message: "Prevented orphans in 1 text layer" });
    expect(describeResult("reset", result({ changed: 2 }))).toEqual({ type: "success", message: "Reset 2 text layers" });
  });

  it("reports nothing to do as info, not an error", () => {
    expect(describeResult("balance", result({}))).toEqual({ type: "info", message: "No changes needed" });
    expect(describeResult("reset", result({}))).toEqual({ type: "info", message: "Nothing to reset" });
  });

  it("explains missing fonts and how to fix them", () => {
    expect(describeResult("pretty", result({ skippedMissingFont: 2 }))).toEqual({
      type: "error",
      message: "Skipped 2 text layers with missing fonts. Install or replace the fonts, then try again.",
    });
  });

  it("keeps the success count when some layers were skipped", () => {
    expect(describeResult("balance", result({ changed: 3, skippedMissingFont: 1 }))).toEqual({
      type: "error",
      message: "Balanced 3 text layers. Skipped 1 text layer with missing fonts. Install or replace the fonts, then try again.",
    });
  });

  it("gives a recovery step when layers fail", () => {
    expect(describeResult("pretty", result({ failed: 1 }))).toEqual({
      type: "error",
      message: "Couldn't update 1 text layer. Try again, or reopen the plugin.",
    });
  });

  it("tells the designer their edits were kept on reset", () => {
    expect(describeResult("reset", result({ skippedEdited: 1 }))).toEqual({
      type: "info",
      message: "Kept 1 text layer you edited.",
    });
    expect(describeResult("reset", result({ changed: 2, skippedEdited: 1 }))).toEqual({
      type: "success",
      message: "Reset 2 text layers. Kept 1 text layer you edited.",
    });
  });
});

describe("describeResult — layers that changed during an action", () => {
  it("asks the designer to run the action again", () => {
    expect(describeResult("pretty", result({ changed: 1, interrupted: 1 }))).toEqual({
      type: "success",
      message: "Prevented orphans in 1 text layer. Skipped 1 text layer that changed during the action. Run it again.",
    });
    expect(describeResult("reset", result({ interrupted: 2 }))).toEqual({
      type: "info",
      message: "Skipped 2 text layers that changed during the action. Run it again.",
    });
  });
});

describe("describeResult — formatted text", () => {
  it("says why Balance left bulleted or indented text alone", () => {
    expect(describeResult("balance", result({ skippedFormatting: 2 }))).toEqual({
      type: "info",
      message: "Skipped 2 text layers with bullets, numbers or an indent.",
    });
  });
});

describe("clampWindowHeight", () => {
  it("keeps the window between its normal and maximum height, in whole pixels", () => {
    expect(clampWindowHeight(300)).toBe(460);
    expect(clampWindowHeight(512.2)).toBe(513);
    expect(clampWindowHeight(5000)).toBe(800);
  });
});

describe("isAction", () => {
  it("accepts only the three actions", () => {
    expect(isAction("balance")).toBe(true);
    expect(isAction("pretty")).toBe(true);
    expect(isAction("reset")).toBe(true);
    expect(isAction("done")).toBe(false);
    expect(isAction(undefined)).toBe(false);
  });
});
