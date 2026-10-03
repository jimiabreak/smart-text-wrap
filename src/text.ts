/** The parts of a Figma TextNode that range-preserving edits need. */
export interface EditableText {
  name: string;
  characters: string;
  insertCharacters(start: number, characters: string, useStyle?: "BEFORE" | "AFTER"): void;
  deleteCharacters(start: number, end: number): void;
}

/**
 * Change the node's text to `target` one character at a time, so bold, links
 * and other range styles survive. Assigning `characters` would reset them.
 * The plugin only ever swaps a regular space for an NBSP or a line break (and
 * back), so `target` always has the same length as the current text.
 */
export function setText(node: EditableText, target: string): void {
  const current = node.characters;
  if (current.length !== target.length) {
    throw new Error(`Refusing to rewrite "${node.name}": length would change from ${current.length} to ${target.length}`);
  }
  for (let i = 0; i < target.length; i++) {
    if (current[i] !== target[i]) {
      // Insert after the old character so the new one copies its style, then drop the old one
      node.insertCharacters(i + 1, target[i], "BEFORE");
      node.deleteCharacters(i, i + 1);
    }
  }
}
