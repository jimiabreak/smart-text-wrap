import { findTextNodes } from "./traversal";
import { loadFontsForNode } from "./fonts";
import { wrapNodes, resetNodes, type TextNodeLike, type WrapDeps, type WrapMode } from "./process";

figma.showUI(__html__, { width: 280, height: 380, themeColors: true });

const deps: WrapDeps = {
  loadFonts: (node: TextNodeLike) => loadFontsForNode(node as TextNode),
};

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

  const result = await wrapNodes(textNodes, mode, deps);
  return result.changed;
}

async function resetSelection(): Promise<number> {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({ type: "error", message: "Select a frame or text layer first" });
    return 0;
  }

  const textNodes = findTextNodes(selection) as TextNode[];
  const result = await resetNodes(textNodes, deps);
  return result.changed;
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

  // One undo step per action, so ⌘Z reverts only the latest click
  figma.commitUndo();

  // Always re-enable UI
  figma.ui.postMessage({ type: "done" });
};
