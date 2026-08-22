- [x] Read the current Roamaps project overview, architecture, build plan, and relevant context.
- [x] Inspect the current source structure without editing code.
- [x] Identify the single highest-leverage product decision for the first MVP feature.
- [x] Record the user’s clarified perpendicular-arrow, crossing, reset, undo/redo, movable-node, and two-node connection requirements.
- [x] Ask one question and wait for the user’s answer about root removal.
- [x] Write and present the implementation contract before changing code.
- [x] Implement only after the user approves the contract.
- [x] Run imprint, type-check, production build, and browser verification.
- [x] Report review findings by severity without auto-fixing them.
- [x] Save durable memory and create a WebDev checkpoint after the review handoff.
- [x] Deliver the result as a clickable live trial website for tablet testing, never as a PDF overview.
- [x] Recover and fix arrow removal so an existing arrow can be selected and deleted reliably.
- [x] Improve route selection so direct horizontal or vertical perpendicular connections are preferred when clear, while retaining orthogonal obstacle-aware routing when needed.
- [x] Record every reported issue, diagnosis, decision, fix, verification result, and user suggestion in durable project memory and the milestone checklist.
- [x] Confirm whether changes are synchronized automatically to GitHub or require an explicit commit and push.
- [x] Receive user approval for the saved recovery plan before changing code.
- [x] Preserve small touch drift during arrow long-press while cancelling on meaningful movement or cancellation.
- [x] Prefer clear direct horizontal or vertical routes before orthogonal fallback routing.
- [x] Verify arrow removal, direct aligned routes, undo/redo, persistence, and clean reset in the live trial.
- [x] Synchronize the recovery changes to GitHub with an explicit commit and push, then save a new WebDev checkpoint.

## Prospective Teleport and copy-arrow benchmark — measured 2026-08-22

- [x] Run isolated non-destructive benchmarks for Teleport validation, copy-arrow shared trunks, and the combined workload using the live router primitives but no live application changes.
- [x] Final 80-map measurements: Teleport `0.127 ms` median / `1.287 ms` p95 / `0.275 ms` average with 80 clean accepted layouts; Copy `0.199 ms` median / `1.023 ms` p95 / `0.341 ms` average with 160 explicitly allowed shared trunk segments, 0 ordinary conflicts, 0 bridges, and 80 clean maps; Combined `0.145 ms` median / `0.976 ms` p95 / `0.271 ms` average with 80 clean accepted layouts, 160 allowed shared segments, 0 ordinary conflicts, and 0 bridges.
- [x] Confirm `pnpm check` passes. Keep this as prospective evidence only: no live code, saved roadmap, localStorage, GitHub, checkpoint, setting, or schedule was changed.

## Pending build scope confirmation — 2026-08-22

- [x] Confirm whether the next trial includes: removal of the current All Set action; Teleport; copy-arrow shared trunks; or a selected subset. The user selected all three: “a and b and c.”

## Approved combined editor build — 2026-08-22

- [x] Remove all user-facing All Set behavior and its temporary route-plan display wiring; preserve ordinary progressive routing and saved roadmap compatibility.
- [x] Add one-attempt Teleport: select from a node’s long-press menu, tap one empty destination, validate all affected routes, reject targets on existing arrows, and deactivate after success or rejection.
- [x] Add Copy Arrow shared-trunk groups: head/tail creation choice, persistent individual and group identities, automatic join/separate during node-driven rerouting, per-branch selection, and shared-trunk colour ownership by the already occupying arrow.
- [x] Add focused regressions and verify type check, production build, and tablet-oriented browser interactions. The 14 focused assertions pass; direct browser checks confirmed All Set removal, Teleport acceptance/rejection, and Head/Tail copy-arrow interaction.
- [ ] Synchronize the approved combined editor build to GitHub, save the required WebDev checkpoint, and deliver the published trial.

## Exact-router recovery incident — 2026-08-20

- [x] Record the user’s blocking report: diagonal arrows, unavailable ordinary moves/connections, and the apparent Undo regression in Tree 2.
- [x] Identify the invalid diagonal no-solution fallback and whole-roadmap strict-legality gate as the causes of the routing freeze.
- [x] Roll the WebDev project back to the last known working routing checkpoint `757b8d6e` before attempting further router changes.
- [x] Add a Tree 2 regression asserting that every rendered route segment is horizontal or vertical.
- [x] Verify TypeScript, the recovered routing suite, and the production build.
- [x] Confirm fresh-history Undo and Redo controls use native disabled state in the recovered editor.
- [x] Remove the failed exact-router implementation from GitHub while retaining the approved contract record; recovery commit `6358b3d`.
- [ ] Save the rollback recovery as a fresh WebDev checkpoint and request a new user tablet trial.

## Isolated progressive router prototype — approved 20 August 2026

- [x] Build a pure orthogonal router that searches zero through five bends.
- [x] Test all four source exit sides and all four target entry sides with perpendicular attachment segments.
- [x] Use staged bend-count selection: accept the best legal route at the lowest available bend count, then choose by shortest length and stable direction.
- [x] Permit temporary backward travel only when required to avoid obstacles; reject loops, self-crossing, and diagonal output.
- [x] Add genuine obstacle fixtures that require exactly zero, one, two, three, four, and five bends, plus a no-legal-route fixture.
- [x] Measure correctness, deterministic repeatability, and calculation time before live integration.
- [x] Record the separate approval gate and complete the approved live integration without changing the reducer, graph persistence, localStorage schema, or history semantics.
- [x] Adapt the router to `TreeCanvas` with safe empty no-route results, suppress no-route SVG edges/arrowheads, preserve baseline-aware validation, and avoid reserving empty routes.
- [x] Add a zero/one-bend fast path so common dense-map routes do not construct the unbounded two-to-five-bend visibility graph.
- [x] Verify `pnpm check`, 12 focused routing tests, production build, Tree 2’s 43 rendered primary routes, a node drag plus Undo, a new connection plus Undo, and fresh disabled Undo/Redo after reload.

## Reported post-integration routing regressions — 20 August 2026

