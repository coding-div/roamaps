/*
 * Obsidian Cartography geometry reminder — collision logic stays spatial and
 * quiet: shape-aware envelopes protect the graphite canvas without changing
 * the visual language of the roadmap editor.
 */

import { type NodeData } from "./treeData";

export const NODE_RADIUS = 3;
export const MIN_BOX_W = 100;
export const MIN_BOX_H = 36;
export const MAX_BOX_W = 280;
export const MAX_BOX_H = 120;
export const FONT_SIZE = 12;
export const CHAR_WIDTH = 7.2;
export const LINE_HEIGHT = 18;
export const ROOT_FONT_SIZE = 14;
export const NODE_COLLISION_MARGIN = 0;

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

export type CollisionShape = { kind: "rect"; x: number; y: number; w: number; h: number };

export function getBoxDimensions(_label: string, isRoot: boolean): { w: number; h: number } {
  return { w: isRoot ? 160 : MIN_BOX_W, h: isRoot ? 52 : MIN_BOX_H };
}

export function getNodeBox(node: NodeData, isRoot: boolean): Box {
  const size = getBoxDimensions(node.label, isRoot);
  return { x: node.x - size.w / 2, y: node.y - size.h / 2, w: size.w, h: size.h };
}

export function getNodeShape(node: NodeData, isRoot: boolean): CollisionShape {
  const box = getBoxDimensions(node.label, isRoot);
  return { kind: "rect", x: node.x - box.w / 2, y: node.y - box.h / 2, w: box.w, h: box.h };
}

export function getNodeEnvelope(node: NodeData, isRoot: boolean): CollisionShape {
  const shape = getNodeShape(node, isRoot);
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

export function shapesOverlap(a: CollisionShape, b: CollisionShape): boolean {
  return rectangleOverlap(a, b);
}

export function pointInsideShape(point: Point, shape: CollisionShape): boolean {
  return point.x >= shape.x && point.x <= shape.x + shape.w && point.y >= shape.y && point.y <= shape.y + shape.h;
}

export function canPlaceNode(node: NodeData, nodes: NodeData[], rootId: string | null, excludeId?: string): boolean {
  const candidate = getNodeEnvelope(node, node.id === rootId);
  return nodes.every((other) => other.id === excludeId || other.id === node.id || !shapesOverlap(candidate, getNodeEnvelope(other, other.id === rootId)));
}
