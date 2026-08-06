/**
 * TreeCanvas — Full-screen SVG canvas for rendering tree branches
 * Features: pinch-to-zoom + pan, scroll-wheel zoom, visible +/- zoom buttons
 *           long-press action panel on nodes AND arrows
 *           auto-resizing boxes with 50-char limit and text wrapping
 *           independent arrow colors
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
import { Plus, Minus } from "lucide-react";

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
const CHAR_WIDTH = 7.2; // approximate width of one character
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

function getOrthogonalPath(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  if (Math.abs(x1 - x2) > Math.abs(y1 - y2)) {
    return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  }
  return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
}

/**
 * Calculate box dimensions based on label content.
 * Auto-resizes to fit text, wraps at max width, caps at max height.
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

  // Calculate how many characters fit per line
  const charsPerLine = Math.max(5, Math.floor(MAX_BOX_W / cw));

  // Split into lines based on newlines in label and word wrapping
  const rawLines = label.split("\n");
  const wrappedLines: string[] = [];

  for (const rawLine of rawLines) {
    if (rawLine.length === 0) {
      wrappedLines.push(""); // empty line still adds height
      continue;
    }
    // Break line into chunks that fit per line
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
    Math.max(isRoot ? 160 : MIN_BOX_W, longestLine * cw + 20) // +20 for padding
  );
  const h = Math.min(
    MAX_BOX_H,
    Math.max(isRoot ? 52 : MIN_BOX_H, numLines * LINE_HEIGHT + 20)
  );

  return { w, h };
}

export default function TreeCanvas({ tree }: TreeCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Force re-render key — incremented when tree data mutates
  const [renderKey, setRenderKey] = useState(0);

  const [viewBox, setViewBox] = useState<ViewBox>(() => {
    if (tree.maxDepth <= 3) {
      return { x: -500, y: -700, w: 1000, h: 1400 };
    }
    return { x: -1400, y: -1600, w: 2800, h: 3200 };
  });

  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Touch pinch-to-zoom state
  const initialPinchDistance = useRef<number | null>(null);
  const initialViewBoxOnPinch = useRef<ViewBox | null>(null);
  const pinchCenter = useRef({ x: 0, y: 0 });
  const isPinching = useRef(false);

  // Action panel state
  const [actionPanelTarget, setActionPanelTarget] = useState<PanelTarget | null>(null);
  const [actionPanelScreenPos, setActionPanelScreenPos] = useState({ x: 0, y: 0 });

  // Long press detection
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

  // ─── SCROLL WHEEL ZOOM ───
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
        const dist = Math.hypot(
          t2.clientX - t1.clientX,
          t2.clientY - t1.clientY
        );
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
        // Check if on a node or arrow
        if (
          el &&
          ((el as Element).closest("[data-node-id]") ||
            (el as Element).closest("[data-arrow-id]"))
        ) {
          return; // let node/arrow handler deal with it
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

      if (
        e.touches.length === 2 &&
        isPinching.current &&
        initialPinchDistance.current !== null
      ) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(
          t2.clientX - t1.clientX,
          t2.clientY - t1.clientY
        );
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
        const dx =
          ((touch.clientX - panStart.current.x) / rect.width) * viewBox.w;
        const dy =
          ((touch.clientY - panStart.current.y) / rect.height) * viewBox.h;
        setViewBox((prev) => ({
          ...prev,
          x: prev.x - dx,
          y: prev.y - dy,
        }));
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
      const dx =
        ((e.clientX - panStart.current.x) / rect.width) * viewBox.w;
      const dy =
        ((e.clientY - panStart.current.y) / rect.height) * viewBox.h;
      setViewBox((prev) => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
      panStart.current = { x: e.clientX, y: e.clientY };
    },
    [isPanning, viewBox.w, viewBox.h]
  );

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  // Prevent default touch gestures
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

  function forceRerender() {
    setRenderKey((k) => k + 1);
  }

  // ─── RENDER ───
  const edges = getEdgesFromTree(tree);
  const nodes = getNodesFromTree(tree);

  // Key to force re-render on data mutation
  const renderId = `${tree.id}-${renderKey}`;

  function renderEdges(): ReactNode[] {
    return edges.map(({ source, target, arrowColor, sourceChildIndex }, i) => {
      const ss = getBoxDimensions(source.label, source.id === tree.root.id);
      const ts = getBoxDimensions(target.label, target.id === tree.root.id);
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const sx = Math.sign(dx) || 1;
      const sy = Math.sign(dy) || 1;
      const startX = source.x + (ss.w / 2) * sx;
      const startY = source.y + (ss.h / 2) * sy;
      const endX = target.x - (ts.w / 2) * sx;
      const endY = target.y - (ts.h / 2) * sy;
      const isH = Math.abs(dx) > Math.abs(dy);

      // Midpoint of the path for long-press target
      const midX = isH ? (startX + endX) / 2 : startX;
      const midY = isH ? startY : (startY + endY) / 2;

      const path = getOrthogonalPath(
        isH ? startX : source.x,
        isH ? source.y : startY,
        isH ? endX : target.x,
        isH ? target.y : endY
      );

      return (
        <g key={`edge-${renderId}-${i}`} data-arrow-id={`edge-${i}`}>
          {/* Invisible wider hit area for easier touching */}
          <path
            d={path}
            fill="none"
            stroke="transparent"
            strokeWidth={16}
            style={{ cursor: "pointer" }}
            onTouchStart={(e) => {
              e.stopPropagation();
              const touch = e.touches[0];
              startLongPress(
                { type: "arrow", edgeIndex: i },
                { x: midX, y: midY },
                touch.clientX,
                touch.clientY
              );
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
              startLongPress(
                { type: "arrow", edgeIndex: i },
                { x: midX, y: midY },
                e.clientX,
                e.clientY
              );
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
        </g>
      );
    });
  }

  function renderNodes(): ReactNode[] {
    return nodes.map((node) => {
      const size = getBoxDimensions(node.label, node.id === tree.root.id);
      const color = VIBGYOR_COLORS[node.color];
      const isRoot = node.id === tree.root.id;

      // Build text with line wrapping for SVG
      const textLines = buildTextLines(node.label, size.w, isRoot);

      return (
        <g
          key={`node-${renderId}-${node.id}`}
          className="tree-node-group"
          data-node-id={node.id}
          style={{ cursor: "pointer" }}
          onTouchStart={(e) => {
            e.stopPropagation();
            const touch = e.touches[0];
            startLongPress(
              { type: "node", nodeId: node.id },
              node,
              touch.clientX,
              touch.clientY
            );
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
            startLongPress(
              { type: "node", nodeId: node.id },
              node,
              e.clientX,
              e.clientY
            );
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
          {/* Render text lines */}
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
        style={{
          cursor: isPanning ? "grabbing" : "grab",
          touchAction: "none",
        }}
      >
        <DotGrid />
        {renderEdges()}
        {renderNodes()}
      </svg>

      {/* Zoom controls */}
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
      </div>

      {/* Action panel overlay */}
      {actionPanelTarget && (
        <ActionPanel
          x={actionPanelScreenPos.x}
          y={actionPanelScreenPos.y}
          target={actionPanelTarget}
          tree={tree}
          onClose={() => setActionPanelTarget(null)}
          onTreeChange={forceRerender}
        />
      )}
    </div>
  );
}
