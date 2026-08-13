/**
 * Roamaps style reminder — the editor is the instrument: full-bleed graphite
 * canvas, compact edge controls, recurring route glyph, cobalt focus, a quiet
 * status rail, and mono route metadata.
 */

import { useParams, useLocation } from "wouter";
import { ArrowLeft, GitBranch } from "lucide-react";
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
      <div className="absolute left-0 right-0 top-0 z-10 flex items-start justify-between bg-gradient-to-b from-[#0a0a0f] via-[#0a0a0f]/90 to-transparent px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3"><button onClick={() => navigate("/")} className="group flex items-center gap-2 font-sans text-sm text-[#8a8a95] transition-colors hover:text-[#e4e4e7]"><ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /><span>Back</span></button><span className="hidden h-7 w-px bg-[#1d2230] sm:block" /><span className="hidden items-center gap-2 font-mono text-[8px] uppercase tracking-[0.2em] text-[#566079] sm:flex"><GitBranch className="h-3.5 w-3.5 text-[#4c7dff]" strokeWidth={1.4} /> map sheet / active</span></div>
        <div className="text-center"><p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#4c7dff]">Route / {treeId}</p><h1 className="font-['Space_Grotesk',sans-serif] text-lg font-semibold tracking-tight text-[#e4e4e7]">{tree.title}</h1><p className="mt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-[#566079]">Working archive / local canvas</p></div>
        <div className="hidden items-end gap-4 pt-1 text-right sm:flex"><div><p className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#4f5971]">Nodes</p><p className="mt-1 font-mono text-xs text-[#a6afc8]">{Object.keys(tree.nodeMap).length}</p></div><div><p className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#4f5971]">Levels</p><p className="mt-1 font-mono text-xs text-[#a6afc8]">{tree.maxDepth}</p></div><span className="h-1.5 w-1.5 rounded-full bg-[#4c7dff] shadow-[0_0_10px_rgba(76,125,255,0.8)]" title="Changes save automatically" /></div>
      </div>
      <TreeCanvas tree={tree} />
      <div className="pointer-events-none absolute bottom-4 left-5 right-5 z-10 flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.18em] text-[#4f5971] sm:bottom-5 sm:left-6 sm:right-6"><div className="flex items-center gap-3"><span className="flex items-center gap-2 text-[#6f8de3]"><span className="h-1.5 w-1.5 rounded-full bg-[#4c7dff] shadow-[0_0_8px_rgba(76,125,255,0.75)]" />Live canvas</span><span className="hidden sm:inline">Local persistence / on</span></div><span className="hidden sm:inline">Place a node · draw the route · shape the map</span></div>
    </div>
  );
}
