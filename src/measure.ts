import { setText } from "./text";

/**
 * Lay out `text` on a temporary copy of the layer and read it with `read`.
 * The copy is parented under figma.currentPage (TextNode.clone's default), so
 * the designer's layer and its parent's layout are never touched. Fonts must
 * already be loaded; `text` must be as long as the layer's current text.
 */
function measure<T>(node: TextNode, text: string, read: (probe: TextNode) => T): T {
  const probe = node.clone();
  try {
    probe.textTruncation = "DISABLED";
    // Vertical trim makes one line shorter than every other line, which skews line counts
    probe.leadingTrim = "NONE";
    setText(probe, text);
    probe.textAutoResize = "HEIGHT";
    return read(probe);
  } finally {
    probe.remove();
  }
}

/**
 * Rendered line count of single-paragraph `text` at the layer's width: the
 * wrapped height divided by the height of one line ("WIDTH_AND_HEIGHT").
 * Only valid for text without line breaks.
 */
export function countLines(node: TextNode, text: string): number {
  if (node.textAutoResize === "WIDTH_AND_HEIGHT") return 1;
  return measure(node, text, (probe) => {
    const wrappedHeight = probe.height;
    probe.textAutoResize = "WIDTH_AND_HEIGHT";
    const lineHeight = probe.height;
    return lineHeight > 0 ? Math.max(1, Math.round(wrappedHeight / lineHeight)) : 1;
  });
}

/** Height of `text` wrapped at the layer's width, line breaks and paragraph spacing included. */
export function textHeight(node: TextNode, text: string): number {
  return measure(node, text, (probe) => probe.height);
}
