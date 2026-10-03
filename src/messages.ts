import type { ProcessResult } from "./process";

export type Action = "balance" | "pretty" | "reset";
export type ToastVariant = "success" | "info" | "error";

/** A message the UI sends to the plugin. */
export type PluginRequest = { type: Action } | { type: "resize"; height: number };

/** A message the plugin sends to the UI. */
export type UiMessage = { type: ToastVariant; message: string } | { type: "done" };

export const NO_SELECTION = "Select a frame or text layer first";
export const NO_TEXT_LAYERS = "No text layers in the selection. Select a layer that contains text.";
export const UNEXPECTED_ERROR = "Unable to update text. Try again, or reopen the plugin.";

export function isAction(value: unknown): value is Action {
  return value === "balance" || value === "pretty" || value === "reset";
}

function layers(count: number): string {
  return `${count} text layer${count === 1 ? "" : "s"}`;
}

const DONE: Record<Action, (count: number) => string> = {
  balance: (count) => `Balanced ${layers(count)}`,
  pretty: (count) => `Prevented orphans in ${layers(count)}`,
  reset: (count) => `Reset ${layers(count)}`,
};

/** Turn a processing result into the one toast the user sees. */
export function describeResult(action: Action, result: ProcessResult): { type: ToastVariant; message: string } {
  const problems: string[] = [];
  if (result.skippedMissingFont > 0) {
    problems.push(`Skipped ${layers(result.skippedMissingFont)} with missing fonts. Install or replace the fonts, then try again.`);
  }
  if (result.failed > 0) {
    problems.push(`Couldn't update ${layers(result.failed)}. Try again, or reopen the plugin.`);
  }
  const kept = `Kept ${layers(result.skippedEdited)} you edited.`;
  const notes = result.skippedEdited > 0 ? [action === "reset" ? kept : `${kept} Run the action again if needed.`] : [];

  const parts = result.changed > 0 ? [`${DONE[action](result.changed)}.`, ...problems, ...notes] : [...problems, ...notes];

  if (problems.length > 0) return { type: "error", message: parts.join(" ") };
  if (result.changed > 0) return { type: "success", message: notes.length > 0 ? parts.join(" ") : DONE[action](result.changed) };
  if (notes.length > 0) return { type: "info", message: parts.join(" ") };
  return { type: "info", message: action === "reset" ? "Nothing to reset" : "No changes needed" };
}
