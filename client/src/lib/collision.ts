/*
 * Obsidian Cartography geometry reminder — collision logic stays spatial and
 * quiet: shape-aware envelopes protect the graphite canvas without changing
 * the visual language of the roadmap editor.
 */

import { MAX_LABEL_LENGTH, type NodeData, type TreeMap } from "./treeData";

export const NODE_RADIUS = 3;
export const MIN_BOX_W = 100;
export const MIN_BOX_H = 36;
export const MAX_BOX_W = 280;
export const MAX_BOX_H = 120;
export const FONT_SIZE = 12;
export const CHAR_WIDTH = 7.2;
export const LINE_HEIGHT = 18;
export const ROOT_FONT_SIZE = 14;
export const JOINER_RADIUS = 9;
export const NODE_COLLISION_MARGIN = 12;
export const JOINER_COLLISION_MARGIN = 6;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

export type CollisionShape =
  | { kind: "rect"; x: number; y: number; w: number; h: number }
  | { kind: "circle"; cx: number; cy: number; r: number };

export function isJoinerNode(node: NodeData): boolean {
  return node.kind === "joiner";
}

export function getBoxDimensions(label: string, isRoot: boolean): { w: number; h: number } {
  const cw = isRoot ? 8 : CHAR_WIDTH;
  if (!label || label.trim() === "") {
    return { w: isRoot ? 160 : MIN_BOX_W, h: isRoot ? 52 : MIN_BOX_H };
  }
  const charsPerLine = Math.max(5, Math.floor(MAX_BOX_W / cw));
  const wrappedLines: string[] = [];
  for (const rawLine of label.split("\n")) {
    if (!rawLine) wrappedLines.push("");
    else {
      for (let start = 0; start < rawLine.length; start += charsPerLine) {
        wrappedLines.push(rawLine.slice(start, start + charsPerLine));
      }
    }
  }
  const lineCount = Math.max(1, wrappedLines.length);
  const longest = Math.max(1, ...wrappedLines.map((line) => line.length));
  return {
    w: Math.min(MAX_BOX_W, Math.max(isRoot ? 160 : MIN_BOX_W, longest * cw + 20)),
    h: Math.min(MAX_BOX_H, Math.max(isRoot ? 52 : MIN_BOX_H, lineCount * LINE_HEIGHT + 20)),
  };
}

export function getNodeBox(node: NodeData, isRoot: boolean): Box {
  if (isJoinerNode(node)) {
    return {
      x: node.x - JOINER_RADIUS,
      y: node.y - JOINER_RADIUS,
      w: JOINER_RADIUS * 2,
      h: JOINER_RADIUS * 2,
    };
  }
  const size = getBoxDimensions(node.label, isRoot);
  return { x: node.x - size.w / 2, y: node.y - size.h / 2, w: size.w, h: size.h };
}

export function getNodeShape(node: NodeData, isRoot: boolean): CollisionShape {
  if (isJoinerNode(node)) return { kind: "circle", cx: node.x, cy: node.y, r: JOINER_RADIUS };
  const box = getBoxDimensions(node.label, isRoot);
  return { kind: "rect", x: node.x - box.w / 2, y: node.y - box.h / 2, w: box.w, h: box.h };
}

export function getNodeEnvelope(node: NodeData, isRoot: boolean): CollisionShape {
  const shape = getNodeShape(node, isRoot);
  if (shape.kind === "circle") return { ...shape, r: shape.r + JOINER_COLLISION_MARGIN };
  return {
    kind: "rect",
    x: shape.x - NODE_COLLISION_MARGIN,
    y: shape.y - NODE_COLLISION_MARGIN,
    w: shape.w + NODE_COLLISION_MARGIN * 2,
    h: shape.h + NODE_COLLISION_MARGIN * 2,
  };
}

function rectangleOverlap(a: Extract<CollisionShape, { kind: "rect" }>, b: Extract<CollisionShape, { kind: "rect" }>): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleOverlap(a: Extract<CollisionShape, { kind: "circle" }>, b: Extract<CollisionShape, { kind: "circle" }>): boolean {
  return Math.hypot(a.cx - b.cx, a.cy - b.cy) < a.r + b.r;
}

function circleRectangleOverlap(circle: Extract<CollisionShape, { kind: "circle" }>, rect: Extract<CollisionShape, { kind: "rect" }>): boolean {
  const closestX = Math.max(rect.x, Math.min(circle.cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(circle.cy, rect.y + rect.h));
  return Math.hypot(circle.cx - closestX, circle.cy - closestY) < circle.r;
}

export function shapesOverlap(a: CollisionShape, b: CollisionShape): boolean {
  if (a.kind === "rect") {
    if (b.kind === "rect") return rectangleOverlap(a, b);
    return circleRectangleOverlap(b, a);
  }
  if (b.kind === "circle") return circleOverlap(a, b);
  return circleRectangleOverlap(a, b);
}

export function pointInsideShape(point: Point, shape: CollisionShape): boolean {
  if (shape.kind === "circle") return Math.hypot(point.x - shape.cx, point.y - shape.cy) <= shape.r;
  return point.x >= shape.x && point.x <= shape.x + shape.w && point.y >= shape.y && point.y <= shape.y + shape.h;
}

export function canPlaceNode(node: NodeData, nodes: NodeData[], rootId: string | null, excludeId?: string): boolean {
  const candidate = getNodeEnvelope(node, node.id === rootId);
  return nodes.every((other) => other.id === excludeId || other.id === node.id || !shapesOverlap(candidate, getNodeEnvelope(other, other.id === rootId)));
}

export function labelFits(tree: TreeMap, node: NodeData, label: string): boolean {
  if (label.length > MAX_LABEL_LENGTH) return false;
  const candidate: NodeData = { ...node, label };
  const nodes = Object.values(tree.nodeMap);
  return canPlaceNode(candidate, nodes, tree.root?.id ?? null, node.id);
}