- [x] Reproduce and trace the Tree 1 purple route that runs parallel along the inside edge of its purple target node instead of terminating perpendicularly at the boundary.
- [x] Reproduce and trace the false red “no space” rejection for the green-connected node where the visible canvas still has a usable non-overlapping route.
- [x] Reproduce and trace the node-move rejection where rerouting introduces an avoidable green parallel-lane conflict despite the moved node occupying valid space.
- [x] Present an evidence-based minimal repair plan and receive approval before changing routing code, test fixtures, or saved roadmap data.
- [x] Add a hard endpoint-safety rule: only the first and last route segments may touch their connected nodes, and they must be perpendicular to the side they use.
- [x] Move parallel-arrow lane conflict checks into progressive-route selection so alternatives through five bends are searched before an action is rejected.
- [x] Separate physical node-overlap feedback from a genuine no-free-arrow-lane rejection while preserving no-history-entry rejection behavior.
- [x] Measure an isolated diagnostic build with the parallel-arrow lane condition disabled; do not publish that relaxation as the product rule.
- [x] Assess the user-proposed equal node-side port distribution: one arrow at the midpoint; two arrows at one-third and two-thirds; three arrows at one-quarter, one-half, and three-quarters.
- [ ] Ask for final approval before implementing any node-side port distribution, which remains deferred until the corrected router is stable.
- [x] Benchmark a normal-node fan-out of eighteen different connections before modifying the live editor: all eighteen incoming, all eighteen outgoing, and a deterministic mixed-direction set totaling eighteen.
- [x] Compare the current midpoint-only port model with the user-proposed evenly spaced port model for route count, legal-route count, no-route count, route cleanliness, and repeated full-graph calculation time.
- [x] Report the benchmark before deciding whether to roll node-side port distribution into the live router.
- [x] Compare two candidate ranking rules before implementation: port distribution before bend count, versus port distribution as a tie-breaker only among routes at the same minimum bend count.
- [ ] Receive a user decision on whether port distribution may override minimum bend count; retain the no-more-than-five-bends limit in either case.
- [x] Re-run the isolated eighteen-arrow comparison with all-incoming, all-outgoing, and five matched deterministic mixed-direction cases; report speed, parallel-conflict count, and clean-route count, including mixed-case averages. The port-first strategy averaged 13.6 clean routes and 4.4 parallel conflicts versus 4 clean routes and 14 conflicts for shortest-path priority, with a 20.927 ms versus 31.241 ms average mixed-case median calculation time.
- [ ] Benchmark an isolated priority order of evenly spaced ports, no parallel arrow touching with perpendicular bridge crossings allowed, then shortest legal route and bend count; compare it against the current port-first model on the matched eighteen-arrow cases.
- [x] Run the strict no-touching bridge-permitted benchmark. It produced zero remaining parallel conflicts but rejected routes in the eighteen-arrow stress test: 10 of 18 all-incoming, 12 of 18 all-outgoing, and 10.8 of 18 across the five mixed cases. Its median time was 66.486 ms, 88.258 ms, and 75.446 ms respectively, so it is not ready for the live editor without a non-greedy global lane-allocation strategy.
- [x] Design and benchmark a balanced port-first routing priority that preserves eighteen-arrow completion and responsive routing while reducing avoidable parallel conflicts more safely than the strict no-touch experiment. The leading candidate is a two-bend local repair pass: retain the fast evenly spaced port-first baseline for clean arrows; for a conflicted arrow only, try a strict no-touch detour of at most two bends; retain the baseline if no such detour exists. It preserved all 18 connections. In the all-incoming case it improved from 14 clean / 4 conflicts to 16 / 2 while reducing the same-run median from 27.042 ms to 21.449 ms. In all-outgoing it improved from 10 / 8 to 14 / 4, but rose from 27.046 ms to 41.870 ms. Across five mixed cases it improved from 13.6 / 4.4 at 22.896 ms to 15.4 / 2.6 at 26.116 ms. It is the best measured middle ground so far, but outgoing-side candidate work needs a bounded fast-path optimization before live implementation.
- [x] Present the measured balanced priority order and obtain approval before changing live router code: evenly spaced ports; immediate node safety; fast port-first baseline; two-bend strict no-touch repair only for a conflicting route; retain the baseline when no repair exists; use perpendicular bridge crossings where true interior crossings remain.

## Controlled live routing repair — approved 20 August 2026

- [x] Receive approval to integrate hard endpoint safety, evenly spaced ports, and the conflict-only two-bend repair into the live editor.
- [x] Preserve reducer, history, persistence, localStorage schema, saved roadmap data, and the five-bend maximum unchanged.
- [x] Add endpoint-penetration regression coverage for the reported purple route.
- [ ] Add route-lane feedback coverage for the reported false red “no space” drag rejection.
- [ ] Add a third-node reroute regression covering the reported green parallel-lane rejection.
- [ ] Verify TypeScript, routing tests, production build, dense Tree 2 orthogonality, core node drag/connection/Undo behavior, and fresh disabled Undo/Redo.
- [ ] Synchronize the approved repair to GitHub, save a WebDev checkpoint, and provide the user with the published tablet trial.

## Independent endpoint-pairs and facing-side fan-out trial — approved 20 August 2026

- [x] Preserve independently selectable source and target sides so one-bend L-routes can use adjacent sides rather than being forced into opposite-side pairs.
- [x] Assign evenly spaced ports while retaining an independently evaluated target-side choice for ordinary edges and a constrained facing-side choice for fan-outs.
- [x] Detect same-source fan-out groups whose targets share one dominant relative direction; same-target fan-in remains outside this approved trial.
- [x] For a clear upward fan-out, prefer source top ports and target bottom ports; rotate the rule for downward, leftward, and rightward fan-outs.
- [x] Order siblings stably along the perpendicular axis before reserving their routes, so a fan-out remains symmetric and does not tangle from creation order.
- [x] Retain all existing endpoint safety, bridge, five-bend, history, persistence, and no-diagonal guarantees.
- [x] Add focused regressions for a shorter adjacent-side one-bend route and the three-target upward fan-out shown by the user.
- [x] Verify TypeScript, focused routing tests, production build, Tree 1 and Tree 2 behavior, and tablet interaction safety before publishing a trial.
- [x] Synchronize the verified dual-improvement code to GitHub, save WebDev checkpoint `f68fa72f`, and deliver the published tablet trial.

## Reported same-orientation one-bend regression — 20 August 2026

- [x] Reproduce the Tree 2 cases where vertical-to-vertical and horizontal-to-horizontal endpoint orientations use two bends despite a legal one-bend route.
- [x] Trace the evaluated endpoint-port pairs, staged bend ranking, and reservation state without changing live route behavior.
- [x] Present the smallest correction and its regression coverage for explicit user approval before implementation.

## Proposed priority-based port selection — 20 August 2026

- [x] Confirm the user’s port identity hierarchy: connected node, then available side, then nearest position on that side.
- [x] Confirm an exact route score: legal route first, then fewer bends, then shorter length, then direct side/position preference, then stable tie-breaking.
- [x] Confirm that fewer bends always beat a shorter route with more bends, and that adding an arrow re-spaces every port on the affected node-side evenly.
- [x] Present the finalized replacement contract and obtain explicit user approval for implementation.
- [x] Retain the existing up/down/left/right port geometry and facing-side candidates, but remove their role as compulsory endpoint pairs.
- [x] Allocate and reserve same-source fan-outs centre-outward before other comparable routes.
- [x] Add real Tree 2 minimum-bend regressions for upward and horizontal fan-outs.
- [x] Verify, publish, and deliver the approved port-priority routing trial in checkpoint `12623726`.

## Reported Tree 2 interaction freeze — 20 August 2026

- [x] Reproduce and time the reported Tree 2 long-press failure, drag freeze, and any blocked node movement against Tree 1 as the control case.
- [x] Profile the synchronous routing, port allocation, drag-state, and render work during a dense-map pointer interaction; identify the exact blocking stage without changing routing behavior.
- [x] Confirm whether the port-priority expansion or another Tree 2-only path causes the regression, preserving the current published checkpoint as the rollback baseline.
- [ ] Present a smallest evidence-based repair that preserves legality, minimum-bend routing, history, persistence, and Android-tablet interaction behavior before code changes.

## Reported shared-side port rebalancing regression — 20 August 2026

- [x] Reproduce the Tree 1 and Tree 2 drag case where one node’s incoming and outgoing arrows converge on one side, overlap at ports, and cause an otherwise valid drag to be rejected.
- [x] Trace whether incoming and outgoing endpoint plans are assigned in separate pools rather than one shared node-side allocation.
- [x] Present an evidence-based combined shared-side port allocation rule that retains directed arrows, even spacing, no-touch lanes, endpoint safety, minimum-bend priority, history, and persistence before code changes.

## Approved shared-side repair and reported Tree 2 drag-start latency — 20 August 2026

- [x] Receive approval for a two-stage exact shared node-side allocation: choose legal sides under minimum-bend priority, then re-space all actual incoming and outgoing endpoints together on each node side before the drag cleanliness check.
- [x] Measure Tree 1 and Tree 2 time from node pointer-down to the first drag preview, separating gesture-threshold delay, pointer-handler work, and route computation. The measured difference was one display frame rather than the prior route freeze.
- [x] Identify the remaining Tree 2 drag-start delay as the deliberate six-screen-pixel gesture threshold, distinct from routing work, and receive approval for the smaller fixed screen-distance correction while retaining the stationary 500 ms long press.
- [x] Implement the approved shared-side allocation with stable per-edge ordering and no role-separated port pools.
- [x] Add Tree 1 and Tree 2 shared-side regressions that prove distinct evenly spaced physical-side ports, clean orthogonal routes, and the retained dense interaction budget; verify the repaired pointer gesture starts drag preview after five screen pixels in both live trees.

