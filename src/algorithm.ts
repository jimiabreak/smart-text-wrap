const NBSP = "\u00A0";

/**
 * If an original is stored, return it directly.
 * Otherwise, strip NBSP characters back to regular spaces.
 */
export function resetText(text: string, original?: string): string {
  if (original) return original;
  return text.replace(/\u00A0/g, " ");
}

function applyPrettyToLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed.includes(" ")) return line;

  // Already fixed — last space before final word is already NBSP
  const lastSpaceIdx = trimmed.lastIndexOf(" ");
  if (lastSpaceIdx === -1) return line;

  const beforeLast = trimmed.slice(0, lastSpaceIdx);
  const lastWord = trimmed.slice(lastSpaceIdx + 1);

  // Check if already has NBSP before last word
  const lastNbspIdx = trimmed.lastIndexOf(NBSP);
  if (lastNbspIdx > beforeLast.lastIndexOf(" ")) return line;

  // If last two words combined > 20 chars, join last three
  const secondLastSpaceIdx = beforeLast.lastIndexOf(" ");
  if (secondLastSpaceIdx !== -1) {
    const secondLastWord = beforeLast.slice(secondLastSpaceIdx + 1);
    if ((secondLastWord + lastWord).length > 20) {
      // Join all three last words with NBSP
      const threeWordTail = secondLastWord + NBSP + lastWord;
      const beforeThree = beforeLast.slice(0, secondLastSpaceIdx);
      const thirdLastSpaceIdx = beforeThree.lastIndexOf(" ");
      if (thirdLastSpaceIdx !== -1) {
        const thirdLastWord = beforeThree.slice(thirdLastSpaceIdx + 1);
        const prefix = beforeThree.slice(0, thirdLastSpaceIdx);
        return prefix + NBSP + thirdLastWord + NBSP + threeWordTail;
      }
      // Only three words total
      return beforeThree + NBSP + threeWordTail;
    }
  }

  return beforeLast + NBSP + lastWord;
}

export function applyPretty(text: string): string {
  return text.split("\n").map(applyPrettyToLine).join("\n");
}

function balanceLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed.includes(" ")) return line;

  const midpoint = trimmed.length / 2;
  let bestIdx = -1;

  // Find the first space at or after the midpoint
  for (let i = Math.ceil(midpoint); i < trimmed.length; i++) {
    if (trimmed[i] === " ") {
      bestIdx = i;
      break;
    }
  }

  // Fall back to the last space before the midpoint
  if (bestIdx === -1) {
    for (let i = Math.floor(midpoint); i >= 0; i--) {
      if (trimmed[i] === " ") {
        bestIdx = i;
        break;
      }
    }
  }

  if (bestIdx === -1) return line;
  return trimmed.slice(0, bestIdx) + "\n" + trimmed.slice(bestIdx + 1);
}

export function applyBalance(text: string): string {
  return text.split("\n").map(balanceLine).join("\n");
}

export function shouldSkip(text: string, textAutoResize: string): boolean {
  const trimmed = text.trim();

  // Empty or whitespace
  if (!trimmed) return true;

  // Single word
  if (!trimmed.includes(" ")) return true;

  // Auto-width container — no orphan possible
  if (textAutoResize === "WIDTH_AND_HEIGHT") return true;

  // Already fixed — last space before final word is NBSP
  const lastSpaceIdx = trimmed.lastIndexOf(" ");
  const lastNbspIdx = trimmed.lastIndexOf(NBSP);
  if (lastNbspIdx > lastSpaceIdx) return true;

  return false;
}

