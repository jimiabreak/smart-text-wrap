import { applyPretty, applyBalance, shouldSkip, resetText } from "./algorithm";
import { findTextNodes } from "./traversal";
import { loadFontsForNode } from "./fonts";

figma.showUI(__html__, { width: 280, height: 380, themeColors: true });

type WrapMode = "balance" | "pretty";

async function processSelection(mode: WrapMode): Promise<number> {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({ type: "error", message: "Select a frame or text layer first" });
    return 0;
  }

  const textNodes = findTextNodes(selection) as TextNode[];

  if (textNodes.length === 0) {
    figma.ui.postMessage({ type: "error", message: "No text layers found in selection" });
    return 0;
  }

  let fixedCount = 0;

  for (const node of textNodes) {
    try {
      await loadFontsForNode(node);

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
        fixedCount++;
      }
    } catch (e) {
      console.error("Failed to process node:", node.name, e);
    }
  }

  return fixedCount;
}

async function resetSelection(): Promise<number> {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({ type: "error", message: "Select a frame or text layer first" });
    return 0;
  }

  const textNodes = findTextNodes(selection) as TextNode[];
  let resetCount = 0;

  for (const node of textNodes) {
    try {
      const original = node.getPluginData("originalText");
      const text = node.characters;
      const restored = resetText(text, original || undefined);

      if (restored !== text) {
        await loadFontsForNode(node);
        node.characters = restored;
        node.setPluginData("originalText", "");
        resetCount++;
      }
    } catch (e) {
      console.error("Failed to reset node:", node.name, e);
    }
  }

  return resetCount;
}

figma.ui.onmessage = async (msg: { type: string }) => {
  try {
    if (msg.type === "balance") {
      const count = await processSelection("balance");
      if (count > 0) {
        figma.ui.postMessage({ type: "success", message: `Balanced ${count} text layer${count !== 1 ? "s" : ""}` });
      } else {
        figma.ui.postMessage({ type: "error", message: "No text needed changes" });
      }
    }

    if (msg.type === "pretty") {
      const count = await processSelection("pretty");
      if (count > 0) {
        figma.ui.postMessage({ type: "success", message: `Fixed ${count} text layer${count !== 1 ? "s" : ""}` });
      } else {
        figma.ui.postMessage({ type: "error", message: "No text needed changes" });
      }
    }

    if (msg.type === "reset") {
      const count = await resetSelection();
      if (count > 0) {
        figma.ui.postMessage({ type: "success", message: `Reset ${count} text layer${count !== 1 ? "s" : ""}` });
      } else {
        figma.ui.postMessage({ type: "error", message: "No text to reset" });
      }
    }
  } catch (e) {
    console.error("Plugin error:", e);
    figma.ui.postMessage({ type: "error", message: "Something went wrong" });
  }

  // Always re-enable UI
  figma.ui.postMessage({ type: "done" });
};
