/**
 * TreeCanvas — Full-screen SVG canvas for rendering tree branches
 * Features: zoom/pan, orthogonal connecting lines, draggable viewport
 * Design: Obsidian Canvas aesthetic — dark background, dot grid, crisp lines
 * 
 * Multi-level support: each node can have children with orthogonal paths
 * Color picker on long-press: changes node border color
 * Hover highlights the box (not text)
 */

import { useRef, useState, useCallback, useEffect, ReactNode } from "react";
import {
  TreeMap,
  NodeData,
  VIBGYOR_COLORS,
  NodeColor,
} from "@/lib/treeData";
import ColorPicker from "./ColorPicker";

interface TreeCanvasProps {
  tree: TreeMap;
}

const GRID_SIZE = 30;
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 3;
const NODE_RADIUS = 3;
const ROOT_W = 160;
const ROOT_H = 52;
const CHILD_W = 120;
const CHILD_H = 40;

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

// Orthogonal path between two points (right-angle turns)
function getOrthogonalPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): string {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  if (Math.abs(x1 - x2) > Math.abs(y1 - y2)) {
    // Horizontal dominant
    return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  } else {
    // Vertical dominant
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

  // Pan/Zoom state
  const [viewBox, setViewBox] = useState<ViewBox>(() => {
    // Adjust initial viewbox based on tree size
    if (tree.maxDepth <= 3) {
      return { x: -400, y: -600, w: 800, h: 1200 };
    }
    return { x: -1200, y: -1400, w: 2400, h: 2800 };
  });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);

  // Color picker state
  const [colorPickerNodeId, setColorPickerNodeId] = useState<string | null>(null);
  const [colorPickerScreenPos, setColorPickerScreenPos] = useState({ x: 0, y: 0 });

  // Long press detection
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressThreshold = 500;

  // Zoom with scroll wheel — FIXED: uses correct coordinate math
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();

      // Cursor position as fraction of SVG viewport
      const fx = (e.clientX - rect.left) / rect.width;
      const fy = (e.clientY - rect.top) / rect.height;

      const zoomFactor = e.deltaY > 0 ? 1.12 : 0.89;

      setViewBox((prev) => {
        const newW = prev.w * zoomFactor;
        const newH = prev.h * zoomFactor;

        // Clamp zoom
        if (newW > 8000 || newW < 200) return prev;

        // Zoom centered on cursor
        return {
          x: prev.x + (prev.w - newW) * fx,
          y: prev.y + (prev.h - newH) * fy,
          w: newW,
          h: newH,
        };
      });
    },
    []
  );

  // Pan handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as Element).closest(".tree-node-group")) return;
      setIsPanning(true);
      hasDragged.current = false;
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

      if (Math.abs(e.clientX - panStart.current.x) > 2 || Math.abs(e.clientY - panStart.current.y) > 2) {
        hasDragged.current = true;
      }

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
  const handleNodePressStart = useCallback(
    (nodeId: string, nodeX: number, nodeY: number) => {
      hasDragged.current = false;
      longPressTimer.current = setTimeout(() => {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const scaleX = rect.width / viewBox.w;
        const scaleY = rect.height / viewBox.h;
        const screenX = (nodeX - viewBox.x) * scaleX;
        const screenY = (nodeY - viewBox.y) * scaleY;
        setColorPickerScreenPos({ x: screenX, y: screenY });
        setColorPickerNodeId(nodeId);
      }, longPressThreshold);
    },
    [viewBox]
  );

  const handleNodePressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Close color picker on outside click
  useEffect(() => {
    if (!colorPickerNodeId) return;
    const handler = () => setColorPickerNodeId(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [colorPickerNodeId]);

  // Get node dimensions
  function getNodeSize(node: NodeData): { w: number; h: number } {
    return node.id === tree.root.id ? { w: ROOT_W, h: ROOT_H } : { w: CHILD_W, h: CHILD_H };
  }

  // Collect all edges from the tree (traverse recursively)
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

  // Collect all nodes (traverse recursively)
  function getAllNodes(node: NodeData): NodeData[] {
    const nodes: NodeData[] = [node];
    for (const childRef of node.children) {
      const target = tree.nodeMap[childRef.targetId];
      if (target) {
        nodes.push(...getAllNodes(target));
      }
    }
    return nodes;
  }

  // Render edges
  function renderEdges(): ReactNode[] {
    const edges = getAllEdges(tree.root);
    return edges.map(({ source, target }, i) => {
      const sourceSize = getNodeSize(source);
      const targetSize = getNodeSize(target);

      const sourceX = source.x;
      const sourceY = source.y;
      const targetX = target.x;
      const targetY = target.y;

      // Adjust endpoints to node borders
      const dx = targetX - sourceX;
      const dy = targetY - sourceY;
      const signX = Math.sign(dx) || 1;
      const signY = Math.sign(dy) || 1;

      const startX = sourceX + (sourceSize.w / 2) * signX;
      const startY = sourceY + (sourceSize.h / 2) * signY;
      const endX = targetX - (targetSize.w / 2) * signX;
      const endY = targetY - (targetSize.h / 2) * signY;

      // Pick the dominant axis for the orthogonal path
      const isHorizontalDominant = Math.abs(dx) > Math.abs(dy);

      const path = getOrthogonalPath(
        isHorizontalDominant ? startX : sourceX,
        isHorizontalDominant ? sourceY : startY,
        isHorizontalDominant ? endX : targetX,
        isHorizontalDominant ? targetY : endY
      );

      const color = VIBGYOR_COLORS[target.color];

      return (
        <path
          key={`edge-${i}`}
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeOpacity={0.55}
          markerEnd="url(#arrowhead)"
        />
      );
    });
  }

  // Render nodes
  function renderNodes(): ReactNode[] {
    const nodes = getAllNodes(tree.root);
    return nodes.map((node) => {
      const size = getNodeSize(node);
      const color = VIBGYOR_COLORS[node.color];
      const isRoot = node.id === tree.root.id;

      return (
        <g
          key={node.id}
          className="tree-node-group"
          style={{ cursor: "pointer" }}
          onMouseDown={(e) => {
            e.stopPropagation();
            handleNodePressStart(node.id, node.x, node.y);
          }}
          onMouseUp={handleNodePressEnd}
          onTouchStart={(e) => {
            e.stopPropagation();
            handleNodePressStart(node.id, node.x, node.y);
          }}
          onTouchEnd={handleNodePressEnd}
        >
          {/* Node box — the rect gets highlighted, NOT the text */}
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
            className="transition-all duration-120"
            style={{
              filter: `drop-shadow(0 0 4px ${color}33)`,
            }}
          />
          {/* Label text */}
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