## Snap-to-grid alignment — requested 21 August 2026

- [x] Make node movement snap to the existing 30-unit canvas grid before collision and route validation, so committed node centres align precisely with the visible map grid.
- [x] Preserve fixed screen-pixel drag initiation, 500 ms stationary long-press behavior, node-envelope collision rejection, route-lane validation, Undo/Redo semantics, and persistence.
- [x] Add focused regression coverage for positive and negative coordinate rounding, then verify both Tree 1 and Tree 2 load correctly before publishing a trial.
- [ ] Verify, publish, and deliver the combined repair trial only after the drag-start investigation is resolved.

## Optional snap and Home roadmap layouts — requested 21 August 2026

- [x] Make snap-to-grid an optional editor preference with a clear active/inactive control; retain the current unsnapped drag behavior when disabled and persist the preference locally.
- [x] Add a Home-page display switcher with a visual box layout and a compact Google Drive-style list layout for existing roadmaps.
- [x] Preserve the box layout as the default, retain every existing roadmap action and preview link in both layouts, and verify the switcher on tablet and desktop sizes.

## All Set arrow recalculation — requested 21 August 2026

- [x] Add one visible All Set action that keeps every node at its exact current position and recalculates the complete arrow layout together.
- [x] Keep the established node safety, endpoint protection, shared-side ports, minimum-bend routing, five-bend ceiling, collision validation, history, and saved-roadmap behavior unchanged.
- [x] Show a truthful circular loading indicator only while the all-arrow calculation is pending, then apply the newest completed safe routing result without changing nodes.
- [x] Verify node coordinates remain unchanged, the latest calculation replaces only route presentation state, and Tree 1 and Tree 2 remain responsive before publishing a trial.

## Smart Arrange Roadmap — user concept, deferred 21 August 2026

- [x] Keep this separate from All Set: All Set remains node-stationary and only recalculates routes; Smart Arrange would deliberately reposition nodes and therefore needs its own action, preview, confirmation, and one-step Undo behavior.
- [x] Record the user’s atom-inspired initial layout idea: select a central node using most outgoing then fewest incoming arrows; arrange directly connected nodes at equal distance around it; use cardinal positions for four, a flat-sided pentagon for five, a hexagon for six, and balanced two/three-node variants; place equal central candidates on a sufficiently spaced central line.
- [ ] Before implementation, define behaviour for directed edges, cycles, multiple disconnected groups, variable node envelopes, collision-free spacing, manually placed nodes, bridge-friendly arrow routing, and a non-destructive preview/confirm flow.
- [ ] Receive a separate approval after the user’s higher-priority routing work is resolved; do not begin Smart Arrange now.

## Reported missing-arrow and missed-route failures after All Set — 21 August 2026

- [x] Clarify the evidence: the orange-node missing arrow is an existing Tree 2 issue; the separate newly created roadmap has visible arrows whose selected routes are worse than available legal alternatives after pressing All Set.
- [x] Confirm the required calculation rule: search progressively by bend count—straight, then one bend, then two, and continue only if no legal route exists at the shorter level; do not enumerate every five-bend combination when a shorter legal route has already been found.
- [ ] Reproduce the existing Tree 2 case where two connected orange nodes have no visible rendered arrow, then distinguish missing rendering from a true no-route result.
- [x] Reproduce the labeled new-roadmap route-quality fixtures: the `B → D` and `D → C` arrows must exchange their current port priorities where that yields the shortest legal pair of routes; `B → D` must leave B vertically downward and then turn horizontally toward D, ahead of a more-obstructed alternative.
- [x] Measure whether the current route plan reserves the nearer D-side port for the wrong connection, forces a bridged route despite a shorter legal candidate, or considers the requested B-down-then-horizontal route at all. Result: B→D is source-constrained to B-right, so the requested B-bottom alternative is not considered; the requested two-route pair is jointly legal and crossing-free.
- [x] Measure the router candidates, endpoint ports, reservations, and rejection reason for each reported connection without changing live behavior. The exact user-requested pair remains legal under the live reserved-lane rule; this is a port-plan/pair-ranking failure, not a five-bend-search failure.
- [ ] Correct the misleading All Set completion wording so it never calls the limited current search “best possible” before deeper candidate coverage is demonstrated.
- [ ] Present the evidence-based cause and smallest repair contract for approval before modifying router or rendering code.

## Bridge-aware All Set shared-port selection — reported 21 August 2026

- [x] Record the user’s Tree 2 A–B/C–A case: when swapping the two A-side ports makes C→A shorter but A→B longer, All Set must compare the pair rather than selecting the individually shorter A→B route.
- [x] Record the routing-obstacle order: node collisions first, then parallel-lane conflicts, then same-port conflicts, then the fewest bridge crossings; only after these conditions may bend count, total route length, and stable port position decide an otherwise equal option.
- [x] Record the new Tree 2 A→D report: the visible route uses two bends by leaving A-right, descending, then turning right, despite a legal A-bottom → downward → D-left one-bend route. All Set must consider suitable source and target sides before it can compare bridge-reducing port swaps.
- [x] Recreate the screenshot-scale A→D geometry and measure the current A-right route against the user-described A-bottom one-bend alternative. With B and C preserved as obstacles, A-right → D-left is legal with two bends and 558 units; A-bottom → D-left is legal with one bend and 590 units. After node/parallel/same-port safety and bridge count, the user’s progressive bend rule selects the one-bend A-bottom route despite its 32-unit extra length.
- [x] Recreate a screenshot-scale A/B/C fixture from the supplied Tree 2 geometry and enumerate the current versus exchanged A-side port assignments without changing live behavior. The user’s moved saved Tree 2 state is not available in this browser, so this is explicitly a measured reconstruction rather than a claim about unseen saved coordinates.
- [x] Measure the pair’s legal options: both assignments have two one-bend routes, zero node/parallel/same-port conflicts, and equal total length (855 world units); the current order has one bridge, while the exchanged A-side order has zero. C→A becomes 33⅓ units shorter and A→B becomes 33⅓ units longer, proving the bridge-aware pair rule selects the exchanged order as the user specified.
- [x] Revise the proposed bounded All Set-only shared-node port-swap search so it first tests all suitable source/target side pairs at each progressive bend level, then applies bridge-aware shared-node swaps without moving nodes or replacing the progressive zero-to-five-bend router. It compares normal/reversed ordinary plans and normal/reversed all-side plans before up to two bridge-focused swap passes; see `diagnostics/ALL_SET_BRIDGE_AWARE_CONTRACT.md`.
- [x] Define truthful completion wording that describes the actual scope of the enhanced search rather than claiming a global optimum: “All Set checked standard route orders and bridge-related port swaps. Moving nodes may still create different legal routes.”
- [ ] Present the measured contract and obtain approval before code changes, a checkpoint, or a new tablet trial.

## Teleport node movement — proposed 21 August 2026

- [x] Record the proposed Teleport interaction as a separate movement mode, selected from a node’s long-press menu. The node remains at its original location while the requested destination is checked against node overlap and every affected route’s normal legality rules.
- [x] Confirm the Teleport destination is set by one tap after the user selects Teleport from the node menu.
- [x] Confirm that directly targeting an existing arrow rejects Teleport because it is not empty space, even if rerouting might otherwise be possible.
- [x] Confirm that Teleport turns off after its single destination attempt, whether that attempt succeeds or is rejected.
- [ ] Define responsive validation feedback: complete immediately when fast; show an honest checking indicator only when validation is noticeably slow; do not insert an artificial extra-second delay.
- [ ] Prepare a separate Teleport contract after the interaction decisions are confirmed. Do not combine it with pending All Set changes or alter current drag behavior without approval.

## All Set retirement — requested 21 August 2026

