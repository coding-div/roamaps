import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { GitBranch, Plus } from "lucide-react";
import { useRoadmaps } from "@/contexts/RoadmapContext";
import type { TreeMap } from "@/lib/treeData";

function createNewTree(index: number): TreeMap {
  const id = `tree-${Date.now()}`;
  const rootId = `${id}-root`;
  const root = { id: rootId, x: 0, y: 0, label: "New Roadmap", color: "blue" as const, children: [] };
  return {
    id,
    title: `New Roadmap ${index}`,
    description: "A blank roadmap ready to build",
    root,
    nodeMap: { [root.id]: root },
    maxDepth: 1,
  };
}

export default function Home() {
  const [, navigate] = useLocation();
  const { trees, dispatch } = useRoadmaps();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  function handleCreate() {
    const tree = createNewTree(trees.length + 1);
    dispatch({ type: "ADD_TREE", tree });
    navigate(`/tree/${tree.id.replace("tree-", "")}`);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      <header className="px-6 pt-12 pb-8 sm:px-10 sm:pt-16">
        <div className="transition-all duration-500 ease-out" style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)" }}>
          <div className="flex items-center gap-3 mb-3">
            <img src="/manus-storage/logo-roamaps_648fdac2.png" alt="Roamaps" className="w-8 h-8" />
            <h1 className="text-[#e4e4e7] text-2xl font-bold tracking-tight font-['Space_Grotesk',sans-serif]">Roamaps</h1>
          </div>
          <p className="text-[#6b6b75] text-sm font-sans max-w-md">Your knowledge, mapped.</p>
        </div>
      </header>

      <main className="flex-1 px-6 sm:px-10 pb-12">
        <div className="flex items-center justify-between max-w-2xl mb-5">
          <p className="text-[#8a8a95] text-xs uppercase tracking-[0.2em] font-sans">Your roadmaps</p>
          <button onClick={handleCreate} className="flex items-center gap-2 rounded-md border border-[#2a2a35] bg-[#13131a] px-3 py-2 text-xs text-[#c4c4cc] hover:border-[#3B82F6]/60 hover:text-white transition-colors active:scale-95">
            <Plus className="w-3.5 h-3.5" /> New roadmap
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
          {trees.map((tree, index) => (
            <button key={tree.id} onClick={() => navigate(`/tree/${tree.id.replace("tree-", "")}`)} className="group relative text-left bg-[#13131a] border border-[#2a2a35] rounded-lg p-6 transition-all duration-200 hover:border-[#3a3a45] hover:bg-[#16161e] hover:shadow-lg hover:shadow-black/20 active:scale-[0.98]" style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)", transitionDelay: `${200 + index * 80}ms` }}>
              <div className="absolute top-0 left-6 right-6 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${tree.root.color === "blue" ? "#3B82F6" : "#8B5CF6"}40, transparent)` }} />
              <div className="mb-4"><GitBranch className="w-6 h-6 text-[#3a3a45] group-hover:text-[#6b6b75] transition-colors" strokeWidth={1.5} /></div>
              <h2 className="text-[#e4e4e7] text-base font-semibold font-['Space_Grotesk',sans-serif] mb-1">{tree.title}</h2>
              <p className="text-[#6b6b75] text-sm font-sans">{tree.description}<span className="ml-1.5 text-[#4a4a55] text-xs font-mono">({tree.maxDepth} levels)</span></p>
              <div className="mt-4 flex items-center gap-1.5"><span className="text-[#4a4a55] text-xs font-mono">{Object.keys(tree.nodeMap).length} nodes</span></div>
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-[#6b6b75] text-lg">→</span></div>
            </button>
          ))}
        </div>
      </main>

      <footer className="px-6 sm:px-10 pb-8"><p className="text-[#3a3a45] text-xs font-sans">Changes save automatically in this browser</p></footer>
    </div>
  );
}
