import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import {
  allTrees,
  type NodeColor,
  type NodeData,
  type TreeMap,
  MAX_LABEL_LENGTH,
} from "@/lib/treeData";

const STORAGE_KEY = "roamaps-roadmaps-v1";

export type RoadmapAction =
  | { type: "ADD_TREE"; tree: TreeMap }
  | { type: "ADD_NODE"; treeId: string; node: NodeData }
  | { type: "REMOVE_NODE"; treeId: string; nodeId: string }
  | { type: "UPDATE_LABEL"; treeId: string; nodeId: string; label: string }
  | { type: "UPDATE_NODE_COLOR"; treeId: string; nodeId: string; color: NodeColor }
  | { type: "ADD_ARROW"; treeId: string; sourceId: string; targetId: string; color: NodeColor }
  | { type: "REMOVE_ARROW"; treeId: string; sourceId: string; targetId: string }
  | { type: "UPDATE_ARROW_COLOR"; treeId: string; sourceId: string; targetId: string; color: NodeColor }
  | { type: "RESET" };

function cloneTrees(trees: TreeMap[]): TreeMap[] {
  return trees.map((tree) => ({
    ...tree,
    root: { ...tree.root, children: tree.root.children.map((child) => ({ ...child })) },
    nodeMap: Object.fromEntries(
      Object.entries(tree.nodeMap).map(([id, node]) => [id, { ...node, children: node.children.map((child) => ({ ...child })) }])
    ),
  }));
}

function updateTree(state: TreeMap[], treeId: string, updater: (tree: TreeMap) => TreeMap): TreeMap[] {
  return state.map((tree) => {
    if (tree.id !== treeId) return tree;
    const draft: TreeMap = {
      ...tree,
      root: { ...tree.root, children: tree.root.children.map((child) => ({ ...child })) },
      nodeMap: Object.fromEntries(
        Object.entries(tree.nodeMap).map(([id, node]) => [id, { ...node, children: node.children.map((child) => ({ ...child })) }])
      ),
    };
    return updater(draft);
  });
}

function reducer(state: TreeMap[], action: RoadmapAction): TreeMap[] {
  if (action.type === "RESET") return cloneTrees(allTrees);
  if (action.type === "ADD_TREE") return [...state, action.tree];

  return updateTree(state, action.treeId, (tree) => {
    const nodeMap = { ...tree.nodeMap };

    switch (action.type) {
      case "ADD_NODE":
        if (nodeMap[action.node.id]) return tree;
        nodeMap[action.node.id] = { ...action.node, children: [] };
        return { ...tree, nodeMap };
      case "REMOVE_NODE": {
        if (action.nodeId === tree.root.id || !nodeMap[action.nodeId]) return tree;
        delete nodeMap[action.nodeId];
        for (const node of Object.values(nodeMap)) {
          node.children = node.children.filter((child) => child.targetId !== action.nodeId);
        }
        return { ...tree, nodeMap, root: nodeMap[tree.root.id] };
      }
      case "UPDATE_LABEL":
        if (!nodeMap[action.nodeId]) return tree;
        nodeMap[action.nodeId].label = action.label.slice(0, MAX_LABEL_LENGTH);
        return { ...tree, nodeMap, root: nodeMap[tree.root.id] };
      case "UPDATE_NODE_COLOR":
        if (!nodeMap[action.nodeId]) return tree;
        nodeMap[action.nodeId].color = action.color;
        return { ...tree, nodeMap, root: nodeMap[tree.root.id] };
      case "ADD_ARROW": {
        const source = nodeMap[action.sourceId];
        if (!source || !nodeMap[action.targetId] || action.sourceId === action.targetId) return tree;
        if (source.children.some((child) => child.targetId === action.targetId)) return tree;
        source.children = [...source.children, { targetId: action.targetId, color: action.color }];
        return { ...tree, nodeMap, root: nodeMap[tree.root.id] };
      }
      case "REMOVE_ARROW": {
        const source = nodeMap[action.sourceId];
        if (!source) return tree;
        source.children = source.children.filter((child) => child.targetId !== action.targetId);
        return { ...tree, nodeMap, root: nodeMap[tree.root.id] };
      }
      case "UPDATE_ARROW_COLOR": {
        const source = nodeMap[action.sourceId];
        if (!source) return tree;
        source.children = source.children.map((child) =>
          child.targetId === action.targetId ? { ...child, color: action.color } : child
        );
        return { ...tree, nodeMap, root: nodeMap[tree.root.id] };
      }
    }
  });
}

interface RoadmapContextValue {
  trees: TreeMap[];
  dispatch: React.Dispatch<RoadmapAction>;
  getTree: (treeId: string) => TreeMap | undefined;
}

const RoadmapContext = createContext<RoadmapContextValue | null>(null);

function loadInitialTrees(): TreeMap[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as TreeMap[];
  } catch {
    // Fall back to the built-in demo trees if storage is unavailable or corrupt.
  }
  return cloneTrees(allTrees);
}

export function RoadmapProvider({ children }: { children: ReactNode }) {
  const [trees, dispatch] = useReducer(reducer, undefined, loadInitialTrees);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trees));
    } catch {
      // The editor remains usable if browser storage is disabled or full.
    }
  }, [trees]);

  const value = useMemo(
    () => ({ trees, dispatch, getTree: (treeId: string) => trees.find((tree) => tree.id === treeId) }),
    [trees]
  );

  return <RoadmapContext.Provider value={value}>{children}</RoadmapContext.Provider>;
}

export function useRoadmaps() {
  const context = useContext(RoadmapContext);
  if (!context) throw new Error("useRoadmaps must be used inside RoadmapProvider");
  return context;
}
