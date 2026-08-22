/*
 * Obsidian Cartography action menu: compact graphite controls, cobalt focus,
 * and no hidden joiner objects. This panel is reserved for long-press actions.
 */

import { useEffect, useRef, useState } from "react";
import { VIBGYOR_COLORS, type NodeColor, COLOR_ORDER, type TreeMap, type NodeData } from "@/lib/treeData";
import type { RoadmapAction } from "@/contexts/RoadmapContext";
import { Palette, Type, Trash2, X, Check, Maximize2, AlertTriangle, Copy, MapPinned } from "lucide-react";
import { toast } from "sonner";

type PanelTarget =
  | { type: "node"; nodeId: string }
  | { type: "arrow"; sourceId: string; targetId: string };

interface ActionPanelProps {
  x: number;
  y: number;
  target: PanelTarget;
  tree: TreeMap;
  dispatch: React.Dispatch<RoadmapAction>;
  onTeleport: (nodeId: string) => void;
  onCopyArrow: (sourceId: string, targetId: string, copyMode: "head" | "tail") => void;
  onClose: () => void;
}

export default function ActionPanel({ x, y, target, tree, dispatch, onTeleport, onCopyArrow, onClose }: ActionPanelProps) {
  const [mode, setMode] = useState<"menu" | "editColor" | "editName" | "copyDirection" | "confirmRemove">("menu");
  const panelRef = useRef<HTMLDivElement>(null);
  const selectedNode = target.type === "node" ? tree.nodeMap[target.nodeId] : undefined;
  const adjustedX = x + 240 > window.innerWidth ? Math.max(12, x - 250) : x + 20;
  const adjustedY = y + 300 > window.innerHeight ? Math.max(12, y - 310) : y + 20;

  useEffect(() => {
    const handler = (event: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) onClose();
    };
    const timer = setTimeout(() => window.addEventListener("pointerdown", handler), 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", handler);
    };
  }, [onClose]);

  function changeColor(color: NodeColor) {
    if (target.type === "node") dispatch({ type: "UPDATE_NODE_COLOR", treeId: tree.id, nodeId: target.nodeId, color });
    else dispatch({ type: "UPDATE_ARROW_COLOR", treeId: tree.id, sourceId: target.sourceId, targetId: target.targetId, color });
    onClose();
  }

  function saveLabel(label: string) {
    if (target.type !== "node") return;
    if (label.trim() === "") return;
    dispatch({ type: "UPDATE_LABEL", treeId: tree.id, nodeId: target.nodeId, label });
    onClose();
  }

  function remove() {
    if (target.type === "node") {
      if ((selectedNode?.popupContent ?? "").trim()) {
        setMode("confirmRemove");
        return;
      }
      dispatch({ type: "REMOVE_NODE", treeId: tree.id, nodeId: target.nodeId });
    } else {
      dispatch({ type: "REMOVE_ARROW", treeId: tree.id, sourceId: target.sourceId, targetId: target.targetId });
    }
    onClose();
  }

  function confirmRemove() {
    if (target.type === "node") dispatch({ type: "REMOVE_NODE", treeId: tree.id, nodeId: target.nodeId });
    onClose();
  }

  return (
    <div ref={panelRef} className="fixed z-50" style={{ left: adjustedX, top: adjustedY }} onClick={(event) => event.stopPropagation()}>
      <div className="overflow-hidden rounded-lg border border-[#2a2a35] bg-[#13131a] shadow-2xl shadow-black/50" style={{ minWidth: 220 }}>
        <div className="flex items-center justify-between border-b border-[#2a2a35] px-3 py-2">
          <p className="font-sans text-[11px] font-medium uppercase tracking-widest text-[#8a8a95]">
            {mode === "menu" ? `${target.type === "node" ? "Node" : "Arrow"} actions` : mode === "editColor" ? "Pick color" : mode === "editName" ? "Edit label" : mode === "copyDirection" ? "Copy arrow" : "Confirm removal"}
          </p>
          <button onClick={onClose} className="flex h-5 w-5 items-center justify-center text-[#8a8a95] hover:text-[#e4e4e7]" aria-label="Close actions"><X className="h-3.5 w-3.5" /></button>
        </div>

        {mode === "menu" && <div className="p-1.5">
          <MenuButton icon={<Palette className="h-4 w-4" />} label="Recolor" onClick={() => setMode("editColor")} />
          {target.type === "node" && <MenuButton icon={<Type className="h-4 w-4" />} label="Edit Label" onClick={() => setMode("editName")} />}
          {target.type === "node" && <MenuButton icon={<Maximize2 className="h-4 w-4" />} label="Resize" onClick={() => toast.message("Resize coming soon")} />}
          {target.type === "node" && <MenuButton icon={<MapPinned className="h-4 w-4" />} label="Teleport" onClick={() => { onTeleport(target.nodeId); onClose(); }} />}
          {target.type === "arrow" && <MenuButton icon={<Copy className="h-4 w-4" />} label="Copy Arrow" onClick={() => setMode("copyDirection")} />}
          <MenuButton icon={<Trash2 className="h-4 w-4" />} label={`Remove ${target.type === "node" ? "Node" : "Arrow"}`} danger onClick={remove} />
        </div>}

        {mode === "editColor" && <div className="p-3"><div className="flex flex-wrap justify-center gap-2.5">{COLOR_ORDER.map((color) => <button key={color} className="h-8 w-8 rounded-full border border-transparent transition-transform hover:scale-110 hover:border-white/40 active:scale-90" style={{ backgroundColor: VIBGYOR_COLORS[color], boxShadow: `0 0 8px ${VIBGYOR_COLORS[color]}55` }} onClick={() => changeColor(color)} title={color} aria-label={`Use ${color}`} />)}</div><button onClick={() => setMode("menu")} className="mt-3 w-full text-center text-xs text-[#8a8a95] hover:text-[#e4e4e7]">← Back</button></div>}
        {mode === "editName" && target.type === "node" && <NameEditor node={selectedNode} onSave={saveLabel} onCancel={() => setMode("menu")} />}
        {mode === "copyDirection" && target.type === "arrow" && <div className="space-y-2 p-3">
          <p className="text-xs leading-5 text-[#c4c4cc]">Choose the shared endpoint, then tap the new node.</p>
          <button onClick={() => onCopyArrow(target.sourceId, target.targetId, "head")} className="w-full rounded-md border border-[#3459b8] bg-[#1e3a8a]/20 px-3 py-2 text-left text-xs text-[#dbeafe] transition-colors hover:border-[#5d87ff] hover:bg-[#2a4ca0]/25"><strong className="block font-medium">Head</strong><span className="text-[#9fb4e8]">Keep the tail; choose a new destination.</span></button>
          <button onClick={() => onCopyArrow(target.sourceId, target.targetId, "tail")} className="w-full rounded-md border border-[#2a2a35] bg-[#1e1e2a] px-3 py-2 text-left text-xs text-[#e4e4e7] transition-colors hover:border-[#3a3a45] hover:bg-[#242432]"><strong className="block font-medium">Tail</strong><span className="text-[#9ba3b7]">Keep the head; choose a new source.</span></button>
          <button onClick={() => setMode("menu")} className="w-full pt-1 text-center text-xs text-[#8a8a95] hover:text-[#e4e4e7]">← Back</button>
        </div>}
        {mode === "confirmRemove" && <div className="p-3">
          <div className="flex gap-2 text-xs leading-5 text-[#c4c4cc]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#f97316]" /><p>This node contains popup text. Removing it will remove the text too.</p></div>
          <div className="mt-3 flex gap-2"><button onClick={confirmRemove} className="flex-1 rounded-md bg-[#ef4444] py-2 text-xs font-medium text-white hover:bg-[#dc2626] active:scale-95">Remove</button><button onClick={() => setMode("menu")} className="flex-1 rounded-md bg-[#1e1e2a] py-2 text-xs text-[#c4c4cc] hover:bg-[#2a2a35] active:scale-95">Cancel</button></div>
        </div>}
      </div>
    </div>
  );
}