- [x] Record the user’s decision that the present All Set action is practically unhelpful and should be removed for now; retain the separate future Smart Arrange concept as deferred work.
- [ ] Present the smallest removal contract: remove the visible All Set control, its loading feedback, and its component-level presentation state without changing node positions, saved roadmaps, ordinary routing, history, or the isolated diagnostic helpers.
- [ ] After approval, remove only the approved All Set interface and unused component wiring; verify ordinary canvas routing, node actions, undo/redo, and saved-roadmap loading before publishing a trial.

## Multi-headed and multi-tailed arrow bundles — proposed 21 August 2026

- [x] Record the graph-preserving visual-bundle idea: keep every saved connection as an ordinary directed two-node arrow, but render the bypass links created by deletion as a shared short stem/trunk with separated fan branches and individual heads or tails.
- [ ] Confirm whether bundle rendering activates only after removing a node with both incoming and outgoing arrows, or is also allowed for an explicitly selected group of ordinary arrows.
- [ ] Confirm whether individual underlying arrows inside a displayed bundle remain separately selectable, removable, and recolourable through a bundle-aware selection surface.
- [ ] Prepare a separate routing and interaction contract before implementing any trunk, rail, fan, or multi-head visual behavior.

## Arrow attachment branches — proposed 21 August 2026

- [x] Record the user’s proposed workflow: long-press an existing arrow, choose an add-branch action, tap a clear point on the highlighted host arrow, then choose a node to create a branch attached at that selected arrow point.
- [ ] Confirm whether the second selection must be a target node only (host arrow point → node), or whether a node may also start an arrow that ends on a host arrow point.
- [ ] Confirm how an attachment persists when its host arrow reroutes: preserve its relative position along the host route, or move to the closest equivalent clear segment.
- [ ] Confirm what happens to branches attached to a host arrow when the host arrow is removed: remove them, reconnect them to the host source, reconnect them to the host target, or show a choice.
- [ ] Prepare a separate data, routing, selection, and deletion contract before changing the present node-to-node arrow model.

## Invisible junction nodes — proposed 21 August 2026

- [x] Record the proposed replacement for virtual arrow attachment: creating a branch on an arrow inserts a real saved junction endpoint at the chosen point, splits the host arrow into two ordinary arrows, and connects the new branch to that junction.
- [x] Preserve the visual rule: the junction has no visible node body, label, popup, or palette; its shared trunk and fan branches are the only visible indication of its location.
- [ ] Confirm whether invisible junctions may be created only by the arrow-attachment action, never on blank canvas, as recommended.
- [ ] Confirm junction selection behavior when pressing the visible shared trunk and how the user removes either the junction or one individual attached arrow.
- [ ] Define junction movement, collision treatment, maximum attached-arrow capacity, reconnection on deletion, history, persistence migration, and route-obstacle rules before implementing it.

## Copy arrows with shared trunks — proposed 21 August 2026

- [x] Record the user’s idea: a copy arrow deliberately shares its parent arrow’s path as one visible trunk and separates only where it needs to reach its own node.
- [x] Preserve the boundary: the shared trunk is drawn once, so it is not an accidental overlap of independently routed arrows; ordinary arrows retain the no-overlap rule.
- [ ] Confirm whether a copy arrow may only branch from its parent source toward a new target, or whether a reverse-direction copy may merge several sources into a shared final trunk.
- [ ] Confirm the parent-removal behavior for dependent copies: remove them, promote them to independently routed arrows, or offer a choice.
- [ ] Compare copy-arrow bundles with invisible junctions for selection, deletion, history, persistence, multi-headed versus multi-tailed routes, and router complexity before selecting a model.

## Confirmed identity and copy-group memory — 21 August 2026

- [x] Record node identity order: creation order before it on the canvas; size; colour; label. A removed node and its label/identity are completely erased; later-added nodes receive new increasing creation order rather than a reused number.
- [x] Record arrow visible identity order: connected nodes; direction; tail and head ports; bends; length; colour.
- [x] Record shared-trunk condition: copy-group members may intentionally overlap only where both tail and head port identities are shared; their colour may be changed later and they may automatically separate and rejoin as compatible ports change.
- [x] Record hidden arrow memory: each arrow has a permanent unique Arrow ID, and each intentional shared-trunk family has a Copy-group ID. No member is permanently an original or primary arrow.
- [x] Record shared-trunk colour precedence: the arrow already occupying a route supplies that route’s visible trunk colour. A copied or dragged arrow joining later never takes trunk-colour precedence, even if it was the first copy created; after recolouring, its new colour appears only on its separated branch.
- [ ] Define Copy Arrow creation, group deletion, individual group-member removal, long-press list selection, undo/redo, and saved-roadmap migration before implementation.

## Prospective Teleport and copy-arrow benchmark — requested 21 August 2026

- [x] Preserve the benchmark boundary: use isolated diagnostics only; do not change live application code, saved roadmaps, local storage, project settings, or routing behavior.
- [ ] Run a representative Teleport-only validation benchmark measuring calculation time, clean legal placements, detected conflicts, and rejected placements.
- [ ] Run a representative copy-arrow-only shared-trunk benchmark measuring calculation time, clean route/trunk formation, conflicts, and separation outcomes.
- [ ] Run a combined Teleport plus copy-arrow benchmark measuring the same values and compare it with the two isolated results.
- [ ] Record fixture limits and distinguish measured existing-router work from the estimated added copy-group bookkeeping work before recommending implementation.

## Background Work File review — 21 August 2026

- [ ] Complete a non-destructive review of current code, durable records, tests, logs, and isolated router diagnostics; replace only `/home/ubuntu/roamaps_background_work_file.md` with the dated findings, recommendations, questions, and an explicit no-changes statement.

## Proposed invisible occupancy-grid rule — 21 August 2026

- [x] Evaluate the user-proposed invisible 12 × 12 world-unit occupancy grid, in which node and arrow occupancy is tracked locally rather than by scanning the whole roadmap.
- [x] Compare a strict no-shared-cell rule against the required node-boundary endpoint attachments, true arrow crossings, normal node dimensions, zoom-independent behavior, and current exact nearby-lane index. Long-run medians add 0.10 ms on Tree 1 and 0.37 ms on Tree 2, but Tree 2 has one valid non-endpoint shared arrow cell.
- [x] Present and record the safety-preserving recommendation: retain the existing 160-unit exact nearby-lane index; do not replace it with a strict 12-unit occupancy acceptance rule.
- [x] Evaluate the clarified unified service: node occupancy prevents node-node overlap, arrow-lane occupancy prevents parallel path sharing, and node-arrow proximity remains legal except where exact endpoint and route-body rules already prohibit it.
- [x] Evaluate the refined endpoint-only sharing rule: an arrow may share one connected endpoint box, but reject a second non-endpoint arrow use of that same box only when exact lane geometry confirms a true shared path. The Tree 2 false rejection proves the grid cannot make that decision alone.

## Branch stage — architecture gate

