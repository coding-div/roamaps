/**
 * TreeCanvas — Full-screen SVG canvas for rendering tree branches
 * Features: zoom/pan, orthogonal connecting lines, draggable viewport
 * Design: Obsidian Canvas aesthetic — dark background, dot grid, crisp lines
 */

import { useRef, useState, useCallback, useEffect, ReactNode } from "react";
import {
  TreeMap,
  TreeEdge,
  VIBGYOR_COLORS,
  NodeColor,
} from "@/lib/treeData";
import ColorPicker from "./ColorPicker";

interface TreeCanvasProps {
  tree: TreeMap;
}

const GRID_SIZE = 30;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;
const NODE_RADIUS = 4;

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

// Orthogonal path between two points
function getOrthogonalPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): string {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  if (Math.abs(x1 - x2) > Math.abs(y1 - y2)) {
    // Horizontal dominant — go horizontal first
    return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  } else {
    // Vertical dominant — go vertical first
    return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
  }
}

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export default function TreeCanvas({ tree }: TreeCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan state
  const [viewBox, setViewBox] = useState<ViewBox>({ x: -800, y: -500, w: 1600, h: 1000 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Zoom state
  const [zoom, setZoom] = useState(1);

  // Color picker state
  const [colorPickerNode, setColorPickerNode] = useState<string | null>(null);
  const [colorPickerPos, setColorPickerPos] = useState({ x: 0, y: 0 });

  // Long press detection
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressThreshold = 600; // ms

  // Zoom with scroll wheel
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * delta));

      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const ratio = newZoom / zoom;
      setViewBox((prev) => ({
        x: (mouseX / rect.width) * prev.w * ratio + prev.x - (mouseX / rect.width) * prev.w,
        y: (mouseY / rect.height) * prev.h * ratio + prev.y - (mouseY / rect.height) * prev.h,
        w: prev.w * ratio,
        h: prev.h * ratio,
      }));
      setZoom(newZoom);
    },
    [zoom]
  );

  // Pan handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as Element).closest(".tree-node")) return;
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY };
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const dx = ((e.clientX - panStart.current.x) / rect.width) * viewBox.w;
      const dy = ((e.clientY - panStart.current.y) / rect.height) * viewBox.h;
      setViewBox((prev) => ({
        ...prev,
        x: prev.x - dx,
        y: prev.y - dy,
      }));
      panStart.current = { x: e.clientX, y: e.clientY };
    },
    [isPanning, viewBox.w, viewBox.h]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Node long-press for color picker
  const handleNodeMouseDown = useCallback(
    (nodeId: string, nodeX: number, nodeY: number) => {
      longPressTimer.current = setTimeout(() => {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const scaleX = rect.width / viewBox.w;
        const scaleY = rect.height / viewBox.h;
        const screenX = (nodeX - viewBox.x) * scaleX;
        const screenY = (nodeY - viewBox.y) * scaleY;
        setColorPickerPos({ x: screenX, y: screenY });
        setColorPickerNode(nodeId);
      }, longPressThreshold);
    },
    [viewBox]
  );

  const handleNodeMouseUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Close color picker on outside click
  useEffect(() => {
    if (!colorPickerNode) return;
    const handler = () => setColorPickerNode(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [colorPickerNode]);

  // Get node color
  function getNodeColor(nodeId: string): string {
    if (nodeId === tree.root.id) return VIBGYOR_COLORS[tree.root.color as NodeColor];
    const pos = tree.nodePositions[nodeId];
    if (pos) return VIBGYOR_COLORS[pos.color as NodeColor];
    return VIBGYOR_COLORS.blue;
  }

  // Get node position
  function getNodePosition(nodeId: string): { x: number; y: number } {
    if (nodeId === tree.root.id) return { x: 0, y: 0 };
    const pos = tree.nodePositions[nodeId];
    return pos || { x: 0, y: 0 };
  }

  // Get node dimensions
  function getNodeSize(nodeId: string) {
    if (nodeId === tree.root.id) return tree.rootSize;
    return tree.childSize;
  }

  // Render edges
  function renderEdges(): ReactNode[] {
    return tree.root.children.map((edge: TreeEdge) => {
      const targetPos = getNodePosition(edge.targetId);
      const targetSize = getNodeSize(edge.targetId);
      const sourceSize = getNodeSize(tree.root.id);

      const sourceX = 0;
      const sourceY = 0;
      const targetX = targetPos.x;
      const targetY = targetPos.y;

      // Adjust endpoints to node borders
      const startX = sourceX + (sourceSize.w / 2) * Math.sign(targetX - sourceX || 1);
      const startY = sourceY + (sourceSize.h / 2) * Math.sign(targetY - sourceY || 1);
      const endX = targetX - (targetSize.w / 2) * Math.sign(targetX - sourceX || 1);
      const endY = targetY - (targetSize.h / 2) * Math.sign(targetY - sourceY || 1);

      const path = getOrthogonalPath(
        Math.abs(targetX - sourceX) > Math.abs(targetY - sourceY) ? startX : sourceX,
        Math.abs(targetY - sourceY) > Math.abs(targetX - sourceX) ? startY : sourceY,
        Math.abs(targetX - sourceX) > Math.abs(targetY - sourceY) ? endX : targetX,
        Math.abs(targetY - sourceY) > Math.abs(targetX - sourceX) ? endY : targetY
      );

      const color = getNodeColor(edge.targetId);

      return (
        <path
          key={edge.id}
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeOpacity={0.6}
          markerEnd="url(#arrowhead)"
        />
      );
    });
  }

  // Render nodes
  function renderNodes(): ReactNode[] {
    const nodes: ReactNode[] = [];

    // Root node
    const rootColor = VIBGYOR_COLORS[tree.root.color as NodeColor];
    nodes.push(
      <g
        key={tree.root.id}
        className="tree-node"
        style={{ cursor: "pointer" }}
        onMouseDown={() => handleNodeMouseDown(tree.root.id, 0, 0)}
        onMouseUp={handleNodeMouseUp}
        onTouchStart={() => handleNodeMouseDown(tree.root.id, 0, 0)}
        onTouchEnd={handleNodeMouseUp}
      >
        <rect
          x={-tree.rootSize.w / 2}
          y={-tree.rootSize.h / 2}
          width={tree.rootSize.w}
          height={tree.rootSize.h}
          rx={NODE_RADIUS}
          fill="#13131a"
          stroke={rootColor}
          strokeWidth={2}
          strokeOpacity={0.8}
        />
        <text
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#e4e4e7"
          fontSize={14}
          fontWeight={600}
          fontFamily="'Space Grotesk', sans-serif"
        >
          {tree.root.label}
        </text>
      </g>
    );

    // Child nodes
    tree.root.children.forEach((edge: TreeEdge) => {
      const pos = getNodePosition(edge.targetId);
      const size = getNodeSize(edge.targetId);
      const color = getNodeColor(edge.targetId);

      nodes.push(
        <g
          key={edge.targetId}
          className="tree-node"
          style={{ cursor: "pointer" }}
          onMouseDown={() => handleNodeMouseDown(edge.targetId, pos.x, pos.y)}
          onMouseUp={handleNodeMouseUp}
          onTouchStart={() => handleNodeMouseDown(edge.targetId, pos.x, pos.y)}
          onTouchEnd={handleNodeMouseUp}
        >
          <rect
            x={pos.x - size.w / 2}
            y={pos.y - size.h / 2}
            width={size.w}
            height={size.h}
            rx={NODE_RADIUS}
            fill="#13131a"
            stroke={color}
            strokeWidth={1.5}
            strokeOpacity={0.7}
          />
        </g>
      );
    });

    return nodes;
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
        style={{
          cursor: isPanning ? "grabbing" : "grab",
          touchAction: "none",
        }}
      >
        <DotGrid />
        {renderEdges()}
        {renderNodes()}
      </svg>

      {/* Color picker overlay */}
      {colorPickerNode && (
        <ColorPicker
          x={colorPickerPos.x}
          y={colorPickerPos.y}
          onColorChange={(_color: NodeColor) => {
            setColorPickerNode(null);
          }}
          onClose={() => setColorPickerNode(null)}
        />
      )}
    </div>
  );
}
