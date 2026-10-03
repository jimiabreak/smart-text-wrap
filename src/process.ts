import { applyPretty, applyBalance, shouldSkip, resetText } from "./algorithm";

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
}

export async function wrapNodes(nodes: TextNodeLike[], mode: WrapMode, deps: WrapDeps): Promise<ProcessResult> {
  const result: ProcessResult = { changed: 0, failed: 0 };

  for (const node of nodes) {
    try {
      await deps.loadFonts(node);

      // Always work from original text to prevent double-application
      const stored = node.getPluginData("originalText");
      const currentText = node.characters;
      const sourceText = stored || currentText;

      if (shouldSkip(sourceText, node.textAutoResize)) continue;

      // Store original before first modification
      if (!stored) {
        node.setPluginData("originalText", currentText);
      }

      // Restore to original first if previously modified
      if (stored && stored !== currentText) {
        node.characters = stored;
      }

      const fixed = mode === "pretty" ? applyPretty(sourceText) : applyBalance(sourceText);

      if (fixed !== sourceText) {
        node.characters = fixed;
        result.changed++;
      }
    } catch (e) {
      console.error("Failed to process node:", node.name, e);
      result.failed++;
    }
  }

  return result;
}

export async function resetNodes(nodes: TextNodeLike[], deps: WrapDeps): Promise<ProcessResult> {
  const result: ProcessResult = { changed: 0, failed: 0 };

  for (const node of nodes) {
    try {
      const original = node.getPluginData("originalText");
      const text = node.characters;
      const restored = resetText(text, original || undefined);

      if (restored !== text) {
        await deps.loadFonts(node);
        node.characters = restored;
        node.setPluginData("originalText", "");
        result.changed++;
      }
    } catch (e) {
      console.error("Failed to reset node:", node.name, e);
      result.failed++;
    }
  }

  return result;
}
