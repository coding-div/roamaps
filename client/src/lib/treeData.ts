/**
 * Roamaps Tree Data Structure
 * Multi-level tree with proper branching — each node can have its own children.
 * Tree 1: up to 3 levels deep
 * Tree 2: up to 8 levels deep
 * Foundation reset: ordinary directed arrows, short node headings, and
 * separate unlimited popup documents. No hidden joiner graph objects remain.
 */

export type NodeColor =
  | "violet"
  | "indigo"
  | "blue"
  | "green"
  | "yellow"
  | "orange"
  | "red"
  | "black"
  | "white";

export const VIBGYOR_COLORS: Record<NodeColor, string> = {
  violet: "#8B5CF6",
  indigo: "#6366F1",
  blue: "#3B82F6",
  green: "#22C55E",
  yellow: "#EAB308",
  orange: "#F97316",
  red: "#EF4444",
  black: "#293747",
  white: "#E8F0F6",
};

export const COLOR_ORDER: NodeColor[] = ["violet", "indigo", "blue", "green", "yellow", "orange", "red", "black", "white"];

export type Direction = "up" | "down" | "left" | "right";

export interface NodeData {
  id: string;
  x: number;
  y: number;
  label: string;
  color: NodeColor;
  /** Unlimited plain-text document shown in the centered node popup. */
  popupContent?: string;
  children: ChildRef[];
}

export interface ChildRef {
  targetId: string;
  /** Independent color for this specific arrow/edge */
  color: NodeColor;
}

export interface TreeMap {
  id: string;
  title: string;
  description: string;
  /** The active root may be empty after the root node is removed. */
  root: NodeData | null;
  nodeMap: Record<string, NodeData>;
  maxDepth: number;
}

/**
 * Collect all edges (source → target) with their arrow color.
 * Returns [{ source, target, arrowColor, targetChildIndex }]
 */
export function getAllEdges(tree: TreeMap): Array<{
  source: NodeData;
  target: NodeData;
  arrowColor: NodeColor;
  sourceChildIndex: number;
}> {
  const edges: Array<{
    source: NodeData;
    target: NodeData;
    arrowColor: NodeColor;
    sourceChildIndex: number;
  }> = [];

  // Iterate over ALL nodes in nodeMap (not just from root)
  // so orphaned/disconnected nodes still have their edges rendered
  for (const node of Object.values(tree.nodeMap)) {
    for (let i = 0; i < node.children.length; i++) {
      const childRef = node.children[i];
      const target = tree.nodeMap[childRef.targetId];
      if (target) {
        edges.push({
          source: node,
          target,
          arrowColor: childRef.color,
          sourceChildIndex: i,
        });
      }
    }
  }

  return edges;
}

export function getAllNodes(tree: TreeMap): NodeData[] {
  // Return ALL nodes from nodeMap — including orphaned/disconnected ones
  return Object.values(tree.nodeMap);
}

// Tree 1: Small tree — 3 levels deep
export const tree1: TreeMap = (() => {
  const root: NodeData = {
    id: "t1-root",
    x: 0,
    y: 0,
    label: "Main Topic",
    color: "blue",
    children: [
      { targetId: "t1-c1", color: "violet" },
      { targetId: "t1-c2", color: "green" },
      { targetId: "t1-c3", color: "orange" },
    ],
  };

  const c1: NodeData = {
    id: "t1-c1",
    x: 0,
    y: -180,
    label: "",
    color: "violet",
    children: [
      { targetId: "t1-c4", color: "indigo" },
      { targetId: "t1-c5", color: "violet" },
    ],
  };

  const c2: NodeData = {
    id: "t1-c2",
    x: -220,
    y: 0,
    label: "",
    color: "green",
    children: [],
  };

  const c3: NodeData = {
    id: "t1-c3",
    x: 220,
    y: 0,
    label: "",
    color: "orange",
    children: [
      { targetId: "t1-c6", color: "red" },
    ],
  };

  const c4: NodeData = {
    id: "t1-c4",
    x: -120,
    y: -340,
    label: "",
    color: "indigo",
    children: [],
  };

  const c5: NodeData = {
    id: "t1-c5",
    x: 120,
    y: -340,
    label: "",
    color: "violet",
    children: [
      { targetId: "t1-c7", color: "indigo" },
    ],
  };

  const c6: NodeData = {
    id: "t1-c6",
    x: 220,
    y: 160,
    label: "",
    color: "red",
    children: [],
  };

  const c7: NodeData = {
    id: "t1-c7",
    x: 120,
    y: -480,
    label: "",
    color: "indigo",
    children: [],
  };

  const nodeMap: Record<string, NodeData> = {
    [root.id]: root,
    [c1.id]: c1,
    [c2.id]: c2,
    [c3.id]: c3,
    [c4.id]: c4,
    [c5.id]: c5,
    [c6.id]: c6,
    [c7.id]: c7,
  };

  return {
    id: "tree-1",
    title: "Tree 1",
    description: "Small tree — up to 3 levels",
    root,
    nodeMap,
    maxDepth: 3,
  };
})();

