# ARCHITECTURE.md — Roamaps

## High-Level Architecture

Roamaps is a **static frontend-only** React application. There is no backend server, no database, and no API calls. All tree data is hardcoded in the source code.

```
┌─────────────────────────────────────────────────────┐
│  React 19 + Wouter (client-side routing)             │
│  ┌───────────────────────────────────────────────┐  │
│  │  App.tsx                                       │  │
│  │  ├── ThemeProvider (forced dark)               │  │
│  │  ├── Router                                    │  │
│  │  │   ├── "/"        → Home (landing page)      │  │
│  │  │   └── "/tree/:id" → TreeView (full canvas)  │  │
│  │  └── ErrorBoundary                             │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  Pages:                                              │
│  ┌─ Home.tsx        (tree cards, no menu)           │
│  └─ TreeView.tsx    (title bar + TreeCanvas)        │
│                                                      │
│  Components:                                         │
│  ┌─ TreeCanvas.tsx  (SVG rendering, zoom/pan,        │
│  │                    orthogonal paths, long-press)  │
│  ├─ ActionPanel.tsx  (popup: color/label/remove)     │
│  └─ ColorPicker.tsx  (OBSOLETE — leftover, unused)   │
│                                                      │
│  Data:                                               │
│  └─ treeData.ts     (TreeMap type, NodeData,        │
│                      allTrees[], getAllEdges(),      │
│                      getAllNodes())                   │
└─────────────────────────────────────────────────────┘
```

## Data Architecture (Current — NESTED TREE MODEL)

The tree is stored as a **nested object** with a `nodeMap` and a `root` reference.

```typescript
interface NodeData {
  id: string;
  label: string;
  color: NodeColor;  // VIBGYOR key
  x: number;
  y: number;
  children: Array<{ targetId: string; color: NodeColor }>;
}

interface TreeMap {
  id: string;
  title: string;
  description: string;
  maxDepth: number;
  root: NodeData;
  nodeMap: Record<string, NodeData>;
}
```

**Critical flaw in this architecture:** The `nodeMap` is a flat dictionary of ALL nodes, but `children` references are stored on each parent node. When a node is disconnected (arrow removed), it still exists in `nodeMap` but has no parent reference. This causes the "can't remove first node of independent tree" bug — because `handleRemoveNode` looks for a parent in the tree, and orphaned root nodes have no parent.

**Additionally:** `getAllEdges()` and `getAllNodes()` iterate over the `nodeMap` but the edge list is computed from parent→child relationships. When arrows are removed, the `sourceChildIndex` index used to reference edges can become stale.

## State Management Architecture

**There is NO proper state management.** The application uses direct object mutation:

1. `TreeCanvas` receives the `tree` object as a prop
2. `ActionPanel` receives the same `tree` object
3. `ActionPanel` **directly mutates** the tree (e.g., `node.color = color`, `parent.children.splice(...)`)
4. `ActionPanel` then calls `onTreeChange()` which triggers `forceRerender()` (increments a `renderKey` state)
5. `TreeCanvas` re-renders with the new key

This is the **root cause** of most bugs:
- No undo/redo possible (mutations are irreversible)
- No persistence (changes are lost on refresh)
- No validation layer (mutations can corrupt the tree structure)
- Components are tightly coupled to the tree object
- React's reconciliation cannot detect changes since the reference doesn't change

## Rendering Architecture

The canvas is a single full-screen `<svg>` element inside a `<div>` container.

- **Zoom/Pan:** Implemented via SVG `viewBox` manipulation (not CSS transforms). This is why zoom works on tablet (pinch-to-zoom recalculates viewBox).
- **Dot Grid:** A static SVG pattern fills the background.
- **Edges:** Rendered as SVG `<path>` elements with orthogonal coordinates.
- **Nodes:** Rendered as SVG `<g>` groups containing a `<rect>` and `<text>` elements.
- **Long-Press:** Timer-based detection (500ms threshold) on both touch and mouse events.

## Touch Event Architecture

Touch handling has two competing systems:

1. **SVG-level touch handlers** — handle pinch-to-zoom (2 fingers) and pan (1 finger on background)
2. **Element-level touch handlers** — handle long-press on nodes and arrows

The SVG-level handler checks if the touch target is a node or arrow and **returns early** (doesn't start pan). The element-level handlers call `e.stopPropagation()` to prevent the SVG handler from interfering. This design has caused historical bugs with long-press not firing.

## Routing

Uses `wouter` (lightweight React router):

```
"/"                    → Home (landing page with tree cards)
"/tree/:treeId"        → TreeView (full-screen canvas)
"/404"                 → NotFound
"*" (fallback)         → NotFound
```

## Dependencies (What's Actually Used)

| Package | Purpose |
|---------|---------|
| `react` + `react-dom` | Core UI framework |
| `wouter` | Client-side routing |
| `framer-motion` | Animations (card entrance) |
| `lucide-react` | Icons (ArrowLeft, Plus, Minus, Home, Palette, Type, Trash2, X, Check, GitBranch) |
| `sonner` | Toast notifications |
| `next-themes` | Theme provider (forced dark) |
| `tailwindcss` | Utility CSS framework |
| `tailwindcss-animate` | Tailwind animation plugin |
| `nanoid` | ID generation (not currently used but available) |

Most other packages in `package.json` (Radix UI components, recharts, zod, etc.) are **inherited from the template** and NOT used by the application.

## Obsolete Files

- `client/src/components/ColorPicker.tsx` — The old standalone color picker from Phase 1. It is no longer imported anywhere. It should be removed or documented as legacy.
