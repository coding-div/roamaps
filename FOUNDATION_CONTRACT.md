# Roamaps Foundation-Only Editor Contract

**Status:** Approved — implementation completed  
**Date:** 2026-08-14  
**Project:** Roamaps dark-mode visual roadmap and knowledge-tree editor  
**Implementation target:** `/home/ubuntu/roamaps-live`  
**Source repository:** `/home/ubuntu/roamaps`

## 1. Purpose and scope

This contract resets Roamaps to a small, reliable foundation before advanced branch and attachable-arrow features are reconsidered. The trial will contain ordinary nodes, ordinary directed arrows, compact node headings, and separate unlimited plain-text popup documents. It will preserve the proven editor essentials—orthogonal routing, crossing bridges, arrowheads, node movement, history, persistence, and tablet navigation—while removing the circular joiner architecture and its associated data and interaction rules.

No application code may be changed until the user explicitly approves this document. Approval means that the user confirms the contract itself, not merely that the general direction sounds acceptable.

## 2. Locked foundation rules

| No. | Rule | Contract interpretation |
|---:|---|---|
| 1 | Node operations | Nodes can be added, removed, recolored, relabeled, and moved. Node resizing is deferred and is not implemented in this trial. |
| 2 | Arrow operations | Arrows can be added, removed, recolored, and move with their endpoint nodes. Each arrow connects exactly two nodes. Between one pair of nodes, one arrow per direction is allowed. |
| 3 | Toolbar actions | The toolbar provides Add Node and Connect Nodes. Add Joiner is removed. |
| 4 | Node-safe routes and crossings | Arrows never run through a node body. A true interior horizontal–vertical crossing receives a bridge arch so the routes remain visually distinct. |
| 5 | Node overlap | Visible node shapes may not overlap. The visible shape is the collision boundary; the old extra collision padding is removed. A larger transparent touch target may be used only for tablet selection and must not enlarge the placement/movement collision boundary. |
| 6 | Parallel arrow segments | Two arrows may approach one another, but their horizontal or vertical segments may not overlap. Rejected routes do not become history entries. |
| 7 | Shortest clear route | The router chooses the shortest valid orthogonal route that avoids node bodies and prohibited parallel segments. It prefers a clear straight horizontal or vertical route, then the shortest clear one-bend route, then a deterministic shortest orthogonal fallback. |
| 8 | Self-loops and reverse arrows | Self-loops are rejected. A reverse-direction arrow is allowed as a separate arrow object and must use a visibly separated route when necessary. |
| 9 | Two-sided node deletion | When a removed node has both incoming and outgoing arrows, the current direct reconnection behavior is preserved: each incoming source may reconnect to each outgoing target, subject to self-loop and duplicate-direction prevention. Stem-and-fan reconnection is deferred. |
| 10 | One-sided node deletion | When a node has only incoming arrows or only outgoing arrows, removing it removes the node and every connected arrow. No replacement arrows are created. |
| 11 | Atomic actions | Every committed structural or map-editing action is one atomic, undoable roadmap action. A rejected action commits nothing and creates no visible history entry. |
| 12 | History and saving | Undo, Redo, Reset, and localStorage persistence remain fundamental. Saved roadmap state includes node headings, popup documents, colors, positions, and arrows. |
| 13 | Tablet navigation | Zoom in and Zoom out buttons remain available. Pinch gestures change zoom. Panning is possible on empty canvas space. Home fits all existing content into a readable view without changing roadmap data. |
| 14 | Node opening and actions | A short tap opens the node’s centered popup. A long press opens the node action menu with Edit Label, Recolor, Remove, and a deferred Resize placeholder. |

## 3. Data model contract

The graph remains a directed node-and-child-reference model. The current field name `label` is retained in code and represents the node’s short visible heading. A separate `popupContent` value stores the node’s document text.

```ts
type NodeData = {
  id: string;
  x: number;
  y: number;
  label: string;
  color: NodeColor;
  popupContent?: string;
  children: ChildRef[];
};

type ChildRef = {
  targetId: string;
  color: NodeColor;
};
```

