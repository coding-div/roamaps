# PROJECT_CONTEXT.md — Roamaps

## Project Purpose and Goals

Roamaps is a dark-mode web application for visualizing **learning roadmaps** as tree-branching diagrams. The concept is that a user maps a subject or topic as a central "root" node, and knowledge branches outward in all directions (up, down, left, right) using orthogonal (right-angle) connecting lines. Each box (node) in the tree can contain text — a topic name, phrase, or note — and the visual layout mimics how a person might sketch a mind map on paper.

The project was built in **phases**:

| Phase | Scope | Status |
|-------|-------|--------|
| Phase 1 | Static visual trees (2 examples), zoom/pan, color picker, dark mode landing page | Implemented |
| Phase 2 | Long-press action panel (edit color, edit label, remove), auto-resizing boxes, independent arrow colors | Implemented |
| Phase 3 | Orthogonal arrow fixes, crossing detection, proper node removal with reconnection | Implemented (with known issues — see KNOWN_ISSUES.md) |
| Phase 4+ | Add node, add arrow, drag-to-reposition, undo/redo, persistence, persistence backend | NOT YET IMPLEMENTED |

## What the Project Accomplishes

- Displays tree-branching roadmaps on an infinite dark canvas
- Supports zoom in/out (mouse wheel, pinch gesture, +/- buttons) and pan (drag)
- Allows long-press on any node or arrow to reveal an action panel
- Nodes can have their color changed and label edited (max 50 characters)
- Nodes and arrows can be removed with specific reconnection behavior
- Each arrow has its own independent VIBGYOR color (separate from node colors)
- Two demo trees are included: Tree 1 (3 levels) and Tree 2 (8 levels)

## Intended Users / Use Cases

The intended user is a **learner** who wants to visually map out a subject (e.g., Physics, World History, Programming) as a branching tree of concepts. The user is **not a programmer** — they interact via touch/gestures on a tablet and communicate requirements in plain language. The project owner has explicitly stated they are not a coder.

## Overall Vision

The vision (as communicated by the project owner) is to build a tool where:
1. Users can create and edit knowledge maps (roadmaps) for any subject
2. Each map is a tree that grows outward from a central topic
3. The editing experience is intuitive — long-press to interact, no complex menus
4. The visual style is clean, dark, and distraction-free (Obsidian Canvas aesthetic)
5. Multiple maps can coexist and be browsed from a landing page
6. Eventually, maps should support deep branching (up to 8 levels), free positioning, and persistence

## Project Ownership

- The user account (Manus) that originally built this project is `coding-div` on GitHub
- The project will be migrated to a new Manus account
- GitHub repository: `https://github.com/coding-div/roamaps`
- The user communicates in a non-technical, conversational style and prefers step-by-step Q&A over bulk documentation
