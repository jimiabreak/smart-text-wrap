import { applyPretty, balanceToLines, hasLineBreak, shouldSkip } from "./algorithm";
import { FontsChangedError } from "./errors";
import { setText } from "./text";

export { setText };

export type WrapMode = "balance" | "pretty";

/** The parts of Figma's TextNode this module uses, so tests can pass plain objects. */
export interface TextNodeLike {
  name: string;
  characters: string;
  textAutoResize: string;
  hasMissingFont: boolean;
  /** True once the layer has been deleted. */
  removed: boolean;
  getPluginData(key: string): string;
  setPluginData(key: string, value: string): void;
  insertCharacters(start: number, characters: string, useStyle?: "BEFORE" | "AFTER"): void;
  deleteCharacters(start: number, end: number): void;
}

export interface WrapDeps {
  loadFonts(node: TextNodeLike): Promise<void>;
  /** Rendered line count of `text` at the node's width, measured without touching the node. `text` has no line breaks. */
  countLines(node: TextNodeLike, text: string): number;
  /** Height of `text` wrapped at the node's width, line breaks included, measured without touching the node. */
  textHeight(node: TextNodeLike, text: string): number;
}

export interface ProcessResult {
  changed: number;
  failed: number;
  skippedEdited: number;
  skippedMissingFont: number;
}

const ORIGINAL_KEY = "originalText";
const APPLIED_KEY = "appliedText";

function emptyResult(): ProcessResult {
  return { changed: 0, failed: 0, skippedEdited: 0, skippedMissingFont: 0 };
}

/** True when the layer still shows exactly what the plugin last wrote to it. */
function isUnedited(node: TextNodeLike): boolean {
  const applied = node.getPluginData(APPLIED_KEY);
  return applied !== "" && node.characters === applied;
}

/**
 * The edited text with the plugin's own earlier swaps (the NBSPs and line
 * breaks it inserted) turned back into spaces, but only outside the span the
 * designer changed, so the edit is kept exactly as typed. `original` and
 * `applied` are the stored texts from the plugin's last write.
 */
function withoutPluginSwaps(original: string, applied: string, current: string): string {
  if (original.length !== applied.length) return current;

  // The edited span lies between the longest common prefix and suffix of applied and current
  const shorter = Math.min(applied.length, current.length);
  let prefix = 0;
  while (prefix < shorter && applied[prefix] === current[prefix]) prefix++;
  let suffix = 0;
  while (suffix < shorter - prefix && applied[applied.length - 1 - suffix] === current[current.length - 1 - suffix]) suffix++;

  const result = current.split("");
  for (let i = 0; i < applied.length; i++) {
    if (original[i] === applied[i]) continue;
    if (i < prefix) result[i] = original[i];
    else if (i >= applied.length - suffix) result[i - applied.length + current.length] = original[i];
  }
  return result.join("");
}

/**
 * The text the designer owns: the stored original, unless the layer was edited
 * after the plugin last wrote to it. Then the edited text wins, minus the
 * plugin's own swaps outside the edit.
 */
function sourceText(node: TextNodeLike): string {
  const original = node.getPluginData(ORIGINAL_KEY);
  if (!original) return node.characters;
  if (isUnedited(node)) return original;
  const applied = node.getPluginData(APPLIED_KEY);
  return applied ? withoutPluginSwaps(original, applied, node.characters) : node.characters;
}

/**
 * True when the plugin's last write to this layer was Pretty, edited since or
 * not: Pretty never adds line breaks, Balance always does.
 */
function lastWriteWasPretty(node: TextNodeLike): boolean {
  const original = node.getPluginData(ORIGINAL_KEY);
  const applied = node.getPluginData(APPLIED_KEY);
  if (!original || !applied) return false;
  return applied.split("\n").length === original.split("\n").length;
}

function clearWrapData(node: TextNodeLike): void {
  node.setPluginData(ORIGINAL_KEY, "");
  node.setPluginData(APPLIED_KEY, "");
}

function snapshot(node: TextNodeLike) {
  return {
    text: node.characters,
    original: node.getPluginData(ORIGINAL_KEY),
    applied: node.getPluginData(APPLIED_KEY),
    resize: node.textAutoResize,
    missingFont: node.hasMissingFont,
  };
}

