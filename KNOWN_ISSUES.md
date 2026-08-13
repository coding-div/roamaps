# KNOWN_ISSUES.md — Roamaps

## Active Issues (Not Yet Fixed)

### Issue 1: Arrow Direction Not Always Perpendicular to Node Surface

**Severity:** High — user can clearly see this
**Status:** Partially fixed, still occurs
**Last reported:** In the message before the migration request

**Description:**
Some arrows still appear to hit the side of a node parallel to the edge (running along the side) instead of perpendicular (straight into the surface). The user describes it as "poking in the sides."

**Root Cause (Identified):**
The orthogonal path calculation (`getOrthogonalPath` in `TreeCanvas.tsx`) correctly computes exit and entry points that are perpendicular to the box surface. However, the **arrowhead marker** (`<marker id="arrowhead">`) is drawn with `orient="auto"` which should rotate to match the path direction. The issue occurs when:

1. The path has multiple segments (2-3 bends), and the arrowhead ends up on a segment that happens to be parallel to the target box's surface
2. The last segment of the path approaches the box from a direction that makes the arrowhead appear to "run along" the edge

**Specifically:** When `exitDir` and `entryDir` produce a path where the final segment is horizontal but the target box is positioned such that the arrow should be entering vertically (or vice versa), the arrowhead direction looks wrong.

**Affected Code:**
- `TreeCanvas.tsx` lines 84-173 (`getEdgePoint`, `getDirectionFromCenter`, `getOrthogonalPath`)
- `TreeCanvas.tsx` lines 62-71 (arrowhead marker definition)
- `TreeCanvas.tsx` lines 562-571 (visible path rendering with `markerEnd`)

**Suggested Fix:**
Instead of using SVG markers, draw the arrowhead manually as a polygon/path at the endpoint. Calculate the final direction of the last path segment and rotate the arrowhead to point perpendicular INTO the box surface (not along the path's last segment). The arrowhead should always point toward the center of the target box from the entry point.

### Issue 2: Crossing Arrows Not Visually Distinguishable

**Severity:** Medium
**Status:** Partially fixed, user says it's "not gone"
**Last reported:** In the message before the migration request

**Description:**
When two arrows cross each other, there's no clear visual way to tell which arrow is which. The current implementation draws a small dark circle (r=4px) at intersection points, but this is too subtle to see, especially when zoomed out or when arrows are the same color.

**Root Cause:**
The crossing detection (`pathsIntersect` function) works correctly for exact point intersections. However:
1. The visual indicator (4px dark circle) is too small and blends into the background
2. The detection only catches exact crossing points — if arrows run parallel side-by-side or overlap for a stretch, no indicator appears
3. The user wants a more obvious visual method: "half circle" or road-overpass style

**User's Proposed Solution:**
"When two arrows about to cross each other turn in a way like half circle" — like a road overpass where one arrow stays straight and the other makes a small arc/bump to go over it.

**Affected Code:**
- `TreeCanvas.tsx` lines 221-265 (`pathsIntersect` function)
- `TreeCanvas.tsx` lines 522-528 (crossing detection in `renderEdges`)
- `TreeCanvas.tsx` lines 572-584 (crossing circle rendering)

**Suggested Fix:**
Replace the small circle with a "bridge" effect: at each crossing point, create a gap in one of the paths and draw a semicircular arc (like an overpass) for the path that goes "over." This requires modifying the path data to split at the crossing point and insert an arc segment. Alternatively, use a larger, more visible indicator (e.g., a 8-10px circle with a white border).

### Issue 3: Cannot Remove First Node of an Independent Tree

**Severity:** High — blocks core functionality
**Status:** Confirmed bug, not fixed
**Last reported:** In the message before the migration request

**Description:**
After removing an arrow (which disconnects a subtree), the user cannot remove the root node of that now-independent subtree. The "Remove Node" action does nothing.

**Root Cause:**
In `ActionPanel.tsx`, the `handleRemoveNode` function (lines 84-126) searches for a parent node by iterating through all nodes looking for one that has the target as a child:

```typescript
for (const node of Object.values(tree.nodeMap)) {
  const idx = node.children.findIndex((c) => c.targetId === nodeId);
  if (idx !== -1) {
    parent = node;
    childIndex = idx;
    break;
  }
}
if (!parent) return; // ← This is the problem
```

When a subtree becomes independent (its parent arrow was removed), the root node of that subtree has NO parent in any other node's `children` array. So `parent` is `null`, and the function returns early without doing anything.

**Affected Code:**
- `ActionPanel.tsx` lines 92-103 (parent search loop and early return)

**Suggested Fix:**
Add a special case: if no parent is found AND the node is not the main tree root, allow removal. In this case:
- Remove the node itself from `nodeMap`
- Reconnect all its children to... nothing (they become independent) OR to a virtual "canvas root"
- OR: Add a "delete subtree" option that removes the node and all its descendants

**User's Intent (from sketch):**
The user's sketch (Image 1) shows that removing a node should remove the box and its incoming arrow, but children stay as independent nodes. The current code handles this correctly for nodes WITH parents. The bug is only for orphan root nodes.

## Historical Issues (Fixed)

| Issue | Fixed In | Description |
|-------|----------|-------------|
| Zoom not working on tablet | v6da192ed | Added pinch-to-zoom and +/- buttons |
| Color picker not appearing on touch | v3ba7110 | Moved long-press detection to element-level handlers |
| Remove deleting entire branch | v2590b5b | Changed getAllNodes/Edges to iterate nodeMap instead of traversing from root |
| Color picker only highlighting text not boxes | vb90db38 | Fixed highlight to apply to the full box rectangle |
| Remove node only removing arrow (not box) | v4221609e | Added actual node deletion from nodeMap |

## Potential Future Issues (Not Yet Occurred)

| Risk | Description |
|------|-------------|
| Stale `sourceChildIndex` after edge removal | When edges are removed, the index references in the edge list can become incorrect, causing wrong arrows to be edited/deleted |
| `renderKey` forcing full re-render | Every mutation forces a complete re-render of all nodes and edges, which could cause performance issues with large trees |
| No validation on tree structure | Direct mutation allows invalid states (e.g., circular references, orphaned nodes with no way to clean up) |
| Touch events on overlapping elements | If a node and arrow overlap visually, the wrong element might receive the long-press |
| ViewBox reset doesn't account for edited positions | If nodes are moved (future feature), the reset view might not center correctly |
