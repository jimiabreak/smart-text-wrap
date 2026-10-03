/**
 * Rendered line count of a single-paragraph text layer at its current width.
 *
 * Measures a temporary clone so the designer's layer is never resized: the
 * clone first wraps at the layer's width ("HEIGHT"), then is laid out on one
 * line ("WIDTH_AND_HEIGHT") to get the height of a single line. Only valid for
 * text without line breaks; with "\n" the one-line pass would measure several
 * lines. Fonts must already be loaded.
 */
export function countLines(node: TextNode): number {
  if (node.textAutoResize === "WIDTH_AND_HEIGHT") return 1;

  const probe = node.clone();
  try {
    probe.textTruncation = "DISABLED";
    probe.textAutoResize = "HEIGHT";
    const wrappedHeight = probe.height;
    probe.textAutoResize = "WIDTH_AND_HEIGHT";
    const lineHeight = probe.height;
    return lineHeight > 0 ? Math.max(1, Math.round(wrappedHeight / lineHeight)) : 1;
  } finally {
    probe.remove();
  }
}

/**
 * Height of a text layer's text when it wraps at the layer's current width,
 * line breaks and paragraph spacing included. Measures a temporary clone so
 * the designer's layer is never resized. Fonts must already be loaded.
 */
export function textHeight(node: TextNode): number {
  const probe = node.clone();
  try {
    probe.textTruncation = "DISABLED";
    probe.textAutoResize = "HEIGHT";
    return probe.height;
  } finally {
    probe.remove();
  }
}
