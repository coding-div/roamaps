# Roamaps Branch and Joiner Stage — Implementation Contract

**Status:** Architecture draft ready for user approval  
**Project:** Roamaps  
**Working style:** Obsidian Cartography, dark mode only, tablet-first  
**Source of truth:** `/home/ubuntu/roamaps` and the live WebDev project `/home/ubuntu/roamaps-live`

## 1. Purpose and scope

This milestone adds editable branches to the current visual roadmap editor without replacing the existing two-node connection workflow. The user’s current A/B method—select two objects and create one directed arrow—remains available and must not regress.

The new capability introduces a **joiner**: a real node-like object used to make a branch junction visually and structurally editable. A joiner is not a hidden routing point and is not flattened into ordinary line geometry. It can be created one at a time, moved like a node, connected like a node, placed directly on an arrow to split that arrow, recolored, and removed using the same bypass behavior as a normal node.

This stage remains a static frontend feature. It does not add accounts, cloud storage, a database, sharing, or external APIs.

## 2. Decisions locked by the user

| Area | Locked behavior |
|---|---|
| Existing connection method | The current A/B two-object connection method remains unchanged. Nodes and joiners can be selected as either source or target. |
| Node identity | Every object is a node. There is no special center/root deletion rule. The legacy `root` field may remain for demo compatibility and initial viewport sizing only. |
| Joiner count | Multiple joiners may exist, but one Add Joiner activation creates at most one joiner. The user activates the option again for another joiner. |
| Free joiner | A free joiner has no tails, is smaller than a rectangular node, is unlabeled, is movable, and behaves like a node for normal connections. |
| Attached joiner | A joiner placed directly on an arrow has plain connection tails/stems but no arrowhead at the joiner. It remains attached while moving. |
| Joiner appearance | New joiners start white with a visually three-dimensional treatment in the flat 2D canvas: shaded center, highlight, and contrasting ring. The ring color is editable. The size is fixed; users cannot resize joiners. |
| Joiner placement | One tap on empty canvas creates a free joiner. One tap on an eligible arrow segment snaps a joiner to that segment and splits the selected directed arrow. Placement on a normal node, crossing, or too-short segment is rejected with a toast. |
| Joiner movement | A joiner moves freely like a normal node. If attached, its split segments recalculate and remain attached; dragging a free joiner across an arrow does not auto-attach it. |
| Joiner selection priority | When a joiner sits on an arrow, the joiner has selection priority. The underlying arrow is selected by long-pressing another segment away from the joiner. |
| Arrow splitting | A selected arrow `A → B` becomes `A → J` and `J → B`. Both new segments inherit the original arrow color and remain ordinary editable arrows. |
| Split-segment removal | Removing one split segment removes only that selected segment. The other segment remains, and the joiner remains attached to it. If both split segments later disappear, the joiner becomes free. |
| Normal connections | Joiners can connect to ordinary nodes and other joiners through the unchanged A/B workflow. |
| Duplicate arrows | A second arrow in the same direction between the same two objects is blocked. |
| Reverse arrows | A reverse-direction arrow is allowed as a separate object. Opposite arrows must render on distinct parallel lanes and must not overlap. Only the tapped directed arrow is split when a joiner is placed on a route. |
| Cycles | Multi-object cycles such as `A → B → A` are allowed. Direct self-loops such as `A → A` are blocked. |
| Node/joiner removal | If the object has incoming and outgoing arrows, connect every incoming source to every outgoing target, skip duplicate directed arrows and self-loops, then remove the object and its old connected arrows. If it has only incoming or only outgoing arrows, remove the object and all its connected arrows without creating replacements. |
| Bypass colors | If there is one incoming arrow, every new bypass arrow inherits that incoming arrow’s color. If there are two or more incoming arrows, every new bypass arrow uses white. |
| Palette | Add black and white to the existing palette. Black must be a theme-safe lifted charcoal rather than invisible near-black; white must be a softened silver-white rather than a harsh unmodulated white. |
| Statistics | Joiners count in visible node and arrow statistics. Home previews do not render joiners. |
| `maxDepth` | Retain only for legacy demo descriptions and initial viewport sizing. It is not a graph limit and is not recalculated as a structural rule. |
| Add Joiner mode | A visible toolbar option behaves like Connect Nodes mode. Pressing it again cancels it. Another toolbar action cancels waiting placement without creating an object. |
| Feedback | Use short tablet-friendly toasts such as “Joiner placed,” “Arrow split,” “Place on a clear arrow segment,” and “Arrow already exists.” |

## 3. Data-model contract

### 3.1 Node type

Extend `NodeData` in `client/src/lib/treeData.ts` with an explicit visual kind:

```ts
type NodeKind = "node" | "joiner";

interface NodeData {
  id: string;
  x: number;
  y: number;
  label: string;
  color: NodeColor;
  kind: NodeKind;
  children: ChildRef[];
}
```

