/**
 * TreeCanvas — Full-screen SVG canvas for rendering tree branches
 * Fixes applied:
 * - Arrows now exit/enter nodes perpendicular to the surface
 * - Crossing arrows show a bridge/gap to distinguish them
 * - Remove node deletes the node + reconnects parent to children
 * Design: Obsidian Canvas aesthetic — dark background, dot grid, crisp lines
 */

import { useRef, useState, useCallback, useEffect, ReactNode } from "react";
import {
  TreeMap,
  NodeData,
  VIBGYOR_COLORS,
  MAX_LABEL_LENGTH,
  getAllEdges as getEdgesFromTree,
  getAllNodes as getNodesFromTree,
} from "@/lib/treeData";
import ActionPanel from "./ActionPanel";
import { useRoadmaps } from "@/contexts/RoadmapContext";
import { Plus, Minus, Home, Link2, MousePointer2 } from "lucide-react";

interface TreeCanvasProps {
  tree: TreeMap;
}

const GRID_SIZE = 30;
const NODE_RADIUS = 3;

// Box size constraints
const MIN_BOX_W = 100;
const MIN_BOX_H = 36;
const MAX_BOX_W = 280;
const MAX_BOX_H = 120;
const FONT_SIZE = 12;
const CHAR_WIDTH = 7.2;
const LINE_HEIGHT = 18;
const ROOT_FONT_SIZE = 14;

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

type PanelTarget =
  | { type: "node"; nodeId: string }
  | { type: "arrow"; edgeIndex: number };

function DotGrid() {
  return (
    <>
      <defs>
        <pattern
          id="dotGrid"
          width={GRID_SIZE}
          height={GRID_SIZE}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={GRID_SIZE / 2} cy={GRID_SIZE / 2} r={1} fill="#2a2a35" />
        </pattern>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill="#e4e4e7" opacity={0.4} />
        </marker>
      </defs>
      <rect
        width="10000"
        height="10000"
        x={-5000}
        y={-5000}
        fill="url(#dotGrid)"
      />
    </>
  );
}

/**
 * Get the exit/entry point on a box edge given a direction.
 * Returns the point on the surface and the direction of travel perpendicular to the surface.
 */
function getEdgePoint(
  cx: number,
  cy: number,
  w: number,
  h: number,
  direction: "up" | "down" | "left" | "right"
): { x: number; y: number; dx: number; dy: number } {
  switch (direction) {
    case "up":
      return { x: cx, y: cy - h / 2, dx: 0, dy: -1 };
    case "down":
      return { x: cx, y: cy + h / 2, dx: 0, dy: 1 };
    case "left":
      return { x: cx - w / 2, y: cy, dx: -1, dy: 0 };
    case "right":
      return { x: cx + w / 2, y: cy, dx: 1, dy: 0 };
  }
}

/**
 * Determine which side of a box a point is on relative to the box center.
 * Returns the direction perpendicular to the side that the point faces.
 */
function getDirectionFromCenter(
  fromCx: number,
  fromCy: number,
  toX: number,
  toY: number
): "up" | "down" | "left" | "right" {
  const dx = toX - fromCx;
  const dy = toY - fromCy;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "right" : "left";
  }
  return dy > 0 ? "down" : "up";
}

/**
 * Build an orthogonal path that:
 * 1. Exits the source box perpendicular to its surface
 * 2. Enters the target box perpendicular to its surface
 * 3. Uses right-angle turns
 */
