/**
 * Home — Landing page showing available trees
 * Design: Obsidian Canvas aesthetic — dark, minimal, no menu, no login
 * Shows tree cards in a clean grid layout
 */

import { useLocation } from "wouter";
import { allTrees } from "@/lib/treeData";
import { useState, useEffect } from "react";
import { GitBranch } from "lucide-react";

export default function Home() {
  const [, navigate] = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Header area */}
      <header className="px-6 pt-12 pb-8 sm:px-10 sm:pt-16">
        <div
          className="transition-all duration-500 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(16px)",
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <img
              src="/manus-storage/logo-roamaps_648fdac2.png"
              alt="Roamaps"
              className="w-8 h-8"
            />
            <h1 className="text-[#e4e4e7] text-2xl font-bold tracking-tight font-['Space_Grotesk',sans-serif]">
              Roamaps
            </h1>
          </div>
          <p className="text-[#6b6b75] text-sm font-sans max-w-md">
            Your knowledge, mapped.
          </p>
        </div>
      </header>

      {/* Tree cards */}
      <main className="flex-1 px-6 sm:px-10 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
          {allTrees.map((tree, index) => (
            <button
              key={tree.id}
              onClick={() => navigate(`/tree/${tree.id.replace("tree-", "")}`)}
              className="group relative text-left bg-[#13131a] border border-[#2a2a35] rounded-lg p-6 transition-all duration-200 hover:border-[#3a3a45] hover:bg-[#16161e] hover:shadow-lg hover:shadow-black/20 active:scale-[0.98]"
              style={{
                transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(16px)",
                transitionDelay: `${200 + index * 80}ms`,
              }}
            >
              {/* Card accent line */}
              <div
                className="absolute top-0 left-6 right-6 h-[1px]"
                style={{
                  background: `linear-gradient(90deg, transparent, ${tree.root.color === "blue" ? "#3B82F6" : "#8B5CF6"}40, transparent)`,
                }}
              />

              {/* Mini tree preview icon */}
              <div className="mb-4">
                <GitBranch
                  className="w-6 h-6 text-[#3a3a45] group-hover:text-[#6b6b75] transition-colors"
                  strokeWidth={1.5}
                />
              </div>

              <h2 className="text-[#e4e4e7] text-base font-semibold font-['Space_Grotesk',sans-serif] mb-1">
                {tree.title}
              </h2>
              <p className="text-[#6b6b75] text-sm font-sans">
                {tree.description}
              </p>

              {/* Branch count */}
              <div className="mt-4 flex items-center gap-1.5">
                <span className="text-[#4a4a55] text-xs font-mono">
                  {tree.root.children.length} branches
                </span>
              </div>

              {/* Subtle hover indicator */}
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="text-[#6b6b75]"
                >
                  <path
                    d="M6 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* Footer hint */}
      <footer className="px-6 sm:px-10 pb-8">
        <p className="text-[#3a3a45] text-xs font-sans">
          Long-press any node to change its color
        </p>
      </footer>
    </div>
  );
}
