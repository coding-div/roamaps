/**
 * TreeCanvas — Full-screen SVG canvas for rendering tree branches
 * Features: pinch-to-zoom + pan on touch, scroll-wheel zoom on desktop,
 *           orthogonal connecting lines, visible +/- zoom buttons
 * Design: Obsidian Canvas aesthetic — dark background, dot grid, crisp lines
 */

import { useRef, useState, useCallback, useEffect, ReactNode } from "react";
import {
  TreeMap,
  NodeData,
  VIBGYOR_COLORS,
  NodeColor,
} from "@/lib/treeData";
import ColorPicker from "./ColorPicker";
import { Plus, Minus } from "lucide-react";

interface TreeCanvasProps {
  tree: TreeMap;
}

const GRID_SIZE = 30;
const NODE_RADIUS = 3;
const ROOT_W = 160;
const ROOT_H = 52;
const CHILD_W = 120;
const CHILD_H = 40;

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Dot grid pattern background
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

export default function TreeCanvas({ tree }: TreeCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [viewBox, setViewBox] = useState<ViewBox>(() => {
    if (tree.maxDepth <= 3) {
      return { x: -400, y: -600, w: 800, h: 1200 };
    }
    return { x: -1200, y: -1400, w: 2400, h: 2800 };
  });

  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Touch pinch-to-zoom state
  const initialPinchDistance = useRef<number | null>(null);
  const initialViewBox = useRef<ViewBox | null>(null);
  const pinchCenter = useRef({ x: 0, y: 0 });

  // Color picker state
  const [colorPickerNodeId, setColorPickerNodeId] = useState<string | null>(null);
  const [colorPickerScreenPos, setColorPickerScreenPos] = useState({ x: 0, y: 0 });

  // Long press detection
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressThreshold = 500;

  // ---------- ZOOM ----------
  const zoomByFactor = useCallback((factor: number, centerFracX?: number, centerFracY?: number) => {
    setViewBox((prev) => {
      const newW = prev.w * factor;
      const newH = prev.h * factor;
      // Clamp: min viewport 150, max 8000
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

  // ---------- SCROLL WHEEL ZOOM (desktop) ----------
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

  // ---------- TOUCH: PINCH-TO-ZOOM + PAN ----------
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();

    if (e.touches.length === 2) {
      // Pinch start
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      initialPinchDistance.current = dist;
      initialViewBox.current = { ...viewBox };
      // Center of pinch in SVG fractions
      pinchCenter.current = {
        x: ((t1.clientX + t2.clientX) / 2 - rect.left) / rect.width,
        y: ((t1.clientY + t2.clientY) / 2 - rect.top) / rect.height,
      };
      setIsPanning(false);
    } else if (e.touches.length === 1) {
      // Single touch — check if on a node
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (target && (target as Element).closest(".tree-node-group")) {
        // Node touch — handle long press
        const nodeId = (target as Element).closest(".tree-node-group")?.getAttribute("data-node-id");
        if (nodeId) {
          const node = tree.nodeMap[nodeId];
          if (node) {
            longPressTimer.current = setTimeout(() => {
              const scaleX = rect.width / viewBox.w;
              const scaleY = rect.height / viewBox.h;
              const screenX = (node.x - viewBox.x) * scaleX;
              const screenY = (node.y - viewBox.y) * scaleY;
              setColorPickerScreenPos({ x: screenX, y: screenY });
              setColorPickerNodeId(nodeId);
            }, longPressThreshold);
          }
        }
      } else {
        // Background touch — start pan
        setIsPanning(true);
        panStart.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  }, [tree, viewBox]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();

    // Clear long press timer on any movement
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (e.touches.length === 2 && initialPinchDistance.current !== null) {
      // Pinch zoom
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const scale = dist / initialPinchDistance.current;
      const ib = initialViewBox.current!;

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
      // Pan
      const touch = e.touches[0];
      const dx = ((touch.clientX - panStart.current.x) / rect.width) * viewBox.w;
      const dy = ((touch.clientY - panStart.current.y) / rect.height) * viewBox.h;
      setViewBox((prev) => ({
        ...prev,
        x: prev.x - dx,
        y: prev.y - dy,
      }));
      panStart.current = { x: touch.clientX, y: touch.clientY };
    }
  }, [isPanning, viewBox.w, viewBox.h]);

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
    initialPinchDistance.current = null;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // ---------- MOUSE PAN ----------
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as Element).closest(".tree-node-group")) return;
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

  // Color picker close
  useEffect(() => {
    if (!colorPickerNodeId) return;
    const handler = () => setColorPickerNodeId(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [colorPickerNodeId]);

  // ---------- RENDER HELPERS ----------
  function getNodeSize(node: NodeData) {
    return node.id === tree.root.id ? { w: ROOT_W, h: ROOT_H } : { w: CHILD_W, h: CHILD_H };
  }

  function getAllEdges(node: NodeData): Array<{ source: NodeData; target: NodeData }> {
    const edges: Array<{ source: NodeData; target: NodeData }> = [];
    for (const childRef of node.children) {
      const target = tree.nodeMap[childRef.targetId];
      if (target) {
        edges.push({ source: node, target });
        edges.push(...getAllEdges(target));
      }
    }
    return edges;
  }

  function getAllNodes(node: NodeData): NodeData[] {
    const nodes: NodeData[] = [node];
    for (const childRef of node.children) {
      const target = tree.nodeMap[childRef.targetId];
      if (target) nodes.push(...getAllNodes(target));
    }
    return nodes;
  }

  function renderEdges(): ReactNode[] {
    return getAllEdges(tree.root).map(({ source, target }, i) => {
      const ss = getNodeSize(source);
      const ts = getNodeSize(target);
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const sx = Math.sign(dx) || 1;
      const sy = Math.sign(dy) || 1;
      const startX = source.x + (ss.w / 2) * sx;
      const startY = source.y + (ss.h / 2) * sy;
      const endX = target.x - (ts.w / 2) * sx;
      const endY = target.y - (ts.h / 2) * sy;
      const isH = Math.abs(dx) > Math.abs(dy);
      const path = getOrthogonalPath(
        isH ? startX : source.x,
        isH ? source.y : startY,
        isH ? endX : target.x,
        isH ? target.y : endY
      );
      return (
        <path
          key={`edge-${i}`}
          d={path}
          fill="none"
          stroke={VIBGYOR_COLORS[target.color]}
          strokeWidth={2}
          strokeOpacity={0.55}
          markerEnd="url(#arrowhead)"
        />
      );
    });
  }

  function renderNodes(): ReactNode[] {
    return getAllNodes(tree.root).map((node) => {
      const size = getNodeSize(node);
      const color = VIBGYOR_COLORS[node.color];
      const isRoot = node.id === tree.root.id;
      return (
        <g
          key={node.id}
          className="tree-node-group"
          data-node-id={node.id}
          style={{ cursor: "pointer" }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
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
          {node.label && (
            <text
              x={node.x}
              y={node.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#e4e4e7"
              fontSize={isRoot ? 14 : 12}
              fontWeight={isRoot ? 600 : 500}
              fontFamily="'Space Grotesk', sans-serif"
              pointerEvents="none"
            >
              {node.label}
            </text>
          )}
        </g>
      );
    });
  }

  // Prevent default touch gestures on the container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    el.addEventListener("touchmove", prevent, { passive: false });
    return () => el.removeEventListener("touchmove", prevent);
  }, []);

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

      {/* Zoom controls — bottom right */}
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

      {/* Color picker overlay */}
      {colorPickerNodeId && (
        <ColorPicker
          x={colorPickerScreenPos.x}
          y={colorPickerScreenPos.y}
          nodeId={colorPickerNodeId}
          tree={tree}
          onClose={() => setColorPickerNodeId(null)}
        />
      )}
    </div>
  );
}
