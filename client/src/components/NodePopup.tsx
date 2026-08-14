/*
 * Obsidian Cartography popup: a centered dark document surface. The short
 * map heading identifies the node; the body is unlimited plain text and stays
 * outside the main roadmap Undo/Redo history. When editing is active, closing
 * always pauses for the explicit Save changes / Discard changes decision.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FileText, Save, X } from "lucide-react";
import type { NodeData } from "@/lib/treeData";
import type { RoadmapAction } from "@/contexts/RoadmapContext";

interface NodePopupProps {
  node: NodeData;
  treeId: string;
  dispatch: React.Dispatch<RoadmapAction>;
  onClose: () => void;
  switchTarget: NodeData | null;
  onSwitchTargetHandled: () => void;
  onSwitchTo: (nodeId: string) => void;
}

type Decision = "close" | "switch" | null;

export default function NodePopup({ node, treeId, dispatch, onClose, switchTarget, onSwitchTargetHandled, onSwitchTo }: NodePopupProps) {
  const savedContent = node.popupContent ?? "";
  const [draft, setDraft] = useState(savedContent);
  const [editing, setEditing] = useState(false);
  const [decision, setDecision] = useState<Decision>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dirty = editing && draft !== savedContent;
  const heading = node.label.trim() || "Untitled node";

  useEffect(() => {
    setDraft(savedContent);
    setEditing(false);
    setDecision(null);
  }, [node.id]);

  useEffect(() => {
    if (!switchTarget || switchTarget.id === node.id) return;
    if (dirty) setDecision("switch");
    else {
      onSwitchTo(switchTarget.id);
      onSwitchTargetHandled();
    }
  }, [switchTarget, node.id, dirty, onSwitchTargetHandled, onSwitchTo]);

  useLayoutEffect(() => {
    if (!editing || !textareaRef.current) return;
    const area = textareaRef.current;
    area.style.height = "auto";
    area.style.height = `${Math.min(area.scrollHeight, Math.max(320, window.innerHeight * 0.54))}px`;
  }, [draft, editing]);

  function saveChanges() {
    if (draft !== savedContent) dispatch({ type: "UPDATE_POPUP_CONTENT", treeId, nodeId: node.id, content: draft });
    setEditing(false);
    setDecision(null);
  }

  function discardChanges() {
    setDraft(savedContent);
    setEditing(false);
    setDecision(null);
  }

  function closeRequested() {
    if (editing) setDecision("close");
    else onClose();
  }

  function chooseSave() {
    const destination = decision;
    saveChanges();
    if (destination === "close") onClose();
    if (destination === "switch" && switchTarget) {
      onSwitchTo(switchTarget.id);
      onSwitchTargetHandled();
    }
  }

  function chooseDiscard() {
    const destination = decision;
    discardChanges();
    if (destination === "close") onClose();
    if (destination === "switch" && switchTarget) {
      onSwitchTo(switchTarget.id);
      onSwitchTargetHandled();
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 px-4 py-6" role="dialog" aria-modal="true" aria-label={`${heading} popup`}>
      <div className="relative flex max-h-[calc(100vh-3rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#30303d] border-l-2 border-l-[#4c7dff]/70 bg-[#111118] shadow-[0_24px_90px_rgba(0,0,0,0.6)]" onPointerDown={(event) => event.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-[#2a2a35] px-5 py-4">
          <div className="min-w-0 pr-4"><div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#4c7dff] shadow-[0_0_8px_rgba(76,125,255,0.75)]" /><p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#77809a]">Node document / {node.id.slice(-4)}</p></div><h2 className="mt-1 truncate font-sans text-lg font-semibold text-[#f2f4fa]">{heading}</h2></div>
          <button onClick={closeRequested} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#2a2a35] text-[#a7a7b3] transition-colors hover:border-[#4c7dff]/70 hover:text-white active:scale-95" aria-label="Close popup"><X className="h-4 w-4" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {editing ? <textarea ref={textareaRef} autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write your notes here..." className="min-h-[320px] w-full resize-none overflow-y-auto rounded-lg border border-[#30303d] bg-[#0a0a0f] px-4 py-4 font-sans text-[15px] leading-7 text-[#e4e4e7] outline-none placeholder:text-[#555564] focus:border-[#4c7dff]" aria-label="Node document text" /> : savedContent ? <p className="whitespace-pre-wrap break-words font-sans text-[15px] leading-7 text-[#d5d7df]">{savedContent}</p> : <div className="flex min-h-[300px] flex-col items-center justify-center text-center"><FileText className="h-8 w-8 text-[#4c7dff]/65" strokeWidth={1.4} /><p className="mt-3 font-sans text-sm text-[#7f8494]">No notes yet</p><p className="mt-1 max-w-xs font-mono text-[10px] uppercase tracking-[0.16em] text-[#4b4d58]">This document belongs to {heading}</p></div>}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#2a2a35] px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#545866]">{editing ? "Draft session / local only" : "Plain text document"}</p>
          {editing ? <button onClick={saveChanges} className="flex items-center gap-1.5 rounded-lg bg-[#4c7dff] px-3 py-2 text-xs font-medium text-white hover:bg-[#3c6bea] active:scale-95"><Save className="h-3.5 w-3.5" />Save</button> : <button onClick={() => { setDraft(savedContent); setEditing(true); }} className="flex items-center gap-1.5 rounded-lg bg-[#4c7dff] px-3 py-2 text-xs font-medium text-white hover:bg-[#3c6bea] active:scale-95"><FileText className="h-3.5 w-3.5" />Edit Text</button>}
        </div>

        {decision && <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0a0f]/92 p-6"><div className="w-full max-w-sm rounded-xl border border-[#3a3a49] bg-[#171720] p-5 shadow-2xl"><p className="font-sans text-base font-semibold text-white">Save your changes?</p><p className="mt-2 text-sm leading-6 text-[#a7a7b3]">You are editing this popup. Choose Save changes or Discard changes before continuing.</p><div className="mt-5 flex flex-col gap-2 sm:flex-row"><button onClick={chooseSave} className="flex-1 rounded-lg bg-[#4c7dff] px-3 py-2.5 text-xs font-medium text-white hover:bg-[#3c6bea] active:scale-95">Save changes</button><button onClick={chooseDiscard} className="flex-1 rounded-lg border border-[#ef4444]/45 bg-[#ef4444]/10 px-3 py-2.5 text-xs text-[#ff9e9e] hover:bg-[#ef4444]/20 active:scale-95">Discard changes</button></div></div></div>}
      </div>
    </div>
  );
}
