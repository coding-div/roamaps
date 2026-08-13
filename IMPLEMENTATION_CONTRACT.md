# Roamaps Editor Milestone — Implementation Contract

## Status

This is a plan-only contract. No implementation code should be changed until the user approves this contract.

## Locked decisions

Roamaps remains a dark-mode-only, client-side React application. Nodes remain independent objects, and arrows remain separate objects connecting two nodes. The user-provided drawing is the geometry reference: an arrow must leave the source rectangle perpendicularly, use only horizontal and vertical segments, and enter the target rectangle perpendicularly. It must stop at the target boundary and must never run along the side of a node as if it were attached tangentially.

When any node is removed, every arrow whose source or target is that node is removed as well. When the center/root node is removed, its former children are not reconnected and no child is promoted. They remain in the node map as independent nodes, so the canvas can display several disconnected trees.

## Scope of this milestone

The editor will receive six coordinated capabilities: reliable orthogonal arrow routing, removable root nodes, visible crossing bridges, reset/undo/redo history controls, drag-to-reposition nodes, and two-node selection for creating an arrow.

### 1. Orthogonal arrow routing

The current center-to-center side selection will be replaced with a port-and-route calculation. The router will choose source and target sides based on relative placement and available space, create an outward clearance segment from the source, create an inward clearance segment before the target, and connect them with horizontal/vertical segments. The final route segment will always be perpendicular to the target rectangle.

The SVG marker-based arrowhead will be removed. Each arrow will render a small manually calculated polygon at the end of the final route segment. This keeps the arrowhead orientation aligned with the actual last horizontal or vertical segment and ensures it does not overlap the node boundary.

The router will treat every other node rectangle as an obstacle. It will prefer a short route with a small clearance around obstacles and will fall back to a deterministic multi-segment route if the first candidate is blocked. It will not introduce curved or Bezier paths.

### 2. Root removal and independent trees

The data model will explicitly support a roadmap with no active root. The node map will remain the source of truth for rendering all nodes, including disconnected nodes. Removing a node will delete it from the node map and filter all incoming and outgoing child references to it. If the removed node is the current root, the roadmap root reference will become empty rather than being reassigned to a child.

Existing UI code that identifies the root will be updated to handle an empty root safely. The home-page preview will use a surviving node color when no root exists, without changing the user’s saved nodes or arrows.

### 3. Crossing arrows

Orthogonal route segments will be represented as geometry rather than only as a path string. When two arrow segments cross at a true horizontal/vertical intersection, the renderer will draw a small bridge/arch on one route and keep the other route visually continuous. The crossing will receive a short background-colored gap or masked bridge treatment so the overpass is visible at normal zoom. Intersections that merely touch at an endpoint or share a node port will not receive a bridge.

### 4. Reset, undo, and redo

The roadmap context will wrap the existing reducer with a history model containing the current tree collection, past snapshots, and future snapshots. Every successful content edit will create one history entry; repeated invalid actions will not create entries. Undo will move to the previous snapshot, redo will restore the next snapshot, and any new edit after undo will clear the redo branch.

Reset will restore the original two demo trees and clear the redo branch. It will be treated as one undoable action. The existing localStorage persistence will save only the current tree collection, not transient history, so a browser reload restores the visible roadmap state without serializing unnecessary history data.

The toolbar will show compact undo, redo, and reset controls. Undo and redo will be disabled when their corresponding history direction is unavailable. Reset will use the existing dark visual language and will provide a confirmation toast rather than a blocking browser dialog.

### 5. Drag-to-reposition nodes

Nodes will support pointer-based dragging. Pointer capture will keep the gesture active if the finger or cursor moves beyond the original SVG element. Screen coordinates will be converted through the current SVG viewBox so dragging remains correct at every zoom level. Arrows will recalculate from the live node positions while dragging, and one move gesture will create one history entry when the gesture ends.

Dragging will not accidentally start canvas panning, long-press editing, or connection creation. A short movement threshold will distinguish a drag from a tap. Existing touch pinch/pan behavior will remain available on the canvas background.

### 6. Two-node selection and arrow creation

Connect mode will become a two-node selection flow. The first tapped node will be visibly selected; tapping a second node will create one arrow between the two nodes, using the current arrow-color default, then clear the selection and leave connect mode. Tapping the same node twice or attempting an already-existing arrow will do nothing except show a small explanatory toast.

The flow will support a two-node multiselect on the tablet through sequential taps, which avoids requiring a desktop keyboard modifier. The selected state will be visually distinct from the normal hover/press state and will not interfere with node dragging.

## Files and boundaries

| File | Planned responsibility |
|---|---|
| `client/src/lib/treeData.ts` | Update the roadmap root type and add small geometry/data helpers needed by the editor. Preserve the flat node map and disconnected-node traversal. |
| `client/src/contexts/RoadmapContext.tsx` | Implement root-safe node removal, move-node actions, history snapshots, undo/redo actions, and reset semantics. Keep persistence at the context boundary. |
| `client/src/components/TreeCanvas.tsx` | Implement obstacle-aware orthogonal route geometry, manual arrowheads, crossing bridges, node dragging, two-node selection, and toolbar controls. Keep rendering and pointer interpretation in the canvas layer. |
| `client/src/components/ActionPanel.tsx` | Keep node/arrow editing aligned with the updated root-safe model and use stable source/target identity for arrow operations. |
| `client/src/pages/Home.tsx` | Make the roadmap preview safe when a roadmap has no active root. |
| `client/src/index.css` or the existing UI registry, only if needed | Reuse the Obsidian Cartography tokens and record any new toolbar/selection pattern without introducing a new visual language. |

No database, account, file-storage, sharing, or external API work is included in this milestone.

## Verification contract

Before handing the result to the user, the implementation must pass TypeScript checking and the production build. Browser verification will cover: creating independent nodes, dragging nodes at more than one zoom level, creating an arrow through two-node selection, confirming perpendicular entry and exit, moving nodes across an obstacle, observing a bridge at a crossing, removing a normal node, removing the root and observing independent trees, undoing and redoing edits, resetting the demo data, and refreshing to confirm current-state persistence.

After implementation, `/imprint` will report any visual-token drift, and `/review` will compare the code against this contract and report findings as Critical, Important, or Minor. Review findings will be reported without automatic fixes so the user can decide what should change.

