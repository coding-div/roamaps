/**
 * Roamaps state reminder — keep the flat node map authoritative, preserve
 * disconnected nodes, and make every visible edit undoable as one action.
 */

import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import {
  allTrees,
  type NodeColor,
  type NodeData,
  type TreeMap,
  MAX_LABEL_LENGTH,
} from "@/lib/treeData";

const STORAGE_KEY = "roamaps-roadmaps-v1";
const MAX_HISTORY = 60;

export type RoadmapAction =
  | { type: "ADD_TREE"; tree: TreeMap }
  | { type: "ADD_NODE"; treeId: string; node: NodeData }
  | { type: "ADD_JOINER"; treeId: string; node: NodeData }
  | { type: "REMOVE_NODE"; treeId: string; nodeId: string }
  | { type: "MOVE_NODE"; treeId: string; nodeId: string; x: number; y: number }
  | { type: "UPDATE_LABEL"; treeId: string; nodeId: string; label: string }
  | { type: "UPDATE_NODE_COLOR"; treeId: string; nodeId: string; color: NodeColor }
  | { type: "ADD_ARROW"; treeId: string; sourceId: string; targetId: string; color: NodeColor }
  | { type: "SPLIT_ARROW"; treeId: string; sourceId: string; targetId: string; joinerId: string }
  | { type: "PLACE_JOINER_ON_ARROW"; treeId: string; sourceId: string; targetId: string; node: NodeData }
  | { type: "REMOVE_ARROW"; treeId: string; sourceId: string; targetId: string }
  | { type: "UPDATE_ARROW_COLOR"; treeId: string; sourceId: string; targetId: string; color: NodeColor }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "RESET" };

interface HistoryState {
  present: TreeMap[];
  past: TreeMap[][];
  future: TreeMap[][];
}

function cloneTrees(trees: TreeMap[]): TreeMap[] {
  return trees.map((tree) => ({
    ...tree,
    root: tree.root
      ? { ...tree.root, children: tree.root.children.map((child) => ({ ...child })) }
      : null,
    nodeMap: Object.fromEntries(
      Object.entries(tree.nodeMap).map(([id, node]) => [
        id,
        { ...node, children: node.children.map((child) => ({ ...child })) },
      ])
    ),
  }));
}

function cloneTree(tree: TreeMap): TreeMap {
  return cloneTrees([tree])[0];
}

