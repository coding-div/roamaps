import { describe, expect, it } from "vitest";
import { CfdJaalValidationError, createCfdJaalDocument, createTreeFromCfdJaal, getCfdJaalPreview, parseCfdJaal } from "./cfdJaal";
import type { TreeMap } from "./treeData";

const source = {
  id: "root",
  x: 0,
  y: 0,
  label: "Main topic",
  color: "blue" as const,
  popupContent: "A local note",
  children: [
    { targetId: "first", color: "orange" as const, groupId: "copy-1" },
    { targetId: "second", color: "orange" as const, groupId: "copy-1" },
  ],
};

const tree: TreeMap = {
  id: "tree-example",
  title: "Study plan",
  description: "Imported safely",
  root: source,
  nodeMap: {
    root: source,
    first: { id: "first", x: 240, y: -80, label: "First", color: "orange", popupContent: "", children: [] },
    second: { id: "second", x: 240, y: 80, label: "Second", color: "red", popupContent: "", children: [] },
  },
  maxDepth: 2,
};

describe("CFD Jaal", () => {
  it("round-trips a supported Roadmap and safely gives an imported duplicate a new title", () => {
    const document = parseCfdJaal(JSON.stringify(createCfdJaalDocument(tree)));
    expect(getCfdJaalPreview(document)).toMatchObject({ title: "Study plan", nodeCount: 3, arrowCount: 2, noteCount: 1 });
    const imported = createTreeFromCfdJaal(document, [tree]);
    expect(imported.title).toBe("Study plan (2)");
    expect(imported.root?.id).toBe("root");
    expect(imported.nodeMap.root.children[0].groupId).toBe("copy-1");
  });

  it("accepts valid CFD Jaal content even when a mobile download has removed its file extension", () => {
    const extensionlessDownloadText = JSON.stringify(createCfdJaalDocument(tree));
    expect(getCfdJaalPreview(parseCfdJaal(extensionlessDownloadText))).toMatchObject({ title: "Study plan", nodeCount: 3, arrowCount: 2 });
  });

  it("still rejects extensionless data that is not a CFD Jaal document", () => {
    expect(() => parseCfdJaal('{"title":"not a Roadmap"}')).toThrow(CfdJaalValidationError);
  });

  it("rejects unexpected data before it can become a saved Roadmap", () => {
    const raw = createCfdJaalDocument(tree) as unknown as { injected: string };
    raw.injected = "not supported";
    expect(() => parseCfdJaal(JSON.stringify(raw))).toThrow(CfdJaalValidationError);
  });

  it("rejects malformed copy groups", () => {
    const raw = createCfdJaalDocument(tree);
    raw.roadmap.nodes[0].children = [{ targetId: "first", color: "orange", groupId: "orphan" }];
    expect(() => parseCfdJaal(JSON.stringify(raw))).toThrow(CfdJaalValidationError);
  });
});
