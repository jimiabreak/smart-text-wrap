import { detectMode, applyPretty, applyBalance, shouldSkip } from "./algorithm";
import { loadFontsForNode } from "./fonts";

figma.showUI(__html__, { width: 240, height: 180 });

let autoFixEnabled = true;
let previousSelection: readonly SceneNode[] = [];

async function fixTextNode(node: TextNode): Promise<boolean> {
  const text = node.characters;
  const autoResize = node.textAutoResize;

  if (shouldSkip(text, autoResize)) return false;

  // Resolve text style name for mode detection
  let styleName: string | null = null;
  if (node.textStyleId && typeof node.textStyleId === "string") {
    const style = await figma.getStyleByIdAsync(node.textStyleId);
    if (style) styleName = style.name;
  }

  const mode = detectMode(styleName, text);

  await loadFontsForNode(node);

  const fixed = mode === "pretty" ? applyPretty(text) : applyBalance(text);

  if (fixed === text) return false;

  node.characters = fixed;
  return true;
}

// Selection listener — fix previous text node when user clicks away
figma.on("selectionchange", () => {
  if (!autoFixEnabled) {
    previousSelection = figma.currentPage.selection;
    return;
  }

  const prev = previousSelection;
  previousSelection = figma.currentPage.selection;

  for (const node of prev) {
    if (node.type === "TEXT") {
      fixTextNode(node).catch(() => {
        // Silently skip nodes that can't be modified (e.g., removed from tree)
      });
    }
  }
});

// Batch fix — process all text nodes on the current page
async function fixCurrentPage(): Promise<number> {
  const textNodes = figma.currentPage.findAll(
    (node) => node.type === "TEXT"
  ) as TextNode[];

  let fixedCount = 0;

  for (const node of textNodes) {
    try {
      const wasFixed = await fixTextNode(node);
      if (wasFixed) fixedCount++;
    } catch {
      // Skip nodes that fail (locked, removed, etc.)
    }
  }

  return fixedCount;
}

// Message handler — receive UI actions
figma.ui.onmessage = async (msg: { type: string; enabled?: boolean }) => {
  if (msg.type === "fix-page") {
    const count = await fixCurrentPage();
    figma.notify(`Fixed ${count} text layer${count !== 1 ? "s" : ""}`);
    figma.ui.postMessage({ type: "fix-page-done", count });
  }

  if (msg.type === "toggle-auto") {
    autoFixEnabled = msg.enabled ?? true;
  }
};
