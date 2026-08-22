/**
 * Roamaps style reminder — Obsidian Cartography: near-black graphite canvas,
 * route cobalt focus, IBM Plex Mono metadata, quiet spatial hierarchy, and
 * asymmetric map-sheet archive cards with recurring route glyphs.
 * Home archive extension: a small left-side utility rail keeps local archive
 * controls discoverable without diluting the canvas-first character.
 */

import { useEffect, useRef, useState, type ComponentType } from "react";
import { useLocation } from "wouter";
import {
  Apple,
  ArrowDownToLine,
  ArrowUpRight,
  Box,
  CheckCircle2,
  Crown,
  Download,
  FileJson2,
  FileUp,
  Glasses,
  GitBranch,
  Globe2,
  Grid3X3,
  HardHat,
  HelpCircle,
  List,
  Menu,
  MoreHorizontal,
  PencilLine,
  Plus,
  RotateCcw,
  Settings2,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  UserRound,
  Bot,
  Smile,
} from "lucide-react";
import { toast } from "sonner";
import { useRoadmaps } from "@/contexts/RoadmapContext";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CFD_JAAL_MAX_BYTES,
  CfdJaalValidationError,
  cfdJaalFileName,
  createCfdJaalDocument,
  createTreeFromCfdJaal,
  getCfdJaalPreview,
  parseCfdJaal,
  uniqueRoadmapTitle,
  type CfdJaalDocument,
  type CfdJaalPreview,
} from "@/lib/cfdJaal";
import { consumeSharedCfdJaal } from "@/lib/sharedCfdJaal";
import { getAllEdges, type TreeMap } from "@/lib/treeData";

const HOME_LAYOUT_STORAGE_KEY = "roamaps-home-layout-v1";
const SNAP_TO_GRID_STORAGE_KEY = "roamaps-snap-to-grid-v1";
const PROFILE_STORAGE_KEY = "roamaps-local-profile-v1";
type HomeLayout = "box" | "list";
type SheetPanel = "menu" | "profile" | "settings" | "bin" | "guide";
type AvatarId = "sunglasses" | "robot" | "mage" | "crown" | "mark" | "man" | "woman" | "apple" | "hat" | "globe";

const SHARE_GUIDE_STEPS = [
  { title: "Open Files", detail: "Find the CFD Jaal (.cfdj) file on your Android device.", Icon: FileJson2 },
  { title: "Tap Share → Roamaps", detail: "Choose Share, then select the installed Roamaps app.", Icon: Share2 },
  { title: "Check and add", detail: "Read the safety preview, then add it as a separate Roadmap.", Icon: ShieldCheck },
] as const;

interface LocalProfile {
  name: string;
  avatar: AvatarId;
}

interface AvatarOption {
  id: AvatarId;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  tone: string;
}

const AVATARS: AvatarOption[] = [
  { id: "sunglasses", label: "Red sunglasses", Icon: Glasses, tone: "border-red-400/50 bg-red-500/15 text-red-300" },
  { id: "robot", label: "Robot", Icon: Bot, tone: "border-sky-400/50 bg-sky-500/15 text-sky-300" },
  { id: "mage", label: "Mage", Icon: Sparkles, tone: "border-violet-400/50 bg-violet-500/15 text-violet-300" },
  { id: "crown", label: "Crown", Icon: Crown, tone: "border-amber-400/50 bg-amber-500/15 text-amber-300" },
  { id: "mark", label: "Roamaps mark", Icon: GitBranch, tone: "border-[#6f92ff]/60 bg-[#4c7dff]/15 text-[#a9bbff]" },
  { id: "man", label: "Young man", Icon: UserRound, tone: "border-emerald-400/50 bg-emerald-500/15 text-emerald-300" },
  { id: "woman", label: "Smiling young woman", Icon: Smile, tone: "border-pink-400/50 bg-pink-500/15 text-pink-300" },
  { id: "apple", label: "Fresh apple", Icon: Apple, tone: "border-lime-400/50 bg-lime-500/15 text-lime-300" },
  { id: "hat", label: "Round hat", Icon: HardHat, tone: "border-orange-400/50 bg-orange-500/15 text-orange-300" },
  { id: "globe", label: "Earth globe", Icon: Globe2, tone: "border-cyan-400/50 bg-cyan-500/15 text-cyan-300" },
];

function loadHomeLayout(): HomeLayout {
  try {
    return localStorage.getItem(HOME_LAYOUT_STORAGE_KEY) === "list" ? "list" : "box";
  } catch {
    return "box";
  }
}

function loadSnapPreference(): boolean {
  try {
    return localStorage.getItem(SNAP_TO_GRID_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function loadProfile(): LocalProfile {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) ?? "null") as Partial<LocalProfile> | null;
    const avatar = AVATARS.some((option) => option.id === saved?.avatar) ? saved?.avatar as AvatarId : "mark";
    return { name: typeof saved?.name === "string" && saved.name.trim() ? saved.name.slice(0, 50) : "Local explorer", avatar };
  } catch {
    return { name: "Local explorer", avatar: "mark" };
  }
}