The normalized runtime value for a missing `popupContent` is an empty string. Existing saved roadmaps that do not contain this field must continue to load with an empty document. Existing joiner metadata must not be used to recreate joiners in the new runtime model.

The following are removed from the data model: `NodeKind`, the joiner kind, `splitJoinerId`, and `MAX_LABEL_LENGTH`. There is no replacement field for a joiner or a split arrow. Graph identity remains based on stable node IDs and directed target references.

New nodes start with an empty `label` and empty `popupContent`. An empty heading is permitted for a newly created node, but Edit Label cannot save an empty heading; the user must enter at least one character before that edit is committed. The visible node heading uses the existing fixed node shape and shows an ellipsis when the heading does not fit. The full heading remains available in the popup header.

## 4. Arrow and routing contract

Connect Nodes remains a two-step tablet interaction: activate Connect Nodes, select a source node, then select a target node. The action is rejected when the source and target are the same node or when an arrow in the same direction already exists. Reverse direction is allowed as a separate edge. A successful connection is one atomic history action and the mode behavior remains consistent with the current editor trial.

Routes are derived from graph state rather than stored as editable graph data. Moving a node recalculates affected routes while preserving all route constraints. The route builder must avoid normal-node bodies, stop at node boundaries, keep final arrow segments long enough for visible arrowheads, and prevent horizontal or vertical segment overlap between distinct arrows. Direct aligned routes are preferred when clear. If a direct route is blocked, the router searches deterministic orthogonal alternatives and selects the shortest valid result.

Crossing treatment is visual rather than a new graph object. At a true interior crossing between a horizontal and vertical route, one route receives a bridge arch. Endpoint contacts, node-boundary contacts, and shared graph junctions are not treated as crossings. Arrowheads are rendered at the target node boundary, after route calculation and in a layer that remains visible above the route and below or beside the node treatment as required by the existing implementation.

When node movement would make the affected arrows invalid, the movement is rejected and the node returns to its exact pre-drag position. The route itself is never allowed to overlap a node or another arrow segment merely to preserve the drag position. A rejected drag is not added to Undo or Redo history.

## 5. Node collision and placement contract

Normal node collision uses the visible node geometry rather than the previous padded interaction envelope. Label length no longer changes the collision envelope because node resizing and automatic label-driven resizing are both outside this trial. Nodes can be placed and dragged close together when their visible shapes do not overlap.

Add Node remains a one-shot tap-to-place mode. The user activates the toolbar action, taps a candidate canvas position, and the node is committed only if the visible node shape does not overlap another node and the placement does not violate the route and canvas rules. A rejected placement turns the mode off, shows concise tablet feedback, and creates no history entry. Direct arrow taps in Add Node mode are rejected rather than silently creating an unclear object-on-arrow state.

Selection hit targets may be made comfortable for tablet use, but hit-target size must not be reused as the collision boundary. This distinction prevents the earlier overly-wide anti-overlap behavior from limiting legitimate close placement.

## 6. Popup document contract

Each node has a short map heading and a separate popup document. The heading is not repeated as the first line of the document. The popup header’s top-left area identifies the node by its current heading. When the saved heading is empty, the popup displays the UI-only placeholder **“Untitled node”**; this placeholder is never stored as node data.

Short-tapping a node opens a single centered popup. The popup is not a side panel. Tapping outside the popup does not close it. The popup closes through its X control, or by switching to another node after the unsaved-change decision described below. Only one popup is visible at a time; tapping another node replaces the current popup after any required decision.

The popup body is plain text with line breaks. It has no word limit, character limit, or space limit. The popup body scrolls vertically without a fixed document-height cap, and its editable area grows as the user writes. No rich text, images, checklists, colors, or formatting controls are part of this trial.

An empty document opens in view mode with the hint **“No notes yet”**. The hint is UI-only and is not saved into `popupContent`. Edit Text changes the entire popup body into an inline editable area. Save commits the complete document text. The popup header remains visible while viewing and editing.