Normal nodes keep their current labels and rectangular rendering. Joiners use an empty label, a fixed small footprint, and conditional action-panel behavior. Existing demo data must be normalized with `kind: "node"`; newly created joiners use `kind: "joiner"`.

### 3.2 Split-arrow metadata

Extend `ChildRef` with optional metadata identifying the split relationship without creating a second competing graph store:

```ts
interface ChildRef {
  targetId: string;
  color: NodeColor;
  splitJoinerId?: string;
}
```

When `A → B` is split by joiner `J`, the two child references `A → J` and `J → B` carry `splitJoinerId: J.id`. Ordinary connections to or from a joiner do not carry this flag. This lets the editor distinguish a free joiner from an attached joiner and keep the attachment state correct when one split segment is removed.

The flat `nodeMap` remains authoritative. The graph may contain disconnected components and cycles. The nullable legacy `root` reference is synchronized only when its referenced node still exists; deleting that node sets the reference to `null` and never promotes another node.

### 3.3 Arrow identity and validation

Arrow actions continue to use stable `sourceId` and `targetId` rather than array positions. Same-direction uniqueness is checked on the source’s children. Reverse-direction arrows are independent and allowed. Self-loops are rejected. A cycle check must **not** be added because multi-object cycles are explicitly allowed.

## 4. Reducer and history contract

Update `client/src/contexts/RoadmapContext.tsx` while preserving the existing immutable reducer and history model.

The reducer must support the following structural operations as single history transactions:

| Operation | State change |
|---|---|
| Add joiner | Add one `kind: "joiner"` node with a stable ID, fixed-size placement, empty label, and default white visual color. |
| Split arrow | Replace one source→target child reference with source→joiner and add joiner→target. Preserve original arrow color and mark both references with the joiner split ID. |
| Add arrow | Keep current A/B behavior, allow reverse direction and cycles, block same-direction duplicates and self-loops. |
| Remove node/joiner | Collect incoming and outgoing edges before deletion, generate the approved many-to-many bypass links with the approved color rule, skip duplicates/self-loops, then delete the object and all old references. |
| Remove arrow | Delete only the selected source→target child reference. If it was a split segment, leave the other segment and its metadata intact; clear the joiner’s attached state only after no split segment remains. |
| Move node/joiner | Update coordinates immutably. Attached joiners remain structurally attached through split metadata; routing is recalculated during rendering. |
| Update joiner color | Update the joiner’s editable ring color while preserving its 3D treatment. |
| Undo/Redo/Reset | Treat each completed structural operation as one history item. Cancelled placement modes create no history entry. |

New arrows generated by bypass deletion must be deduplicated before insertion. When one incoming edge exists, its color is copied to all generated outgoing links. When multiple incoming edges exist, generated links use the new white palette color.

## 5. Canvas and routing contract

Update `client/src/components/TreeCanvas.tsx` without changing the existing tablet zoom, pan, drag, long-press, or manual arrowhead foundations.

### 5.1 Toolbar and placement mode

Add an **Add Joiner** control beside the existing editor controls. Its active state must be visually obvious but consistent with the Obsidian Cartography cobalt accent. The control toggles placement mode. Entering it cancels Connect Nodes mode; pressing it again cancels placement. Pressing another toolbar action also cancels placement without mutation.

During Add Joiner mode:

1. A tap on clear canvas space creates one free joiner and exits the mode.
2. A tap on an eligible arrow segment creates one attached joiner at the nearest point on that segment, splits only the tapped directed arrow, and exits the mode.
3. Taps on normal nodes, joiners, crossings, or too-short segments are rejected without mutation and explain the reason through a toast.
4. The existing A/B connection method remains the separate way to connect a placed joiner to other nodes.

### 5.2 Joiner rendering and hit targets

Render joiners as small fixed-size circular objects with a center fill, inner highlight, outer shadow, and editable contrasting ring. The result should read as a shallow 3D instrument sitting on the flat canvas, not as a glowing game icon. A free joiner has no tails. An attached joiner has plain stems/tails from its split segments but no arrowhead at the joiner.

The visible circle/ring receives selection priority over any arrow underneath. The joiner’s invisible touch target must be larger than its visual diameter for tablet usability. Its action panel must expose color editing and Remove Joiner but must not expose a label editor.

### 5.3 Routing and obstacles

Keep the direct-route improvement from the recovery pass and extend it safely:

1. Use a clear straight horizontal or vertical port-to-port route whenever the endpoint ports align and the segment is unobstructed.
2. Otherwise use right-angle routes with perpendicular exits and entries, node-boundary termination, and no side-running along a node.
3. Treat rectangular normal nodes as routing obstacles. Do not treat joiners as obstacles; they are intentional junction objects and may be crossed by other route geometry.
4. When reverse arrows exist between the same endpoints, assign distinct parallel interior lanes. Keep each endpoint entry/exit perpendicular and keep the two routes visually separate even when their source and target boxes are aligned.
5. Preserve bridge/overpass treatment at strict crossings between unrelated orthogonal routes.
6. Recalculate all affected routes during node and joiner movement without mutating data on every pointer move; commit the final position as one history action.

