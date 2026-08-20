# Roamaps Exact Faster-Router Contract

**Status:** Draft for user approval.  
**Purpose:** Replace the present limited route-candidate calculation with an exact, testable, and faster routing system while preserving every approved foundation rule.

> This document is a design contract only. It does not authorize a code change until the user approves it.

## 1. Objective

For every proposed structural roadmap action, Roamaps must either produce a complete set of legal, clear, deterministic orthogonal arrow routes or reject the entire action. The new router must be faster on large roadmaps because it searches relevant geometry and recalculates only routes that can be affected, not because it weakens any visual or safety rule.

The current implementation derives arrow routes from node positions. It does not save route geometry as durable roadmap data. The new implementation keeps that model: saved data remains nodes, arrows, labels, colours, notes, and positions; routes are derived and verified from that saved graph.

## 2. Rules That Must Not Change

| Rule | Contract requirement |
|---|---|
| Nodes | Nodes remain ordinary movable nodes. No hidden centre node is introduced. Nodes cannot overlap. |
| Arrows | Arrows connect nodes only; no self-loop; one arrow per direction per node pair; reverse arrows remain allowed. |
| Node avoidance | An arrow never passes through a non-endpoint node. |
| Parallel separation | Parallel arrow centre lines must remain at least **12 world units** apart. Exactly 12 units is legal. |
| Crossings | Legal perpendicular crossings retain bridge arches. Parallel overlap is never treated as a bridge. |
| Routing style | Routes remain orthogonal and use perpendicular node entry and exit. |
| Shortest legal route | The chosen route must follow the selection order in Section 4. |
| History | Accepted structural actions create one atomic Undo step. Rejected actions create no history entry. |
| Existing features | Popup notes, local persistence, Add Node, Connect Nodes, delete/reconnect behaviour, pan, zoom, Home, colours, labels, and long-press actions remain intact. |

## 3. Complete-Action Rejection Rule

The current valid roadmap is never partially changed.

1. Roamaps builds a proposed next roadmap state off-screen.
2. It computes and independently verifies every route that the action can affect.
3. If a complete legal routing solution exists, the entire proposed action commits as one atomic update.
4. If any arrow has no legal unconflicted route, the entire action is rejected. The previous roadmap remains unchanged and no Undo history entry is created.

This rule applies to every route-changing structural action: adding an arrow, dragging a node, adding a node, deleting and reconnecting a node, and Reset. Popup-note editing remains outside routing checks.

## 4. Deterministic Route Selection

The router must compare only fully legal routes. It selects one using this fixed order:

| Priority | Selection rule |
|---:|---|
| 1 | Shortest total orthogonal route length. |
| 2 | If lengths tie, prefer the route that goes around fewer **distinct node boxes or reserved conflicting arrow lanes**. |
| 3 | If still tied, prefer fewer right-angle bends. |
| 4 | If still tied, use the same stable geometric direction rule: **top/left before bottom/right**. |

No arrow receives a permanent privilege that permits an impossible conflict. If there is no complete legal layout, the action is rejected instead of choosing a winner and loser.

## 5. Node Attachment Boundary for This First Router

The first router preserves the current node attachment grammar. It must not introduce a visible junction rail, a shared arrow segment, a selectable junction object, or a new node-centre concept.

The unresolved crowded-port/fan-out design, the illustrated node-owned junction-rail concept, and automatic perimeter-port distribution are explicitly **parked for a later design discussion**. If the existing attachment geometry cannot produce a full legal layout, the current action is rejected under Section 3 rather than silently inventing new attachment behaviour.

## 6. Required Routing Modules

The router is separated from `TreeCanvas.tsx` into testable, pure modules. Separation is a correctness safeguard; the actual speed gains come from relevant-geometry lookup, optimized route search, and affected-route updates.

