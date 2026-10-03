const loadedFonts = new Set<string>();

function fontKey(font: FontName): string {
  return `${font.family}::${font.style}`;
}

export function resetFontCache(): void {
  loadedFonts.clear();
}

function nodeFonts(node: TextNode): FontName[] {
  const fonts: FontName[] = [];

  if (node.fontName === figma.mixed) {
    const allFonts = node.getRangeAllFontNames(0, node.characters.length);
    fonts.push(...allFonts);
  } else {
    fonts.push(node.fontName as FontName);
  }

  return fonts;
}

export async function loadFontsForNode(node: TextNode): Promise<void> {
  const toLoad = nodeFonts(node).filter((f) => !loadedFonts.has(fontKey(f)));

  await Promise.all(
    toLoad.map(async (font) => {
      await figma.loadFontAsync(font);
      loadedFonts.add(fontKey(font));
    })
  );
  // A style edit can introduce another font while the requested fonts load.
  // Leave that layer untouched; the next action will load its current fonts.
  if (nodeFonts(node).some((font) => !loadedFonts.has(fontKey(font)))) {
    throw new Error("Text fonts changed while loading. Try the action again.");
  }
}