### 5.4 Arrow selection and split placement

Arrow hit paths remain wider and transparent than the visible strokes. When a joiner occupies a route, the joiner hit target is rendered above the arrow hit path. Arrow selection is still possible by long-pressing a clear segment away from the joiner. Split placement must reject exact crossings and segments below the minimum split length needed to leave visible tails on both sides.

## 6. Action panel and statistics contract

Update `client/src/components/ActionPanel.tsx` so it recognizes `kind: "joiner"`.

For a normal node, retain color, label, and removal actions. For a joiner, show color and removal actions only. The color action edits the joiner ring color; the center shading, highlight, and depth treatment remain intact. Arrow actions retain color and Remove Arrow. Split segments are not special in the panel: each is an ordinary removable/colorable directed arrow.

The editor’s visible node and arrow counts include joiners and all directed segments. Home-page preview diagrams remain unchanged and do not draw joiner rings.

## 7. Files to touch

| File | Responsibility |
|---|---|
| `client/src/lib/treeData.ts` | Add node kind and split-arrow metadata; normalize demo nodes and palette values. |
| `client/src/contexts/RoadmapContext.tsx` | Add joiner/split actions, bypass deletion, color rules, validation, and history-safe updates. |
| `client/src/components/TreeCanvas.tsx` | Add Joiner mode, placement/splitting, joiner rendering/hit priority, route lanes, obstacle exclusion, and tablet toasts. |
| `client/src/components/ActionPanel.tsx` | Add joiner-specific action behavior and hide label editing for joiners. |
| `client/src/pages/TreeView.tsx` | Only if the status rail or toolbar needs new joiner statistics or help text. |
| `client/src/index.css` | Only if existing tokens need a documented theme-safe charcoal/silver-white treatment or joiner-specific 3D utility classes. |
| `context/ui-registry.md` or the project’s active UI registry | Record the new Add Joiner control, joiner marker, and joiner toast patterns during imprint. |

No backend, database, authentication, or external-service files are in scope.

## 8. Verification and review gate

After implementation, verification will cover the following flows on the live editor:

| Test | Expected result |
|---|---|
| Add Joiner on empty canvas | One free white 3D joiner appears; mode exits; no tails or arrowhead. |
| Add Joiner on a clear arrow | Only the tapped directed arrow splits; both segments inherit its color; joiner has tails and no arrowhead. |
| Add Joiner on reverse overlap | Only the tapped lane is split; the opposite arrow remains unchanged and separate. |
| Add Joiner at crossing/short segment/normal node | Operation is rejected with a clear toast and no state change. |
| Move free and attached joiners | Both move like nodes; attached split segments recalculate; free joiners do not auto-attach. |
| Connect nodes and joiners | Existing A/B method works unchanged; joiner-to-joiner works. |
| Create duplicate, reverse, cycle, and self-loop | Same-direction duplicate and self-loop are blocked; reverse arrows and multi-object cycles are allowed. |
| Remove node/joiner with multiple inputs/outputs | Every incoming-to-outgoing combination is created, duplicates skipped, color rule applied, object removed. |
| Remove node/joiner with one-sided edges | Connected arrows disappear; no replacement arrows are created. |
| Remove one split segment | Only that segment disappears; other segment and attached joiner relationship remain. |
| Undo/Redo/Reset and refresh | Structural actions are one-step undoable, redoable, resettable, and persisted in localStorage. |
| Tablet interaction and visuals | Long-press selection, drag, zoom/pan, route contrast, joiner hit target, and dark-mode contrast remain usable. |

The post-build workflow is: run `pnpm check`, run `pnpm build`, use the imprint workflow to record and report UI consistency findings, run the review workflow against this contract, and report review findings by severity without auto-fixing them. Any review fixes wait for user approval. Finally, update memory and the checklist, synchronize the source repository, save a WebDev checkpoint, and deliver a clickable trial website.

## 9. Out of scope and explicit non-goals

This milestone will not add automatic graph layout, cloud persistence, user profiles, shareable links, a database, or a mobile-native app. It will not replace the current A/B connection method with a new connection system. It will not treat joiners as hidden or disposable geometry, and it will not silently invent behavior for any new edge case discovered during verification; such a case will be recorded and asked about before implementation changes.

## 10. Approval gate

No implementation code should be changed until this contract is approved. After approval, implementation proceeds in the file order above, followed by technical verification, imprint findings, review findings, user-approved fixes if any, durable record updates, GitHub synchronization, and a new clickable WebDev trial checkpoint.
