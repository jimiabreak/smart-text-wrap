const loadedFonts = new Set<string>();

function fontKey(font: FontName): string {
  return `${font.family}::${font.style}`;
}

export function resetFontCache(): void {
  loadedFonts.clear();
}

export async function loadFontsForNode(node: TextNode): Promise<void> {
  const fonts: FontName[] = [];

  if (node.fontName === figma.mixed) {
    const allFonts = node.getRangeAllFontNames(0, node.characters.length);
    fonts.push(...allFonts);
  } else {
    fonts.push(node.fontName as FontName);
  }

  const toLoad = fonts.filter((f) => !loadedFonts.has(fontKey(f)));

  await Promise.all(
    toLoad.map(async (font) => {
      await figma.loadFontAsync(font);
      loadedFonts.add(fontKey(font));
    })
  );
}
