import { findTextNodes } from "./traversal";
import { loadFontsForNode } from "./fonts";
import { countLines, textHeight } from "./measure";
import { wrapNodes, resetNodes, type TextNodeLike, type WrapDeps } from "./process";
import {
  describeResult,
  isAction,
  NO_SELECTION,
  NO_TEXT_LAYERS,
  UNEXPECTED_ERROR,
  type Action,
  type UiMessage,
} from "./messages";

figma.showUI(__html__, { width: 280, height: 460, themeColors: true });

function post(message: UiMessage): void {
  figma.ui.postMessage(message);
}

const deps: WrapDeps = {
  loadFonts: (node: TextNodeLike) => loadFontsForNode(node as TextNode),
  countLines: (node: TextNodeLike) => countLines(node as TextNode),
  textHeight: (node: TextNodeLike) => textHeight(node as TextNode),
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

figma.ui.onmessage = async (msg: { type: string }) => {
  try {
    if (isAction(msg.type)) await run(msg.type);
  } catch (e) {
    console.error("Plugin error:", e);
    post({ type: "error", message: UNEXPECTED_ERROR });
  }

  // One undo step per action, so ⌘Z reverts only the latest click
  figma.commitUndo();

  // Always re-enable UI
  post({ type: "done" });
};
