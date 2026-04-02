"use strict";
(() => {
  // src/algorithm.ts
  var BALANCE_PATTERN = /\b(head|title|display|h[1-6])\b/i;
  function detectMode(styleName, text) {
    if (styleName) {
      return BALANCE_PATTERN.test(styleName) ? "balance" : "pretty";
    }
    return text.length < 50 ? "balance" : "pretty";
  }
  var NBSP = "\xA0";
  function applyPrettyToLine(line) {
    const trimmed = line.trim();
    if (!trimmed.includes(" "))
      return line;
    const lastSpaceIdx = trimmed.lastIndexOf(" ");
    if (lastSpaceIdx === -1)
      return line;
    const beforeLast = trimmed.slice(0, lastSpaceIdx);
    const lastWord = trimmed.slice(lastSpaceIdx + 1);
    const lastNbspIdx = trimmed.lastIndexOf(NBSP);
    if (lastNbspIdx > beforeLast.lastIndexOf(" "))
      return line;
    const secondLastSpaceIdx = beforeLast.lastIndexOf(" ");
    if (secondLastSpaceIdx !== -1) {
      const secondLastWord = beforeLast.slice(secondLastSpaceIdx + 1);
      if ((secondLastWord + lastWord).length > 20) {
        const threeWordTail = secondLastWord + NBSP + lastWord;
        const beforeThree = beforeLast.slice(0, secondLastSpaceIdx);
        const thirdLastSpaceIdx = beforeThree.lastIndexOf(" ");
        if (thirdLastSpaceIdx !== -1) {
          const thirdLastWord = beforeThree.slice(thirdLastSpaceIdx + 1);
          const prefix = beforeThree.slice(0, thirdLastSpaceIdx);
          return prefix + NBSP + thirdLastWord + NBSP + threeWordTail;
        }
        return beforeThree + NBSP + threeWordTail;
      }
    }
    return beforeLast + NBSP + lastWord;
  }
  function applyPretty(text) {
    return text.split("\n").map(applyPrettyToLine).join("\n");
  }
  function balanceLine(line) {
    const trimmed = line.trim();
    if (!trimmed.includes(" "))
      return line;
    const midpoint = trimmed.length / 2;
    let bestIdx = -1;
    for (let i = Math.ceil(midpoint); i < trimmed.length; i++) {
      if (trimmed[i] === " ") {
        bestIdx = i;
        break;
      }
    }
    if (bestIdx === -1) {
      for (let i = Math.floor(midpoint); i >= 0; i--) {
        if (trimmed[i] === " ") {
          bestIdx = i;
          break;
        }
      }
    }
    if (bestIdx === -1)
      return line;
    return trimmed.slice(0, bestIdx) + "\n" + trimmed.slice(bestIdx + 1);
  }
  function applyBalance(text) {
    return text.split("\n").map(balanceLine).join("\n");
  }
  function shouldSkip(text, textAutoResize) {
    const trimmed = text.trim();
    if (!trimmed)
      return true;
    if (!trimmed.includes(" "))
      return true;
    if (textAutoResize === "WIDTH_AND_HEIGHT")
      return true;
    const lastSpaceIdx = trimmed.lastIndexOf(" ");
    const lastNbspIdx = trimmed.lastIndexOf(NBSP);
    if (lastNbspIdx > lastSpaceIdx)
      return true;
    return false;
  }

  // src/fonts.ts
  var loadedFonts = /* @__PURE__ */ new Set();
  function fontKey(font) {
    return `${font.family}::${font.style}`;
  }
  async function loadFontsForNode(node) {
    const fonts = [];
    if (node.fontName === figma.mixed) {
      const allFonts = node.getRangeAllFontNames(0, node.characters.length);
      fonts.push(...allFonts);
    } else {
      fonts.push(node.fontName);
    }
    const toLoad = fonts.filter((f) => !loadedFonts.has(fontKey(f)));
    await Promise.all(
      toLoad.map(async (font) => {
        await figma.loadFontAsync(font);
        loadedFonts.add(fontKey(font));
      })
    );
  }

  // src/code.ts
  figma.showUI(__html__, { width: 240, height: 180 });
  var autoFixEnabled = true;
  var previousSelection = [];
  async function fixTextNode(node) {
    const text = node.characters;
    const autoResize = node.textAutoResize;
    if (shouldSkip(text, autoResize))
      return false;
    let styleName = null;
    if (node.textStyleId && typeof node.textStyleId === "string") {
      const style = await figma.getStyleByIdAsync(node.textStyleId);
      if (style)
        styleName = style.name;
    }
    const mode = detectMode(styleName, text);
    await loadFontsForNode(node);
    const fixed = mode === "pretty" ? applyPretty(text) : applyBalance(text);
    if (fixed === text)
      return false;
    node.characters = fixed;
    return true;
  }
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
        });
      }
    }
  });
  async function fixCurrentPage() {
    const textNodes = figma.currentPage.findAll(
      (node) => node.type === "TEXT"
    );
    let fixedCount = 0;
    for (const node of textNodes) {
      try {
        const wasFixed = await fixTextNode(node);
        if (wasFixed)
          fixedCount++;
      } catch (e) {
      }
    }
    return fixedCount;
  }
  figma.ui.onmessage = async (msg) => {
    var _a;
    if (msg.type === "fix-page") {
      const count = await fixCurrentPage();
      figma.notify(`Fixed ${count} text layer${count !== 1 ? "s" : ""}`);
      figma.ui.postMessage({ type: "fix-page-done", count });
    }
    if (msg.type === "toggle-auto") {
      autoFixEnabled = (_a = msg.enabled) != null ? _a : true;
    }
  };
})();
