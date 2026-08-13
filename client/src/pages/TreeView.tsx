/**
 * Roamaps style reminder — the editor is the instrument: full-bleed graphite
 * canvas, compact edge controls, cobalt focus, and mono route metadata.
 */

import { useParams, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import TreeCanvas from "@/components/TreeCanvas";
import { useRoadmaps } from "@/contexts/RoadmapContext";

export default function TreeView() {
  const { treeId } = useParams<{ treeId: string }>();
  const [, navigate] = useLocation();
  const { getTree } = useRoadmaps();
  const tree = getTree(`tree-${treeId}`);

  if (!tree) {
    return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><div className="text-center"><p className="text-[#8a8a95] text-lg font-sans">Roadmap not found</p><button onClick={() => navigate("/")} className="mt-4 text-[#e4e4e7] underline hover:text-white transition-colors font-sans">Go back home</button></div></div>;
  }

  return (
    <div className="fixed inset-0 bg-[#0a0a0f]">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between px-5 py-4 bg-gradient-to-b from-[#0a0a0f] via-[#0a0a0f]/90 to-transparent sm:px-6">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-[#8a8a95] hover:text-[#e4e4e7] transition-colors font-sans text-sm group"><ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /><span>Back</span></button>
        <div className="text-center"><p className="text-[#4c7dff] font-mono text-[9px] uppercase tracking-[0.22em]">Route / {treeId}</p><h1 className="text-[#e4e4e7] text-lg font-semibold font-['Space_Grotesk',sans-serif] tracking-tight">{tree.title}</h1><p className="mt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-[#566079]">Working archive / local canvas</p></div>
        <div className="hidden items-end gap-4 pt-1 text-right sm:flex"><div><p className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#4f5971]">Nodes</p><p className="mt-1 font-mono text-xs text-[#a6afc8]">{Object.keys(tree.nodeMap).length}</p></div><div><p className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#4f5971]">Levels</p><p className="mt-1 font-mono text-xs text-[#a6afc8]">{tree.maxDepth}</p></div><span className="h-1.5 w-1.5 rounded-full bg-[#4c7dff] shadow-[0_0_10px_rgba(76,125,255,0.8)]" title="Changes save automatically" /></div>
      </div>
      <TreeCanvas tree={tree} />
    </div>
  );
}
