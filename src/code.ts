import { applyPretty, applyBalance, shouldSkip, resetText } from "./algorithm";
import { findTextNodes } from "./traversal";
import { loadFontsForNode } from "./fonts";

figma.showUI(__html__, { width: 280, height: 380, themeColors: true });

type WrapMode = "balance" | "pretty";

async function processSelection(mode: WrapMode): Promise<number> {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.notify("Select a frame or text layer first", { error: true });
    return 0;
  }

  const textNodes = findTextNodes(selection) as TextNode[];

  if (textNodes.length === 0) {
    figma.notify("No text layers found in selection", { error: true });
    return 0;
  }

  let fixedCount = 0;

  for (const node of textNodes) {
    try {
      const text = node.characters;
      const autoResize = node.textAutoResize;

      if (shouldSkip(text, autoResize)) continue;

      // Store original text before first modification
      if (!node.getPluginData("originalText")) {
        node.setPluginData("originalText", text);
      }

      await loadFontsForNode(node);

      const fixed = mode === "pretty" ? applyPretty(text) : applyBalance(text);

      if (fixed !== text) {
        node.characters = fixed;
        fixedCount++;
      }
    } catch {
      // Skip nodes that fail (locked, removed, etc.)
    }
  }

  return fixedCount;
}

async function resetSelection(): Promise<number> {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.notify("Select a frame or text layer first", { error: true });
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
    } catch {
      // Skip nodes that fail
    }
  }

  return resetCount;
}

figma.ui.onmessage = async (msg: { type: string }) => {
  if (msg.type === "balance") {
    const count = await processSelection("balance");
    figma.notify(`Balanced ${count} text layer${count !== 1 ? "s" : ""}`);
    figma.ui.postMessage({ type: "done", count });
  }

  if (msg.type === "pretty") {
    const count = await processSelection("pretty");
    figma.notify(`Fixed ${count} text layer${count !== 1 ? "s" : ""}`);
    figma.ui.postMessage({ type: "done", count });
  }

  if (msg.type === "reset") {
    const count = await resetSelection();
    figma.notify(`Reset ${count} text layer${count !== 1 ? "s" : ""}`);
    figma.ui.postMessage({ type: "done", count });
  }
};