## 7. Popup Save, Discard, and local editor history

The popup has an explicit Save button during editing. Pressing X while the document contains unsaved changes opens a decision prompt with **Save changes** and **Discard changes**. Pressing Save commits the document and exits editing or returns to view mode according to the existing popup layout. Pressing Discard abandons changes since the last Save and returns to the last saved document. Pressing X when there are no unsaved changes closes immediately.

If the user taps another node while the current popup has unsaved document changes, the same Save changes / Discard changes decision is shown before switching. The app must never silently lose unsaved document text.

Popup text editing is deliberately outside the main roadmap Undo/Redo history. The main Undo and Redo buttons do not undo or redo typing or saved popup-document edits. The active popup editor may use its own session-local editing history, such as the browser text-editor history, but that local history is discarded when the popup editing session ends. Saving a document updates the node’s persisted `popupContent` and localStorage without creating a main roadmap history entry.

Structural node deletion is the exception that must preserve complete node data. If a node with non-empty popup data is removed, the confirmation flow is required before the removal is committed. A confirmed deletion removes and later restores the complete node record, including heading, popup document, color, position, and connected graph state. Undo or Redo that would remove a node with stored popup data must also require the same clear confirmation. A node with no popup data does not require this popup-data warning, although it remains subject to ordinary action validation.

## 8. Long-press action menu

Long-pressing a node opens the existing action menu rather than the popup. The menu contains:

| Action | Behavior in this trial |
|---|---|
| Edit Label | Opens the short-heading editor. Saving requires at least one character. The heading edit is a normal atomic roadmap action. |
| Recolor | Opens the existing node-color choice. The color change is one atomic roadmap action. Black and white remain available with theme-safe visual treatment. |
| Remove | Removes the node under the deletion rules. If its popup document is non-empty, show the required confirmation before committing. |
| Resize | Deferred. Keep a visible placeholder action that shows a concise “Resize coming soon” message and makes no data change. |

The old word-limit editor and dynamic label-envelope rejection are removed. The old resize controls, font-size slider, and automatic node-size changes are not available.

## 9. Removal, confirmation, and history boundaries

All graph edits—adding/removing/moving/recoloring nodes, adding/removing/recoloring arrows, heading edits, and reset—remain atomic main-roadmap actions unless explicitly excluded by this contract. Rejected actions create no history entry. LocalStorage is updated from the committed roadmap state, not from rejected previews.

Removing a node with incoming and outgoing edges uses the current direct bypass behavior, skipping duplicate directed edges and self-loops. Removing a node with only one direction of connected edges removes those edges with the node. Removing a node with no connected edges removes only that node. In every case, a node’s popup document travels with the node when a confirmed removal is recorded for Undo/Redo.

The popup editor is not part of main roadmap history. Its Save and Discard decisions affect only the popup document state. A deliberate node removal, however, is a structural roadmap action and must preserve the complete node data needed for restoration.

## 10. Removed from this trial

The following features and data concepts must not remain active in the foundation implementation:

1. Circular joiners, Add Joiner mode, joiner selection priority, free/attached joiner rendering, and joiner collision behavior.
2. `NodeKind`, joiner records, `splitJoinerId`, `SPLIT_ARROW`, and `PLACE_JOINER_ON_ARROW`.
3. Joiner-specific tails, branch rails, attachable arrow branches, and multi-headed joiner visuals.
4. The old `MAX_LABEL_LENGTH` word limit and longest-valid label-growth behavior.
5. Automatic node resizing based on label length.

## 11. Deferred to a later phase

The following are intentionally not part of this trial and must not be reintroduced through guessed “temporary” implementations:

1. Node box resizing with tablet drag handles.
2. Font or label-size sliders and independent letter resizing.
3. Stem-and-fan reconnection after two-sided node deletion.
4. Movable 90-degree route corners.
5. Attachable arrows, branch rails, junction surfaces, perimeter attachment lines, and other dense-branch mechanisms.
6. Rich popup-document formatting, media, checklists, and document-specific styling.

