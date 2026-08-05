/**
 * Roamaps Tree Data Structure
 * Multi-level tree with proper branching — each node can have its own children.
 * Tree 1: up to 3 levels deep
 * Tree 2: up to 8 levels deep
 */

export type NodeColor =
  | "violet"
  | "indigo"
  | "blue"
  | "green"
  | "yellow"
  | "orange"
  | "red";

export const VIBGYOR_COLORS: Record<NodeColor, string> = {
  violet: "#8B5CF6",
  indigo: "#6366F1",
  blue: "#3B82F6",
  green: "#22C55E",
  yellow: "#EAB308",
  orange: "#F97316",
  red: "#EF4444",
};

export type Direction = "up" | "down" | "left" | "right";

export interface NodeData {
  id: string;
  x: number;
  y: number;
  label: string;
  color: NodeColor;
  children: ChildRef[];
}

export interface ChildRef {
  targetId: string;
}

export interface TreeMap {
  id: string;
  title: string;
  description: string;
  root: NodeData;
  // Flat map of all nodes by id for quick lookup
  nodeMap: Record<string, NodeData>;
  maxDepth: number;
}

// Tree 1: Small tree — 3 levels deep
// Structure:
//          root
//     /     |      \
//   c1(up) c2(left) c3(right)
//   /  \           |
//  c4   c5        c6(down)
//   |
//  c7(down)

