# REQUIREMENTS.md — Roamaps

## Current (Active) Requirements

These are the requirements confirmed by the user as of the latest checkpoint (v4221609e). They are organized by category.

### UI/UX Requirements

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Website must be completely in dark mode | IMPLEMENTED |
| 2 | No navigation menu | IMPLEMENTED |
| 3 | No user profile / login system | IMPLEMENTED |
| 4 | Landing page shows tree cards in a simple list/gallery format | IMPLEMENTED |
| 5 | Clicking a tree opens it on a full-screen canvas | IMPLEMENTED |
| 6 | Title of the subject at the top of the tree view | IMPLEMENTED |
| 7 | Back button to return to the landing page | IMPLEMENTED |
| 8 | Zoom in/out support on tablet (pinch-to-zoom AND visible +/- buttons) | IMPLEMENTED |
| 9 | Pan/drag support (single finger) | IMPLEMENTED |
| 10 | Reset view button (snap back to default centered view) | IMPLEMENTED |
| 11 | Long-press (hold ~0.5s) on a node OR arrow triggers an action panel | IMPLEMENTED |
| 12 | Action panel options for nodes: Edit Color, Edit Label, Remove Node | IMPLEMENTED |
| 13 | Action panel options for arrows: Edit Color, Remove Arrow | IMPLEMENTED |
| 14 | Connecting lines must be orthogonal (right-angle turns, like the user's sketch) | IMPLEMENTED |

### Tree Structure Requirements

| # | Requirement | Status |
|---|-------------|--------|
| 15 | Tree branches in all directions (up, down, left, right) from a central root | IMPLEMENTED |
| 16 | Tree 1: up to 3 levels deep (small tree) | IMPLEMENTED |
| 17 | Tree 2: up to 8 levels deep (big tree) | IMPLEMENTED |
| 18 | Branches should NOT be symmetric — organic/asymmetric spread like a real tree | IMPLEMENTED |
| 19 | Each branch can grow up to its max depth (3 or 8 levels) | IMPLEMENTED |
| 20 | Phase 1 has exactly 2 demo trees | IMPLEMENTED |
| 21 | Future phases will add more trees (gallery/list format planned) | PLANNED |

### Node Requirements

| # | Requirement | Status |
|---|-------------|--------|
| 22 | Nodes are rectangular boxes | IMPLEMENTED |
| 23 | Nodes can be empty, contain text, emoji, numbers, or symbols (e.g., ^@&#£) | IMPLEMENTED |
| 24 | Nodes cannot contain images, memes, or GIFs | IMPLEMENTED (by omission — no image support exists) |
| 25 | Max label length: 50 characters (including spaces and blank lines) | IMPLEMENTED |
| 26 | Boxes auto-resize to fit content with text wrapping | IMPLEMENTED |
| 27 | Max box width: 280px, Max box height: 120px | IMPLEMENTED |
| 28 | Min box width: 100px, Min box height: 36px | IMPLEMENTED |
| 29 | Empty boxes have minimum dimensions | IMPLEMENTED |
| 30 | Box colors from VIBGYOR palette (7 colors) | IMPLEMENTED |
| 31 | The initial Main Topic is a demo starting node; no node has special root-only behavior | ACTIVE — visual treatment to be reconciled in branch stage |

### Arrow/Edge Requirements

| # | Requirement | Status |
|---|-------------|--------|
| 32 | Arrow colors are independent of box colors (can be different) | IMPLEMENTED |
| 33 | Each arrow has its own VIBGYOR color | IMPLEMENTED |
| 34 | Arrows must exit and enter nodes perpendicular to the surface (90° to the side) | PARTIAL — see KNOWN_ISSUES.md |
| 35 | Crossing arrows must be visually distinguishable | PARTIAL — see KNOWN_ISSUES.md |

### Remove Behavior Requirements

| # | Requirement | Status |
|---|-------------|--------|
| 36 | Remove Node: when both incoming and outgoing arrows exist, reconnect every incoming source to every outgoing target before removing the node; otherwise remove the connected arrows | ACTIVE — branch-stage implementation |
| 37 | Remove Arrow: removes only the arrow; both boxes remain as independent nodes | IMPLEMENTED |
| 38 | Every node, including the first/demo node, can be removed | ACTIVE — no special center/root deletion rule |

## Obsolete / Replaced Requirements

The following were discussed but later corrected or superseded:

| Original Requirement | Correction |
|---------------------|------------|
| "Long-press pops up a simple color template" (Phase 1) | Replaced by full ActionPanel with multiple options (Phase 2) |
| "Removing a node removes the box + arrow, children become independent" (initial interpretation) | Corrected to: children reconnect to the grandparent (chain reconnection) |
| "Removing an arrow makes 2 separate trees" (accepted) | Still valid — removing an arrow disconnects the child subtree |
| "Small tree has 3 branches, big tree has 8 branches" | Clarified: Tree 1 has 3 LEVELS deep, Tree 2 has 8 LEVELS deep |
| Color palette: "7 main colors" | Specified as VIBGYOR: violet, indigo, blue, green, yellow, orange, red |
| "Box can be any rectangle within a certain area limit" | Quantified: min 100x36, max 280x120 |
| "Box auto-resize but with limits" | Quantified with specific max/min values above |

## Constraints

- No external navigation menu — only Back button for escape route
- No user authentication or accounts
- Must work on tablet (touch-first, no scroll wheel assumption)
- Dark mode only — no light theme option
- Static frontend only (no backend in current architecture)
- All tree data is currently hardcoded in the source code

## Branch-stage decisions (confirmed)

The existing A/B two-node connection method remains unchanged and continues to be available. A new branch workflow will add a movable, persistent joiner: a small visible, selectable, unlabeled node-like object. A joiner can be placed on an existing arrow, is not treated as a routing obstacle, and can receive or emit multiple arrows. After placement, the joiner remains as an editable object rather than collapsing into plain arrow geometry.

The branch graph is allowed to contain cycles. Duplicate arrows in the same direction between the same source and target are blocked. Reverse-direction arrows are allowed as separate objects and must use distinct parallel lanes rather than overlap. A joiner placed on an existing arrow will split that arrow into source → joiner → target. Removing a node or joiner uses the same bypass rule: with incoming and outgoing arrows, create every incoming-source to outgoing-target connection, skip duplicates, then remove the object; with only one side of connections, remove those connected arrows.
