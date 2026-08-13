# CONTINUATION_INSTRUCTIONS.md — Roamaps

## How to Continue This Project

This document provides step-by-step instructions for a new Manus account to pick up and continue developing Roamaps.

## Step 1: Set Up the Environment

1. **Clone or import the project** from GitHub: `https://github.com/coding-div/roamaps`
2. **Verify the latest checkpoint** matches GitHub commit on `main` branch
3. **Install dependencies:** `pnpm install` (or let the Manus platform handle this)
4. **Start the dev server:** The Manus webdev environment will handle this automatically

## Step 2: Read the Documentation (In This Order)

1. `PROJECT_CONTEXT.md` — Understand what Roamaps is and who the user is
2. `REQUIREMENTS.md` — Know what's required and what's already done
3. `ARCHITECTURE.md` — Understand how the code is structured
4. `KNOWN_ISSUES.md` — Know the 3 active bugs that MUST be fixed first
5. `PENDING_WORK.md` — Know what features to build after bugs are fixed
6. `DECISIONS_AND_REASONING.md` — Understand why things were built this way
7. `DATABASE.md` — Understand the data model
8. `INTEGRATIONS_AND_CONFIG.md` — Know the config and env vars

## Step 3: Fix the 3 Active Bugs (DO THIS FIRST)

Do NOT add new features until these are fixed. The user has already reported these and they block progress.

### Bug 1: Arrow Perpendicular Direction
- **File:** `client/src/components/TreeCanvas.tsx`
- **What to change:** The arrowhead marker (lines 62-71, 562-571). Replace `markerEnd="url(#arrowhead)"` with manually drawn arrowhead polygons that always point perpendicular INTO the target box surface.
- **Test:** Zoom in on tree nodes and verify every arrowhead points straight at the box edge (not along it).

### Bug 2: Crossing Arrow Visibility
- **File:** `client/src/components/TreeCanvas.tsx`
- **What to change:** The crossing circle rendering (lines 572-584). Replace the 4px dark circle with a more visible overpass effect or larger indicator.
- **User's preference:** "Half circle" / road overpass style — one arrow arcs over the other.
- **Test:** Create a tree with crossing arrows and verify you can clearly tell which arrow is which.

### Bug 3: Remove Independent Tree Root
- **File:** `client/src/components/ActionPanel.tsx`
- **What to change:** The `handleRemoveNode` function (lines 84-126). Add a special case when `parent` is `null` but the node is not `tree.root.id` — allow removal.
- **Test:** Remove an arrow to create an independent subtree, then try to remove that subtree's root node. It should work.

## Step 4: After Bugs Are Fixed — Add Core Features

Follow the priority order in `PENDING_WORK.md`:

1. **Add Node** — long-press on empty canvas → create new node
2. **Add Arrow** — connect two existing nodes
3. **Drag-to-Reposition** — move nodes around
4. **Undo/Redo** — reverse accidental changes

**Important:** When implementing these, use proper state management (useReducer pattern). Do NOT continue the direct mutation approach — it's the root cause of all our bugs.

## Step 5: Communication Style with the User

The user:
- Is **not a programmer** — explain things in plain language
- Uses a **tablet** — always test touch interactions
- Prefers **step-by-step Q&A** — don't dump bulk information
- Works in **phases** — finish one phase before starting the next
- Gives feedback through **hand-drawn sketches** — interpret these carefully
- Asks about **root causes** — always explain WHY something broke, not just how you fixed it
- Wants to understand **if new fixes create new problems** — be honest about risks

## Step 6: Testing Checklist (After Every Change)

Always verify these still work after any code change:

- [ ] Landing page loads and shows tree cards
- [ ] Clicking a tree card opens the tree view
- [ ] Back button returns to landing page
- [ ] Zoom in/out works (both +/- buttons and pinch-to-zoom)
- [ ] Pan/drag works (single finger on background)
- [ ] Reset view button works
- [ ] Long-press on a node shows the action panel
- [ ] Long-press on an arrow shows the action panel
- [ ] Edit color changes the node/arrow color
- [ ] Edit label saves the text (max 50 chars)
- [ ] Remove node works (including independent subtree roots)
- [ ] Remove arrow works (both nodes stay, subtree disconnects)
- [ ] Arrows are perpendicular to node surfaces
- [ ] Crossing arrows are visually distinguishable
- [ ] No TypeScript errors (`pnpm check`)
- [ ] No console errors in browser

## Step 7: Save and Push to GitHub

After each significant change:
1. Save a Manus checkpoint
2. Push to GitHub: `git push github main`

## Common Pitfalls to Avoid

1. **Don't use direct object mutation** — always use state management (useState/useReducer)
2. **Don't add features before fixing bugs** — the user will notice
3. **Don't assume desktop behavior** — always test on tablet/touch
4. **Don't change the dark theme** — it's a hard requirement
5. **Don't add a menu or login** — explicitly not wanted
6. **Don't use curved paths** — user wants orthogonal only
7. **Don't use symmetric tree layouts** — user wants organic/asymmetric
8. **Don't forget to explain root causes** — the user always asks "why did this happen?"
