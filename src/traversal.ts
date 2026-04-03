type SceneNodeLike = {
  type: string;
  children?: readonly SceneNodeLike[];
  findAll?: (predicate: (node: SceneNodeLike) => boolean) => SceneNodeLike[];
};

export function findTextNodes(selection: readonly SceneNodeLike[]): SceneNodeLike[] {
  const seen = new Set<SceneNodeLike>();
  const results: SceneNodeLike[] = [];

  for (const node of selection) {
    if (node.type === "TEXT") {
      if (!seen.has(node)) {
        seen.add(node);
        results.push(node);
      }
    } else if (node.findAll) {
      const textNodes = node.findAll((n) => n.type === "TEXT");
      for (const tn of textNodes) {
        if (!seen.has(tn)) {
          seen.add(tn);
          results.push(tn);
        }
      }
    }
  }

  return results;
}
