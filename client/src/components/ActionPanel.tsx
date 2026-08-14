import { useState, useRef, useEffect } from "react";
import { VIBGYOR_COLORS, NodeColor, COLOR_ORDER, TreeMap, NodeData, MAX_LABEL_LENGTH } from "@/lib/treeData";
import type { RoadmapAction } from "@/contexts/RoadmapContext";
import { labelFits } from "@/lib/collision";
import { Palette, Type, Trash2, X, Check } from "lucide-react";

type PanelTarget =
  | { type: "node"; nodeId: string }
  | { type: "arrow"; sourceId: string; targetId: string };

interface ActionPanelProps {
  x: number;
  y: number;
  target: PanelTarget;
  tree: TreeMap;
  dispatch: React.Dispatch<RoadmapAction>;
  onClose: () => void;
}

export default function ActionPanel({ x, y, target, tree, dispatch, onClose }: ActionPanelProps) {
  const [mode, setMode] = useState<"menu" | "editColor" | "editName">("menu");
  const panelRef = useRef<HTMLDivElement>(null);
  const selectedNode = target.type === "node" ? tree.nodeMap[target.nodeId] : undefined;
  const isJoiner = selectedNode?.kind === "joiner";
  const adjustedX = x + 240 > window.innerWidth ? x - 250 : x + 20;
  const adjustedY = y + 260 > window.innerHeight ? y - 270 : y + 20;

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose(); };
    const timer = setTimeout(() => window.addEventListener("click", handler), 50);
    return () => { clearTimeout(timer); window.removeEventListener("click", handler); };
  }, [onClose]);

  function changeColor(color: NodeColor) {
    if (target.type === "node") dispatch({ type: "UPDATE_NODE_COLOR", treeId: tree.id, nodeId: target.nodeId, color });
    else dispatch({ type: "UPDATE_ARROW_COLOR", treeId: tree.id, sourceId: target.sourceId, targetId: target.targetId, color });
    onClose();
  }

  function saveLabel(label: string) {
    if (target.type === "node") dispatch({ type: "UPDATE_LABEL", treeId: tree.id, nodeId: target.nodeId, label });
    onClose();
  }

  function remove() {
    if (target.type === "node") dispatch({ type: "REMOVE_NODE", treeId: tree.id, nodeId: target.nodeId });
    else dispatch({ type: "REMOVE_ARROW", treeId: tree.id, sourceId: target.sourceId, targetId: target.targetId });
    onClose();
  }

  return <div ref={panelRef} className="fixed z-50" style={{ left: adjustedX, top: adjustedY }} onClick={(e) => e.stopPropagation()}>
      <div className="bg-[#13131a] border border-[#2a2a35] rounded-lg shadow-2xl shadow-black/50 overflow-hidden" style={{ minWidth: 210 }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a35]"><p className="text-[#8a8a95] text-[11px] font-medium font-sans uppercase tracking-widest">{mode === "menu" ? `${target.type === "node" ? (isJoiner ? "Joiner" : "Node") : "Arrow"} Actions` : mode === "editColor" ? "Pick Color" : "Edit Label"}</p><button onClick={onClose} className="w-5 h-5 flex items-center justify-center text-[#8a8a95] hover:text-[#e4e4e7]"><X className="w-3.5 h-3.5" /></button></div>
      {mode === "menu" && <div className="p-1.5">
        <MenuButton icon={<Palette className="w-4 h-4" />} label="Edit Color" onClick={() => setMode("editColor")} />
        {target.type === "node" && !isJoiner && <MenuButton icon={<Type className="w-4 h-4" />} label="Edit Label" onClick={() => setMode("editName")} />}
        <MenuButton icon={<Trash2 className="w-4 h-4" />} label={`Remove ${target.type === "node" ? (isJoiner ? "Joiner" : "Node") : "Arrow"}`} danger onClick={remove} />
      </div>}
      {mode === "editColor" && <div className="p-3"><div className="flex flex-wrap gap-2.5 justify-center">{COLOR_ORDER.map((color) => <button key={color} className="w-8 h-8 rounded-full transition-transform hover:scale-110 active:scale-90 border border-transparent hover:border-white/40" style={{ backgroundColor: VIBGYOR_COLORS[color], boxShadow: `0 0 8px ${VIBGYOR_COLORS[color]}55` }} onClick={() => changeColor(color)} title={color} />)}</div><button onClick={() => setMode("menu")} className="mt-3 w-full text-[#8a8a95] text-xs text-center hover:text-[#e4e4e7]">← Back</button></div>}
      {mode === "editName" && target.type === "node" && <NameEditor node={tree.nodeMap[target.nodeId]} tree={tree} onSave={saveLabel} onCancel={() => setMode("menu")} />}
    </div>
  </div>;
}

