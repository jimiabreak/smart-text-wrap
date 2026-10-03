import { applyPretty, applyBalance, shouldSkip } from "./algorithm";

export type WrapMode = "balance" | "pretty";

/** The parts of Figma's TextNode this module uses, so tests can pass plain objects. */
export interface TextNodeLike {
  name: string;
  characters: string;
  textAutoResize: string;
  getPluginData(key: string): string;
  setPluginData(key: string, value: string): void;
}

export interface WrapDeps {
  loadFonts(node: TextNodeLike): Promise<void>;
}

export interface ProcessResult {
  changed: number;
  failed: number;
  skippedEdited: number;
}

const ORIGINAL_KEY = "originalText";
const APPLIED_KEY = "appliedText";

function emptyResult(): ProcessResult {
  return { changed: 0, failed: 0, skippedEdited: 0 };
}

/** True when the layer still shows exactly what the plugin last wrote to it. */
function isUnedited(node: TextNodeLike): boolean {
  const applied = node.getPluginData(APPLIED_KEY);
  return applied !== "" && node.characters === applied;
}

/**
 * The text the designer owns: the stored original, unless the layer was edited
 * after the plugin last wrote to it. Then the edited text wins.
 */
function sourceText(node: TextNodeLike): string {
  const original = node.getPluginData(ORIGINAL_KEY);
  return original && isUnedited(node) ? original : node.characters;
}

function clearWrapData(node: TextNodeLike): void {
  node.setPluginData(ORIGINAL_KEY, "");
  node.setPluginData(APPLIED_KEY, "");
}

export async function wrapNodes(nodes: TextNodeLike[], mode: WrapMode, deps: WrapDeps): Promise<ProcessResult> {
  const result = emptyResult();

  for (const node of nodes) {
    try {
      const source = sourceText(node);
      if (shouldSkip(source, node.textAutoResize)) continue;

      await deps.loadFonts(node);

      const before = node.characters;
      const target = mode === "pretty" ? applyPretty(source) : applyBalance(source);
      if (before !== target) node.characters = target;
      if (node.characters !== before) result.changed++;

      if (target === source) {
        clearWrapData(node);
      } else {
        node.setPluginData(ORIGINAL_KEY, source);
        node.setPluginData(APPLIED_KEY, target);
      }
    } catch (e) {
      console.error("Failed to process node:", node.name, e);
      result.failed++;
    }
  }

  return result;
}

export async function resetNodes(nodes: TextNodeLike[], deps: WrapDeps): Promise<ProcessResult> {
  const result = emptyResult();

  for (const node of nodes) {
    try {
      const original = node.getPluginData(ORIGINAL_KEY);
      // Never wrapped by this plugin — leave the designer's text (and any NBSPs they typed) alone
      if (!original) continue;

      // Edited since the plugin wrote to it — keep the edit, forget the old original
      if (!isUnedited(node)) {
        clearWrapData(node);
        result.skippedEdited++;
        continue;
      }

      await deps.loadFonts(node);
      node.characters = original;
      clearWrapData(node);
      result.changed++;
    } catch (e) {
      console.error("Failed to reset node:", node.name, e);
      result.failed++;
    }
  }

  return result;
}
