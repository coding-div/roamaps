/**
 * TreeCanvas style reminder — Obsidian Cartography: graphite field, dotted
 * survey grid, cobalt controls, VIBGYOR route colors, and precise spatial ink.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  getAllEdges as getEdgesFromTree,
  getAllNodes as getNodesFromTree,
  MAX_LABEL_LENGTH,
  type Direction,
  type NodeData,
  type TreeMap,
  VIBGYOR_COLORS,
} from "@/lib/treeData";
import { useRoadmaps } from "@/contexts/RoadmapContext";
import { toast } from "sonner";
import { Home, Link2, Minus, MousePointer2, Plus, Redo2, RotateCcw, Undo2 } from "lucide-react";
import ActionPanel from "./ActionPanel";

interface TreeCanvasProps {
  tree: TreeMap;
}

const GRID_SIZE = 30;
const NODE_RADIUS = 3;
const MIN_BOX_W = 100;
const MIN_BOX_H = 36;
const MAX_BOX_W = 280;
const MAX_BOX_H = 120;
const FONT_SIZE = 12;
const CHAR_WIDTH = 7.2;
const LINE_HEIGHT = 18;
const ROOT_FONT_SIZE = 14;
const ROUTE_CLEARANCE = 18;
const OBSTACLE_PADDING = 10;
const ARROW_LENGTH = 9;
const ARROW_WIDTH = 5;

interface ViewBox { x: number; y: number; w: number; h: number }
interface Point { x: number; y: number }
interface Segment { a: Point; b: Point }
interface Box { x: number; y: number; w: number; h: number }
interface Route { points: Point[]; path: string; targetDirection: Direction; midpoint: Point }
interface DragState { nodeId: string; pointerId: number; startX: number; startY: number; moved: boolean; x: number; y: number }
type PanelTarget = { type: "node"; nodeId: string } | { type: "arrow"; sourceId: string; targetId: string };

function DotGrid() {
  return (
    <defs>
      <pattern id="dotGrid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
        <circle cx={GRID_SIZE / 2} cy={GRID_SIZE / 2} r={1} fill="#2a2a35" />
      </pattern>
    </defs>
  );
}

function getBoxDimensions(label: string, isRoot: boolean): { w: number; h: number } {
  const cw = isRoot ? 8 : CHAR_WIDTH;
  if (!label || label.trim() === "") return { w: isRoot ? 160 : MIN_BOX_W, h: isRoot ? 52 : MIN_BOX_H };
  const charsPerLine = Math.max(5, Math.floor(MAX_BOX_W / cw));
  const wrappedLines: string[] = [];
  for (const rawLine of label.split("\n")) {
    if (!rawLine) wrappedLines.push("");
    else for (let start = 0; start < rawLine.length; start += charsPerLine) wrappedLines.push(rawLine.slice(start, start + charsPerLine));
  }
  const lineCount = Math.max(1, wrappedLines.length);
  const longest = Math.max(1, ...wrappedLines.map((line) => line.length));
  return {
    w: Math.min(MAX_BOX_W, Math.max(isRoot ? 160 : MIN_BOX_W, longest * cw + 20)),
    h: Math.min(MAX_BOX_H, Math.max(isRoot ? 52 : MIN_BOX_H, lineCount * LINE_HEIGHT + 20)),
  };
}

function getPort(node: NodeData, box: Box, direction: Direction): Point {
  if (direction === "up") return { x: node.x, y: node.y - box.h / 2 };
  if (direction === "down") return { x: node.x, y: node.y + box.h / 2 };
  if (direction === "left") return { x: node.x - box.w / 2, y: node.y };
  return { x: node.x + box.w / 2, y: node.y };
}

function movePoint(point: Point, direction: Direction, distance: number): Point {
  if (direction === "up") return { x: point.x, y: point.y - distance };
  if (direction === "down") return { x: point.x, y: point.y + distance };
  if (direction === "left") return { x: point.x - distance, y: point.y };
  return { x: point.x + distance, y: point.y };
}

function directionFromTo(a: Point, b: Point): Direction {
  if (Math.abs(b.x - a.x) >= Math.abs(b.y - a.y)) return b.x >= a.x ? "right" : "left";
  return b.y >= a.y ? "down" : "up";
}

function isHorizontal(segment: Segment): boolean { return segment.a.y === segment.b.y; }

function simplifyPoints(points: Point[]): Point[] {
  const result: Point[] = [];
  for (const point of points) {
    const previous = result[result.length - 1];
    if (previous && previous.x === point.x && previous.y === point.y) continue;
    const before = result[result.length - 2];
    if (before && previous && ((before.x === previous.x && previous.x === point.x) || (before.y === previous.y && previous.y === point.y))) {
      result[result.length - 1] = point;
    } else result.push(point);
  }
  return result;
}

function pointInsideRect(point: Point, rect: Box, padding = 0): boolean {
  return point.x > rect.x - padding && point.x < rect.x + rect.w + padding && point.y > rect.y - padding && point.y < rect.y + rect.h + padding;
}

function segmentClear(a: Point, b: Point, obstacles: Box[]): boolean {
  if (a.x !== b.x && a.y !== b.y) return false;
  for (const obstacle of obstacles) {
    if (a.x === b.x) {
      const yMin = Math.min(a.y, b.y);
      const yMax = Math.max(a.y, b.y);
      if (a.x > obstacle.x - OBSTACLE_PADDING && a.x < obstacle.x + obstacle.w + OBSTACLE_PADDING && yMax > obstacle.y - OBSTACLE_PADDING && yMin < obstacle.y + obstacle.h + OBSTACLE_PADDING) return false;
    } else {
      const xMin = Math.min(a.x, b.x);
      const xMax = Math.max(a.x, b.x);
      if (a.y > obstacle.y - OBSTACLE_PADDING && a.y < obstacle.y + obstacle.h + OBSTACLE_PADDING && xMax > obstacle.x - OBSTACLE_PADDING && xMin < obstacle.x + obstacle.w + OBSTACLE_PADDING) return false;
    }
  }
  return true;
}

function routeClear(points: Point[], obstacles: Box[]): boolean {
  for (let i = 0; i < points.length - 1; i++) if (!segmentClear(points[i], points[i + 1], obstacles)) return false;
  return true;
}

function routeLength(points: Point[]): number {
  return points.slice(1).reduce((total, point, index) => total + Math.abs(point.x - points[index].x) + Math.abs(point.y - points[index].y), 0);
}

function getOrthogonalRoute(source: NodeData, target: NodeData, sourceBox: Box, targetBox: Box, obstacles: Box[]): Route {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const horizontalFirst: Direction[] = dx >= 0 ? ["right", "left", "down", "up"] : ["left", "right", "up", "down"];
  const verticalFirst: Direction[] = dy >= 0 ? ["down", "up", "right", "left"] : ["up", "down", "left", "right"];
  const ordered = Math.abs(dx) >= Math.abs(dy) ? horizontalFirst : verticalFirst;
  const pairs: Array<[Direction, Direction]> = [];
  for (const sourceDirection of ordered) for (const targetDirection of ordered) pairs.push([sourceDirection, targetDirection]);
  const candidates: Array<{ points: Point[]; targetDirection: Direction; cost: number }> = [];

  for (const [sourceDirection, targetDirection] of pairs) {
    const start = getPort(source, sourceBox, sourceDirection);
    const end = getPort(target, targetBox, targetDirection);
    const startOut = movePoint(start, sourceDirection, ROUTE_CLEARANCE);
    const endIn = movePoint(end, targetDirection, ROUTE_CLEARANCE);
    const connectors: Point[][] = [
      [start, startOut, { x: endIn.x, y: startOut.y }, endIn, end],
      [start, startOut, { x: startOut.x, y: endIn.y }, endIn, end],
    ];
    for (const rawPoints of connectors) {
      const points = simplifyPoints(rawPoints);
      const clear = routeClear(points, obstacles);
      const obstaclePenalty = clear ? 0 : 100000;
      candidates.push({ points, targetDirection, cost: routeLength(points) + points.length * 10 + obstaclePenalty });
    }
  }

  const best = candidates.sort((a, b) => a.cost - b.cost)[0];
  const points = best?.points ?? [getPort(source, sourceBox, "right"), getPort(target, targetBox, "left")];
  const d = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  let midpoint = points[0];
  let longest = -1;
  for (let i = 0; i < points.length - 1; i++) {
    const length = Math.abs(points[i + 1].x - points[i].x) + Math.abs(points[i + 1].y - points[i].y);
    if (length > longest) {
      longest = length;
      midpoint = { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 };
    }
  }
  return { points, path: d, targetDirection: best?.targetDirection ?? "left", midpoint };
}

function toSegments(points: Point[]): Segment[] {
  return points.slice(1).map((point, index) => ({ a: points[index], b: point }));
}

function strictCrossing(a: Segment, b: Segment): Point | null {
  const aH = isHorizontal(a);
  const bH = isHorizontal(b);
  if (aH === bH) return null;
  const horizontal = aH ? a : b;
  const vertical = aH ? b : a;
  const minX = Math.min(horizontal.a.x, horizontal.b.x);
  const maxX = Math.max(horizontal.a.x, horizontal.b.x);
  const minY = Math.min(vertical.a.y, vertical.b.y);
  const maxY = Math.max(vertical.a.y, vertical.b.y);
  if (vertical.a.x > minX && vertical.a.x < maxX && horizontal.a.y > minY && horizontal.a.y < maxY) return { x: vertical.a.x, y: horizontal.a.y };
  return null;
}

function getArrowHead(route: Route): string {
  const tip = route.points[route.points.length - 1];
  const before = route.points[route.points.length - 2] ?? tip;
  const length = Math.hypot(tip.x - before.x, tip.y - before.y) || 1;
  const ux = (tip.x - before.x) / length;
  const uy = (tip.y - before.y) / length;
  const base = { x: tip.x - ux * ARROW_LENGTH, y: tip.y - uy * ARROW_LENGTH };
  const px = -uy * ARROW_WIDTH;
  const py = ux * ARROW_WIDTH;
  return `${tip.x},${tip.y} ${base.x + px},${base.y + py} ${base.x - px},${base.y - py}`;
}

function bridgePath(point: Point, segment: Segment): string {
  if (isHorizontal(segment)) return `M ${point.x - 7} ${point.y} Q ${point.x} ${point.y - 9} ${point.x + 7} ${point.y}`;
  return `M ${point.x} ${point.y - 7} Q ${point.x + 9} ${point.y} ${point.x} ${point.y + 7}`;
}

function buildTextLines(label: string, boxW: number, isRoot: boolean): string[] {
  if (!label || label.trim() === "") return [];
  const charsPerLine = Math.max(5, Math.floor((boxW - 16) / (isRoot ? 8 : CHAR_WIDTH)));
  const lines: string[] = [];
  for (const rawLine of label.split("\n")) {
    if (!rawLine) lines.push("");
    else for (let start = 0; start < rawLine.length; start += charsPerLine) lines.push(rawLine.slice(start, start + charsPerLine));
  }
  return lines;
}

export default function TreeCanvas({ tree }: TreeCanvasProps) {
  const { dispatch, canUndo, canRedo } = useRoadmaps();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [viewBox, setViewBox] = useState<ViewBox>(() => tree.maxDepth <= 3 ? { x: -500, y: -700, w: 1000, h: 1400 } : { x: -1400, y: -1600, w: 2800, h: 3200 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const initialPinchDistance = useRef<number | null>(null);
  const initialViewBoxOnPinch = useRef<ViewBox | null>(null);
  const pinchCenter = useRef({ x: 0, y: 0 });
  const isPinching = useRef(false);
  const [actionPanelTarget, setActionPanelTarget] = useState<PanelTarget | null>(null);
  const [actionPanelScreenPos, setActionPanelScreenPos] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressActive = useRef(false);

  const worldPoint = useCallback((clientX: number, clientY: number): Point | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return { x: viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.w, y: viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.h };
  }, [viewBox]);

  const zoomByFactor = useCallback((factor: number, centerFracX = 0.5, centerFracY = 0.5) => {
    setViewBox((previous) => {
      const newW = previous.w * factor;
      const newH = previous.h * factor;
      if (newW > 8000 || newW < 150) return previous;
      return { x: previous.x + (previous.w - newW) * centerFracX, y: previous.y + (previous.h - newH) * centerFracY, w: newW, h: newH };
    });
  }, []);

  const resetView = useCallback(() => setViewBox(tree.maxDepth <= 3 ? { x: -500, y: -700, w: 1000, h: 1400 } : { x: -1400, y: -1600, w: 2800, h: 3200 }), [tree.maxDepth]);

  const endLongPress = useCallback(() => {
    longPressActive.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  }, []);

  function startLongPress(target: PanelTarget, world: Point) {
    endLongPress();
    longPressActive.current = true;
    longPressTimer.current = setTimeout(() => {
      if (!longPressActive.current || dragRef.current?.moved) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      setActionPanelScreenPos({ x: (world.x - viewBox.x) * rect.width / viewBox.w, y: (world.y - viewBox.y) * rect.height / viewBox.h });
      setActionPanelTarget(target);
    }, 500);
  }

  function selectForConnection(nodeId: string) {
    if (!connectMode) return;
    if (!connectSourceId) {
      setConnectSourceId(nodeId);
      toast.message("Source selected", { description: "Tap another node to draw the arrow." });
      return;
    }
    if (connectSourceId === nodeId) {
      toast.message("Choose a different node", { description: "An arrow needs two different nodes." });
      return;
    }
    const source = tree.nodeMap[connectSourceId];
    if (source?.children.some((child) => child.targetId === nodeId)) {
      toast.message("Arrow already exists");
    } else {
      dispatch({ type: "ADD_ARROW", treeId: tree.id, sourceId: connectSourceId, targetId: nodeId, color: "blue" });
      toast.success("Arrow added");
    }
    setConnectSourceId(null);
    setConnectMode(false);
  }

  function addIndependentNode() {
    const nodeId = `${tree.id}-node-${Date.now()}`;
    dispatch({ type: "ADD_NODE", treeId: tree.id, node: { id: nodeId, x: viewBox.x + viewBox.w / 2, y: viewBox.y + viewBox.h / 2, label: "New node", color: "violet", children: [] } });
  }

  function beginNodePointer(e: React.PointerEvent<SVGGElement>, node: NodeData) {
    e.stopPropagation();
    if (connectMode) {
      selectForConnection(node.id);
      return;
    }
    const point = worldPoint(e.clientX, e.clientY);
    if (!point) return;
    dragRef.current = { nodeId: node.id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false, x: node.x, y: node.y };
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // Synthetic events and a cancelled touch may not have an active pointer to capture.
    }
    startLongPress({ type: "node", nodeId: node.id }, { x: node.x, y: node.y });
  }

  function moveNodePointer(e: React.PointerEvent<SVGGElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const delta = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
    if (delta > 6) {
      drag.moved = true;
      endLongPress();
      const point = worldPoint(e.clientX, e.clientY);
      const startPoint = worldPoint(drag.startX, drag.startY);
      if (point && startPoint) {
        setDragPosition({ nodeId: drag.nodeId, x: drag.x + point.x - startPoint.x, y: drag.y + point.y - startPoint.y });
      }
    }
  }

  function finishNodePointer(e: React.PointerEvent<SVGGElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const point = dragPosition?.nodeId === drag.nodeId ? dragPosition : null;
    endLongPress();
    if (drag.moved && point) dispatch({ type: "MOVE_NODE", treeId: tree.id, nodeId: drag.nodeId, x: point.x, y: point.y });
    setDragPosition(null);
    dragRef.current = null;
  }

  function handleTouchStart(e: React.TouchEvent) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (e.touches.length === 2) {
      e.preventDefault();
      isPinching.current = true;
      const [a, b] = [e.touches[0], e.touches[1]];
      initialPinchDistance.current = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      initialViewBoxOnPinch.current = { ...viewBox };
      pinchCenter.current = { x: ((a.clientX + b.clientX) / 2 - rect.left) / rect.width, y: ((a.clientY + b.clientY) / 2 - rect.top) / rect.height };
      setIsPanning(false);
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (target?.closest("[data-node-id]") || target?.closest("[data-arrow-id]")) return;
      setIsPanning(true);
      panStart.current = { x: touch.clientX, y: touch.clientY };
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (e.touches.length === 2 && isPinching.current && initialPinchDistance.current && initialViewBoxOnPinch.current) {
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const scale = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY) / initialPinchDistance.current;
      const initial = initialViewBoxOnPinch.current;
      const newW = initial.w / scale;
      const newH = initial.h / scale;
      if (newW > 8000 || newW < 150) return;
      setViewBox({ x: initial.x + (initial.w - newW) * pinchCenter.current.x, y: initial.y + (initial.h - newH) * pinchCenter.current.y, w: newW, h: newH });
    } else if (e.touches.length === 1 && isPanning) {
      const touch = e.touches[0];
      const dx = ((touch.clientX - panStart.current.x) / rect.width) * viewBox.w;
      const dy = ((touch.clientY - panStart.current.y) / rect.height) * viewBox.h;
      setViewBox((previous) => ({ ...previous, x: previous.x - dx, y: previous.y - dy }));
      panStart.current = { x: touch.clientX, y: touch.clientY };
    }
  }

  function handleMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if ((e.target as Element).closest("[data-node-id]") || (e.target as Element).closest("[data-arrow-id]")) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY };
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!isPanning) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const dx = ((e.clientX - panStart.current.x) / rect.width) * viewBox.w;
    const dy = ((e.clientY - panStart.current.y) / rect.height) * viewBox.h;
    setViewBox((previous) => ({ ...previous, x: previous.x - dx, y: previous.y - dy }));
    panStart.current = { x: e.clientX, y: e.clientY };
  }

  const nodes = getNodesFromTree(tree);
  const edges = getEdgesFromTree(tree);
  const rootId = tree.root?.id ?? null;
  const positionOf = (node: NodeData): NodeData => dragPosition?.nodeId === node.id ? { ...node, x: dragPosition.x, y: dragPosition.y } : node;
  const displayNodes = nodes.map(positionOf);
  const boxes = new Map(displayNodes.map((node) => { const dimensions = getBoxDimensions(node.label, node.id === rootId); return [node.id, { x: node.x - dimensions.w / 2, y: node.y - dimensions.h / 2, w: dimensions.w, h: dimensions.h }]; }));
  const routes = edges.map(({ source, target }) => {
    const sourceNode = positionOf(source);
    const targetNode = positionOf(target);
    const sourceBox = boxes.get(source.id)!;
    const targetBox = boxes.get(target.id)!;
    const obstacleBoxes = displayNodes.filter((node) => node.id !== source.id && node.id !== target.id).map((node) => boxes.get(node.id)!);
    return { source, target, sourceNode, targetNode, route: getOrthogonalRoute(sourceNode, targetNode, sourceBox, targetBox, obstacleBoxes) };
  });
  const bridgePoints = routes.map((current, index) => {
    const currentSegments = toSegments(current.route.points);
    const crossings: Array<{ point: Point; segment: Segment }> = [];
    for (let otherIndex = 0; otherIndex < index; otherIndex++) {
      for (const currentSegment of currentSegments) for (const otherSegment of toSegments(routes[otherIndex].route.points)) {
        const point = strictCrossing(currentSegment, otherSegment);
        if (point && !crossings.some((item) => Math.abs(item.point.x - point.x) < 1 && Math.abs(item.point.y - point.y) < 1)) crossings.push({ point, segment: currentSegment });
      }
    }
    return crossings;
  });

  function renderEdges(): ReactNode[] {
    return routes.map(({ source, target, route }, index) => {
      const arrowColor = source.children.find((child) => child.targetId === target.id)?.color ?? "blue";
      const key = `${tree.id}-${source.id}-${target.id}`;
      return (
        <g key={key} data-arrow-id={key}>
          <path d={route.path} fill="none" stroke="transparent" strokeWidth={18} style={{ cursor: "pointer" }} onPointerDown={(e) => { e.stopPropagation(); const point = worldPoint(e.clientX, e.clientY); if (point) startLongPress({ type: "arrow", sourceId: source.id, targetId: target.id }, route.midpoint); }} onPointerMove={endLongPress} onPointerUp={endLongPress} onPointerCancel={endLongPress} />
          <path d={route.path} fill="none" stroke={VIBGYOR_COLORS[arrowColor]} strokeWidth={2} strokeOpacity={0.72} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
          <polygon points={getArrowHead(route)} fill={VIBGYOR_COLORS[arrowColor]} opacity={0.86} pointerEvents="none" />
          {bridgePoints[index].map(({ point, segment }, crossingIndex) => (
            <g key={`${key}-bridge-${crossingIndex}`} pointerEvents="none">
              <circle cx={point.x} cy={point.y} r={5.5} fill="#0a0a0f" />
              <path d={bridgePath(point, segment)} fill="none" stroke={VIBGYOR_COLORS[arrowColor]} strokeWidth={2} strokeLinecap="round" />
            </g>
          ))}
        </g>
      );
    });
  }

  function renderNodes(): ReactNode[] {
    return displayNodes.map((node) => {
      const isRoot = node.id === rootId;
      const size = getBoxDimensions(node.label, isRoot);
      const textLines = buildTextLines(node.label, size.w, isRoot);
      const selected = connectSourceId === node.id;
      return (
        <g key={`${tree.id}-${node.id}`} data-node-id={node.id} className="tree-node-group" style={{ cursor: connectMode ? "crosshair" : dragPosition?.nodeId === node.id ? "grabbing" : "grab" }} onPointerDown={(e) => beginNodePointer(e, node)} onPointerMove={moveNodePointer} onPointerUp={finishNodePointer} onPointerCancel={finishNodePointer}>
          <rect x={node.x - size.w / 2} y={node.y - size.h / 2} width={size.w} height={size.h} rx={NODE_RADIUS} fill="#13131a" stroke={selected ? "#f2f4fa" : VIBGYOR_COLORS[node.color]} strokeWidth={selected ? 3 : isRoot ? 2 : 1.5} strokeOpacity={selected ? 1 : 0.82} />
          {textLines.length > 0 && <g pointerEvents="none">{textLines.map((line, lineIndex) => <text key={lineIndex} x={node.x} y={node.y - ((textLines.length - 1) * LINE_HEIGHT) / 2 + lineIndex * LINE_HEIGHT} textAnchor="middle" dominantBaseline="central" fill="#e4e4e7" fontSize={isRoot ? ROOT_FONT_SIZE : FONT_SIZE} fontWeight={isRoot ? 600 : 500} fontFamily="'Space Grotesk', sans-serif">{line}</text>)}</g>}
        </g>
      );
    });
  }

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const prevent = (event: TouchEvent) => { if (event.touches.length > 1) event.preventDefault(); };
    element.addEventListener("touchmove", prevent, { passive: false });
    return () => element.removeEventListener("touchmove", prevent);
  }, []);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden" style={{ background: "#0a0a0f" }}>
      <svg ref={svgRef} width="100%" height="100%" viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={() => setIsPanning(false)} onMouseLeave={() => setIsPanning(false)} onWheel={(e) => { e.preventDefault(); const rect = svgRef.current?.getBoundingClientRect(); if (rect) zoomByFactor(e.deltaY > 0 ? 1.12 : 0.89, (e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height); }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={() => { setIsPanning(false); isPinching.current = false; initialPinchDistance.current = null; }} style={{ cursor: isPanning ? "grabbing" : "grab", touchAction: "none" }}>
        <DotGrid />
        <rect width="10000" height="10000" x={-5000} y={-5000} fill="url(#dotGrid)" />
        {renderEdges()}
        {renderNodes()}
      </svg>

      <div className="absolute left-5 top-16 z-10 flex max-w-[calc(100%-2.5rem)] flex-wrap items-center gap-2">
        <button onClick={addIndependentNode} className="flex items-center gap-2 rounded-lg border border-[#2a2a35] bg-[#13131a] px-3 py-2 text-xs text-[#c4c4cc] transition-all hover:border-[#3B82F6]/60 hover:text-white active:scale-95" title="Add an independent node"><Plus className="h-4 w-4" />Add node</button>
        <button onClick={() => { setConnectMode((mode) => !mode); setConnectSourceId(null); }} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all active:scale-95 ${connectMode ? "border-[#3B82F6] bg-[#3B82F6]/15 text-white" : "border-[#2a2a35] bg-[#13131a] text-[#c4c4cc] hover:border-[#3B82F6]/60 hover:text-white"}`} title="Connect two nodes"><Link2 className="h-4 w-4" />{connectMode ? (connectSourceId ? "Select target" : "Select source") : "Connect nodes"}</button>
        {connectMode && <button onClick={() => { setConnectMode(false); setConnectSourceId(null); }} className="rounded-lg border border-[#2a2a35] bg-[#13131a] p-2 text-[#8a8a95] hover:text-white" title="Cancel connection mode"><MousePointer2 className="h-4 w-4" /></button>}
        <div className="flex items-center gap-1 rounded-lg border border-[#2a2a35] bg-[#13131a] p-1">
          <button onClick={() => dispatch({ type: "UNDO" })} disabled={!canUndo} className="rounded-md p-2 text-[#c4c4cc] transition-colors hover:bg-[#1e1e2a] hover:text-white disabled:cursor-not-allowed disabled:opacity-35" title="Undo"><Undo2 className="h-4 w-4" /></button>
          <button onClick={() => dispatch({ type: "REDO" })} disabled={!canRedo} className="rounded-md p-2 text-[#c4c4cc] transition-colors hover:bg-[#1e1e2a] hover:text-white disabled:cursor-not-allowed disabled:opacity-35" title="Redo"><Redo2 className="h-4 w-4" /></button>
          <button onClick={() => { dispatch({ type: "RESET" }); toast.success("Demo roadmaps restored"); }} className="rounded-md p-2 text-[#c4c4cc] transition-colors hover:bg-[#1e1e2a] hover:text-white" title="Reset demo roadmaps"><RotateCcw className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2">
        <button onClick={() => zoomByFactor(0.8)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#2a2a35] bg-[#13131a] text-[#e4e4e7] transition-all hover:border-[#3a3a45] hover:bg-[#1a1a24] active:scale-95" title="Zoom in"><Plus className="h-5 w-5" strokeWidth={1.5} /></button>
        <button onClick={() => zoomByFactor(1.25)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#2a2a35] bg-[#13131a] text-[#e4e4e7] transition-all hover:border-[#3a3a45] hover:bg-[#1a1a24] active:scale-95" title="Zoom out"><Minus className="h-5 w-5" strokeWidth={1.5} /></button>
        <button onClick={resetView} className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#2a2a35] bg-[#13131a] text-[#e4e4e7] transition-all hover:border-[#3a3a45] hover:bg-[#1a1a24] active:scale-95" title="Reset view"><Home className="h-5 w-5" strokeWidth={1.5} /></button>
      </div>

      {actionPanelTarget && <ActionPanel x={actionPanelScreenPos.x} y={actionPanelScreenPos.y} target={actionPanelTarget} tree={tree} dispatch={dispatch} onClose={() => setActionPanelTarget(null)} />}
    </div>
  );
}