function createNewTree(trees: TreeMap[]): TreeMap {
  const id = `tree-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const rootId = `${id}-root`;
  const root = { id: rootId, x: 0, y: 0, label: "New Roadmap", color: "blue" as const, popupContent: "", children: [] };
  return {
    id,
    title: uniqueRoadmapTitle("New Roadmap", trees.map((tree) => tree.title)),
    description: "A blank Roadmap ready to build",
    root,
    nodeMap: { [root.id]: root },
    maxDepth: 1,
  };
}

function roadmapStats(tree: TreeMap) {
  return { nodes: Object.keys(tree.nodeMap).length, arrows: getAllEdges(tree).length };
}

function archiveTitle(tree: TreeMap): string {
  if (tree.id === "tree-1" && tree.title === "Tree 1") return "Learning Route";
  if (tree.id === "tree-2" && tree.title === "Tree 2") return "Systems Atlas";
  return tree.title;
}

function archiveDescription(tree: TreeMap): string {
  if (tree.id === "tree-1" && tree.description === "Small tree — up to 3 levels") return "A compact map sheet for a focused subject";
  if (tree.id === "tree-2" && tree.description === "Big tree — up to 8 levels") return "A deeper map sheet for connected systems";
  return tree.description;
}

function Avatar({ avatar, size = "normal" }: { avatar: AvatarId; size?: "small" | "normal" | "large" }) {
  const option = AVATARS.find((item) => item.id === avatar) ?? AVATARS[4];
  const dimensions = size === "small" ? "h-8 w-8" : size === "large" ? "h-14 w-14" : "h-10 w-10";
  return <span className={`flex ${dimensions} shrink-0 items-center justify-center rounded-full border ${option.tone}`} aria-label={option.label}><option.Icon className={size === "large" ? "h-6 w-6" : "h-4 w-4"} /></span>;
}

function downloadCfdJaal(tree: TreeMap) {
  const content = JSON.stringify(createCfdJaalDocument(tree), null, 2);
  const file = new Blob([content], { type: "application/vnd.roamaps.cfd-jaal+json" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = cfdJaalFileName(tree.title);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function Home() {
  const [, navigate] = useLocation();
  const { trees, bin, dispatch, moveTreeToBin, restoreTreeFromBin, deleteTreeFromBin, emptyBin } = useRoadmaps();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [visible, setVisible] = useState(false);
  const [roadmapLayout, setRoadmapLayout] = useState<HomeLayout>(loadHomeLayout);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetPanel, setSheetPanel] = useState<SheetPanel>("menu");
  const [profile, setProfile] = useState<LocalProfile>(loadProfile);
  const [profileDraft, setProfileDraft] = useState<LocalProfile>(profile);
  const [snapToGrid, setSnapToGrid] = useState(loadSnapPreference);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [renameTree, setRenameTree] = useState<TreeMap | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [pendingImport, setPendingImport] = useState<{ document: CfdJaalDocument; preview: CfdJaalPreview } | null>(null);
  const [confirming, setConfirming] = useState<{ type: "delete"; tree: TreeMap } | { type: "empty" } | null>(null);
  const [shareGuideStep, setShareGuideStep] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 50);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(HOME_LAYOUT_STORAGE_KEY, roadmapLayout); } catch { /* optional preference */ }
  }, [roadmapLayout]);

  useEffect(() => {
    try { localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile)); } catch { /* local profile is optional */ }
  }, [profile]);

  useEffect(() => {
    try { localStorage.setItem(SNAP_TO_GRID_STORAGE_KEY, String(snapToGrid)); } catch { /* setting remains off if storage fails */ }
  }, [snapToGrid]);

  useEffect(() => {
    void (async () => {
      const shared = await consumeSharedCfdJaal();
      if (shared.reason === "invalid") {
        toast.error("Roamaps can only receive a CFD Jaal (.cfdj) file from Share.");
        return;
      }
      if (shared.reason === "error") {
        toast.error("The shared file could not be opened. Please use Upload a file instead.");
        return;
      }
      if (shared.file) {
        toast.message("CFD Jaal received. Checking it safely…");
        await readCfdJaalFile(shared.file);
      }
    })();
  }, []);

  useEffect(() => {
    if (!sheetOpen || sheetPanel !== "guide" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setShareGuideStep((step) => (step + 1) % SHARE_GUIDE_STEPS.length), 1900);
    return () => window.clearInterval(timer);
  }, [sheetOpen, sheetPanel]);

  function openSheet(panel: SheetPanel) {
    if (panel === "profile") setProfileDraft(profile);
    setSheetPanel(panel);
    setSheetOpen(true);
  }

  function handleCreate() {
    const tree = createNewTree(trees);
    dispatch({ type: "ADD_TREE", tree });
    setAddDialogOpen(false);
    navigate(`/tree/${tree.id.replace("tree-", "")}`);
  }

  async function readCfdJaalFile(file: File) {
    if (file.size > CFD_JAAL_MAX_BYTES) {
      toast.error("This CFD Jaal file is larger than the 20 MB safety limit.");
      return;
    }
    try {
      const document = parseCfdJaal(await file.text());
      setAddDialogOpen(false);
      setPendingImport({ document, preview: getCfdJaalPreview(document) });
    } catch (error) {
      toast.error(error instanceof CfdJaalValidationError ? `${error.message} Roamaps accepts only valid CFD Jaal data.` : "This file could not be checked safely.");
    }
  }

  function importPendingRoadmap() {
    if (!pendingImport) return;
    const tree = createTreeFromCfdJaal(pendingImport.document, trees);
    dispatch({ type: "ADD_TREE", tree });
    setPendingImport(null);
    toast.success(`Added ${tree.title} as a separate local Roadmap.`);
    navigate(`/tree/${tree.id.replace("tree-", "")}`);
  }

  function saveRename() {
    if (!renameTree) return;
    const title = renameDraft.trim();
    if (!title) { toast.error("A Roadmap needs a name."); return; }
    const duplicate = trees.some((tree) => tree.id !== renameTree.id && tree.title.trim().toLocaleLowerCase() === title.toLocaleLowerCase());
    dispatch({ type: "UPDATE_TREE_TITLE", treeId: renameTree.id, title: duplicate ? uniqueRoadmapTitle(title, trees.filter((tree) => tree.id !== renameTree.id).map((tree) => tree.title)) : title });
    setRenameTree(null);
  }

  function renderSheet() {
    if (sheetPanel === "profile") return <>
      <button onClick={() => setSheetPanel("menu")} className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#7686b8] transition-colors hover:text-white">← Menu</button>
      <div className="flex items-center gap-3"><Avatar avatar={profileDraft.avatar} size="large" /><div><h2 className="font-['Space_Grotesk',sans-serif] text-xl font-medium text-[#eef2ff]">Site profile</h2><p className="mt-1 text-sm text-[#7a849d]">Stored only on this device.</p></div></div>
      <label className="mt-6 block font-mono text-[9px] uppercase tracking-[0.18em] text-[#7d8aa8]">Name<input value={profileDraft.name} maxLength={50} onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))} className="mt-2 h-11 w-full border border-[#30394f] bg-[#0b0e15] px-3 font-sans text-sm text-white outline-none focus:border-[#6f92ff]" /></label>
      <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.18em] text-[#7d8aa8]">Choose a character</p>
      <div className="mt-3 grid grid-cols-5 gap-2">{AVATARS.map((option) => <button key={option.id} onClick={() => setProfileDraft((current) => ({ ...current, avatar: option.id }))} className={`flex aspect-square items-center justify-center border transition-colors ${profileDraft.avatar === option.id ? "border-[#83a2ff] bg-[#4c7dff]/15" : "border-[#283045] bg-[#0d111a] hover:border-[#526da8]"}`} title={option.label} aria-label={option.label} aria-pressed={profileDraft.avatar === option.id}><Avatar avatar={option.id} size="small" /></button>)}</div>
      <button onClick={() => { const name = profileDraft.name.trim() || "Local explorer"; setProfile({ ...profileDraft, name }); setProfileDraft((current) => ({ ...current, name })); toast.success("Local profile saved."); }} className="mt-7 w-full border border-[#6f92ff] bg-[#4c7dff] px-4 py-3 font-['Space_Grotesk',sans-serif] text-sm font-medium text-white transition-colors hover:bg-[#628dff] active:scale-[0.98]">Save local profile</button>
    </>;

    if (sheetPanel === "settings") return <>
      <button onClick={() => setSheetPanel("menu")} className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#7686b8] transition-colors hover:text-white">← Menu</button>
      <h2 className="font-['Space_Grotesk',sans-serif] text-xl font-medium text-[#eef2ff]">Settings</h2><p className="text-sm leading-6 text-[#7a849d]">Optional drafting features for this browser.</p>
      <div className="mt-5 border-y border-[#222a3d] py-4"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium text-[#e8edfa]">Snap to grid</p><p className="mt-1 text-xs leading-5 text-[#737e98]">Place moved nodes on visible dot intersections.</p></div><Switch checked={snapToGrid} onCheckedChange={setSnapToGrid} className="data-[state=checked]:bg-[#4c7dff] data-[state=unchecked]:bg-[#31394b]" aria-label="Toggle Snap to grid" /></div></div>
      <div className="mt-5 border-l-2 border-[#4c7dff]/70 bg-[#111728] px-3 py-3 text-xs leading-5 text-[#9eaed5]">More custom features will appear here only when they are ready to use.</div>
    </>;

    if (sheetPanel === "bin") return <>
      <button onClick={() => setSheetPanel("menu")} className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#7686b8] transition-colors hover:text-white">← Menu</button>
      <div className="flex items-start justify-between gap-4"><div><h2 className="font-['Space_Grotesk',sans-serif] text-xl font-medium text-[#eef2ff]">Bin</h2><p className="mt-1 text-sm text-[#7a849d]">Restore a Roadmap or delete it permanently.</p></div>{bin.length > 0 && <button onClick={() => setConfirming({ type: "empty" })} className="font-mono text-[9px] uppercase tracking-[0.14em] text-red-300 hover:text-red-100">Empty Bin</button>}</div>
      <div className="mt-6 space-y-2">{bin.length === 0 ? <div className="border border-dashed border-[#30394f] bg-[#0d1119] px-4 py-8 text-center text-sm text-[#74809a]">The Bin is empty.</div> : bin.map((tree) => <div key={tree.id} className="border border-[#273047] bg-[#0d1119] p-3"><p className="truncate text-sm font-medium text-[#e7ebf7]">{tree.title}</p><p className="mt-1 font-mono text-[9px] uppercase tracking-[0.13em] text-[#68758f]">{roadmapStats(tree).nodes} nodes · {roadmapStats(tree).arrows} arrows</p><div className="mt-3 flex gap-3"><button onClick={() => { restoreTreeFromBin(tree.id); toast.success(`${tree.title} restored.`); }} className="text-xs font-medium text-[#aabfff] hover:text-white">Restore</button><button onClick={() => setConfirming({ type: "delete", tree })} className="text-xs font-medium text-red-300 hover:text-red-100">Delete permanently</button></div></div>)}</div>
    </>;

    if (sheetPanel === "guide") return <>
      <button onClick={() => setSheetPanel("menu")} className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#7686b8] transition-colors hover:text-white">← Menu</button>
      <h2 className="font-['Space_Grotesk',sans-serif] text-xl font-medium text-[#eef2ff]">Useful features</h2><p className="text-sm leading-6 text-[#7a849d]">What each Roamaps tool is for, and when it helps.</p>
      <section className="mt-6 border border-[#314a85]/70 bg-[#0b101d] p-3.5" aria-labelledby="android-share-demo-title">
        <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#87a5ff]">Android / short visual demo</p><h3 id="android-share-demo-title" className="mt-1 font-['Space_Grotesk',sans-serif] text-base font-medium text-[#edf2ff]">Share a CFD Jaal to Roamaps</h3></div><Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-[#7394f1]" /></div>
        <div className="relative mt-4 overflow-hidden border border-[#253354] bg-[#080b12] p-2.5">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#7c9dff] to-transparent opacity-70" />
          <div className="grid gap-2" role="tablist" aria-label="Android sharing steps">
            {SHARE_GUIDE_STEPS.map(({ title, detail, Icon }, index) => {
              const active = shareGuideStep === index;
              return <button key={title} type="button" role="tab" aria-selected={active} onClick={() => setShareGuideStep(index)} className={`group relative flex w-full items-center gap-3 overflow-hidden border px-2.5 py-2.5 text-left transition-all duration-300 motion-reduce:transition-none ${active ? "border-[#668afd] bg-[#152652] shadow-[inset_3px_0_0_#668afd]" : "border-[#20293d] bg-[#0d111a] hover:border-[#435985]"}`}>
                <span aria-hidden="true" className={`flex h-7 w-7 shrink-0 items-center justify-center border transition-colors duration-300 motion-reduce:transition-none ${active ? "border-[#8aa8ff] bg-[#527dff] text-white" : "border-[#394865] bg-[#111a2b] text-[#7182a7]"}`}><Icon className="h-3.5 w-3.5" /></span>
                <span className="min-w-0 flex-1"><span className={`block font-mono text-[9px] uppercase tracking-[0.16em] ${active ? "text-[#b7c9ff]" : "text-[#6f7b94]"}`}>{String(index + 1).padStart(2, "0")} / {title}</span><span className={`mt-0.5 block text-[11px] leading-4 ${active ? "text-[#d7e1ff]" : "text-[#7c879c]"}`}>{detail}</span></span>
                {active && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 bg-[#90abff] shadow-[0_0_12px_3px_rgba(111,146,255,0.55)]" />}
              </button>;
            })}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#1d2740] pt-2.5"><p className="text-[10px] leading-4 text-[#7d8ba8]">Install Roamaps once. The file stays on your device until you approve the import.</p><div className="flex shrink-0 gap-1" aria-hidden="true">{SHARE_GUIDE_STEPS.map((step, index) => <span key={step.title} className={`h-1 w-4 transition-colors duration-300 motion-reduce:transition-none ${shareGuideStep === index ? "bg-[#7c9dff]" : "bg-[#2a3550]"}`} />)}</div></div>
        </div>
      </section>
      <div className="mt-6 space-y-3">{[
        ["01", "Build a map", "Tap empty canvas to add a node. Drag it to place the idea; Connect adds one safe directional arrow between two nodes."],
        ["02", "Use long press", "Long-press a node for label editing, full notes, colour, Teleport, and removal. Long-press an arrow for its own tools."],
        ["03", "Keep full context", "A node can stay short on the map while its pop-up note holds long writing. Save a note before closing it."],
        ["04", "Move difficult nodes", "Teleport lets you choose a new empty place once. Roamaps checks the node and its arrows before accepting it."],
        ["05", "Use Copy Arrow", "Choose Head or Tail Copy Arrow when arrows should share a route for as long as possible, then separate only for their own destination."],
        ["06", "Control the view", "Use zoom, finger pinch, canvas drag, and Home to navigate large Roadmaps. Snap to Grid is optional in Settings."],
        ["07", "Keep Roadmaps safe", "Rename, Download CFD Jaal, or Move to Bin from a Roadmap’s three-dot menu. Bin lets you Restore before permanent deletion."],
        ["08", "Move a Roadmap between devices", "On any device, use Add Roadmap → Upload a file. On Android after installing Roamaps, open Files, tap Share on a .cfdj file, then choose Roamaps."],
        ["09", "Choose the right screen", "Home works on computer, tablet, and phone. The editor works everywhere, but an Android tablet gives the best space for dense routes and dragging."],
      ].map(([number, title, text]) => <div key={number} className="flex gap-3 border-l border-[#3d579c] bg-[#0d1119] px-3 py-3"><span className="font-mono text-[10px] text-[#8fa8ff]">{number}</span><div><p className="text-sm font-medium text-[#edf1ff]">{title}</p><p className="mt-1 text-xs leading-5 text-[#78839d]">{text}</p></div></div>)}</div>
      <button onClick={() => uploadInputRef.current?.click()} className="mt-5 flex w-full items-center justify-center gap-2 border border-[#4e6fc8] bg-[#152243] px-4 py-3 text-sm font-medium text-[#dbe5ff] transition-colors hover:bg-[#1c3163]"><FileUp className="h-4 w-4" />Open CFD Jaal file</button>
    </>;

    return <>
      <div className="flex items-center gap-3 border-b border-[#222a3c] pb-5"><Avatar avatar={profile.avatar} /><div className="min-w-0"><p className="truncate font-['Space_Grotesk',sans-serif] text-base font-medium text-[#eef2ff]">{profile.name}</p><p className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#66728e]">Local profile</p></div></div>
      <nav className="mt-4 space-y-1" aria-label="Local archive menu">
        {([
          ["profile", UserRound, "Site profile", "Name and character"],
          ["settings", Settings2, "Settings", "Custom features"],
          ["bin", Trash2, "Bin", bin.length ? `${bin.length} stored safely` : "Nothing stored"],
          ["guide", HelpCircle, "Guide", "How Roamaps works"],
        ] as Array<[SheetPanel, ComponentType<{ className?: string }>, string, string]>).map(([panel, Icon, label, detail]) => <button key={panel} onClick={() => openSheet(panel)} className="flex w-full items-center gap-3 border border-transparent px-3 py-3 text-left transition-colors hover:border-[#273756] hover:bg-[#11192a]"><Icon className="h-4 w-4 text-[#8fa8ff]" /><span className="min-w-0"><span className="block text-sm font-medium text-[#e8edf9]">{label}</span><span className="block text-[11px] text-[#737e99]">{detail}</span></span><ArrowUpRight className="ml-auto h-3.5 w-3.5 text-[#55627f]" /></button>)}
      </nav>
      <div className="mt-auto border-t border-[#222a3c] pt-4"><p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#7082b7]"><ShieldCheck className="h-3.5 w-3.5" /> Local data stays in this browser</p></div>
    </>;
  }

  return <div className="relative min-h-screen overflow-hidden bg-[#090a0f] text-[#e4e4e7]">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_73%_18%,rgba(76,125,255,0.12),transparent_32%),linear-gradient(180deg,rgba(9,10,15,0.25),#090a0f_68%)]" />
    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[56%] bg-cover bg-center opacity-50 lg:block" style={{ backgroundImage: "url('/manus-storage/roamaps-canvas-constellation_dcda31e9.png')" }} />

    <header className="relative z-10 flex items-center justify-between px-6 pt-7 sm:px-10 lg:px-14">
      <div className="flex items-center gap-3.5"><button onClick={() => openSheet("menu")} className="group flex h-10 w-10 items-center justify-center border border-[#2d3852] bg-[#0c1019] text-[#98a9d3] transition-colors hover:border-[#6d8ee4] hover:text-white active:scale-[0.96]" aria-label="Open menu"><Menu className="h-5 w-5" /></button><div className="flex items-center gap-3.5" aria-label="Roamaps — visual thinking instrument"><div className="relative flex h-10 w-10 items-center justify-center border border-[#31466f]/70 bg-[#0c1019] shadow-[inset_0_0_0_1px_rgba(76,125,255,0.08)]"><img src="/manus-storage/roamaps-mark_a6c218e4.png" alt="" className="h-7 w-7 object-contain" /><span className="absolute -bottom-px -right-px h-1.5 w-1.5 bg-[#4c7dff]" /></div><div className="flex flex-col gap-0.5 leading-none"><span className="font-['Space_Grotesk',sans-serif] text-[0.98rem] font-semibold uppercase tracking-[-0.1em] text-[#e8edff]"><span className="text-[#6f92ff]">ROAM</span><span className="text-[#f0f3ff]">APS</span></span><span className="font-mono text-[7px] uppercase tracking-[0.27em] text-[#5e6a88]">Instrument / route archive</span></div></div></div>
      <span className="hidden font-mono text-[10px] uppercase tracking-[0.24em] text-[#596073] sm:block">Local canvas / v1</span>
    </header>

    <main className="relative z-10 px-6 pb-14 pt-20 sm:px-10 sm:pt-28 lg:px-14 lg:pt-36">
      <section className="max-w-3xl"><p className="mb-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.28em] text-[#6f8de3]"><span className="h-px w-8 bg-[#4c7dff]" /> Visual thinking instrument</p><h1 className="max-w-2xl font-['Space_Grotesk',sans-serif] text-5xl font-semibold leading-[0.98] tracking-[-0.065em] text-[#f2f4fa] sm:text-7xl">Build the shape of what you know.</h1><p className="mt-7 max-w-lg text-base leading-7 text-[#8a91a3]">A quiet canvas for turning subjects, systems, and loose ideas into maps you can see, edit, and follow.</p><div className="mt-9 flex flex-wrap items-center gap-3"><button onClick={() => setAddDialogOpen(true)} className="group flex items-center gap-2 rounded-sm border border-[#6f92ff] bg-[#4c7dff] px-4 py-3 font-['Space_Grotesk',sans-serif] text-sm font-medium text-white transition-all duration-200 hover:bg-[#628dff] active:scale-[0.97]"><Plus className="h-4 w-4" />Add Roadmap</button><span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5e6577]">No account required</span></div></section>

      <div aria-hidden="true" className="pointer-events-none relative mt-20 hidden h-14 max-w-6xl lg:mt-28 lg:block"><div className="absolute left-0 top-7 h-px w-[53%] bg-gradient-to-r from-[#4c7dff]/70 via-[#4c7dff]/22 to-transparent" /><div className="absolute left-[53%] top-7 h-5 w-5 -translate-x-1/2 -translate-y-1/2 border border-[#4c7dff]/60 bg-[#111827] shadow-[0_0_0_4px_rgba(9,10,15,0.9)]" /><div className="absolute left-[53%] top-7 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 bg-[#4c7dff]" /><div className="absolute left-[55%] top-3 font-mono text-[8px] uppercase tracking-[0.22em] text-[#5e6a88]">Archive junction / 02</div></div>

      <section className="relative mt-28 max-w-6xl border-l border-[#26314a]/55 pl-5 lg:mt-0 lg:pl-7"><span aria-hidden="true" className="absolute -left-[3px] top-0 h-10 w-[5px] bg-[#4c7dff] shadow-[0_0_16px_rgba(76,125,255,0.45)]" /><div className="mb-5 flex items-end justify-between gap-4 border-b border-[#1d2230] pb-3"><div><p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#68708a]">Archive junction / Your Roadmaps</p><p className="mt-2 text-sm text-[#71798d]">Trace a Roadmap or place a new pin.</p></div><div className="flex items-center gap-4"><ToggleGroup type="single" value={roadmapLayout} onValueChange={(layout) => { if (layout === "box" || layout === "list") setRoadmapLayout(layout); }} aria-label="Roadmap display format" className="border border-[#283043] bg-[#0d1018] p-0.5"><ToggleGroupItem value="box" aria-label="Box layout" title="Box layout" className="h-8 min-w-8 border-0 px-2 text-[#6d7895] hover:bg-[#151b29] hover:text-white data-[state=on]:bg-[#1d2d52] data-[state=on]:text-[#9ab4ff]"><Grid3X3 className="h-4 w-4" /></ToggleGroupItem><ToggleGroupItem value="list" aria-label="List layout" title="List layout" className="h-8 min-w-8 border-0 px-2 text-[#6d7895] hover:bg-[#151b29] hover:text-white data-[state=on]:bg-[#1d2d52] data-[state=on]:text-[#9ab4ff]"><List className="h-4 w-4" /></ToggleGroupItem></ToggleGroup><button onClick={() => setAddDialogOpen(true)} className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8195d8] transition-colors hover:text-white sm:flex">Add Roadmap <ArrowUpRight className="h-3.5 w-3.5" /></button></div></div>
        {trees.length === 0 ? <div className="max-w-3xl border border-dashed border-[#2d3850] bg-[#0d1119]/80 px-6 py-12 text-center"><Box className="mx-auto h-7 w-7 text-[#7492ec]" /><h2 className="mt-4 font-['Space_Grotesk',sans-serif] text-xl font-medium text-[#edf1fb]">Your archive is ready.</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#79839b]">Create a blank Roadmap or upload a CFD Jaal file. Nothing is pre-filled, so this space begins with your own ideas.</p><button onClick={() => setAddDialogOpen(true)} className="mt-6 border border-[#5d7fdc] px-4 py-2.5 text-sm font-medium text-[#c9d6ff] transition-colors hover:bg-[#1b2d59]">Add your first Roadmap</button></div> : <div className={roadmapLayout === "box" ? "grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-[1.08fr_0.92fr]" : "max-w-5xl divide-y divide-[#202637] border-y border-[#202637]"}>{trees.map((tree, index) => {
          const stats = roadmapStats(tree);
          const actionMenu = <DropdownMenu><DropdownMenuTrigger asChild><button onClick={(event) => event.stopPropagation()} className="relative z-10 flex h-8 w-8 items-center justify-center text-[#8795b8] transition-colors hover:bg-[#1b2947] hover:text-white" aria-label={`Roadmap actions for ${tree.title}`}><MoreHorizontal className="h-4 w-4" /></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="border-[#33405d] bg-[#101522] text-[#e7ecfa]"><DropdownMenuItem onSelect={() => { setRenameTree(tree); setRenameDraft(tree.title); }}><PencilLine />Edit name</DropdownMenuItem><DropdownMenuItem onSelect={() => { downloadCfdJaal(tree); toast.success("CFD Jaal download started."); }}><Download />Download CFD Jaal</DropdownMenuItem><DropdownMenuSeparator className="bg-[#2b3448]" /><DropdownMenuItem variant="destructive" onSelect={() => { moveTreeToBin(tree.id); toast.success(`${tree.title} moved to Bin.`); }}><Trash2 />Move to Bin</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
          return roadmapLayout === "box" ? <article key={tree.id} className={`group relative overflow-hidden rounded-[4px] border border-[#222837] bg-[#10131b]/90 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#4c7dff]/55 hover:bg-[#131824] ${index === 1 ? "md:translate-y-8" : ""}`} style={{ opacity: visible ? 1 : 0, transform: visible ? undefined : "translateY(14px)", transitionDelay: `${180 + index * 70}ms` }}><div className="absolute right-3 top-2">{actionMenu}</div><button onClick={() => navigate(`/tree/${tree.id.replace("tree-", "")}`)} className="block w-full text-left active:scale-[0.99]"><div className="absolute inset-y-0 left-0 w-[3px] bg-[#4c7dff]/35 transition-colors group-hover:bg-[#4c7dff]" /><div className="relative h-32 overflow-hidden border-b border-[#1d2230] bg-[#0c0f16]"><img src={index % 2 === 0 ? "/manus-storage/roamaps-tree-preview-a_c0166a80.png" : "/manus-storage/roamaps-tree-preview-b_1ff7c59e.png"} alt="" className="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-[1.04]" /><div className="absolute inset-0 bg-gradient-to-t from-[#10131b] via-transparent to-transparent" /><span className="absolute bottom-3 left-4 font-mono text-[8px] uppercase tracking-[0.22em] text-[#7581a0]">Local Roadmap / {String(index + 1).padStart(2, "0")}</span></div><div className="relative p-5"><div className="mb-5 flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5c6680]">Route sheet {String(index + 1).padStart(2, "0")} / local archive</span><GitBranch className="h-4 w-4 text-[#4c7dff]/80" strokeWidth={1.4} /></div><h2 className="font-['Space_Grotesk',sans-serif] text-xl font-medium tracking-[-0.03em] text-[#e9ecf5]">{archiveTitle(tree)}</h2><p className="mt-1.5 text-sm text-[#737b8e]">{archiveDescription(tree)}</p><div className="mt-6 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.13em] text-[#565f75]"><span>{stats.nodes} nodes</span><span>{stats.arrows} arrows</span><span className="ml-auto text-[#7888bd] transition-transform group-hover:translate-x-1">Trace →</span></div></div></button></article> : <article key={tree.id} className="group relative flex w-full items-center gap-4 overflow-hidden bg-[#0f131c]/72 px-4 py-3 text-left transition-colors duration-200 hover:bg-[#141c2b] sm:gap-5 sm:px-5"><span className="absolute inset-y-0 left-0 w-[3px] bg-[#4c7dff]/35 transition-colors group-hover:bg-[#4c7dff]" /><button onClick={() => navigate(`/tree/${tree.id.replace("tree-", "")}`)} className="flex min-w-0 flex-1 items-center gap-4 text-left active:scale-[0.995] sm:gap-5"><div className="relative h-14 w-20 shrink-0 overflow-hidden border border-[#252d40] bg-[#0c0f16] sm:h-16 sm:w-28"><img src={index % 2 === 0 ? "/manus-storage/roamaps-tree-preview-a_c0166a80.png" : "/manus-storage/roamaps-tree-preview-b_1ff7c59e.png"} alt="" className="h-full w-full object-cover opacity-75" /></div><div className="min-w-0 flex-1"><div className="mb-1 flex items-center gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#65708c]">Route sheet {String(index + 1).padStart(2, "0")}</span><GitBranch className="h-3.5 w-3.5 text-[#4c7dff]/80" strokeWidth={1.4} /></div><h2 className="truncate font-['Space_Grotesk',sans-serif] text-base font-medium tracking-[-0.025em] text-[#edf0f8] sm:text-lg">{archiveTitle(tree)}</h2><p className="mt-0.5 truncate text-xs text-[#778096] sm:text-sm">{archiveDescription(tree)}</p></div></button><div className="hidden items-center gap-4 font-mono text-[9px] uppercase tracking-[0.13em] text-[#65708b] sm:flex"><span>{stats.nodes} nodes</span><span>{stats.arrows} arrows</span></div>{actionMenu}</article>;
        })}</div>}</section>
    </main>

    <footer className="relative z-10 flex flex-col gap-2 border-t border-[#171b27] px-6 py-6 font-mono text-[10px] uppercase tracking-[0.16em] text-[#4e566a] sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-14"><span>Changes save automatically in this browser</span><span>Place a node. Draw the route.</span></footer>

    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}><SheetContent side="left" className="w-[19rem] max-w-[86vw] border-[#2d3851] bg-[#0b0e15] p-5 text-[#e4e8f5]"><SheetHeader className="sr-only"><SheetTitle>Roamaps local menu</SheetTitle><SheetDescription>Local archive controls</SheetDescription></SheetHeader>{renderSheet()}</SheetContent></Sheet>

    <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}><DialogContent className="border-[#33415f] bg-[#0d111a] text-[#e8edf9]"><DialogHeader><DialogTitle className="font-['Space_Grotesk',sans-serif] text-xl">Add Roadmap</DialogTitle><DialogDescription className="text-[#7d879f]">Create a blank local Roadmap or bring in one checked CFD Jaal file.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><button onClick={handleCreate} className="group border border-[#5879d4] bg-[#162345] p-5 text-left transition-colors hover:bg-[#1d3267]"><Plus className="h-5 w-5 text-[#b8c9ff]" /><p className="mt-5 font-medium text-white">Create a new</p><p className="mt-1 text-xs leading-5 text-[#9eb1e8]">Start with one node named New Roadmap.</p></button><button onClick={() => uploadInputRef.current?.click()} className="group border border-[#303a52] bg-[#101521] p-5 text-left transition-colors hover:border-[#607abf] hover:bg-[#151d2e]"><FileUp className="h-5 w-5 text-[#adc0f4]" /><p className="mt-5 font-medium text-white">Upload a file</p><p className="mt-1 text-xs leading-5 text-[#8896b5]">Choose any downloaded file. Roamaps adds it only when its CFD Jaal data passes every safety check.</p></button></div><input ref={uploadInputRef} type="file" accept="*/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; if (file) void readCfdJaalFile(file); }} /></DialogContent></Dialog>

    <Dialog open={Boolean(renameTree)} onOpenChange={(open) => { if (!open) setRenameTree(null); }}><DialogContent className="border-[#33415f] bg-[#0d111a] text-[#e8edf9]"><DialogHeader><DialogTitle>Edit Roadmap name</DialogTitle><DialogDescription className="text-[#7d879f]">This changes only the local archive name.</DialogDescription></DialogHeader><input autoFocus value={renameDraft} maxLength={120} onChange={(event) => setRenameDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveRename(); }} className="h-11 w-full border border-[#33405a] bg-[#090c13] px-3 text-sm text-white outline-none focus:border-[#7596f8]" /><DialogFooter><button onClick={() => setRenameTree(null)} className="px-4 py-2 text-sm text-[#a8b1c8] hover:text-white">Cancel</button><button onClick={saveRename} className="border border-[#6d8ff0] bg-[#4c7dff] px-4 py-2 text-sm font-medium text-white hover:bg-[#628dff]">Save name</button></DialogFooter></DialogContent></Dialog>

    <Dialog open={Boolean(pendingImport)} onOpenChange={(open) => { if (!open) setPendingImport(null); }}><DialogContent className="border-[#33415f] bg-[#0d111a] text-[#e8edf9]"><DialogHeader><DialogTitle>CFD Jaal safety check</DialogTitle><DialogDescription className="text-[#7d879f]">This file has passed its format checks. It will be added as a separate Roadmap.</DialogDescription></DialogHeader>{pendingImport && <div className="border border-[#2f3b57] bg-[#090d15] p-4"><p className="font-['Space_Grotesk',sans-serif] text-lg font-medium text-white">{pendingImport.preview.title}</p><p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8392b4]">{pendingImport.preview.nodeCount} nodes · {pendingImport.preview.arrowCount} arrows · {pendingImport.preview.noteCount} notes</p><p className="mt-3 text-xs text-[#76829c]">Created {new Date(pendingImport.preview.createdAt).toLocaleString()}</p>{pendingImport.preview.isAboveTreeTwo && <div className="mt-4 flex gap-2 border-l-2 border-amber-400/70 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />This is larger than Tree 2. It is safe to add, but it may feel slow on this device.</div>}</div>}<DialogFooter><button onClick={() => setPendingImport(null)} className="px-4 py-2 text-sm text-[#a8b1c8] hover:text-white">Cancel</button><button onClick={importPendingRoadmap} className="border border-[#6d8ff0] bg-[#4c7dff] px-4 py-2 text-sm font-medium text-white hover:bg-[#628dff]">Add separate Roadmap</button></DialogFooter></DialogContent></Dialog>

    <Dialog open={Boolean(confirming)} onOpenChange={(open) => { if (!open) setConfirming(null); }}><DialogContent className="border-[#533740] bg-[#120d12] text-[#f4e8eb]"><DialogHeader><DialogTitle>{confirming?.type === "empty" ? "Empty Bin?" : "Delete permanently?"}</DialogTitle><DialogDescription className="text-[#c5aab2]">{confirming?.type === "empty" ? "Every Roadmap in the Bin will be permanently deleted from this browser." : `“${confirming?.tree.title ?? "This Roadmap"}” cannot be restored after this.`}</DialogDescription></DialogHeader><DialogFooter><button onClick={() => setConfirming(null)} className="px-4 py-2 text-sm text-[#d8c0c6] hover:text-white">Cancel</button><button onClick={() => { if (confirming?.type === "empty") { emptyBin(); toast.success("Bin emptied."); } else if (confirming?.type === "delete") { deleteTreeFromBin(confirming.tree.id); toast.success("Roadmap permanently deleted."); } setConfirming(null); }} className="border border-red-400/60 bg-red-500/20 px-4 py-2 text-sm font-medium text-red-100 hover:bg-red-500/30">Delete permanently</button></DialogFooter></DialogContent></Dialog>
  </div>;
}
