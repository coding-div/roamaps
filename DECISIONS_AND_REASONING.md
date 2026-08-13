# DECISIONS_AND_REASONING.md — Roamaps

## Design Decisions

### 1. Dark Mode Only (No Toggle)
**Decision:** The entire application is forced dark. There is no theme toggle.
**Reasoning:** The user explicitly requested "completely in dark mode" as a hard requirement. The `ThemeProvider` in `App.tsx` sets `defaultTheme="dark"` without the `switchable` prop.
**File:** `App.tsx` line 30-32

### 2. No Navigation Menu
**Decision:** The app has no header navigation, sidebar, or hamburger menu. The only navigation is the Back button on tree views.
**Reasoning:** The user explicitly requested no menu. The design philosophy is "content-first" — the tree is the only focus.
**File:** `TreeView.tsx` (only has Back + title)

### 3. No User Authentication
**Decision:** No login, no profiles, no user accounts.
**Reasoning:** Explicitly requested by the user. Phase 1 is a prototype/model, not a multi-user product.

### 4. Obsidian Canvas Aesthetic
**Decision:** The visual style follows a dark productivity-tool aesthetic inspired by Obsidian Canvas and Excalidraw dark mode.
**Reasoning:** Chosen during the design brainstorm (see `ideas.md`). Key elements: near-black background (#0a0a0f), dot grid, crisp orthogonal lines, VIBGYOR color accents on dark, Space Grotesk + Inter + JetBrains Mono fonts.

### 5. SVG viewBox for Zoom/Pan (Not CSS Transforms)
**Decision:** Zoom and pan are implemented by manipulating the SVG `viewBox` attribute directly.
**Reasoning:** This approach works correctly with touch devices (pinch-to-zoom) because it recalculates the coordinate space rather than applying CSS transforms which can conflict with touch gestures. CSS transforms on SVG can cause rendering issues and don't play well with touch events.

### 6. VIBGYOR Color Palette (7 Colors)
**Decision:** Exactly 7 colors: Violet, Indigo, Blue, Green, Yellow, Orange, Red.
**Reasoning:** Explicitly requested by the user. These are the "rainbow" colors that are visually distinct and work well on dark backgrounds.

### 7. Long-Press (Hold) Instead of Click for Actions
**Decision:** Long-press (500ms hold) triggers the action panel, not a regular click.
**Reasoning:** On a tablet, a regular click/tap is ambiguous — it could mean "select" or "interact." Long-press clearly separates "just looking" from "wanting to edit." This is a common pattern in mobile apps.

### 8. Orthogonal (Right-Angle) Paths
**Decision:** All connecting lines use 90-degree turns only, never diagonal.
**Reasoning:** The user's original sketch shows orthogonal paths. This creates a clean, structured look that's easier to follow visually.

### 9. Direct Object Mutation (Current State)
**Decision:** Tree data is mutated directly by the ActionPanel component.
**Reasoning:** This was the initial implementation approach for Phase 1/2 simplicity. It was NOT a deliberate architectural choice — it's a shortcut that has caused multiple bugs. The audit document recommends replacing this with `useReducer` in a future phase.

### 10. Hardcoded Demo Trees
**Decision:** Tree data is hardcoded in `treeData.ts` rather than loaded from an API or file.
**Reasoning:** Phase 1/2 is a prototype. The user said "right now I am just building a model." Future phases will add dynamic tree creation.

### 11. Node Removal with Chain Reconnection
**Decision:** When removing a node, its children reconnect to its parent (A→B→C becomes A→C).
**Reasoning:** The user clarified this with an example: "removing arrow attach the previous arrow to the arrows that start from that node." This is like removing a link in a chain — the chain reconnects around it.

### 12. Arrow Removal Creates Independent Trees
**Decision:** Removing an arrow disconnects the child subtree but leaves it on the canvas.
**Reasoning:** The user confirmed: "if I now try to remove the first node in that new tree it won't be removed" — this is acknowledged as desired behavior (the subtree stays), though the inability to then remove that subtree's root is a known bug.

### 13. Box Size Constraints
**Decision:** Min 100x36, Max 280x120. Auto-resize within these bounds.
**Reasoning:** The user specified: "box can be any rectangle within a certain limit of area it should cover" and "current area of boxes is lowest, and length and width also lowest" — meaning boxes start at minimum size and grow as needed.

### 14. 50-Character Label Limit
**Decision:** Maximum 50 characters including spaces and blank lines.
**Reasoning:** Explicitly stated by the user: "max 50 characters, space and blank lines included."

### 15. Independent Arrow Colors
**Decision:** Each arrow has its own color stored separately from node colors.
**Reasoning:** The user stated: "a box and arrow can be different colors" and "arrows can be different colors" — meaning arrows are not forced to match their target node's color.

## Rejected Alternatives

| Alternative | Why Rejected |
|-------------|--------------|
| Click to open action panel | Would conflict with pan/drag gestures on touch |
| Right-click context menu | Not available on touch devices (tablet) |
| CSS transform-based zoom | Conflicts with touch events, causes rendering issues |
| Curved/Bezier arrow paths | User's sketch explicitly shows right-angle turns |
| Symmetric radial tree layout | User said "too symmetric" — wants organic spread |
| Light theme option | User explicitly wants dark mode only |
| Menu/navigation bar | User explicitly doesn't want a menu |

## Lessons Learned (Mistakes Made)

### Mistake 1: Patching Symptoms Instead of Root Causes
Multiple bugs (zoom not working, color picker not appearing, remove deleting branches) were patched individually when they all stemmed from the same architectural problem: lack of proper state management. Each patch introduced new issues.

### Mistake 2: Direct Object Mutation Without React Awareness
Mutating the tree object directly and forcing re-render with a `renderKey` increment works but is fragile. React cannot track what changed, leading to stale references and unpredictable behavior.

### Mistake 3: Touch Event Conflict Between Zoom and Long-Press
The SVG-level touch handler and element-level touch handlers competed for the same events. Fixing one often broke the other. The solution (element-level handlers with `stopPropagation`) works but is fragile.

### Mistake 4: Bikeshedding on Polish Before Core Features
Time was spent on zoom buttons, reset view, and dot grid polish while the core feature (adding nodes/arrows) was never built. The app is a viewer/editor of existing trees, not a builder.

### Mistake 5: No Documentation of Decisions
Each session repeated mistakes because decisions weren't recorded. The user couldn't remember what was discussed, and the code didn't explain WHY certain approaches were chosen.