function getOrthogonalPath(
  srcCx: number,
  srcCy: number,
  srcW: number,
  srcH: number,
  tgtCx: number,
  tgtCy: number,
  tgtW: number,
  tgtH: number
): string {
  // Determine exit direction from source
  const exitDir = getDirectionFromCenter(srcCx, srcCy, tgtCx, tgtCy);
  const entryDir = getDirectionFromCenter(tgtCx, tgtCy, srcCx, srcCy);

  const exitPt = getEdgePoint(srcCx, srcCy, srcW, srcH, exitDir);
  const entryPt = getEdgePoint(tgtCx, tgtCy, tgtW, tgtH, entryDir);

  // Build the orthogonal path with right-angle turns
  // The path must start perpendicular to exit side and end perpendicular to entry side

  if (exitDir === entryDir) {
    // Same direction — simple straight path with one bend
    if (exitDir === "up" || exitDir === "down") {
      const midX = (exitPt.x + entryPt.x) / 2;
      return `M ${exitPt.x} ${exitPt.y} L ${midX} ${exitPt.y} L ${midX} ${entryPt.y} L ${entryPt.x} ${entryPt.y}`;
    }
    const midY = (exitPt.y + entryPt.y) / 2;
    return `M ${exitPt.x} ${exitPt.y} L ${exitPt.x} ${midY} L ${entryPt.x} ${midY} L ${entryPt.x} ${entryPt.y}`;
  }

  // Different directions — two bends
  if ((exitDir === "up" || exitDir === "down") && (entryDir === "left" || entryDir === "right")) {
    // Exit vertical, enter horizontal
    const midX = entryPt.x;
    const midY = exitPt.y;
    return `M ${exitPt.x} ${exitPt.y} L ${midX} ${midY} L ${entryPt.x} ${entryPt.y}`;
  }

  // Exit horizontal, enter vertical
  const midX = exitPt.x;
  const midY = entryPt.y;
  return `M ${exitPt.x} ${exitPt.y} L ${midX} ${midY} L ${entryPt.x} ${entryPt.y}`;
}

/**
 * Calculate box dimensions based on label content.
 */
function getBoxDimensions(label: string, isRoot: boolean): { w: number; h: number } {
  const fs = isRoot ? ROOT_FONT_SIZE : FONT_SIZE;
  const cw = isRoot ? 8.0 : CHAR_WIDTH;

  if (!label || label.trim() === "") {
    return {
      w: isRoot ? 160 : MIN_BOX_W,
      h: isRoot ? 52 : MIN_BOX_H,
    };
  }

  const charsPerLine = Math.max(5, Math.floor(MAX_BOX_W / cw));
  const rawLines = label.split("\n");
  const wrappedLines: string[] = [];

  for (const rawLine of rawLines) {
    if (rawLine.length === 0) {
      wrappedLines.push("");
      continue;
    }
    let remaining = rawLine;
    while (remaining.length > 0) {
      const chunk = remaining.slice(0, charsPerLine);
      wrappedLines.push(chunk);
      remaining = remaining.slice(charsPerLine);
    }
  }

  const numLines = Math.max(1, wrappedLines.length);
  const longestLine = Math.max(1, ...wrappedLines.map((l) => l.length));

  const w = Math.min(
    MAX_BOX_W,
    Math.max(isRoot ? 160 : MIN_BOX_W, longestLine * cw + 20)
  );
  const h = Math.min(
    MAX_BOX_H,
    Math.max(isRoot ? 52 : MIN_BOX_H, numLines * LINE_HEIGHT + 20)
  );

  return { w, h };
}

/**
 * Detect intersections between two orthogonal path segments.
 * Returns true if the paths cross (not just touch).
 */
function pathsIntersect(
  path1: Array<{ x: number; y: number }>,
  path2: Array<{ x: number; y: number }>
): Array<{ x: number; y: number }> {
  const intersections: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < path1.length - 1; i++) {
    const a1 = path1[i];
    const a2 = path1[i + 1];
    for (let j = 0; j < path2.length - 1; j++) {
      const b1 = path2[j];
      const b2 = path2[j + 1];

      // Check if segment a1-a2 intersects segment b1-b2
      const isH1 = a1.y === a2.y;
      const isH2 = b1.y === b2.y;

      if (isH1 && !isH2) {
        // a is horizontal, b is vertical
        const minX = Math.min(a1.x, a2.x);
        const maxX = Math.max(a1.x, a2.x);
        const minY = Math.min(b1.y, b2.y);
        const maxY = Math.max(b1.y, b2.y);
        if (b1.x >= minX && b1.x <= maxX && a1.y >= minY && a1.y <= maxY) {
          intersections.push({ x: b1.x, y: a1.y });
        }
      } else if (!isH1 && isH2) {
        // a is vertical, b is horizontal
        const minX = Math.min(b1.x, b2.x);
        const maxX = Math.max(b1.x, b2.x);
        const minY = Math.min(a1.y, a2.y);
        const maxY = Math.max(a1.y, a2.y);
        if (a1.x >= minX && a1.x <= maxX && b1.y >= minY && b1.y <= maxY) {
          intersections.push({ x: a1.x, y: b1.y });
        }
      }
    }
  }

  return intersections;
}

