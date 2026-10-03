import { hasLineBreak } from "./algorithm";
import { setText } from "./text";

/**
 * Lay `text` out on a temporary copy of the layer, at the layer's width, and
 * read it with `read`. The copy is parented under figma.currentPage
 * (TextNode.clone's default), so the designer's layer and its parent's layout
 * are never touched. Fonts must already be loaded; `text` must be as long as
 * the layer's current text.
 */
function withProbe<T>(node: TextNode, text: string, read: (probe: TextNode) => T): T {
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
 * Line count and height of `text` at the layer's width: the wrapped height
 * divided by the height of one line ("WIDTH_AND_HEIGHT"). The one-line pass
 * only means one line when the text has no line breaks, so such text is refused.
 */
export function measureLines(node: TextNode, text: string): { lines: number; height: number } {
  if (hasLineBreak(text)) throw new Error("measureLines needs text without line breaks");
  return withProbe(node, text, (probe) => {
    const height = probe.height;
    probe.textAutoResize = "WIDTH_AND_HEIGHT";
    const lineHeight = probe.height;
    return { lines: lineHeight > 0 ? Math.max(1, Math.round(height / lineHeight)) : 1, height };
  });
}

/** Height of `text` at the layer's width, line breaks and paragraph spacing included. */
export function measureHeight(node: TextNode, text: string): number {
  return withProbe(node, text, (probe) => probe.height);
}

/**
 * True when each new paragraph would add a bullet, number or indent. Balance
 * breaks lines with "\n", which starts a new paragraph in Figma, so it must
 * leave such text alone.
 */
export function hasParagraphFormatting(node: TextNode): boolean {
  if (node.paragraphIndent > 0) return true;
  // Figma's range getters throw on an empty range
  if (node.characters.length === 0) return false;
  const list = node.getRangeListOptions(0, node.characters.length);
  return list === figma.mixed || list.type !== "NONE";
}
