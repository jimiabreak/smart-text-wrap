import { findTextNodes } from "./traversal";
import { loadFontsForNode } from "./fonts";
import { hasParagraphFormatting, measureHeight, measureLines } from "./measure";
import { wrapNodes, resetNodes, type TextNodeLike, type WrapDeps } from "./process";
import {
  describeResult,
  isAction,
  NO_SELECTION,
  NO_TEXT_LAYERS,
  UNEXPECTED_ERROR,
  WINDOW_SIZE,
  clampWindowHeight,
  type Action,
  type PluginRequest,
  type UiMessage,
} from "./messages";

figma.showUI(__html__, { width: WINDOW_SIZE.width, height: WINDOW_SIZE.height, themeColors: true });

function post(message: UiMessage): void {
  figma.ui.postMessage(message);
}

const deps: WrapDeps = {
  loadFonts: (node: TextNodeLike) => loadFontsForNode(node as TextNode),
  measureLines: (node: TextNodeLike, text: string) => measureLines(node as TextNode, text),
  measureHeight: (node: TextNodeLike, text: string) => measureHeight(node as TextNode, text),
  hasParagraphFormatting: (node: TextNodeLike) => hasParagraphFormatting(node as TextNode),
};

async function run(action: Action): Promise<void> {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    post({ type: "error", message: NO_SELECTION });
    return;
  }

  const textNodes = findTextNodes(selection) as TextNode[];

  if (textNodes.length === 0) {
    post({ type: "error", message: NO_TEXT_LAYERS });
    return;
  }

  const result = action === "reset" ? await resetNodes(textNodes, deps) : await wrapNodes(textNodes, action, deps);
  post(describeResult(action, result));
}

// Messages come from the panel's iframe, so check their shape at runtime too
figma.ui.onmessage = async (msg: PluginRequest) => {
  if (!msg || typeof msg !== "object") return;

  if (msg.type === "resize") {
    if (Number.isFinite(msg.height)) {
      figma.ui.resize(WINDOW_SIZE.width, clampWindowHeight(msg.height));
    }
    return;
  }

  // Anything else is not from the panel: ignore it, so it can't end a running action early
  if (!isAction(msg.type)) return;

  try {
    await run(msg.type);
  } catch (e) {
    console.error("Plugin error:", e);
    post({ type: "error", message: UNEXPECTED_ERROR });
  } finally {
    try {
      // One undo step per action, so ⌘Z reverts only the latest click
      figma.commitUndo();
    } catch (e) {
      console.error("Could not commit the undo step:", e);
    }
    // Always re-enable the UI
    post({ type: "done" });
  }
};