function MenuButton({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-sans transition-colors ${danger ? "text-[#ef4444] hover:bg-[#ef4444]/10" : "text-[#c4c4cc] hover:bg-[#1e1e2a]"}`}>{icon}<span>{label}</span></button>;
}

function NameEditor({ node, onSave, onCancel }: { node: NodeData | undefined; onSave: (label: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(node?.label ?? "");
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  function save() {
    if (value.trim() === "") {
      setError(true);
      return;
    }
    onSave(value);
  }
  return <div className="p-3"><textarea ref={inputRef} rows={3} value={value} onChange={(event) => { setValue(event.target.value); setError(false); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); save(); } if (event.key === "Escape") onCancel(); }} placeholder="Type a short heading..." className="w-full resize-none rounded-md border border-[#2a2a35] bg-[#0a0a0f] px-3 py-2 text-sm text-[#e4e4e7] outline-none focus:border-[#3B82F6]" />{error && <p className="mt-1 text-[11px] text-[#ef4444]" aria-live="polite">Enter at least one character before saving.</p>}<div className="mt-3 flex gap-2"><button onClick={save} className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#3B82F6] py-2 text-xs font-medium text-white hover:bg-[#2563eb] active:scale-95"><Check className="h-3.5 w-3.5" />Save</button><button onClick={onCancel} className="flex-1 rounded-md bg-[#1e1e2a] py-2 text-xs text-[#c4c4cc] hover:bg-[#2a2a35] active:scale-95">Cancel</button></div></div>;
}
