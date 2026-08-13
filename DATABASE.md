# DATABASE.md — Roamaps

## Current State: No Database

This project has **no database**. All data is hardcoded in the source code. This is intentional for Phase 1/2 (prototype/model stage). The user explicitly said "right now I am just building a model."

## Data Storage (Current)

Tree data lives in a single TypeScript file:

```
client/src/lib/treeData.ts
```

This file contains:
- Type definitions (`NodeData`, `TreeMap`, `NodeColor`)
- The VIBGYOR color palette (`VIBGYOR_COLORS`, `COLOR_ORDER`)
- Constants (`MAX_LABEL_LENGTH`, box size limits)
- Helper functions (`getAllEdges`, `getAllNodes`)
- Two hardcoded demo trees (`allTrees` array)

## Data Model (Detailed)

### NodeData

```typescript
interface NodeData {
  id: string;                        // Unique identifier (e.g., "n1", "n2")
  label: string;                     // Display text (max 50 chars)
  color: NodeColor;                  // Key into VIBGYOR_COLORS (e.g., "violet", "blue")
  x: number;                         // X coordinate on canvas (in SVG units)
  y: number;                         // Y coordinate on canvas (in SVG units)
  children: Array<{                  // Outgoing connections
    targetId: string;                // ID of the child node
    color: NodeColor;                // Color of the arrow connecting to this child
  }>;
}
```

### TreeMap

```typescript
interface TreeMap {
  id: string;                        // e.g., "tree-1", "tree-2"
  title: string;                     // Display title on landing page
  description: string;               // Short description
  maxDepth: number;                  // 3 or 8 (levels of branching)
  root: NodeData;                    // The central/main topic node
  nodeMap: Record<string, NodeData>; // ALL nodes keyed by ID (flat lookup)
}
```

### VIBGYOR Colors

```typescript
const VIBGYOR_COLORS: Record<NodeColor, string> = {
  violet: "#8B5CF6",
  indigo: "#6366F1",
  blue: "#3B82F6",
  green: "#22C55E",
  yellow: "#EAB308",
  orange: "#F97316",
  red: "#EF4444",
};
```

## Constants

```typescript
const MAX_LABEL_LENGTH = 50;
const MIN_BOX_W = 100;
const MIN_BOX_H = 36;
const MAX_BOX_W = 280;
const MAX_BOX_H = 120;
const FONT_SIZE = 12;
const CHAR_WIDTH = 7.2;
const LINE_HEIGHT = 18;
const ROOT_FONT_SIZE = 14;
```

## Proposed Data Model (Future — Flat Model)

As discussed in the project audit, the recommended future architecture uses a **flat data model** instead of nested children:

```typescript
// Flat model — nodes and edges are separate lists
interface FlatNode {
  id: string;
  label: string;
  color: NodeColor;
  x: number;
  y: number;
  treeId: string;
}

interface FlatEdge {
  id: string;
  sourceId: string;   // Parent node
  targetId: string;   // Child node
  color: NodeColor;
  treeId: string;
}

interface FlatTree {
  id: string;
  title: string;
  rootId: string;     // Reference to the root node
  nodeIds: string[];  // List of all node IDs in this tree
  edgeIds: string[];  // List of all edge IDs in this tree
}
```

**Advantages of the flat model:**
- Removing a node = deleting the node + edges connected to it. Children are unaffected.
- No "can't find parent" bug — edges are independent records.
- Easier to add undo/redo (just push/pop from a history array).
- Easier to persist (serialize/deserialize flat arrays).
- Easier to add "add node" and "add arrow" features.

## Persistence (Not Yet Implemented)

When persistence is added, the options discussed were:

| Option | Pros | Cons |
|--------|------|------|
| `localStorage` | Simple, works immediately, no backend needed | Limited to ~5MB, per-browser, no sync across devices |
| Backend database (PostgreSQL) | Full persistence, multi-device sync, user accounts | Requires upgrading to full-stack project, more complexity |

**User's preference (when asked):** Not yet confirmed. The user was asked about persistence but the migration happened before they could answer.

**Recommendation:** Start with `localStorage` for simplicity. If the user wants multi-device sync or sharing later, upgrade to full-stack with a database.