- [x] Preserve the existing A/B two-node connection method.
- [x] Treat every object as a node; remove special center/root deletion semantics.
- [x] Define ordinary node and joiner deletion as incoming-to-outgoing bypass when both sides exist.
- [x] Use every incoming source × every outgoing target for bypass deletion, skipping duplicate directed arrows.
- [x] Allow cycles.
- [x] Block duplicate same-direction arrows; allow reverse-direction arrows as separate objects.
- [x] Render reverse-direction arrows on distinct parallel lanes with no overlap.
- [x] Keep joiners visible, selectable, movable, smaller, unlabeled, and persistent after branch construction.
- [x] Allow joiners to be placed on arrows without treating them as routing obstacles.
- [x] Split an arrow when a joiner is placed on it: source → joiner → target.
- [x] Add Joiner mode places at most one joiner per activation; multiple joiners are allowed when created one-by-one.
- [x] One tap on empty canvas places a joiner; one tap on an existing arrow places and splits a joiner at that route.
- [x] Bypass arrows inherit the sole incoming arrow color; if there are two or more incoming arrows, bypass arrows use white.
- [x] Add black and white to the palette with theme-safe charcoal and softened silver-white tokens.
- [x] If a node or joiner has only incoming or only outgoing arrows, remove it and all its connected arrows without creating replacements.
- [x] Allow cycles, and keep reverse-direction arrows as distinct non-overlapping lanes.
- [x] A joiner has selection priority over an underlying arrow; select the arrow from another segment away from the joiner.
- [x] One joiner is created per Add Joiner activation; multiple joiners may exist when created one-by-one.
- [x] A free joiner remains free when dragged across an arrow; only direct placement through Add Joiner attaches/splits it.
- [x] Reject joiner placement on a normal node, at an arrow crossing, or on a segment too short to split cleanly.
- [x] An attached joiner moves freely like a node while staying attached to its split arrow segments.
- [x] If one split segment is removed, the other segment and joiner relationship remain.
- [x] A free joiner has no tails; an attached joiner has plain tails/stems without arrowheads.
- [x] Both split segments inherit the original arrow color; joiner ring color is editable and 3D depth remains.
- [x] Joiner-to-joiner connections are allowed; self-loops are blocked while multi-node cycles are allowed.
- [x] Keep maxDepth only for legacy demo descriptions and initial viewport sizing; do not use it as a graph limit.
- [x] Add Joiner is a visible toolbar action with explanatory tablet toasts.
- [x] Free joiners and attached joiners continue to behave like ordinary nodes for connection and movement.
- [x] Split arrow segments remain ordinary editable arrows for color, removal, reverse links, bridges, and history.
- [x] Include joiners in visible node and arrow statistics.
- [x] Add Joiner mode behaves like Connect Nodes mode and toggles off when its toolbar option is pressed again.
- [x] New joiners use a white visually 3D treatment in the 2D canvas; the ring remains editable later.
- [x] Another toolbar action cancels waiting Add Joiner mode without creating an object.
- [x] Home previews do not display joiners.
- [x] Write and approve the full branch implementation contract before coding.
- [x] Implement the approved joiner data model, split-arrow metadata, and reducer actions.
- [x] Implement Add Joiner placement, attached/free movement, selection priority, tails, and tablet toasts.
- [x] Implement branch routing, direct aligned routes, reverse-arrow lanes, and joiner non-obstacle behavior.
- [x] Run imprint, TypeScript check, production build, and browser verification.
- [x] Record every implementation change, test result, error, and solution in memory and verification notes.
- [x] Synchronize the completed milestone to GitHub and save a WebDev checkpoint.
- [x] Deliver a clickable trial and a numbered tablet testing checklist for the user.
- [x] Implement typed joiners, branch creation, arrow splitting, bypass deletion, and reverse lanes.
- [x] Run imprint and review; report findings without auto-fixing until approved.
- [x] Save all branch findings, fixes, and verification results to memory, checklist, GitHub, and a WebDev checkpoint.

## Branch-stage review handoff

- [x] Confirm no Blocker or Major review findings remain before delivery.
- [x] Record Minor manual-tablet validation and Non-blocking static-persistence findings.
- [x] Create `BRANCH_REVIEW_REPORT.md` and `USER_TRIAL_TASKS.md`.
- [ ] Receive and record the user’s numbered tablet trial results.
- [x] Record issue 1: separate arrows can visually overlap or share the same orthogonal corridor, making one appear to connect to the middle of another.
- [ ] Revise and classify all nine reported image observations before implementing any fix.
- [ ] Confirm which observations are intended behavior, which are clarity issues, and which are actual bugs.
- [ ] Present the consolidated fix plan and receive user approval before changing code.
- [ ] Reproduce and isolate the image 3 arrowhead-rendering failure before selecting a geometry fix.
- [ ] Decide the user-approved prevention behavior for overlapping normal nodes.
- [ ] Add a proximity collision rule for free joiner placement after the plan is approved.
- [ ] Preserve the approved bypass behavior explanation for images 6–8; do not change it as a bug fix.
- [x] Record the user’s invisible node/joiner interaction-area rule: visible shapes may approach, but invisible clickable areas must never overlap.
- [x] Record the user’s placement rule: empty-canvas taps place only when no node, joiner, or arrow occupies the candidate area and collision bounds remain clear.
- [x] Record the user’s rejection rule: occupied/too-close candidates and direct arrow taps halt placement and require manual mode reactivation.
- [x] Confirm Add Node should use tap-to-place mode matching Add Joiner instead of immediately spawning at canvas center.
- [ ] Define the exact collision-area dimensions and movement behavior before implementation.
- [ ] Compare simple invisible-area rejection with a stronger preview-and-snap collision design; choose one without guessing.
- [ ] Receive approval for the improved overlap-prevention contract before editing application code.
- [x] Record the proposed stronger design: shared interaction envelopes, preview-gated placement, direct-arrow rejection, and last-valid-position clamping during movement.
- [x] Confirm approval of the stronger collision design before implementation.
- [x] Record the refinement: attached joiners may be placed directly on eligible branch arrows despite their enlarged interaction area.
- [x] Record the refinement: normal-node interaction envelopes resize with label content.
- [x] Record the refinement: label growth is blocked when the resized envelope would overlap another object.
- [x] Record the refinement: an invalid drag release restores the object to its pre-drag position.
- [x] Record the refinement: any committed overlap-causing action must be rolled back immediately.
- [x] Confirm that direct joiner placement is allowed on any eligible existing arrow segment, including segments previously created by splitting another arrow.
- [x] Decide that label editing rejects only the newly typed or pasted character/line that would cause overlap; the already-valid text remains.
- [x] Decide that a saved label edit remains one normal user-history action, so user Undo restores the entire previous label.
- [x] Define automatic overlap recovery as an internal rejection with no extra visible Undo or Redo entry.
- [x] Record the recommendation to treat invalid overlap-causing actions as rejected transactions rather than extra visible Undo history entries.
- [x] Preserve the no-overlap invariant for saved roadmaps; no automatic legacy overlap migration is needed.
- [x] Limit collision envelopes to normal node bodies and joiner circles; attached tails/stems remain arrows.
- [x] Show a temporary invalid outline during an overlapping drag, then restore the exact pre-drag position on release.
- [x] Preserve surrounding text when editing in the middle; keep the longest valid inserted beginning.
- [x] Confirm the short feedback message shown when label growth is blocked by an interaction-envelope collision: “No room for more text.”
- [x] Write the complete approved design in `COLLISION_IMPLEMENTATION_CONTRACT.md`.
- [x] Receive the final contract approval message before editing application code.
- [x] Implement only after the final contract approval gate is passed.
- [x] Re-read architect, recover, review, imprint, remember, and static-web skills before implementation.
- [x] Add shared shape-aware collision geometry without changing arrow routing semantics.
- [x] Convert Add Node to one-shot tap-to-place with rejection and manual reactivation.
- [x] Add joiner-on-eligible-arrow exception while keeping node/joiner envelope collision protection.
- [x] Add label resizing, longest-valid input rejection, and clean label history behavior.
- [x] Add invalid drag preview and exact pre-drag restoration.
- [x] Run TypeScript, production build, browser regression, review, imprint, GitHub sync, and checkpoint verification.

## Arrow-stage review handoff

