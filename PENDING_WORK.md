# PENDING_WORK.md — Roamaps

## Immediate Priorities (Bugs to Fix First)

These are the three open issues the user reported. Fix these before adding any new features.

### 1. Fix Arrow Perpendicular Direction
**Priority:** Critical
**Effort:** Medium
**Description:** Some arrows still appear parallel to the node surface instead of perpendicular. The arrowhead should always point straight INTO the box surface (90° to the edge it enters).
**Approach:** Replace SVG `markerEnd` with manually drawn arrowhead polygons. Calculate the entry direction from the last path segment and ensure the arrowhead points toward the center of the target box.
**Reference:** See KNOWN_ISSUES.md Issue 1 for detailed root cause analysis.

### 2. Improve Crossing Arrow Visibility
**Priority:** High
**Effort:** Medium-High
**Description:** Crossing arrows are not visually distinguishable. User wants a "half circle" or overpass effect where one arrow arcs over the other.
**Approach:** At each detected crossing point, split the "over" path and insert a semicircular arc segment. The "under" path gets a small gap. Alternatively, use a larger visual indicator (8-10px circle with white border).
**Reference:** See KNOWN_ISSUES.md Issue 2.

### 3. Fix Remove on Independent Tree Roots
**Priority:** Critical
**Effort:** Low
**Description:** After removing an arrow to create an independent subtree, the root node of that subtree cannot be removed.
**Approach:** In `ActionPanel.tsx` `handleRemoveNode`, add a special case: if no parent is found AND the node is not the main tree root (`tree.root.id`), allow removal. Remove the node from `nodeMap` and let its children become independent (or remove them too — confirm with user).
**Reference:** See KNOWN_ISSUES.md Issue 3.

## Feature Backlog (In Order of Priority)

### Phase 4 — Core Editing Features

#### 4. Add Node
**Description:** Allow creating new nodes. User long-presses on empty canvas space → "Add Node" option appears → new node is placed nearby.
**Considerations:**
- Where to place the new node? (near the long-press position, or auto-place near parent)
- Should the new node automatically connect to the nearest existing node?
- What color should it default to?

#### 5. Add Arrow (Connect Nodes)
**Description:** Allow creating connections between existing nodes. User long-presses on a node → "Add Arrow" → selects target node → arrow is drawn.
**Considerations:**
- How does the user select the target? (tap another node, or drag from source to target)
- Should the arrow direction be auto-determined by relative positions?
- What color does it default to?

#### 6. Drag-to-Reposition Nodes
**Description:** Allow moving nodes around the canvas by dragging them.
**Considerations:**
- Arrows must update in real-time as the node moves
- Orthogonal path must recalculate on every drag frame
- Performance: only re-render affected edges, not the whole tree

#### 7. Undo/Redo
**Description:** Allow reversing accidental changes (color, label, remove).
**Considerations:**
- Requires implementing proper state management (useReducer or similar)
- Store action history as a stack
- Max history depth (e.g., 50 actions)

### Phase 5 — Persistence & Multi-Tree

#### 8. Local Storage Persistence
**Description:** Save user edits so they survive page refresh.
**Approach:** Serialize the tree state to `localStorage` after each mutation. Load on page visit.
**Considerations:** Which tree(s) to persist? All of them? Only edited ones?

#### 9. Create New Trees
**Description:** Allow users to create new empty trees from the landing page.
**Approach:** Add a "+" button on the landing page → creates a new tree with just a root node → opens the canvas editor.

#### 10. Tree Gallery / List View
**Description:** When more trees exist, show them in a browsable format.
**Considerations:** Grid layout? List? Categories? Search?

### Phase 6 — Advanced Features

#### 11. Export/Share Trees
**Description:** Allow exporting a tree as an image or sharing a link.
**Considerations:** SVG export? PNG screenshot? Shareable URL with tree data encoded?

#### 12. Backend + User Accounts
**Description:** If the user wants multi-device sync or sharing with others.
**Approach:** Upgrade to full-stack project, add PostgreSQL database, add authentication.
**Note:** Only if the user explicitly requests this. They have not asked for accounts.

## Rejected / Not Planned

| Feature | Why Rejected |
|---------|--------------|
| Images/memes/GIFs in nodes | User explicitly said no images |
| Light mode toggle | User wants dark mode only |
| Navigation menu | User explicitly doesn't want a menu |
| User profiles/login | Not requested for current phase |
| Curved/Bezier paths | User wants orthogonal (right-angle) only |

## Questions Pending User Answers

These were asked but not yet answered before the migration:

1. **Persistence preference:** localStorage or backend database?
2. **New tree creation:** Start from blank canvas, or from a template?
3. **New node placement:** Auto-place near parent, or manually position?
4. **Demo trees:** Keep as hardcoded examples or convert to new model?
5. **Arrow overpass direction:** Which arrow goes "over" at a crossing? (Top one? First drawn? Configurable?)
6. **Remove independent subtree root:** Should it remove just that node (children become independent) or the entire subtree?