export default function TreeCanvas({ tree }: TreeCanvasProps) {
  const { dispatch } = useRoadmaps();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [connectMode, setConnectMode] = useState(false);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);

  const [viewBox, setViewBox] = useState<ViewBox>(() => {
    if (tree.maxDepth <= 3) {
      return { x: -500, y: -700, w: 1000, h: 1400 };
    }
    return { x: -1400, y: -1600, w: 2800, h: 3200 };
  });

  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  const initialPinchDistance = useRef<number | null>(null);
  const initialViewBoxOnPinch = useRef<ViewBox | null>(null);
  const pinchCenter = useRef({ x: 0, y: 0 });
  const isPinching = useRef(false);

  const [actionPanelTarget, setActionPanelTarget] = useState<PanelTarget | null>(null);
  const [actionPanelScreenPos, setActionPanelScreenPos] = useState({ x: 0, y: 0 });

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressThreshold = 500;
  const isLongPressActive = useRef(false);

  // ─── ZOOM ───
  const zoomByFactor = useCallback((factor: number, centerFracX?: number, centerFracY?: number) => {
    setViewBox((prev) => {
      const newW = prev.w * factor;
      const newH = prev.h * factor;
      if (newW > 8000 || newW < 150) return prev;
      const cx = centerFracX ?? 0.5;
      const cy = centerFracY ?? 0.5;
      return {
        x: prev.x + (prev.w - newW) * cx,
        y: prev.y + (prev.h - newH) * cy,
        w: newW,
        h: newH,
      };
    });
  }, []);

  const handleZoomIn = useCallback(() => zoomByFactor(0.8), [zoomByFactor]);
  const handleZoomOut = useCallback(() => zoomByFactor(1.25), [zoomByFactor]);

  const handleResetView = useCallback(() => {
    if (tree.maxDepth <= 3) {
      setViewBox({ x: -500, y: -700, w: 1000, h: 1400 });
    } else {
      setViewBox({ x: -1400, y: -1600, w: 2800, h: 3200 });
    }
  }, [tree.maxDepth]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const fx = (e.clientX - rect.left) / rect.width;
      const fy = (e.clientY - rect.top) / rect.height;
      const factor = e.deltaY > 0 ? 1.12 : 0.89;
      zoomByFactor(factor, fx, fy);
    },
    [zoomByFactor]
  );

  // ─── SVG TOUCH: PINCH + PAN ───
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();

      if (e.touches.length === 2) {
        e.preventDefault();
        isPinching.current = true;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        initialPinchDistance.current = dist;
        initialViewBoxOnPinch.current = { ...viewBox };
        pinchCenter.current = {
          x: ((t1.clientX + t2.clientX) / 2 - rect.left) / rect.width,
          y: ((t1.clientY + t2.clientY) / 2 - rect.top) / rect.height,
        };
        setIsPanning(false);
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      } else if (e.touches.length === 1) {
        const touch = e.touches[0];
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        if (
          el &&
          ((el as Element).closest("[data-node-id]") ||
            (el as Element).closest("[data-arrow-id]"))
        ) {
          return;
        }
        setIsPanning(true);
        panStart.current = { x: touch.clientX, y: touch.clientY };
      }
    },
    [viewBox]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();

      if (e.touches.length === 2 && isPinching.current && initialPinchDistance.current !== null) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const scale = dist / initialPinchDistance.current;
        const ib = initialViewBoxOnPinch.current!;
        const newW = ib.w / scale;
        const newH = ib.h / scale;
        if (newW > 8000 || newW < 150) return;
        setViewBox({
          x: ib.x + (ib.w - newW) * pinchCenter.current.x,
          y: ib.y + (ib.h - newH) * pinchCenter.current.y,
          w: newW,
          h: newH,
        });
      } else if (e.touches.length === 1 && isPanning) {
        const touch = e.touches[0];
        const dx = ((touch.clientX - panStart.current.x) / rect.width) * viewBox.w;
        const dy = ((touch.clientY - panStart.current.y) / rect.height) * viewBox.h;
        setViewBox((prev) => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
        panStart.current = { x: touch.clientX, y: touch.clientY };
      }
    },
    [isPanning, viewBox.w, viewBox.h]
  );

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
    isPinching.current = false;
    initialPinchDistance.current = null;
  }, []);

  // ─── MOUSE PAN ───
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (
      (e.target as Element).closest("[data-node-id]") ||
      (e.target as Element).closest("[data-arrow-id]")
    )
      return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const dx = ((e.clientX - panStart.current.x) / rect.width) * viewBox.w;
      const dy = ((e.clientY - panStart.current.y) / rect.height) * viewBox.h;
      setViewBox((prev) => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
      panStart.current = { x: e.clientX, y: e.clientY };
    },
    [isPanning, viewBox.w, viewBox.h]
  );

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    el.addEventListener("touchmove", prevent, { passive: false });
    return () => el.removeEventListener("touchmove", prevent);
  }, []);

  // ─── LONG PRESS HELPERS ───
  function startLongPress(
    target: PanelTarget,
    nodeOrMid: { x: number; y: number },
    clientX: number,
    clientY: number
  ) {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    isLongPressActive.current = true;
    longPressTimer.current = setTimeout(() => {
      if (!isLongPressActive.current) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const scaleX = rect.width / viewBox.w;
      const scaleY = rect.height / viewBox.h;
      const screenX = (nodeOrMid.x - viewBox.x) * scaleX;
      const screenY = (nodeOrMid.y - viewBox.y) * scaleY;
      setActionPanelScreenPos({ x: screenX, y: screenY });
      setActionPanelTarget(target);
    }, longPressThreshold);
  }

  function endLongPress() {
    isLongPressActive.current = false;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleNodeSelection(nodeId: string) {
    if (!connectMode) return;
    if (!connectSourceId) {
      setConnectSourceId(nodeId);
      return;
    }
    if (connectSourceId !== nodeId) {
      dispatch({ type: "ADD_ARROW", treeId: tree.id, sourceId: connectSourceId, targetId: nodeId, color: "blue" });
    }
    setConnectSourceId(null);
    setConnectMode(false);
  }

  function addIndependentNode() {
    const nodeId = `${tree.id}-node-${Date.now()}`;
    const node: NodeData = {
      id: nodeId,
      x: viewBox.x + viewBox.w / 2,
      y: viewBox.y + viewBox.h / 2,
      label: "New node",
      color: "violet",
      children: [],
    };
    dispatch({ type: "ADD_NODE", treeId: tree.id, node });
  }

  // ─── RENDER ───
  const edges = getEdgesFromTree(tree);
  const nodes = getNodesFromTree(tree);
  const renderId = tree.id;

  // Precompute all paths for crossing detection
  const pathSegments: Array<Array<{ x: number; y: number }>> = [];

  function renderEdges(): ReactNode[] {
    return edges.map(({ source, target, arrowColor, sourceChildIndex }, i) => {
      const ss = getBoxDimensions(source.label, source.id === tree.root.id);
      const ts = getBoxDimensions(target.label, target.id === tree.root.id);

      const path = getOrthogonalPath(
        source.x, source.y, ss.w, ss.h,
        target.x, target.y, ts.w, ts.h
      );

      // Parse path into segments for crossing detection
      const segs: Array<{ x: number; y: number }> = [];
      const parts = path.replace("M ", "").split(" L ");
      for (const part of parts) {
        const [px, py] = part.split(" ").map(Number);
        segs.push({ x: px, y: py });
      }
      pathSegments[i] = segs;

      // Midpoint for long-press target
      const midIdx = Math.floor(segs.length / 2);
      const midX = segs[midIdx]?.x ?? source.x;
      const midY = segs[midIdx]?.y ?? source.y;

      // Find crossing points with other edges
      const crossings: Array<{ x: number; y: number }> = [];
      for (let j = 0; j < pathSegments.length; j++) {
        if (j === i || !pathSegments[j]) continue;
        const pts = pathsIntersect(segs, pathSegments[j]);
        crossings.push(...pts);
      }

      return (
        <g key={`edge-${renderId}-${i}`} data-arrow-id={`edge-${i}`}>
          {/* Invisible wider hit area */}
          <path
            d={path}
            fill="none"
            stroke="transparent"
            strokeWidth={16}
            style={{ cursor: "pointer" }}
            onTouchStart={(e) => {
              e.stopPropagation();
              const touch = e.touches[0];
              startLongPress({ type: "arrow", edgeIndex: i }, { x: midX, y: midY }, touch.clientX, touch.clientY);
            }}
            onTouchMove={() => {
              if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
              }
              isLongPressActive.current = false;
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              endLongPress();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              startLongPress({ type: "arrow", edgeIndex: i }, { x: midX, y: midY }, e.clientX, e.clientY);
            }}
            onMouseUp={endLongPress}
            onMouseLeave={endLongPress}
          />
          {/* Visible path */}
          <path
            d={path}
            fill="none"
            stroke={VIBGYOR_COLORS[arrowColor]}
            strokeWidth={2}
            strokeOpacity={0.55}
            markerEnd="url(#arrowhead)"
            pointerEvents="none"
          />
          {/* Bridge gaps at crossings */}
          {crossings.map((c, ci) => (
            <circle
              key={`crossing-${renderId}-${i}-${ci}`}
              cx={c.x}
              cy={c.y}
              r={4}
              fill="#0a0a0f"
              stroke="#0a0a0f"
              strokeWidth={4}
              pointerEvents="none"
            />
          ))}
        </g>
      );
    });
  }

  function renderNodes(): ReactNode[] {
    return nodes.map((node) => {
      const size = getBoxDimensions(node.label, node.id === tree.root.id);
      const color = VIBGYOR_COLORS[node.color];
      const isRoot = node.id === tree.root.id;
      const textLines = buildTextLines(node.label, size.w, isRoot);

      return (
        <g
          key={`node-${renderId}-${node.id}`}
          className="tree-node-group"
          data-node-id={node.id}
          style={{ cursor: "pointer" }}
          onTouchStart={(e) => {
            e.stopPropagation();
            if (connectMode) { handleNodeSelection(node.id); return; }
            const touch = e.touches[0];
            startLongPress({ type: "node", nodeId: node.id }, node, touch.clientX, touch.clientY);
          }}
          onTouchMove={() => {
            if (longPressTimer.current) {
              clearTimeout(longPressTimer.current);
              longPressTimer.current = null;
            }
            isLongPressActive.current = false;
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            endLongPress();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (connectMode) { handleNodeSelection(node.id); return; }
            startLongPress({ type: "node", nodeId: node.id }, node, e.clientX, e.clientY);
          }}
          onMouseUp={endLongPress}
          onMouseLeave={endLongPress}
        >
          <rect
            x={node.x - size.w / 2}
            y={node.y - size.h / 2}
            width={size.w}
            height={size.h}
            rx={NODE_RADIUS}
            fill="#13131a"
            stroke={color}
            strokeWidth={isRoot ? 2 : 1.5}
            strokeOpacity={0.8}
          />
          {textLines.length > 0 && (
            <g pointerEvents="none">
              {textLines.map((line, li) => (
                <text
                  key={li}
                  x={node.x}
                  y={node.y - ((textLines.length - 1) * LINE_HEIGHT) / 2 + li * LINE_HEIGHT}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#e4e4e7"
                  fontSize={isRoot ? ROOT_FONT_SIZE : FONT_SIZE}
                  fontWeight={isRoot ? 600 : 500}
                  fontFamily="'Space Grotesk', sans-serif"
                >
                  {line}
                </text>
              ))}
            </g>
          )}
        </g>
      );
    });
  }

  function buildTextLines(label: string, boxW: number, isRoot: boolean): string[] {
    if (!label || label.trim() === "") return [];

    const cw = isRoot ? 8.0 : CHAR_WIDTH;
    const charsPerLine = Math.max(5, Math.floor((boxW - 16) / cw));

    const rawLines = label.split("\n");
    const wrappedLines: string[] = [];

    for (const rawLine of rawLines) {
      if (rawLine.length === 0) {
        wrappedLines.push("");
        continue;
      }
      let remaining = rawLine;
      while (remaining.length > 0) {
        const chunk = remaining.slice(0, charsPerLine);
        wrappedLines.push(chunk);
        remaining = remaining.slice(charsPerLine);
      }
    }

    return wrappedLines;
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ background: "#0a0a0f" }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: isPanning ? "grabbing" : "grab", touchAction: "none" }}
      >
        <DotGrid />
        {renderEdges()}
        {renderNodes()}
      </svg>

      {/* Zoom controls */}
      <div className="absolute top-16 left-5 z-10 flex items-center gap-2">
        <button onClick={addIndependentNode} className="flex items-center gap-2 rounded-lg border border-[#2a2a35] bg-[#13131a] px-3 py-2 text-xs text-[#c4c4cc] hover:border-[#3B82F6]/60 hover:text-white active:scale-95 transition-all" title="Add an independent node"><Plus className="w-4 h-4" />Add node</button>
        <button onClick={() => { setConnectMode((mode) => !mode); setConnectSourceId(null); }} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs active:scale-95 transition-all ${connectMode ? "border-[#3B82F6] bg-[#3B82F6]/15 text-white" : "border-[#2a2a35] bg-[#13131a] text-[#c4c4cc] hover:border-[#3B82F6]/60 hover:text-white"}`} title="Connect two nodes"><Link2 className="w-4 h-4" />{connectMode ? (connectSourceId ? "Select target" : "Select source") : "Connect nodes"}</button>
        {connectMode && <button onClick={() => { setConnectMode(false); setConnectSourceId(null); }} className="rounded-lg border border-[#2a2a35] bg-[#13131a] p-2 text-[#8a8a95] hover:text-white" title="Cancel connection mode"><MousePointer2 className="w-4 h-4" /></button>}
      </div>
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-10">
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 bg-[#13131a] border border-[#2a2a35] rounded-lg flex items-center justify-center text-[#e4e4e7] hover:bg-[#1a1a24] hover:border-[#3a3a45] active:scale-95 transition-all"
          title="Zoom in"
        >
          <Plus className="w-5 h-5" strokeWidth={1.5} />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 bg-[#13131a] border border-[#2a2a35] rounded-lg flex items-center justify-center text-[#e4e4e7] hover:bg-[#1a1a24] hover:border-[#3a3a45] active:scale-95 transition-all"
          title="Zoom out"
        >
          <Minus className="w-5 h-5" strokeWidth={1.5} />
        </button>
        <button
          onClick={handleResetView}
          className="w-10 h-10 bg-[#13131a] border border-[#2a2a35] rounded-lg flex items-center justify-center text-[#e4e4e7] hover:bg-[#1a1a24] hover:border-[#3a3a45] active:scale-95 transition-all"
          title="Reset view"
        >
          <Home className="w-5 h-5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Action panel overlay */}
      {actionPanelTarget && (
        <ActionPanel
          x={actionPanelScreenPos.x}
          y={actionPanelScreenPos.y}
          target={actionPanelTarget}
          tree={tree}
          dispatch={dispatch}
          onClose={() => setActionPanelTarget(null)}
        />
      )}
    </div>
  );
}
