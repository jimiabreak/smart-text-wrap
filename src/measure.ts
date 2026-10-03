import { setText } from "./text";

/**
 * Lay `text` out on a temporary copy of the layer, at the layer's width, and
 * return its height and its line count (wrapped height divided by the height of
 * one line). The line count is only meaningful for text without line breaks.
 *
 * The copy is parented under figma.currentPage (TextNode.clone's default), so
 * the designer's layer and its parent's layout are never touched. Fonts must
 * already be loaded; `text` must be as long as the layer's current text.
 */
export function measureText(node: TextNode, text: string): { lines: number; height: number } {
  const probe = node.clone();
  try {
    probe.textTruncation = "DISABLED";
    // Vertical trim makes one line shorter than every other line, which skews line counts
    probe.leadingTrim = "NONE";
    setText(probe, text);
    probe.textAutoResize = "HEIGHT";
    const height = probe.height;
    probe.textAutoResize = "WIDTH_AND_HEIGHT";
    const lineHeight = probe.height;
    return { lines: lineHeight > 0 ? Math.max(1, Math.round(height / lineHeight)) : 1, height };
  } finally {
    probe.remove();
  }
}
