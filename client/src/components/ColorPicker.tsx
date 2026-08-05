/**
 * ColorPicker — Appears on long-press of a node
 * Shows 7 VIBGYOR colors to choose from
 * Actually mutates the node color in the tree's nodeMap
 * Design: Compact popup panel with circular color swatches
 */

import { VIBGYOR_COLORS, NodeColor, TreeMap } from "@/lib/treeData";

interface ColorPickerProps {
  x: number;
  y: number;
  nodeId: string;
  tree: TreeMap;
  onClose: () => void;
}

const colorOrder: NodeColor[] = ["violet", "indigo", "blue", "green", "yellow", "orange", "red"];

export default function ColorPicker({ x, y, nodeId, tree, onClose }: ColorPickerProps) {
  // Adjust position to keep picker within viewport
  const offsetX = x + 220 > window.innerWidth ? x - 230 : x + 20;
  const offsetY = y + 200 > window.innerHeight ? y - 210 : y + 20;

  const handleColorSelect = (color: NodeColor) => {
    // Actually update the node color in the tree data
    const node = tree.nodeMap[nodeId];
    if (node) {
      node.color = color;
    }
    onClose();
  };

  return (
    <div
      className="fixed z-50"
      style={{
        left: offsetX,
        top: offsetY,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="bg-[#13131a] border border-[#2a2a35] rounded-lg p-3 shadow-2xl shadow-black/50"
        style={{ minWidth: 200 }}
      >
        <p className="text-[#8a8a95] text-[11px] font-medium mb-2.5 font-sans uppercase tracking-widest">
          Change Color
        </p>
        <div className="flex flex-wrap gap-2.5 justify-center">
          {colorOrder.map((color) => (
            <button
              key={color}
              className="w-7 h-7 rounded-full transition-transform duration-120 hover:scale-115 active:scale-90 border-[1.5px] border-transparent hover:border-white/40"
              style={{
                backgroundColor: VIBGYOR_COLORS[color],
                boxShadow: `0 0 8px ${VIBGYOR_COLORS[color]}55`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleColorSelect(color);
              }}
              title={color}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
