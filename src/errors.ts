/** Thrown when a layer's fonts change while they load: the designer is editing it, so it is left alone. */
export class FontsChangedError extends Error {
  constructor() {
    super("Text fonts changed while loading. Try the action again.");
    this.name = "FontsChangedError";
  }
}