| Module | Responsibility |
|---|---|
| Graph and geometry adapter | Converts current nodes, arrows, and candidate positions into canonical route inputs. |
| Exact route search | Searches legal orthogonal lanes and returns the best route under Section 4. The final implementation uses a sparse meaningful-coordinate search rather than an ever-growing handwritten list of detour shapes. |
| Uniform spatial index | Invisibly indexes node boxes, route bounds, and arrow segments in square cells. Long segments are listed in every cell they cross. It has no user interface, saved-data, or rule change. |
| Affected-route finder | Finds every route that could change because of a node's old area, new area, a newly opened shorter corridor, or an ensuing reroute chain. It may include extra nearby arrows, but must never omit a possibly affected one. |
| Independent legality verifier | Checks final routes independently for node penetration, endpoint perpendicularity, minimum final arrowhead segment, 12-unit parallel separation, self-conflict, and permitted perpendicular crossings. |
| Test-only slow reference solver | Uses exhaustive or deliberately slow checks on small maps to compare the exact fast result with a trusted answer. It never runs in the normal editor. |

Numeric geometry must use one deterministic fixed-precision policy. The implementation must not rely on accidental floating-point equality at the exact 12-unit boundary.

## 7. Safe Calculation Feedback

Roamaps always prioritizes an exact valid final state over misleading temporary geometry.

| Condition | Required user-visible behaviour |
|---|---|
| Calculation finishes within 240 ms | Commit or reject immediately. No feedback indicator flashes. |
| Calculation exceeds 240 ms | Show a small non-blocking **“Checking routes…”** indicator. |
| Calculation is pending | Keep the last valid roadmap visible. Block new structural actions. Pan and zoom remain available. |
| Slow drag after finger release | Keep the node at its last valid position while the exact final finger position is calculated. Move it only after a complete legal result is ready. |
| Legal result | Commit all changed routes and positions together as one Undo step. |
| Illegal result | Reject the action, keep the previous map, add no Undo step, and provide a short reason. |

A slow calculation is not an error. The indicator exists only to explain a longer exact check; it must never cause a partial commit.

## 8. Safe Build Order

1. Extract pure geometry and route interfaces from the current canvas without changing visible behaviour.
2. Add the independent legality verifier and focused fixtures for existing failures, including the Tree 2 third-node detour case.
3. Add the test-only slow reference solver and acceptance cases for direct, one-corner, multi-turn, reverse, crossing, close-node, exact-12-gap, deletion/reconnection, and no-legal-route rejection cases.
4. Build the exact full recomputation router and prove it against the verifier and reference solver before adding incremental speed shortcuts.
5. Add the uniform spatial index, then conservative affected-route recalculation. Compare its outcome with full recomputation in tests.
6. Add the 240 ms calculation-feedback behaviour and verify that it never corrupts history, persistence, popup behaviour, pan, or zoom.
7. Test production builds, the original Tree 2 route case, large-map workload behaviour, drag/rejection safety, and existing editor interactions before delivery.

## 9. Acceptance Criteria

The upgrade is complete only when all of the following are demonstrated:

- The original Tree 2 third-node corridor case takes a clean legal detour when one exists.
- Every accepted route passes the independent legality verifier.
- Every no-solution action is rejected atomically with no history entry or partial visual update.
- Multiple legal solutions select the same route deterministically using Section 4.
- The exact 12-unit parallel-lane boundary is accepted, while anything closer is rejected.
- Existing direct routes remain straight where clear.
- Routes automatically shorten when a moved blocker opens a better legal path.
- Long arrows are not missed by spatial lookup or affected-route calculation.
- Delayed checks preserve a valid canvas, permit pan/zoom, and block only structural actions.
- Regression coverage protects popup decisions, node dragging, arrow creation/removal, deletion/reconnection, Undo/Redo/Reset, and local persistence.

## 10. Explicitly Deferred Work

The following work is not part of this first router contract:

| Deferred item | Reason |
|---|---|
| Crowded node ports and fan-out | Requires a separate user-approved attachment design. |
| Node-owned junction rail | Must be compared against simpler perimeter-port alternatives; it must not reintroduce a hidden joiner. |
| Smart Arrange Roadmap | A distinct whole-map layout feature with its own readability, centre/no-centre, disconnected-tree, cycle, confirmation, and Undo rules. |
| Background Work File recommendations | Advisory only; they never change code automatically. |

## 11. Approval Gate

No router code may be changed until the user approves this contract. Approval authorizes only the planned routing-engine work above; it does not authorize the deferred port, junction, or Smart Arrange features.