- [ ] Record the missing-arrowhead issue shown in the user’s supplied image and reproduce it before choosing a geometry fix.
- [ ] Define the intended multi-headed result after removing a joiner, distinguishing it from ordinary arrows that share a path.
- [ ] Define stable branch-segment behavior so moving a connected node changes only the affected arrow while the other tail remains anchored at the joiner.
- [ ] Prevent arrow segments from overlapping; allow them to approach while preserving separate lanes, and restore a dragged node when its committed routes cannot remain separated.
- [ ] Treat tails from multiple arrows into the same node and parallel segments of the same arrow as routing obstacles to one another.
- [ ] Preserve perpendicular crossings with bridge arches rather than flattening or overlapping the crossing routes.
- [ ] Resolve all arrow semantics and remaining questions before writing the implementation contract.
- [ ] Receive approval for the arrow implementation contract before editing application code.
- [ ] Implement robust arrowhead placement, stable split-segment anchoring, lane separation, self-obstacle routing, and bridge crossings without regressing collision or joiner behavior.
- [ ] Run TypeScript, production build, browser regression, imprint/review, GitHub synchronization, and WebDev checkpoint verification for the arrow milestone.
- [x] Confirm the preferred multi-branch design: separate directed arrows with distinct lanes, not one visually bundled multi-headed arrow.
- [x] Confirm normal-node arrowheads must terminate at the target boundary with enough final-segment length to remain visible; joiner targets still have no arrowheads.
- [x] Use the existing 12-unit gap as the first branch-lane spacing trial.
- [x] Try the opposite route side during a node drag when the current side would overlap arrow lanes; restore the pre-drag position if neither side is valid.
- [x] Treat every other arrow segment, including parallel segments from the same joint, as an obstacle while routing; ignore only the route currently being calculated.
- [x] Preserve bridge arches only for true interior horizontal–vertical crossings, not endpoint or joint contacts.
- [x] Reject a node movement when no clean orthogonal route remains rather than permitting arrow overlap.
- [x] Record the performance plan: direct-route fast path, limited lane candidates, cached derived routes, requestAnimationFrame drag updates, and no route data stored in history.
- [x] Write and receive approval for the complete arrow implementation contract before editing application code.
- [ ] Implement arrow changes behind focused derived-route helpers so the reducer and graph data model remain stable.
- [ ] Protect direct aligned routes, orthogonal fallback routing, reverse lanes, joiner split metadata, collision envelopes, and tablet pointer thresholds during implementation.
- [ ] Verify all four arrowhead directions, joiner-target suppression, branch-lane separation, arrow-segment obstacles, opposite-side drag recovery, failed-route restoration, and true crossing bridges.
- [ ] Re-run TypeScript, production build, browser console, performance-oriented drag checks, imprint/review, GitHub synchronization, and WebDev checkpoint verification.

## Post-arrow-stage issue review — user trial findings

- [ ] Investigate why removing a joiner or ordinary node restores tails to the original node instead of preserving the intended separate directed-arrow structure.
- [ ] Decide whether the current anti-overlap routing is incorrectly limiting the number of arrows that may terminate at or leave a node.
- [ ] Investigate opposite-direction A→B and A←B routing when both arrows bend into each other; define a visibly separated lane rule.
- [ ] Investigate routes that cross through a node while travelling toward an upper-side endpoint; enforce node-boundary-safe routing.
- [ ] Explain proposed behavior for all four findings and receive user approval before editing code.
- [ ] Preserve the user's intended geometry: same-axis node pairs use a straight perpendicular route; corner placements use one clean 90-degree bend when clear.
- [ ] Reassess the interaction envelope size: visible node and joiner shapes should be the default collision area, with no extra spacing that prevents close-but-non-overlapping placement.
- [ ] Compare designated point/port slots against automatic perimeter fan-out lanes for multiple arrows.
- [ ] Select a stable automatic port-and-lane design that allows many close arrows without overlap, random lane swapping, or a hidden arrow-count limit.
- [ ] Receive user approval for the selected routing and interaction-envelope design before implementation.
- [x] Clarify that the differently colored lines in the sketch illustrate two possible shortest route choices, not parallel stored graph edges.
- [x] Preserve the one-arrow-per-direction rule between any two nodes; use the routing system to choose one actual route for each real connection.
- [ ] Discuss the user’s illustrated alignment and route-choice ideas before proposing implementation details.
- [ ] Evaluate the central-axis straight-line idea, the corner one-bend idea, and the designated point/port idea separately.
- [ ] Ask for confirmation after each unclear visual behavior rather than combining decisions.
- [ ] Treat the third sketch (designated attachment points) and fourth sketch (many close parallel attachments) as separate ideas.
- [ ] Compare each sketch independently against the current node-and-arrow model.
- [ ] Propose one or two additional routing ideas and explain their tradeoffs before recommending a design.
- [ ] Create an explanatory diagram showing the proposed short stems, separated fan-out lanes, node boundary, and arrow directions for user review.
- [ ] Do not treat the explanatory diagram as approval to implement the routing design.
- [ ] Revise the diagram so repeated arrows from one source to the same target are removed; one source-target pair has one real arrow.
- [ ] Show joiner-like branching as separate arrows from one junction toward different target nodes.
- [ ] Show node dimensions as customizable independently from the amount of label text.
- [ ] Review the post-deletion branching sketch as the intended visual result, not as a request for an added visible joiner.
- [x] Record that the branching shape in the sketch never appeared in the app; it is the desired post-deletion result to design toward.
- [ ] Identify which earlier decisions were necessary requirements and which were implementation choices that may be replaceable.
- [ ] Compare visible joiners, invisible routing junctions, and hybrid approaches for branch density, movement, deletion, and selection behavior.
- [ ] Evaluate a movable line-segment junction that accepts arrow attachments anywhere along its length, including its selection, movement, deletion, overlap, and routing behavior.
- [ ] Compare a perimeter line around every node with a line-junction object and with ordinary route segments that can expose movable 90-degree corner controls.
- [ ] Decide whether junction attachment surfaces are explicit user-created objects, derived routing geometry, or a controlled hybrid before revising the branch contract.
- [ ] Evaluate whether a line junction should be movable while carrying its attached arrows and whether attachment positions remain stable during movement.
- [ ] Evaluate a perimeter attachment surface around every node as a possible dense-connection mechanism, including whether it should be visible or only interactive.
- [ ] Evaluate whether ordinary horizontal/vertical route segments should become junction surfaces and whether their 90-degree corners should be movable controls.
- [ ] Do not change code until the retrospective architecture is approved.
- [ ] Audit the earlier decisions and state which ones were user requirements, which were good implementation choices, and which were unnecessary overengineering.
- [ ] Treat the visible joiner direction as paused and do not extend it into the next attachable-arrow architecture without a fresh contract.
- [ ] Define customizable node width and height as a fundamental feature independent of label length.
- [ ] Decide how node resizing works on an Android tablet, including controls, minimum/maximum dimensions, label fitting, arrow re-routing, collision handling, and undo/redo.
- [ ] Receive approval for the customizable-node-size contract before editing application code.
- [ ] Revisit attachable arrows from first principles after node sizing is implemented and verified.
- [ ] Normalize the seven proposed fundamentals into a foundation contract, correcting item 6 to refer to non-overlapping arrow segments.
- [ ] Confirm the essential missing graph rules: self-loop behavior, reverse-direction arrows, node deletion behavior, and whether every user action is undoable and locally persistent.
- [ ] Confirm that “shortest possible root” means the shortest clear orthogonal route, with node bodies and same-orientation arrow segments as obstacles.
- [ ] Receive approval for the foundation contract before implementation.
- [ ] Add the deletion-cleanup fundamental: removing a node with only incoming or only outgoing arrows automatically removes those connected arrows.
- [ ] Record stem-and-fan reconnection after deletion as the next phase after fundamentals, not as a foundation rule to implement now.
- [ ] Add tablet navigation fundamentals: zoom in, zoom out, and home/reset view controls using both visible buttons and pinch/touch gestures where appropriate.
- [ ] Define home-view behavior separately from roadmap reset: home returns the viewport to a readable canvas position without deleting or changing roadmap data.
- [ ] Replace word-limit preview behavior with a short-tap full-context popup or side panel containing Edit Text and Close controls.
- [ ] Keep Edit Label available from the long-press action menu, and keep Resize as a separate long-press action.
- [ ] Remove the label word limit while preserving explicit node width and height; label editing must not automatically resize the node.
- [ ] Confirm popup placement, dismissal, long-label wrapping, and whether Edit Text reuses the existing label editor.
- [ ] Confirm resize completion, side-drag behavior, collision rejection, and rerouting after a node size change.
- [ ] Remove node-box resizing from the current foundation trial; preserve it for a later phase.
- [ ] Make short tap open a centered popup with an X close button and an Edit Text button.
- [ ] Make the entire popup document editable in place, with unlimited text and vertical scrolling as content grows.
- [ ] Show the node’s current short heading in the popup’s top-left header; do not duplicate the heading as document text.
- [ ] Use an explicit Save button for popup document edits.
- [ ] If X is pressed during popup editing, offer “Save changes” or “Discard changes.”
- [ ] If another node is tapped during popup editing, offer the same Save/Discard choice before switching popups.
- [ ] Keep popup documents as plain text with line breaks only for this trial.
- [ ] Start new nodes with an empty heading and an empty popup document.
- [ ] Allow only one popup at a time; tapping another node replaces the current popup with that node’s popup.
- [ ] Keep popup text out of the main roadmap Undo/Redo history; popup editing uses a local editor history for the current editing session.
- [ ] Confirm removal when a node containing popup data would be removed, whether removal is deliberate or caused by Undo; empty-data node removal follows the ordinary action flow.
- [ ] Display a UI-only “Untitled node” placeholder in the popup header when the saved heading is empty; do not store the placeholder as heading data.
- [ ] Show a “No notes yet” hint for an empty popup document without storing hint text in the document.
- [ ] Reject saving an empty heading from Edit Label; a heading must contain at least one character.
- [ ] Keep node appearance and size fixed in this trial; do not resize from heading or popup content.
- [ ] Keep long-press Edit Label for the short heading shown on the node; do not use the old word-limit preview behavior.
- [ ] Defer font/letter-size resizing to a later phase; do not add a label-size slider now.
- [ ] Confirm popup editing history, dismissal behavior, heading preview behavior, and the distinction between node heading and popup document.

