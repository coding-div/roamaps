/**
 * ColorPicker — Appears on long-press of a node
 * Shows 7 VIBGYOR colors to choose from
 * Design: Compact popup panel with circular color swatches
 */

import { VIBGYOR_COLORS, NodeColor } from "@/lib/treeData";

interface ColorPickerProps {
  x: number;
  y: number;
  onColorChange: (color: NodeColor) => void;
  onClose: () => void;
}

const colorOrder: NodeColor[] = ["violet", "indigo", "blue", "green", "yellow", "orange", "red"];

export default function ColorPicker({ x, y, onColorChange, onClose }: ColorPickerProps) {
  // Adjust position to keep picker within viewport
  const offsetX = x + 200 > window.innerWidth ? x - 220 : x + 20;
  const offsetY = y + 200 > window.innerHeight ? y - 220 : y + 20;

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
        className="bg-[#13131a] border border-[#2a2a35] rounded-lg p-3 shadow-2xl"
        style={{ minWidth: 180 }}
      >
        <p className="text-[#8a8a95] text-xs font-medium mb-2 font-sans uppercase tracking-wider">
          Choose Color
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {colorOrder.map((color) => (
            <button
              key={color}
              className="w-8 h-8 rounded-full transition-transform hover:scale-110 active:scale-95 border-2 border-transparent hover:border-white/30"
              style={{ backgroundColor: VIBGYOR_COLORS[color] }}
              onClick={() => onColorChange(color)}
              title={color}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
