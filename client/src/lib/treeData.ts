/**
 * Roamaps Tree Data Structure
 * Defines the data model for tree branching roadmap visualizations.
 * Each tree has a central node with branches radiating outward.
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

export interface TreeEdge {
  id: string;
  targetId: string;
}

export interface TreeNode {
  id: string;
  label: string;
  color: NodeColor;
  children: TreeEdge[];
}

export interface TreeMap {
  id: string;
  title: string;
  description: string;
  root: TreeNode;
  // Position map for all non-root nodes
  nodePositions: Record<string, { x: number; y: number; color: NodeColor }>;
  // Node sizes: root and child
  rootSize: { w: number; h: number };
  childSize: { w: number; h: number };
}

// Tree 1: Small tree with 3 sub-branches
export const tree1: TreeMap = {
  id: "tree-1",
  title: "Tree 1",
  description: "Small tree — 3 sub-branches",
  root: {
    id: "t1-root",
    label: "Main Topic",
    color: "blue",
    children: [
      { id: "t1-e1", targetId: "t1-c1" },
      { id: "t1-e2", targetId: "t1-c2" },
      { id: "t1-e3", targetId: "t1-c3" },
    ],
  },
  nodePositions: {
    "t1-c1": { x: 0, y: -180, color: "violet" },
    "t1-c2": { x: -200, y: 0, color: "green" },
    "t1-c3": { x: 200, y: 0, color: "orange" },
  },
  rootSize: { w: 160, h: 52 },
  childSize: { w: 120, h: 40 },
};

// Tree 2: Big tree with 8 sub-branches (radiating in all directions)
export const tree2: TreeMap = {
  id: "tree-2",
  title: "Tree 2",
  description: "Big tree — 8 sub-branches",
  root: {
    id: "t2-root",
    label: "Main Topic",
    color: "blue",
    children: [
      { id: "t2-e1", targetId: "t2-c1" },
      { id: "t2-e2", targetId: "t2-c2" },
      { id: "t2-e3", targetId: "t2-c3" },
      { id: "t2-e4", targetId: "t2-c4" },
      { id: "t2-e5", targetId: "t2-c5" },
      { id: "t2-e6", targetId: "t2-c6" },
      { id: "t2-e7", targetId: "t2-c7" },
      { id: "t2-e8", targetId: "t2-c8" },
    ],
  },
  nodePositions: {
    "t2-c1": { x: -80, y: -180, color: "violet" },
    "t2-c2": { x: 80, y: -180, color: "indigo" },
    "t2-c3": { x: -240, y: -60, color: "blue" },
    "t2-c4": { x: -240, y: 80, color: "green" },
    "t2-c5": { x: -120, y: 200, color: "yellow" },
    "t2-c6": { x: 260, y: -80, color: "orange" },
    "t2-c7": { x: 260, y: 80, color: "red" },
    "t2-c8": { x: 120, y: 200, color: "orange" },
  },
  rootSize: { w: 160, h: 52 },
  childSize: { w: 120, h: 40 },
};

export const allTrees: TreeMap[] = [tree1, tree2];
