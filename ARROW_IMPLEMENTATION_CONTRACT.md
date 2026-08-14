# Roamaps Arrow Implementation Contract

## Status

This contract records the approved design direction for the arrow-stage revision. Application code must not be changed until the user gives final approval to this document.

## 1. Stable arrowheads

Every arrow whose target is a normal node must render one visible arrowhead at the target boundary. The route planner must reserve a final orthogonal segment long enough for the full arrowhead polygon, and the arrowhead must be rendered after the route stroke and in a layer that cannot be hidden by the target node fill. The arrowhead must point along the final route segment, regardless of whether the final direction is up, down, left, or right.

Arrows whose target is a joiner continue to have no arrowhead. Attached joiners may display plain incoming and outgoing tails, but a joiner-target arrow must never receive a normal-node arrowhead.

## 2. Joiner removal and branch representation

When a joiner with incoming and outgoing arrows is removed, the bypass remains a set of separate directed arrow objects. Roamaps must not collapse them into one ambiguous multi-headed object. The arrows may share a logical joint, but their visible branches must leave that joint through distinct route lanes.

If one destination node moves, only the route for that destination branch is recalculated. Other branch tails and lanes remain anchored at the joint unless their own valid route becomes impossible. This preserves stable branch geometry and makes node movement predictable.

## 3. Lane separation

The first trial uses the existing 12-unit route gap. Branches leaving the same joint, reverse-direction arrows, and any other parallel route segments must receive distinct lanes. Two arrow strokes must never occupy the same segment or visually overlap. Routes may approach one another, but they must remain separately selectable and visibly distinguishable.

## 4. Arrow segments as obstacles

When calculating a route, every other existing arrow segment is an obstacle. This includes tails from multiple arrows entering the same node, parallel segments belonging to other branches, and parallel segments already created by a split arrow. The route currently being calculated is excluded from its own obstacle set while candidate segments are tested.

Normal node envelopes remain obstacles. Joiner circles remain non-obstacles for route planning, except that the route must preserve the explicit split relationship of an attached joiner. A route must not run through a normal node, through another arrow segment, or through a protected branch lane.

## 5. Dragging and route-side recovery

During node dragging, the editor first attempts to keep the node on its current side while recalculating affected routes. If the new position would force arrow overlap, it tries the opposite valid routing side automatically. If neither side can produce clean orthogonal routes, the node returns to its exact pre-drag position when the pointer is released. The invalid candidate is never committed to the reducer or Undo history.

This automatic side choice supplements the previously approved collision-envelope behavior: node and joiner interaction envelopes must still never overlap, and an invalid object collision continues to restore the pre-drag position.

## 6. Crossing bridges

Perpendicular crossings remain orthogonal. When a horizontal and vertical arrow intersect at a true interior point, one route receives a visible bridge arch. Endpoint contacts, shared node or joiner joints, and segments that merely touch without crossing do not receive bridges. Bridge rendering is derived from the final separated routes and is not stored as graph data.

## 7. Routing priority and performance

The route planner should use a direct horizontal or vertical path first when it is clear. If that fails, it should try a limited set of orthogonal lane candidates before using broader obstacle-aware search. Derived routes should be memoized or reused until node positions, labels, graph connections, or relevant obstacle geometry changes. Pointer-driven recalculation should be throttled through `requestAnimationFrame` or an equivalent single-frame update path. Route geometry must remain derived state so automatic rejection and route previews do not add Undo or Redo entries.

## 8. Regression protections

The implementation must preserve independent nodes, cycles, duplicate same-direction prevention, reverse arrows on distinct lanes, joiner selection priority, free and attached joiners, split-arrow removal behavior, bypass color rules, collision-safe placement, label validation, automatic drag rollback, localStorage persistence, Undo/Redo/Reset, long-press arrow removal, tablet pointer tolerance, and the existing dark Obsidian Cartography visual language.

## 9. Verification gate

Before delivery, verify missing arrowheads in all four final directions; separate branches after joiner removal; one-branch-only changes during destination movement; parallel-lane separation; arrow-segment obstacles; forced drag recovery; true crossing bridges; joiner-target head suppression; existing collision flows; TypeScript; production build; clean browser console; and explicit GitHub synchronization plus a new WebDev checkpoint.