## Tree 2 interaction recovery — reported 2026-08-15

- [x] Reproduce and profile Tree 2 lag during commands, dragging, and long presses without changing the working new-roadmap behavior.
- [x] Trace why Tree 2 treated ordinary node presses as short taps that open popups instead of allowing drag or long-press action-menu activation.
- [x] Restore reliable Tree 2 node dragging and the long-press palette for recolor and remove, while preserving normal short-tap popup opening.
- [x] Identify the dense-graph causes: stale route reuse, all-route rebuilding during unnecessary renders, delayed-action-panel dismissal, and SVG letterbox coordinate drift.
- [x] Verify TypeScript, production build, rendering of Tree 1 and Tree 2, drag safety logic, popup Save/Discard preservation, and recovery diff integrity before checkpointing.
- [ ] Receive Android-tablet confirmation that Tree 2 can drag nodes and open Recolor/Remove through long press without lag or accidental popup opening.

## Post-recovery follow-up — Undo, isolated rerouting, and large-map performance

- [x] Diagnose and correct the Undo control appearing active before the user performs any roadmap action.
- [x] Reproduce the specific Tree 2 arrow that still fails to reroute when a third, non-endpoint node blocks its current path.
- [x] Measure route-generation and interaction costs for progressively denser roadmaps; identify practical optimization work before large-map performance becomes unacceptable.
- [x] Verify initial Undo state, the reported isolated arrow corridor, ordinary Tree 2 interaction, TypeScript, and production build before delivery.
- [x] Make the disabled Undo state visibly distinct and keep an empty-history Undo dispatch as a harmless no-op.
- [x] Expand the route candidate generator with deterministic node-boundary detour lanes so a blocked arrow can take the shortest clean multi-turn path around a third node.
- [x] Confirm the Tree 2 root-to-first-level blocked-corridor case reroutes during a third-node drag without disturbing unaffected arrows.
- [x] Record the measured routing-cost findings and the practical large-roadmap guidance after verification.

## Exact faster-router architecture — deferred user decisions

- [x] Record the approved long-term replacement of the current candidate router with an exact faster router. The user replaced winner/loser priority for impossible lane conflicts with complete-action rejection; stable tie-breaks apply only where multiple complete legal layouts exist.
- [x] Park the illustrated node-owned junction-rail concept for a later design-problems discussion; do not decide or implement it while the remaining earlier routing topics are being clarified.
- [ ] Review the user’s illustrated node-owned junction-rail concept: a short local line beside a node can offer several attachment points for arrows that would otherwise compete for one lane. Compare it with separate perimeter ports and automatic fan-out before choosing it.
- [ ] If a junction rail is considered, define it as node-owned routing geometry rather than a shared arrow segment or a newly selectable joiner; decide visibility, capacity, side selection, movement with the node, deletion behavior, and interaction with the no-overlap and shortest-route rules.
- [x] Discuss the user’s true lane-conflict policy: if a proposed structural action leaves any arrow without a fully legal, unconflicted route, reject the entire action rather than assigning a winner and loser.
- [x] Discuss and approve the Stage 3 spatial-index approach: it remains entirely invisible with no new controls; it changes no safety rule or saved data; each long arrow must be registered in every invisible area it crosses so collisions cannot be missed.
- [x] Discuss and approve the Stage 4 conservative affected-arrow system: recalculate every possibly affected nearby arrow rather than risk missing one; automatically shorten an arrow when a moved obstacle opens a better route; and continue deterministic rerouting through the affected chain until every route is clean and stable.
- [x] Define the exact true lane-conflict policy: reject the complete action when no full legal routing solution exists; no arrow may receive a priority privilege that breaks the no-overlap rule.
- [x] Define the deterministic tie-break for multiple complete legal solutions: shortest route, then fewer distinct obstacles, then fewer bends, then stable top/left before bottom/right.
- [x] Define the formal minimum parallel-arrow lane gap (δ): 12 world units, measured centre-line to centre-line; exactly 12 units is legal.
- [x] Define the approved route-choice preference after primary shortest length: prefer the legal route that must go around fewer distinct node boxes or reserved conflicting arrow lanes; use another legal route when that preferred side is blocked.
- [ ] Before prototyping the Stage 5 exact direction-aware graph router, hear and record the user’s own idea for this step; do not choose the graph design without it.
- [x] Record the approved adaptive exact-drag behavior for a later worker phase: move with the finger when exact routing completes quickly; when it does not, calculate the final finger location after release and move there only when the exact route result is ready.
- [ ] Discuss the proposed Stage 7 worker and typed-array optimization later, including the visible drag-ghost example and the detailed behavior of fast versus delayed exact commits.
- [ ] When any future conversation moves to exact faster routing, proactively bring these deferred decisions back before asking for an implementation approval.

## Proposed automatic roadmap arrangement — design gate

- [ ] Evaluate the user’s proposed non-destructive visible “Arrange Roadmap” command, placed like Reset rather than inside a long-press menu: it should calculate clearer node positions and shortest unconflicted arrow routes without deleting nodes, arrows, labels, colors, or popup documents.
- [ ] In a dedicated later discussion, define the arrangement rules for centre versus no centre, disconnected trees, relative node distance, directed connection priority, readable structure, shortest unconflicted routes, and minimum crossings before promising that it can create a universally “best” layout.
- [ ] Define preview, confirmation, undo/redo, and cancellation behavior for automatic arrangement before implementation; do not make it behave like destructive Reset.

## External AI routing review brief

- [x] Create a neutral PDF that distinguishes approved Roamaps routing rules, provisional architectural directions, deferred design decisions, and targeted questions for external AI review.
- [x] Include the existing ChatGPT/Gemini debate conclusions without treating their unapproved suggestions as product decisions.
- [x] Review the finished PDF against the user-approved checklist and deliver it for copy-and-share use before any router rewrite begins.

## Claude review — newly identified exact-router decisions

