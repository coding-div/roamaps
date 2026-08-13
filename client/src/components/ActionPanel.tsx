/**
 * ActionPanel — Unified popup panel for nodes and arrows
 * Appears on long-press of a node or arrow.
 * Options: Edit Color, Edit Name (nodes only), Remove
 * Design: Compact dark popup matching Obsidian Canvas aesthetic
 */

import { useState, useRef, useEffect } from "react";
import {
  VIBGYOR_COLORS,
  NodeColor,
  COLOR_ORDER,
  TreeMap,
  NodeData,
  MAX_LABEL_LENGTH,
  getAllEdges,
} from "@/lib/treeData";
import { Palette, Type, Trash2, X, Check } from "lucide-react";

type PanelTarget =
  | { type: "node"; nodeId: string }
  | { type: "arrow"; edgeIndex: number };

interface ActionPanelProps {
  x: number;
  y: number;
  target: PanelTarget;
  tree: TreeMap;
  onClose: () => void;
  onTreeChange: () => void; // callback to force re-render after mutation
}

export default function ActionPanel({
  x,
  y,
  target,
  tree,
  onClose,
  onTreeChange,
}: ActionPanelProps) {
  const [mode, setMode] = useState<"menu" | "editColor" | "editName">("menu");
  const panelRef = useRef<HTMLDivElement>(null);

  // Adjust position to keep panel within viewport
  const adjustedX = x + 240 > window.innerWidth ? x - 250 : x + 20;
  const adjustedY = y + 260 > window.innerHeight ? y - 270 : y + 20;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid immediate close from the long-press release
    const timer = setTimeout(() => {
      window.addEventListener("click", handler);
    }, 50);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", handler);
    };
  }, [onClose]);

  // ─── NODE ACTIONS ───
  function handleNodeColorChange(color: NodeColor) {
    const node = tree.nodeMap[target.type === "node" ? target.nodeId : ""];
    if (node) {
      node.color = color;
      onTreeChange();
    }
    onClose();
  }

  function handleNodeNameChange(newLabel: string) {
    const node = tree.nodeMap[target.type === "node" ? target.nodeId : ""];
    if (node) {
      node.label = newLabel.slice(0, MAX_LABEL_LENGTH);
      onTreeChange();
    }
    onClose();
  }

  function handleRemoveNode() {
    if (target.type !== "node") return;
    const nodeId = target.nodeId;

    // Don't allow removing the root node
    if (nodeId === tree.root.id) return;

    // Find the parent node that has this node as a child
    let parent: NodeData | null = null;
    let childIndex = -1;
    for (const node of Object.values(tree.nodeMap)) {
      const idx = node.children.findIndex((c) => c.targetId === nodeId);
      if (idx !== -1) {
        parent = node;
        childIndex = idx;
        break;
      }
    }

    if (!parent) return; // No parent found (orphan or root)

    // Get the node being removed
    const nodeToRemove = tree.nodeMap[nodeId];
    if (!nodeToRemove) return;

    // Reconnect: parent's children should now include the removed node's children
    // with the same arrow colors from parent to each grandchild
    const grandchildren = nodeToRemove.children;
    
    // Remove this node from parent's children list
    parent.children.splice(childIndex, 1);

    // Add all grandchildren to parent with their original arrow colors
    for (const gc of grandchildren) {
      parent.children.push({ targetId: gc.targetId, color: gc.color });
    }

    // Remove the node from the nodeMap entirely
    delete tree.nodeMap[nodeId];

    onTreeChange();
    onClose();
  }

  // ─── ARROW ACTIONS ───
  function handleArrowColorChange(color: NodeColor) {
    if (target.type !== "arrow") return;
    const edges = getAllEdges(tree);
    const edge = edges[target.edgeIndex];
    if (edge) {
      edge.source.children[edge.sourceChildIndex].color = color;
      onTreeChange();
    }
    onClose();
  }

  function handleRemoveArrow() {
    if (target.type !== "arrow") return;
    const edges = getAllEdges(tree);
    const edge = edges[target.edgeIndex];
    if (edge) {
      // Remove the child reference from parent — target node becomes independent
      edge.source.children.splice(edge.sourceChildIndex, 1);
      onTreeChange();
    }
    onClose();
  }

  // ─── RENDER ───
  return (
    <div
      ref={panelRef}
      className="fixed z-50"
      style={{ left: adjustedX, top: adjustedY }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="bg-[#13131a] border border-[#2a2a35] rounded-lg shadow-2xl shadow-black/50 overflow-hidden"
        style={{ minWidth: 210 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a35]">
          <p className="text-[#8a8a95] text-[11px] font-medium font-sans uppercase tracking-widest">
            {mode === "menu"
              ? target.type === "node"
                ? "Node Actions"
                : "Arrow Actions"
              : mode === "editColor"
              ? "Pick Color"
              : "Edit Label"}
          </p>
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center text-[#8a8a95] hover:text-[#e4e4e7] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {mode === "menu" && (
          <div className="p-1.5">
            {target.type === "node" && (
              <>
                <MenuButton
                  icon={<Palette className="w-4 h-4" />}
                  label="Edit Color"
                  onClick={() => setMode("editColor")}
                />
                <MenuButton
                  icon={<Type className="w-4 h-4" />}
                  label="Edit Label"
                  onClick={() => setMode("editName")}
                />
              </>
            )}
            {target.type === "arrow" && (
              <MenuButton
                icon={<Palette className="w-4 h-4" />}
                label="Edit Color"
                onClick={() => setMode("editColor")}
              />
            )}
            <MenuButton
              icon={<Trash2 className="w-4 h-4" />}
              label={`Remove ${target.type === "node" ? "Node" : "Arrow"}`}
              danger
              onClick={
                target.type === "node" ? handleRemoveNode : handleRemoveArrow
              }
            />
          </div>
        )}

        {mode === "editColor" && (
          <div className="p-3">
            <div className="flex flex-wrap gap-2.5 justify-center">
              {COLOR_ORDER.map((color) => (
                <button
                  key={color}
                  className="w-8 h-8 rounded-full transition-transform duration-120 hover:scale-115 active:scale-90 border-[1.5px] border-transparent hover:border-white/40"
                  style={{
                    backgroundColor: VIBGYOR_COLORS[color],
                    boxShadow: `0 0 8px ${VIBGYOR_COLORS[color]}55`,
                  }}
                  onClick={() => {
                    if (target.type === "node") handleNodeColorChange(color);
                    else handleArrowColorChange(color);
                  }}
                  title={color}
                />
              ))}
            </div>
            <button
              onClick={() => setMode("menu")}
              className="mt-3 w-full text-[#8a8a95] text-xs text-center hover:text-[#e4e4e7] transition-colors font-sans"
            >
              ← Back
            </button>
          </div>
        )}

        {mode === "editName" && target.type === "node" && (
          <NameEditor
            node={tree.nodeMap[target.nodeId]}
            onSave={handleNodeNameChange}
            onCancel={() => setMode("menu")}
          />
        )}
      </div>
    </div>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-sans transition-colors ${
        danger
          ? "text-[#ef4444] hover:bg-[#ef4444]/10"
          : "text-[#c4c4cc] hover:bg-[#1e1e2a]"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function NameEditor({
  node,
  onSave,
  onCancel,
}: {
  node: NodeData | undefined;
  onSave: (label: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(node?.label ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const remaining = MAX_LABEL_LENGTH - value.length;

  return (
    <div className="p-3">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX_LABEL_LENGTH))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSave(value);
            }
            if (e.key === "Escape") onCancel();
          }}
          placeholder="Type label..."
          className="w-full bg-[#0a0a0f] border border-[#2a2a35] rounded-md px-3 py-2 text-[#e4e4e7] text-sm font-sans outline-none focus:border-[#3B82F6] transition-colors"
        />
        <span
          className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono ${
            remaining <= 5 ? "text-[#ef4444]" : "text-[#5a5a65]"
          }`}
        >
          {remaining}
        </span>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onSave(value)}
          className="flex-1 flex items-center justify-center gap-1.5 bg-[#3B82F6] hover:bg-[#2563eb] text-white text-xs font-medium font-sans rounded-md py-2 transition-colors active:scale-95"
        >
          <Check className="w-3.5 h-3.5" />
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 flex items-center justify-center gap-1.5 bg-[#1e1e2a] hover:bg-[#2a2a35] text-[#c4c4cc] text-xs font-medium font-sans rounded-md py-2 transition-colors active:scale-95"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
