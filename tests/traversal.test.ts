import { describe, it, expect } from "vitest";
import { findTextNodes } from "../src/traversal";

function makeTextNode(name: string): any {
  return { type: "TEXT", name, children: undefined };
}

function makeFrame(name: string, children: any[]): any {
  return {
    type: "FRAME",
    name,
    children,
    findAll(predicate: (node: any) => boolean): any[] {
      const results: any[] = [];
      const walk = (nodes: any[]) => {
        for (const n of nodes) {
          if (predicate(n)) results.push(n);
          if (n.children) walk(n.children);
        }
      };
      walk(children);
      return results;
    },
  };
}

function makeComponent(name: string, children: any[]): any {
  return { ...makeFrame(name, children), type: "COMPONENT" };
}

function makeInstance(name: string, children: any[]): any {
  return { ...makeFrame(name, children), type: "INSTANCE" };
}

describe("findTextNodes", () => {
  it("returns a text node directly if selected", () => {
    const text = makeTextNode("Title");
    expect(findTextNodes([text])).toEqual([text]);
  });

  it("finds text nodes inside a frame", () => {
    const t1 = makeTextNode("Heading");
    const t2 = makeTextNode("Body");
    const frame = makeFrame("Card", [t1, t2]);
    expect(findTextNodes([frame])).toEqual([t1, t2]);
  });

  it("finds text nodes inside nested components", () => {
    const t1 = makeTextNode("Label");
    const inner = makeComponent("Button", [t1]);
    const outer = makeFrame("Page", [inner]);
    expect(findTextNodes([outer])).toEqual([t1]);
  });

  it("finds text nodes inside instances", () => {
    const t1 = makeTextNode("Value");
    const instance = makeInstance("ListItem", [t1]);
    expect(findTextNodes([instance])).toEqual([t1]);
  });

  it("handles deeply nested structures", () => {
    const t1 = makeTextNode("Deep");
    const l3 = makeFrame("L3", [t1]);
    const l2 = makeInstance("L2", [l3]);
    const l1 = makeComponent("L1", [l2]);
    const root = makeFrame("Root", [l1]);
    expect(findTextNodes([root])).toEqual([t1]);
  });

  it("returns empty array when no text nodes found", () => {
    const frame = makeFrame("Empty", []);
    expect(findTextNodes([frame])).toEqual([]);
  });

  it("handles multiple selected nodes", () => {
    const t1 = makeTextNode("A");
    const t2 = makeTextNode("B");
    const f1 = makeFrame("F1", [t1]);
    const f2 = makeFrame("F2", [t2]);
    expect(findTextNodes([f1, f2])).toEqual([t1, t2]);
  });

  it("deduplicates if a text node is selected along with its parent", () => {
    const t1 = makeTextNode("Title");
    const frame = makeFrame("Card", [t1]);
    const result = findTextNodes([frame, t1]);
    expect(result).toEqual([t1]);
  });
});