function MenuButton({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-sans transition-colors ${danger ? "text-[#ef4444] hover:bg-[#ef4444]/10" : "text-[#c4c4cc] hover:bg-[#1e1e2a]"}`}>{icon}<span>{label}</span></button>;
}

function NameEditor({ node, tree, onSave, onCancel }: { node: NodeData | undefined; tree: TreeMap; onSave: (label: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(node?.label ?? "");
  const [blocked, setBlocked] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const remaining = MAX_LABEL_LENGTH - value.length;
  function acceptInput(nextValue: string) {
    if (!node) return;
    if (nextValue.length <= MAX_LABEL_LENGTH && labelFits(tree, { ...node, label: nextValue }, nextValue)) {
      setValue(nextValue);
      setBlocked(false);
      return;
    }

    let prefixLength = 0;
    while (prefixLength < value.length && prefixLength < nextValue.length && value[prefixLength] === nextValue[prefixLength]) prefixLength += 1;
    let oldSuffixStart = value.length;
    let nextSuffixStart = nextValue.length;
    while (oldSuffixStart > prefixLength && nextSuffixStart > prefixLength && value[oldSuffixStart - 1] === nextValue[nextSuffixStart - 1]) {
      oldSuffixStart -= 1;
      nextSuffixStart -= 1;
    }
    const inserted = nextValue.slice(prefixLength, nextSuffixStart);
    const before = value.slice(0, prefixLength);
    const after = value.slice(oldSuffixStart);
    let acceptedInserted = "";
    for (const character of inserted) {
      const candidate = before + acceptedInserted + character + after;
      if (candidate.length > MAX_LABEL_LENGTH || !labelFits(tree, { ...node, label: candidate }, candidate)) break;
      acceptedInserted += character;
    }
    const accepted = before + acceptedInserted + after;
    if (accepted !== nextValue) setBlocked(true);
    setValue(accepted);
  }

  return <div className="p-3"><div className="relative"><textarea ref={inputRef} rows={3} value={value} onChange={(e) => acceptInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSave(value); } if (e.key === "Escape") onCancel(); }} placeholder="Type label..." className="w-full resize-none bg-[#0a0a0f] border border-[#2a2a35] rounded-md px-3 py-2 pr-10 text-[#e4e4e7] text-sm font-sans outline-none focus:border-[#3B82F6]" /><span className={`absolute right-2 top-2 text-[10px] font-mono ${remaining <= 5 ? "text-[#ef4444]" : "text-[#5a5a65]"}`}>{remaining}</span></div>{blocked && <p className="mt-1 text-[11px] text-[#ef4444]" aria-live="polite">No room for more text</p>}<div className="flex gap-2 mt-3"><button onClick={() => onSave(value)} className="flex-1 flex items-center justify-center gap-1.5 bg-[#3B82F6] hover:bg-[#2563eb] text-white text-xs font-medium rounded-md py-2 active:scale-95"><Check className="w-3.5 h-3.5" />Save</button><button onClick={onCancel} className="flex-1 bg-[#1e1e2a] hover:bg-[#2a2a35] text-[#c4c4cc] text-xs rounded-md py-2 active:scale-95">Cancel</button></div></div>;
}