function sameTrees(a: TreeMap[], b: TreeMap[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function commitEdit(state: HistoryState, nextTrees: TreeMap[]): HistoryState {
  if (sameTrees(state.present, nextTrees)) return state;
  const nextPast = [...state.past, cloneTrees(state.present)].slice(-MAX_HISTORY);
  return { present: nextTrees, past: nextPast, future: [] };
}

function updateTree(
  trees: TreeMap[],
  treeId: string,
  updater: (tree: TreeMap) => TreeMap
): TreeMap[] {
  let changed = false;
  const nextTrees = trees.map((tree) => {
    if (tree.id !== treeId) return tree;
    changed = true;
    const draft: TreeMap = {
      ...tree,
      root: tree.root
        ? { ...tree.root, children: tree.root.children.map((child) => ({ ...child })) }
        : null,
      nodeMap: Object.fromEntries(
        Object.entries(tree.nodeMap).map(([id, node]) => [
          id,
          { ...node, children: node.children.map((child) => ({ ...child })) },
        ])
      ),
    };
    return updater(draft);
  });
  return changed ? nextTrees : trees;
}

function syncRoot(tree: TreeMap, nodeMap: Record<string, NodeData>): TreeMap {
  const rootId = tree.root?.id;
  return { ...tree, nodeMap, root: rootId ? nodeMap[rootId] ?? null : null };
}

type TreeContentAction = Extract<RoadmapAction, { treeId: string }>;

function applyContentAction(trees: TreeMap[], action: TreeContentAction): TreeMap[] {
  return updateTree(trees, action.treeId, (tree) => {
    const nodeMap = { ...tree.nodeMap };

    switch (action.type) {
      case "ADD_NODE":
        if (nodeMap[action.node.id]) return tree;
        nodeMap[action.node.id] = { ...action.node, kind: "node", children: [] };
        return { ...tree, nodeMap };
      case "ADD_JOINER":
        if (nodeMap[action.node.id]) return tree;
        nodeMap[action.node.id] = { ...action.node, kind: "joiner", label: "", children: [] };
        return { ...tree, nodeMap };
      case "REMOVE_NODE": {
        const removed = nodeMap[action.nodeId];
        if (!removed) return tree;
        const incoming = Object.values(nodeMap).flatMap((source) => source.children
          .filter((child) => child.targetId === action.nodeId)
          .map((child) => ({ sourceId: source.id, color: child.color })));
        const outgoing = removed.children.map((child) => ({ ...child }));
        delete nodeMap[action.nodeId];
        for (const source of Object.values(nodeMap)) {
          source.children = source.children.filter((child) => child.targetId !== action.nodeId);
        }
        if (incoming.length > 0 && outgoing.length > 0) {
          const bypassColor = incoming.length === 1 ? incoming[0].color : "white";
          for (const entry of incoming) {
            const source = nodeMap[entry.sourceId];
            if (!source) continue;
            for (const child of outgoing) {
              if (child.targetId === entry.sourceId || source.children.some((existing) => existing.targetId === child.targetId)) continue;
              source.children.push({ targetId: child.targetId, color: bypassColor });
            }
          }
        }
        const removedRoot = tree.root?.id === action.nodeId;
        return {
          ...tree,
          nodeMap,
          root: removedRoot ? null : nodeMap[tree.root?.id ?? ""] ?? null,
        };
      }
      case "MOVE_NODE": {
        const node = nodeMap[action.nodeId];
        if (!node || !Number.isFinite(action.x) || !Number.isFinite(action.y)) return tree;
        node.x = action.x;
        node.y = action.y;
        return syncRoot(tree, nodeMap);
      }
      case "UPDATE_LABEL": {
        const node = nodeMap[action.nodeId];
        if (!node) return tree;
        node.label = action.label.slice(0, MAX_LABEL_LENGTH);
        return syncRoot(tree, nodeMap);
      }
      case "UPDATE_NODE_COLOR": {
        const node = nodeMap[action.nodeId];
        if (!node) return tree;
        node.color = action.color;
        return syncRoot(tree, nodeMap);
      }
      case "ADD_ARROW": {
        const source = nodeMap[action.sourceId];
        if (!source || !nodeMap[action.targetId] || action.sourceId === action.targetId) return tree;
        if (source.children.some((child) => child.targetId === action.targetId)) return tree;
        source.children = [...source.children, { targetId: action.targetId, color: action.color }];
        return syncRoot(tree, nodeMap);
      }
      case "SPLIT_ARROW": {
        const source = nodeMap[action.sourceId];
        const target = nodeMap[action.targetId];
        const joiner = nodeMap[action.joinerId];
        if (!source || !target || !joiner || action.sourceId === action.targetId || action.sourceId === action.joinerId || action.targetId === action.joinerId) return tree;
        const original = source.children.find((child) => child.targetId === action.targetId);
        if (!original || source.children.some((child) => child.targetId === action.joinerId) || joiner.children.some((child) => child.targetId === action.targetId)) return tree;
        source.children = source.children.map((child) => child.targetId === action.targetId
          ? { ...child, targetId: action.joinerId, splitJoinerId: action.joinerId }
          : child);
        joiner.children = [...joiner.children, { targetId: action.targetId, color: original.color, splitJoinerId: action.joinerId }];
        return syncRoot(tree, nodeMap);
      }
      case "PLACE_JOINER_ON_ARROW": {
        const source = nodeMap[action.sourceId];
        const target = nodeMap[action.targetId];
        if (!source || !target || nodeMap[action.node.id] || action.sourceId === action.targetId || action.sourceId === action.node.id || action.targetId === action.node.id) return tree;
        const original = source.children.find((child) => child.targetId === action.targetId);
        if (!original) return tree;
        nodeMap[action.node.id] = { ...action.node, kind: "joiner", label: "", children: [] };
        source.children = source.children.map((child) => child.targetId === action.targetId
          ? { ...child, targetId: action.node.id, splitJoinerId: action.node.id }
          : child);
        nodeMap[action.node.id].children = [{ targetId: action.targetId, color: original.color, splitJoinerId: action.node.id }];
        return syncRoot(tree, nodeMap);
      }
      case "REMOVE_ARROW": {
        const source = nodeMap[action.sourceId];
        if (!source) return tree;
        const nextChildren = source.children.filter((child) => child.targetId !== action.targetId);
        if (nextChildren.length === source.children.length) return tree;
        source.children = nextChildren;
        return syncRoot(tree, nodeMap);
      }
      case "UPDATE_ARROW_COLOR": {
        const source = nodeMap[action.sourceId];
        if (!source) return tree;
        let found = false;
        source.children = source.children.map((child) => {
          if (child.targetId !== action.targetId) return child;
          found = true;
          return { ...child, color: action.color };
        });
        return found ? syncRoot(tree, nodeMap) : tree;
      }
      default:
        return tree;
    }
  });
}

function historyReducer(state: HistoryState, action: RoadmapAction): HistoryState {
  if (action.type === "UNDO") {
    const previous = state.past[state.past.length - 1];
    if (!previous) return state;
    return {
      present: cloneTrees(previous),
      past: state.past.slice(0, -1),
      future: [cloneTrees(state.present), ...state.future],
    };
  }

  if (action.type === "REDO") {
    const next = state.future[0];
    if (!next) return state;
    return {
      present: cloneTrees(next),
      past: [...state.past, cloneTrees(state.present)].slice(-MAX_HISTORY),
      future: state.future.slice(1),
    };
  }

  if (action.type === "RESET") return commitEdit(state, cloneTrees(allTrees));
  if (action.type === "ADD_TREE") {
    if (state.present.some((tree) => tree.id === action.tree.id)) return state;
    return commitEdit(state, [...state.present, cloneTree(action.tree)]);
  }
  if (!("treeId" in action)) return state;
  return commitEdit(state, applyContentAction(state.present, action));
}

interface RoadmapContextValue {
  trees: TreeMap[];
  dispatch: React.Dispatch<RoadmapAction>;
  getTree: (treeId: string) => TreeMap | undefined;
  canUndo: boolean;
  canRedo: boolean;
}

const RoadmapContext = createContext<RoadmapContextValue | null>(null);

function loadInitialState(): HistoryState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as TreeMap[];
      if (Array.isArray(parsed)) {
        const normalized = parsed.map((tree) => ({
          ...tree,
          nodeMap: Object.fromEntries(Object.entries(tree.nodeMap ?? {}).map(([id, node]) => [id, {
            ...node,
            kind: node.kind ?? "node",
            children: (node.children ?? []).map((child) => ({ ...child })),
          }])),
        }));
        return { present: normalized, past: [], future: [] };
      }
    }
  } catch {
    // Fall back to the built-in demo trees if storage is unavailable or corrupt.
  }
  return { present: cloneTrees(allTrees), past: [], future: [] };
}

export function RoadmapProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(historyReducer, undefined, loadInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.present));
    } catch {
      // The editor remains usable if browser storage is disabled or full.
    }
  }, [state.present]);

  const value = useMemo(
    () => ({
      trees: state.present,
      dispatch,
      getTree: (treeId: string) => state.present.find((tree) => tree.id === treeId),
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
    }),
    [state]
  );

  return <RoadmapContext.Provider value={value}>{children}</RoadmapContext.Provider>;
}

export function useRoadmaps() {
  const context = useContext(RoadmapContext);
  if (!context) throw new Error("useRoadmaps must be used inside RoadmapProvider");
  return context;
}
