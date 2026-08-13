/**
 * Roamaps style reminder — Obsidian Cartography: near-black graphite canvas,
 * route cobalt focus, IBM Plex Mono metadata, quiet spatial hierarchy, and
 * asymmetrical map-sheet archive cards with recurring route glyphs.
 */

import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { GitBranch, Plus, ArrowUpRight } from "lucide-react";
import { useRoadmaps } from "@/contexts/RoadmapContext";
import type { TreeMap } from "@/lib/treeData";

function createNewTree(index: number): TreeMap {
  const id = `tree-${Date.now()}`;
  const rootId = `${id}-root`;
  const root = { id: rootId, x: 0, y: 0, label: "New Roadmap", color: "blue" as const, kind: "node" as const, children: [] };
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
    <div className="relative min-h-screen overflow-hidden bg-[#090a0f] text-[#e4e4e7]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_73%_18%,rgba(76,125,255,0.12),transparent_32%),linear-gradient(180deg,rgba(9,10,15,0.25),#090a0f_68%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[56%] bg-cover bg-center opacity-50 lg:block" style={{ backgroundImage: "url('/manus-storage/roamaps-canvas-constellation_dcda31e9.png')" }} />

      <header className="relative z-10 flex items-center justify-between px-6 pt-7 sm:px-10 lg:px-14">
        <div className="flex items-center gap-3">
          <img src="/manus-storage/roamaps-mark_a6c218e4.png" alt="Roamaps mark" className="h-9 w-9 object-contain" />
          <span className="font-['Space_Grotesk',sans-serif] text-lg font-semibold tracking-[-0.065em]"><span className="mr-[1px] text-[#4c7dff]">R</span>oamaps</span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#596073]">Local canvas / v1</span>
      </header>

      <main className="relative z-10 px-6 pb-14 pt-20 sm:px-10 sm:pt-28 lg:px-14 lg:pt-36">
        <section className="max-w-3xl">
          <p className="mb-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.28em] text-[#6f8de3]"><span className="h-px w-8 bg-[#4c7dff]" /> Visual thinking instrument</p>
          <h1 className="max-w-2xl font-['Space_Grotesk',sans-serif] text-5xl font-semibold leading-[0.98] tracking-[-0.065em] text-[#f2f4fa] sm:text-7xl">Build the shape of what you know.</h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-[#8a91a3]">A quiet canvas for turning subjects, systems, and loose ideas into maps you can see, edit, and follow.</p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <button onClick={handleCreate} className="group flex items-center gap-2 rounded-sm border border-[#6f92ff] bg-[#4c7dff] px-4 py-3 font-['Space_Grotesk',sans-serif] text-sm font-medium text-white transition-all duration-200 hover:bg-[#628dff] active:scale-[0.97]"><Plus className="h-4 w-4" />Start a new roadmap</button>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5e6577]">No account required</span>
          </div>
        </section>

        <section className="mt-28 max-w-6xl lg:mt-40">
          <div className="mb-5 flex items-end justify-between border-b border-[#1d2230] pb-3"><div><p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#68708a]">01 / Your roadmaps</p><p className="mt-2 text-sm text-[#71798d]">Open a route or place a new pin.</p></div><button onClick={handleCreate} className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8195d8] transition-colors hover:text-white sm:flex">New roadmap <ArrowUpRight className="h-3.5 w-3.5" /></button></div>
          <div className="grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-[1.08fr_0.92fr]">
            {trees.map((tree, index) => (
              <button key={tree.id} onClick={() => navigate(`/tree/${tree.id.replace("tree-", "")}`)} className={`group relative overflow-hidden rounded-[4px] border border-[#222837] bg-[#10131b]/90 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#4c7dff]/55 hover:bg-[#131824] active:scale-[0.99] ${index === 1 ? "md:translate-y-8" : ""}`} style={{ opacity: visible ? 1 : 0, transform: visible ? undefined : "translateY(14px)", transitionDelay: `${180 + index * 70}ms` }}>
                <div className="absolute inset-y-0 left-0 w-[3px] bg-[#4c7dff]/35 transition-colors group-hover:bg-[#4c7dff]" /><div className="absolute left-[-2px] top-7 h-1 w-1 bg-[#4c7dff]" /><div className="absolute right-4 top-3 font-mono text-[8px] tracking-[0.18em] text-[#3f4961]">X 0{index + 2} · Y 1{index + 4}</div><div className="pointer-events-none absolute right-[-16px] top-10 h-20 w-20 rounded-l-full border border-[#4c7dff]/10" /><div className="pointer-events-none absolute right-[-4px] top-[4.5rem] h-px w-16 bg-[#4c7dff]/20" />
                <div className="relative h-32 overflow-hidden border-b border-[#1d2230] bg-[#0c0f16]"><img src={index % 2 === 0 ? "/manus-storage/roamaps-tree-preview-a_c0166a80.png" : "/manus-storage/roamaps-tree-preview-b_1ff7c59e.png"} alt="" className="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-[1.04]" /><div className="absolute inset-0 bg-gradient-to-t from-[#10131b] via-transparent to-transparent" /><span className="absolute bottom-3 left-4 font-mono text-[8px] uppercase tracking-[0.22em] text-[#7581a0]">Plotted route / {String(index + 1).padStart(2, "0")}</span></div>
                <div className="relative p-5"><div className="mb-5 flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5c6680]">Map {String(index + 1).padStart(2, "0")} / archive</span><span className="flex items-center gap-2"><span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#3f4961]">route glyph</span><GitBranch className="h-4 w-4 text-[#4c7dff]/80" strokeWidth={1.4} /></span></div><h2 className="font-['Space_Grotesk',sans-serif] text-xl font-medium tracking-[-0.03em] text-[#e9ecf5]">{tree.title}</h2><p className="mt-1.5 text-sm text-[#737b8e]">{tree.description}</p><div className="mt-6 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.13em] text-[#565f75]"><span>{Object.keys(tree.nodeMap).length} nodes</span><span>{tree.maxDepth} levels</span><span className="ml-auto text-[#7888bd] transition-transform group-hover:translate-x-1">Open →</span></div></div>
              </button>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 flex flex-col gap-2 border-t border-[#171b27] px-6 py-6 font-mono text-[10px] uppercase tracking-[0.16em] text-[#4e566a] sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-14"><span>Changes save automatically in this browser</span><span>Place a node. Draw the route.</span></footer>
    </div>
  );
}