function stillMatches(node: TextNodeLike, before: ReturnType<typeof snapshot>): boolean {
  const now = snapshot(node);
  return now.text === before.text && now.original === before.original && now.applied === before.applied
    && now.resize === before.resize && now.missingFont === before.missingFont;
}

/** Restore text and both metadata entries even if an individual rollback fails. */
function restore(node: TextNodeLike, before: ReturnType<typeof snapshot>): void {
  try {
    if (node.characters !== before.text) setText(node, before.text);
  } finally {
    try {
      if (node.getPluginData(ORIGINAL_KEY) !== before.original) node.setPluginData(ORIGINAL_KEY, before.original);
    } finally {
      if (node.getPluginData(APPLIED_KEY) !== before.applied) node.setPluginData(APPLIED_KEY, before.applied);
    }
  }
}

/**
 * Balance against the layer's real line count, and keep the result only if the
 * layer doesn't get taller. Measures copies, so the layer itself is never touched.
 */
function balance(node: TextNodeLike, source: string, deps: WrapDeps): string {
  if (hasLineBreak(source)) return source;
  const target = balanceToLines(source, deps.countLines(node, source));
  if (target === source) return source;
  return deps.textHeight(node, target) <= deps.textHeight(node, source) ? target : source;
}

/**
 * Load the layer's fonts. Returns false when the layer should be left alone:
 * deleted, or its fonts changed while loading because the designer is editing it.
 */
async function loadFontsFor(node: TextNodeLike, deps: Pick<WrapDeps, "loadFonts">, result: ProcessResult): Promise<boolean> {
  try {
    await deps.loadFonts(node);
  } catch (e) {
    if (!(e instanceof FontsChangedError)) throw e;
    result.skippedEdited++;
    return false;
  }
  return !node.removed;
}

export async function wrapNodes(nodes: TextNodeLike[], mode: WrapMode, deps: WrapDeps): Promise<ProcessResult> {
  const result = emptyResult();

  for (const node of nodes) {
    try {
      const source = sourceText(node);
      if (shouldSkip(source, node.textAutoResize)) continue;

      if (node.hasMissingFont) {
        result.skippedMissingFont++;
        continue;
      }
      const before = snapshot(node);
      if (!(await loadFontsFor(node, deps, result))) continue;
      // A designer or another action may edit the layer while fonts load.
      if (!stillMatches(node, before)) {
        result.skippedEdited++;
        continue;
      }
      const keepsPretty = mode === "balance" && lastWriteWasPretty(node);
      try {
        const target = mode === "pretty" ? applyPretty(source) : balance(node, source, deps);
        // Nothing to balance: keep the earlier Pretty result rather than strip it
        if (keepsPretty && target === source) continue;
        // Store both recovery entries before committing the final text.
        if (target === source) {
          clearWrapData(node);
        } else {
          node.setPluginData(ORIGINAL_KEY, source);
          node.setPluginData(APPLIED_KEY, target);
        }
        setText(node, target);
      } catch (e) {
        restore(node, before);
        throw e;
      }
      if (node.characters !== before.text) result.changed++;
    } catch (e) {
      console.error("Failed to process node:", node.name, e);
      result.failed++;
    }
  }

  return result;
}

export async function resetNodes(nodes: TextNodeLike[], deps: Pick<WrapDeps, "loadFonts">): Promise<ProcessResult> {
  const result = emptyResult();

  for (const node of nodes) {
    try {
      const original = node.getPluginData(ORIGINAL_KEY);
      // Never wrapped by this plugin — leave the designer's text (and any NBSPs they typed) alone
      if (!original) continue;

      // The original, or for an edited layer the edit minus the plugin's own swaps around it
      const target = sourceText(node);

      // Edited, with none of the plugin's swaps left outside the edit — keep it as typed
      if (target === node.characters) {
        clearWrapData(node);
        result.skippedEdited++;
        continue;
      }

      if (node.hasMissingFont) {
        result.skippedMissingFont++;
        continue;
      }
      const before = snapshot(node);
      if (!(await loadFontsFor(node, deps, result))) continue;
      if (!stillMatches(node, before)) {
        result.skippedEdited++;
        continue;
      }
      try {
        clearWrapData(node);
        setText(node, target);
      } catch (e) {
        restore(node, before);
        throw e;
      }
      result.changed++;
    } catch (e) {
      console.error("Failed to reset node:", node.name, e);
      result.failed++;
    }
  }

  return result;
}