- [ ] Decide port/fan-out capacity: how arrows obtain distinct perpendicular ports on one node side and whether insufficient space is a clean no-legal-route outcome.
- [x] Decide that non-overlap alone remains sufficient for close node placement; do not add an extra forced gap. Reject only an action for which no complete legal routing solution exists.
- [ ] Add an independent finished-route legality verifier, strict priority-order convergence rule, deterministic numeric-boundary policy, and reverse-arrow port fixtures to the final router contract.
- [ ] Review whether a sparse critical-coordinate graph is a better exact-routing search model than the proposed simple uniform routing grid, while retaining the approved uniform spatial index for fast lookup.
- [ ] Do not accept an internal-ID priority rule until the user supplies and approves the human-understandable lane-conflict policy.

## Current user-led routing discussion

- [x] Stop waiting for external AI replies; treat their proposals only as background, not as a decision source.
- [x] Create and deliver a plain-text copy-and-paste summary of the current Roamaps state, verified problems, considered solutions, and approved rules that must not change.

## Claude proposal assessment

- [x] Compare Claude’s current exact-router recommendations with the approved Roamaps rules, existing code, and deferred decisions.
- [x] Answer the proposal’s final product questions only where the current approved direction is sufficient; preserve genuinely open choices for the user.
- [x] Define a safe role for Claude as an external reviewer and specification/test assistant, not an autonomous source of product decisions or repository changes.

## Exact-router calculation feedback — pending confirmation

- [x] Confirm the user’s proposed conflict policy: compute the complete proposed state first and reject the entire action if even one arrow has no fully legal, unconflicted route; do not introduce a winner/loser priority for impossible conflicts. Apply it to every route-changing structural action: add arrow, drag, add node, deletion/reconnection, and Reset.
- [x] Define the remaining stable tie-break only for multiple complete legal solutions: shortest route, then fewer distinct obstacles/conflicting lanes, then fewer bends, then stable top/left before bottom/right.
- [x] Define the required separate routing modules: route search, independent legality verifier, test-only slow reference solver, and performance index; modularity protects correctness while the optimized search and index provide the speed improvement.
- [x] Write the first exact faster-router architecture contract with every currently approved rule, the 240 ms calculation-feedback behavior, and an explicit boundary that crowded node ports/junction rails remain later work. Draft: `/home/ubuntu/roamaps/EXACT_FASTER_ROUTER_CONTRACT.md`.
- [ ] Present the contract for the user’s final approval before changing any routing code.
- [x] Define safe delayed-calculation feedback: display a small non-blocking “Checking routes…” indicator only after 240 ms; compute a proposed state off-screen and commit atomically only after exact verification passes.
- [x] Decide that the canvas temporarily blocks further structural actions while a delayed exact calculation is pending, while pan and zoom remain available; a slow calculation is not itself an error, and a delayed drag keeps the node at its last valid position until its exact final result is ready.

## Background Work File schedule — approved

- [x] Configure non-destructive Roamaps review runs for today every two hours through 4:00 PM India time, then recurring daily reviews at 9:00 AM and 6:00 PM India time. Active after publishing; the temporary final run transitions the single schedule to the recurring cadence.
- [x] Limit every run to analysis only: identify bugs and risks, possible fixes, code-performance improvements, interface ideas, and a clear “no changes made” record.
- [x] Store the latest review as the Background Work File, to be delivered only when the user writes `bgwf`; do not alter code, project settings, saved roadmaps, GitHub, or checkpoints in any scheduled run.

## Exact faster-router implementation — user approved

- [x] Receive the user’s final approval of `EXACT_FASTER_ROUTER_CONTRACT.md`; do not implement crowded ports, junction rails, or Smart Arrange Roadmap as part of this work.
- [x] Extract pure routing geometry and canonical route interfaces from `TreeCanvas.tsx` without changing visible editor behavior.
- [x] Add an independent completed-route legality verifier for obstacle penetration, perpendicular ports, arrowhead clearance, self-conflict, exact 12-unit parallel separation, and legal bridge crossings.
- [x] Expand focused regression fixtures, including Tree 2 third-node detours, direct routes, reverse arrows, deletion/reconnection, close nodes, and no-solution rejection.
- [x] Add a test-only slow reference solver and prove the exact router against it on bounded fixtures.
- [x] Replace the limited route-candidate search with the approved exact orthogonal route search, preserving current node attachment grammar and deferring crowded-port design.
- [x] Add the invisible uniform spatial index and conservative affected-route calculation, with conservative later-route coverage in focused tests; the canvas currently remains on safe full recomputation until incremental commit wiring is separately verified.
- [ ] Add 240 ms `Checking routes…` feedback and atomic pending-action behavior without regressing pan, zoom, history, persistence, or popup interactions.
- [ ] Run TypeScript, production build, focused tests, large-map workloads, browser interaction checks, GitHub synchronization, WebDev checkpoint, and live-trial delivery.

## Exact-router recovery incident — reported 2026-08-20

- [ ] Reproduce the reported Tree 2 diagonal route segments using the saved 44-node roadmap and identify the first route whose points cease to be orthogonal.
- [ ] Trace why the new all-routes-legal gate rejects ordinary node moves and two-node connections in the user’s existing saved roadmap.
- [ ] Trace and correct the Undo control being active when no user action is available to undo.
- [ ] Restore the last known valid interaction behavior with the smallest evidence-based code change; do not add new routing features during recovery.
- [ ] Add regression coverage for every reproduced diagonal route, blocked ordinary action, and incorrect fresh-history Undo state.
- [ ] Verify Tree 2 interactions on tablet-relevant dimensions, TypeScript, routing tests, production build, browser console, GitHub synchronization, and a checkpoint before another trial.

## Isolated progressive router prototype — approved 2026-08-20

- [x] Keep the zero-to-five-bend router prototype unimported by `TreeCanvas`, the reducer, and all user-facing application components.
- [x] Test all source/target sides, perpendicular port stubs, necessary temporary backward movement, deterministic selection, and no diagonal fallback.
- [x] Create genuine constrained obstacle fixtures requiring exactly 0, 1, 2, 3, 4, and 5 bends; ensure the five-bend maze fails at a four-bend ceiling.
- [x] Verify TypeScript, no live imports, orthogonality, no-route rejection, repeatability, and a local 100-run five-bend performance guard.
- [ ] Do not integrate the prototype until the user approves a separate gate covering real Tree 2 shadow comparison, crowded-port behavior, Android-tablet performance, history/persistence safeguards, and 240 ms pending-action feedback.

## Progressive router live integration — approved 2026-08-20

- [ ] Preserve the verified five-bend prototype as the routing core while adapting it to the live node and arrow model; do not alter graph persistence, localStorage schema, or history semantics.
- [ ] Remove every diagonal and best-effort fallback from live rendering: no legal route must render as a safe non-diagonal unresolved state, never a tilted arrow.
- [ ] Maintain baseline-aware structural validation so pre-existing dense-map route debt cannot freeze unrelated Tree 2 moves or new connections.
- [ ] Add targeted regression tests for route orthogonality, five-bend detours, Tree 2 action availability, fresh-history Undo/Redo availability, and no-route handling.
- [ ] Complete real Tree 2 and tablet-relevant validation, TypeScript, production build, browser-console checks, GitHub synchronization, and a WebDev checkpoint before publishing a new trial.

## Tree 2 exact responsiveness repair — approved 2026-08-20
- [x] Preserve routing output and safety rules while caching the currently derived route set for pointer-down, drag validation, and rendering.
- [x] Replace full flat-list arrow-lane comparison with an exact nearby-lane spatial lookup; do not weaken no-touch, endpoint-body, port-priority, or five-bend rules.
- [x] Ensure a dense drag calculation is consumed once for both validation and display, rather than re-derived in the pointer handler and render.
- [x] Prevent browser text selection during canvas long press without breaking node popups, label editing, panning, pinch zoom, or arrow long press.
- [x] Add exact-route equality, Tree 1/Tree 2 timing, long-press, drag, history, persistence, TypeScript, build, browser, GitHub, and checkpoint verification before publishing the repair trial.
- [x] Synchronize the verified repair to GitHub in commit `e12dfda`, publish WebDev checkpoint `3457475c`, and deliver the new tablet trial.
