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
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-[#0a0a0f] via-[#0a0a0f]/90 to-transparent">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-[#8a8a95] hover:text-[#e4e4e7] transition-colors font-sans text-sm group"><ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /><span>Back</span></button>
        <h1 className="text-[#e4e4e7] text-lg font-semibold font-['Space_Grotesk',sans-serif] tracking-tight">{tree.title}</h1>
        <div className="w-16" />
      </div>
      <TreeCanvas tree={tree} />
    </div>
  );
}