## 12. Implementation boundaries and file plan

| File | Required work after approval |
|---|---|
| `client/src/lib/treeData.ts` | Remove joiner types and split metadata; remove `MAX_LABEL_LENGTH`; add and normalize `popupContent`; preserve node and arrow color definitions. |
| `client/src/lib/collision.ts` | Reduce normal-node collision to visible-shape geometry; remove joiner-specific collision code and dynamic label-fitting limits. |
| `client/src/contexts/RoadmapContext.tsx` | Remove joiner actions and metadata handling; remove word-limit validation; add popup-content persistence action; preserve atomic graph history, deletion rules, reset, and localStorage. |
| `client/src/components/TreeCanvas.tsx` | Remove joiner rendering, hit targets, placement, and route metadata; preserve routing, arrowheads, bridges, node-safe routes, drag, pan, zoom, and placement; add short-tap popup opening. |
| `client/src/components/ActionPanel.tsx` | Remove joiner-specific behavior; keep Edit Label, Recolor, and Remove; add deferred Resize placeholder; preserve long-press tablet behavior and confirmations. |
| `client/src/components/NodePopup.tsx` | Add centered popup, node-heading header, empty-document hint, inline plain-text editing, Save, X, and Save/Discard decision behavior. |
| `client/src/pages/TreeView.tsx` | Remove Add Joiner; keep Add Node, Connect Nodes, Undo, Redo, Reset, zoom controls, and Home fit-to-content. |
| `client/src/pages/Home.tsx` | Keep both demo trees and ensure no joiner-only visuals or statistics remain. |
| `context/memory.md` and `todo-roamaps-step-one.md` | Record implementation decisions, verification findings, unresolved issues, and the delivery state. |

The existing Obsidian Cartography design language remains in force: near-black graphite surfaces, route cobalt accents, Space Grotesk display typography, IBM Plex Mono metadata, restrained tablet-friendly controls, and no light-mode switch, login, profile, or navigation menu.

## 13. Verification gate after approval

The implementation is complete only after all of the following are checked:

1. TypeScript checking and production build pass.
2. No joiner code remains reachable from the toolbar, reducer, canvas, data model, or action menu.
3. Add Node, Connect Nodes, node movement, node recoloring, heading editing, arrow creation, arrow removal, arrow recoloring, node removal, direct bypass deletion, one-sided deletion, reverse arrows, arrow bridges, node collision, parallel-segment rejection, Undo, Redo, Reset, localStorage, zoom buttons, pinch zoom, empty-canvas pan, and Home fit-to-content are manually verified in the browser.
4. Popup short tap, centered placement, X-only outside-dismissal behavior, node-heading header, empty-document hint, inline Edit Text, unlimited multiline content, Save, Discard, unsaved-close prompt, unsaved-switch prompt, and one-popup-at-a-time behavior are verified.
5. Main Undo/Redo does not alter popup typing or saved popup documents, while confirmed structural deletion restores the complete node and popup data through the graph history model.
6. A node with popup data cannot be removed without confirmation, including removal caused by an Undo action; a node without popup data follows the ordinary removal flow.
7. Resize and font-size controls remain deferred placeholders and do not mutate the roadmap.
8. Browser console, persistence, and regression checks are clean. Review findings are reported by severity without auto-fixing. Imprint checks the new popup component against the existing UI tokens and records any drift without silently changing unrelated design.
9. Changed source files are explicitly copied to `/home/ubuntu/roamaps`, committed, and pushed to `main`. A WebDev checkpoint is saved before the trial is delivered.

## 14. Approval gate

**No application code changes are authorized until the user explicitly approves this foundation contract.** After approval, implementation will follow the file plan and verification gate above. Any newly discovered ambiguity will pause implementation and be presented for a decision rather than guessed.

**Approval status:** Approved by the user on 2026-08-14. Implementation and verification completed in `/home/ubuntu/roamaps-live`.