export const tree1: TreeMap = (() => {
  const root: NodeData = {
    id: "t1-root",
    x: 0,
    y: 0,
    label: "Main Topic",
    color: "blue",
    children: [
      { targetId: "t1-c1" },
      { targetId: "t1-c2" },
      { targetId: "t1-c3" },
    ],
  };

  const c1: NodeData = {
    id: "t1-c1",
    x: 0,
    y: -180,
    label: "",
    color: "violet",
    children: [
      { targetId: "t1-c4" },
      { targetId: "t1-c5" },
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
      { targetId: "t1-c6" },
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
      { targetId: "t1-c7" },
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
// Structure grows outward organically with up to 8 branches per node at different levels

export const tree2: TreeMap = (() => {
  // Root with 5 first-level branches (asymmetric)
  const root: NodeData = {
    id: "t2-root",
    x: 0,
    y: 0,
    label: "Main Topic",
    color: "blue",
    children: [
      { targetId: "t2-a1" },
      { targetId: "t2-a2" },
      { targetId: "t2-a3" },
      { targetId: "t2-a4" },
      { targetId: "t2-a5" },
    ],
  };

  // Level 1: 5 branches from root
  const a1: NodeData = { id: "t2-a1", x: 0, y: -180, label: "", color: "violet", children: [
    { targetId: "t2-b1" },
    { targetId: "t2-b2" },
    { targetId: "t2-b3" },
  ]};

  const a2: NodeData = { id: "t2-a2", x: -200, y: -120, label: "", color: "indigo", children: [
    { targetId: "t2-b4" },
    { targetId: "t2-b5" },
  ]};

  const a3: NodeData = { id: "t2-a3", x: -240, y: 40, label: "", color: "green", children: [
    { targetId: "t2-b6" },
  ]};

  const a4: NodeData = { id: "t2-a4", x: 200, y: -100, label: "", color: "orange", children: [
    { targetId: "t2-b7" },
    { targetId: "t2-b8" },
  ]};

  const a5: NodeData = { id: "t2-a5", x: 100, y: 160, label: "", color: "yellow", children: [
    { targetId: "t2-b9" },
    { targetId: "t2-b10" },
  ]};

  // Level 2: branches from level 1
  const b1: NodeData = { id: "t2-b1", x: -120, y: -340, label: "", color: "blue", children: [
    { targetId: "t2-c1" },
    { targetId: "t2-c2" },
  ]};

  const b2: NodeData = { id: "t2-b2", x: 100, y: -360, label: "", color: "violet", children: [
    { targetId: "t2-c3" },
  ]};

  const b3: NodeData = { id: "t2-b3", x: 0, y: -400, label: "", color: "indigo", children: [] };

  const b4: NodeData = { id: "t2-b4", x: -360, y: -220, label: "", color: "blue", children: [
    { targetId: "t2-c4" },
  ]};

  const b5: NodeData = { id: "t2-b5", x: -320, y: -20, label: "", color: "green", children: [
    { targetId: "t2-c5" },
    { targetId: "t2-c6" },
  ]};

  const b6: NodeData = { id: "t2-b6", x: -400, y: 40, label: "", color: "green", children: [
    { targetId: "t2-c7" },
  ]};

  const b7: NodeData = { id: "t2-b7", x: 360, y: -240, label: "", color: "orange", children: [
    { targetId: "t2-c8" },
  ]};

  const b8: NodeData = { id: "t2-b8", x: 320, y: -80, label: "", color: "red", children: [
    { targetId: "t2-c9" },
    { targetId: "t2-c10" },
  ]};

  const b9: NodeData = { id: "t2-b9", x: -40, y: 320, label: "", color: "yellow", children: [
    { targetId: "t2-c11" },
  ]};

  const b10: NodeData = { id: "t2-b10", x: 260, y: 300, label: "", color: "orange", children: [
    { targetId: "t2-c12" },
  ]};

  // Level 3: branches from level 2
  const c1: NodeData = { id: "t2-c1", x: -200, y: -500, label: "", color: "violet", children: [
    { targetId: "t2-d1" },
  ]};

  const c2: NodeData = { id: "t2-c2", x: -60, y: -520, label: "", color: "indigo", children: [] };

  const c3: NodeData = { id: "t2-c3", x: 80, y: -520, label: "", color: "violet", children: [
    { targetId: "t2-d2" },
  ]};

  const c4: NodeData = { id: "t2-c4", x: -460, y: -340, label: "", color: "blue", children: [
    { targetId: "t2-d3" },
  ]};

  const c5: NodeData = { id: "t2-c5", x: -440, y: -60, label: "", color: "green", children: [] };

  const c6: NodeData = { id: "t2-c6", x: -400, y: 160, label: "", color: "green", children: [
    { targetId: "t2-d4" },
  ]};

  const c7: NodeData = { id: "t2-c7", x: -520, y: 40, label: "", color: "green", children: [
    { targetId: "t2-d5" },
    { targetId: "t2-d6" },
  ]};

  const c8: NodeData = { id: "t2-c8", x: 480, y: -360, label: "", color: "orange", children: [] };

  const c9: NodeData = { id: "t2-c9", x: 440, y: -160, label: "", color: "red", children: [
    { targetId: "t2-d7" },
  ]};

  const c10: NodeData = { id: "t2-c10", x: 420, y: 40, label: "", color: "red", children: [] };

  const c11: NodeData = { id: "t2-c11", x: -160, y: 460, label: "", color: "yellow", children: [] };

  const c12: NodeData = { id: "t2-c12", x: 380, y: 420, label: "", color: "orange", children: [
    { targetId: "t2-d8" },
  ]};

  // Level 4: branches from level 3
  const d1: NodeData = { id: "t2-d1", x: -260, y: -640, label: "", color: "violet", children: [
    { targetId: "t2-e1" },
  ]};

  const d2: NodeData = { id: "t2-d2", x: 40, y: -660, label: "", color: "violet", children: [] };

  const d3: NodeData = { id: "t2-d3", x: -540, y: -440, label: "", color: "blue", children: [
    { targetId: "t2-e2" },
  ]};

  const d4: NodeData = { id: "t2-d4", x: -500, y: 260, label: "", color: "green", children: [] };

  const d5: NodeData = { id: "t2-d5", x: -640, y: -20, label: "", color: "green", children: [
    { targetId: "t2-e3" },
  ]};

  const d6: NodeData = { id: "t2-d6", x: -600, y: 140, label: "", color: "green", children: [] };

  const d7: NodeData = { id: "t2-d7", x: 540, y: -260, label: "", color: "red", children: [
    { targetId: "t2-e4" },
  ]};

  const d8: NodeData = { id: "t2-d8", x: 480, y: 520, label: "", color: "orange", children: [] };

  // Level 5: branches from level 4
  const e1: NodeData = { id: "t2-e1", x: -340, y: -760, label: "", color: "indigo", children: [
    { targetId: "t2-f1" },
  ]};

  const e2: NodeData = { id: "t2-e2", x: -620, y: -560, label: "", color: "blue", children: [] };

  const e3: NodeData = { id: "t2-e3", x: -740, y: -120, label: "", color: "green", children: [
    { targetId: "t2-f2" },
  ]};

  const e4: NodeData = { id: "t2-e4", x: 640, y: -380, label: "", color: "red", children: [] };

  // Level 6
  const f1: NodeData = { id: "t2-f1", x: -420, y: -860, label: "", color: "indigo", children: [
    { targetId: "t2-g1" },
  ]};

  const f2: NodeData = { id: "t2-f2", x: -820, y: -200, label: "", color: "green", children: [] };

  // Level 7
  const g1: NodeData = { id: "t2-g1", x: -420, y: -980, label: "", color: "indigo", children: [
    { targetId: "t2-h1" },
  ]};

  // Level 8 (max depth)
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
