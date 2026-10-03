import { applyPretty, balanceToLines, shouldSkip } from "./algorithm";

export type WrapMode = "balance" | "pretty";

/** The parts of Figma's TextNode this module uses, so tests can pass plain objects. */
export interface TextNodeLike {
  name: string;
  characters: string;
  textAutoResize: string;
  hasMissingFont: boolean;
  getPluginData(key: string): string;
  setPluginData(key: string, value: string): void;
  insertCharacters(start: number, characters: string, useStyle?: "BEFORE" | "AFTER"): void;
  deleteCharacters(start: number, end: number): void;
}

export interface WrapDeps {
  loadFonts(node: TextNodeLike): Promise<void>;
  /** Rendered line count of the node's current text at its current width. Only called on text without line breaks. */
  countLines(node: TextNodeLike): number;
  /** Height of the node's current text when it wraps at its current width, line breaks included. */
  textHeight(node: TextNodeLike): number;
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

  let result = current;
  for (let i = 0; i < applied.length; i++) {
    if (original[i] === applied[i]) continue;
    let at = -1;
    if (i < prefix) at = i;
    else if (i >= applied.length - suffix) at = i - applied.length + current.length;
    if (at !== -1) result = result.slice(0, at) + original[i] + result.slice(at + 1);
  }
  return result;
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
 * Change the node's text to `target` one character at a time, so bold, links
 * and other range styles survive. Assigning `characters` would reset them.
 * The plugin only ever swaps a regular space for an NBSP or a line break (and
 * back), so `target` always has the same length as the current text.
 */
export function setText(node: TextNodeLike, target: string): void {
  const current = node.characters;
  if (current.length !== target.length) {
    throw new Error(`Refusing to rewrite "${node.name}": length would change from ${current.length} to ${target.length}`);
  }
  for (let i = 0; i < target.length; i++) {
    if (current[i] !== target[i]) {
      // Insert after the old character so the new one copies its style, then drop the old one
      node.insertCharacters(i + 1, target[i], "BEFORE");
      node.deleteCharacters(i, i + 1);
    }
  }
}

/** Balance against the layer's real line count, and keep the result only if the layer doesn't get taller. */
function balance(node: TextNodeLike, source: string, deps: WrapDeps): string {
  if (source.includes("\n")) return source;
  const shown = node.characters;
  try {
    setText(node, source); // measure the unwrapped text
    const lines = deps.countLines(node);
    const target = balanceToLines(source, lines);
    if (target === source) return source;
    const sourceHeight = deps.textHeight(node);
    setText(node, target);
    return deps.textHeight(node) <= sourceHeight ? target : source;
  } catch (e) {
    // Measuring failed: put back what the layer showed before this action
    setText(node, shown);
    throw e;
  }
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
      await deps.loadFonts(node);
      // A designer or another action may edit the layer while fonts load.
      if (!stillMatches(node, before)) {
        result.skippedEdited++;
        continue;
      }
      const keepsPretty = mode === "balance" && lastWriteWasPretty(node);
      try {
        const target = mode === "pretty" ? applyPretty(source) : balance(node, source, deps);
        if (keepsPretty && target === source) {
          // Nothing to balance: keep the earlier Pretty result rather than strip it
          restore(node, before);
          continue;
        }
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
      await deps.loadFonts(node);
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