// Tree 2: Big tree — up to 8 levels deep
export const tree2: TreeMap = (() => {
  const root: NodeData = {
    id: "t2-root",
    x: 0,
    y: 0,
    label: "Main Topic",
    color: "blue",
    children: [
      { targetId: "t2-a1", color: "violet" },
      { targetId: "t2-a2", color: "indigo" },
      { targetId: "t2-a3", color: "green" },
      { targetId: "t2-a4", color: "orange" },
      { targetId: "t2-a5", color: "yellow" },
    ],
  };

  const a1: NodeData = { id: "t2-a1", x: 0, y: -180, label: "", color: "violet", children: [
    { targetId: "t2-b1", color: "blue" },
    { targetId: "t2-b2", color: "violet" },
    { targetId: "t2-b3", color: "indigo" },
  ]};

  const a2: NodeData = { id: "t2-a2", x: -200, y: -120, label: "", color: "indigo", children: [
    { targetId: "t2-b4", color: "blue" },
    { targetId: "t2-b5", color: "green" },
  ]};

  const a3: NodeData = { id: "t2-a3", x: -240, y: 40, label: "", color: "green", children: [
    { targetId: "t2-b6", color: "green" },
  ]};

  const a4: NodeData = { id: "t2-a4", x: 200, y: -100, label: "", color: "orange", children: [
    { targetId: "t2-b7", color: "orange" },
    { targetId: "t2-b8", color: "red" },
  ]};

  const a5: NodeData = { id: "t2-a5", x: 100, y: 160, label: "", color: "yellow", children: [
    { targetId: "t2-b9", color: "yellow" },
    { targetId: "t2-b10", color: "orange" },
  ]};

  const b1: NodeData = { id: "t2-b1", x: -120, y: -340, label: "", color: "blue", children: [
    { targetId: "t2-c1", color: "violet" },
    { targetId: "t2-c2", color: "indigo" },
  ]};

  const b2: NodeData = { id: "t2-b2", x: 100, y: -360, label: "", color: "violet", children: [
    { targetId: "t2-c3", color: "violet" },
  ]};

  const b3: NodeData = { id: "t2-b3", x: 0, y: -400, label: "", color: "indigo", children: [] };

  const b4: NodeData = { id: "t2-b4", x: -360, y: -220, label: "", color: "blue", children: [
    { targetId: "t2-c4", color: "blue" },
  ]};

  const b5: NodeData = { id: "t2-b5", x: -320, y: -20, label: "", color: "green", children: [
    { targetId: "t2-c5", color: "green" },
    { targetId: "t2-c6", color: "green" },
  ]};

  const b6: NodeData = { id: "t2-b6", x: -400, y: 40, label: "", color: "green", children: [
    { targetId: "t2-c7", color: "green" },
  ]};

  const b7: NodeData = { id: "t2-b7", x: 360, y: -240, label: "", color: "orange", children: [
    { targetId: "t2-c8", color: "orange" },
  ]};

  const b8: NodeData = { id: "t2-b8", x: 320, y: -80, label: "", color: "red", children: [
    { targetId: "t2-c9", color: "red" },
    { targetId: "t2-c10", color: "red" },
  ]};

  const b9: NodeData = { id: "t2-b9", x: -40, y: 320, label: "", color: "yellow", children: [
    { targetId: "t2-c11", color: "yellow" },
  ]};

  const b10: NodeData = { id: "t2-b10", x: 260, y: 300, label: "", color: "orange", children: [
    { targetId: "t2-c12", color: "orange" },
  ]};

  const c1: NodeData = { id: "t2-c1", x: -200, y: -500, label: "", color: "violet", children: [
    { targetId: "t2-d1", color: "violet" },
  ]};

  const c2: NodeData = { id: "t2-c2", x: -60, y: -520, label: "", color: "indigo", children: [] };

  const c3: NodeData = { id: "t2-c3", x: 80, y: -520, label: "", color: "violet", children: [
    { targetId: "t2-d2", color: "violet" },
  ]};

  const c4: NodeData = { id: "t2-c4", x: -460, y: -340, label: "", color: "blue", children: [
    { targetId: "t2-d3", color: "blue" },
  ]};

  const c5: NodeData = { id: "t2-c5", x: -440, y: -60, label: "", color: "green", children: [] };

  const c6: NodeData = { id: "t2-c6", x: -400, y: 160, label: "", color: "green", children: [
    { targetId: "t2-d4", color: "green" },
  ]};

  const c7: NodeData = { id: "t2-c7", x: -520, y: 40, label: "", color: "green", children: [
    { targetId: "t2-d5", color: "green" },
    { targetId: "t2-d6", color: "green" },
  ]};

  const c8: NodeData = { id: "t2-c8", x: 480, y: -360, label: "", color: "orange", children: [] };

  const c9: NodeData = { id: "t2-c9", x: 440, y: -160, label: "", color: "red", children: [
    { targetId: "t2-d7", color: "red" },
  ]};

  const c10: NodeData = { id: "t2-c10", x: 420, y: 40, label: "", color: "red", children: [] };

  const c11: NodeData = { id: "t2-c11", x: -160, y: 460, label: "", color: "yellow", children: [] };

  const c12: NodeData = { id: "t2-c12", x: 380, y: 420, label: "", color: "orange", children: [
    { targetId: "t2-d8", color: "orange" },
  ]};

  const d1: NodeData = { id: "t2-d1", x: -260, y: -640, label: "", color: "violet", children: [
    { targetId: "t2-e1", color: "indigo" },
  ]};

  const d2: NodeData = { id: "t2-d2", x: 40, y: -660, label: "", color: "violet", children: [] };

  const d3: NodeData = { id: "t2-d3", x: -540, y: -440, label: "", color: "blue", children: [
    { targetId: "t2-e2", color: "blue" },
  ]};

  const d4: NodeData = { id: "t2-d4", x: -500, y: 260, label: "", color: "green", children: [] };

  const d5: NodeData = { id: "t2-d5", x: -640, y: -20, label: "", color: "green", children: [
    { targetId: "t2-e3", color: "green" },
  ]};

  const d6: NodeData = { id: "t2-d6", x: -600, y: 140, label: "", color: "green", children: [] };

  const d7: NodeData = { id: "t2-d7", x: 540, y: -260, label: "", color: "red", children: [
    { targetId: "t2-e4", color: "red" },
  ]};

  const d8: NodeData = { id: "t2-d8", x: 480, y: 520, label: "", color: "orange", children: [] };

  const e1: NodeData = { id: "t2-e1", x: -340, y: -760, label: "", color: "indigo", children: [
    { targetId: "t2-f1", color: "indigo" },
  ]};

  const e2: NodeData = { id: "t2-e2", x: -620, y: -560, label: "", color: "blue", children: [] };

  const e3: NodeData = { id: "t2-e3", x: -740, y: -120, label: "", color: "green", children: [
    { targetId: "t2-f2", color: "green" },
  ]};

  const e4: NodeData = { id: "t2-e4", x: 640, y: -380, label: "", color: "red", children: [] };

  const f1: NodeData = { id: "t2-f1", x: -420, y: -860, label: "", color: "indigo", children: [
    { targetId: "t2-g1", color: "indigo" },
  ]};

  const f2: NodeData = { id: "t2-f2", x: -820, y: -200, label: "", color: "green", children: [] };

  const g1: NodeData = { id: "t2-g1", x: -420, y: -980, label: "", color: "indigo", children: [
    { targetId: "t2-h1", color: "violet" },
  ]};

  const h1: NodeData = { id: "t2-h1", x: -340, y: -1080, label: "", color: "violet", children: [] };

  const nodeMap: Record<string, NodeData> = {
    [root.id]: root,
    [a1.id]: a1, [a2.id]: a2, [a3.id]: a3, [a4.id]: a4, [a5.id]: a5,
    [b1.id]: b1, [b2.id]: b2, [b3.id]: b3, [b4.id]: b4, [b5.id]: b5,
    [b6.id]: b6, [b7.id]: b7, [b8.id]: b8, [b9.id]: b9, [b10.id]: b10,
    [c1.id]: c1, [c2.id]: c2, [c3.id]: c3, [c4.id]: c4, [c5.id]: c5,
    [c6.id]: c6, [c7.id]: c7, [c8.id]: c8, [c9.id]: c9, [c10.id]: c10,
    [c11.id]: c11, [c12.id]: c12,
    [d1.id]: d1, [d2.id]: d2, [d3.id]: d3, [d4.id]: d4, [d5.id]: d5,
    [d6.id]: d6, [d7.id]: d7, [d8.id]: d8,
    [e1.id]: e1, [e2.id]: e2, [e3.id]: e3, [e4.id]: e4,
    [f1.id]: f1, [f2.id]: f2,
    [g1.id]: g1,
    [h1.id]: h1,
  };

  return {
    id: "tree-2",
    title: "Tree 2",
    description: "Big tree — up to 8 levels",
    root,
    nodeMap,
    maxDepth: 8,
  };
})();

export const allTrees: TreeMap[] = [tree1, tree2];
