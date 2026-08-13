# Live trial verification notes

Preview URL: `https://3000-ik8qkak4s5d933dh1ybvw-dc124c94.sg1.manus.computer`

Editor route tested: `/#/tree/1`

The home route and editor route load in the browser. The editor exposes Back, Add node, Connect nodes, Undo, Redo, Reset demo roadmaps, Zoom in, Zoom out, and Reset view controls. The default Tree 1 canvas renders the dark dotted grid, independent colored nodes, orthogonal routes, and manually oriented arrowheads.

The editor is currently being tested as a live trial preview, not as a published public link. The Management UI shows a Preview mode notice that a public shareable link requires publishing; publishing remains a user-controlled action.

Interaction test completed: tapping **Add node** increased Tree 1 from 8 to 9 nodes and placed an independent “New node” on the canvas. The route header updated its node count immediately.

History test completed: **Undo** returned the count to 8 nodes, and **Redo** restored the ninth node. This confirms the editor history stack is connected to visible roadmap state.

Reset test completed: **Reset demo roadmaps** restored Tree 1 to its original 8-node state and displayed a confirmation toast. Connection mode then entered the expected “Select source” state.

The browser automation view exposes SVG nodes visually but not as indexed interactive elements, so the coordinate-only node selection could not be completed reliably through this harness. The implementation uses pointer handlers on the SVG node groups for real tablet taps; this should be confirmed manually in the live trial.

DOM pointer test completed: dispatching pointer events to `t1-c2` and `t1-c6` produced an “Arrow added” confirmation and exited connection mode, confirming the two-node path logic. A synthetic long-press dispatch did not open the action panel in the browser harness, so root removal should be manually long-pressed in the live trial.

Final browser state was reset to the clean Tree 1 demo with 8 nodes, and the editor route/status rail remained visible.

Fresh-route verification completed after the pointer-capture hardening: Tree 1 loaded with 8 nodes, the editor controls were present, and the browser console reported no new output.

New-roadmap regression test completed: the home page action created and opened `New Roadmap 3` with one root node, confirming that the ADD_TREE reducer path is now active.

User trial findings added for the recovery pass: arrow removal was not usable on the tablet, and direct aligned routes should be preferred when no obstacle blocks them. The first verification covered arrow creation but did not cover arrow selection/removal; this is a recorded verification gap, not evidence that the reducer action is missing.

Recovery verification setup: the fresh Tree 1 route rendered seven stable arrow groups with source/target IDs. Direct aligned examples now render as one SVG segment, including the root-to-left, root-to-right, and root-to-upper-child routes.

Arrow-removal recovery test passed: a synthetic touch long-press with only 3px of drift opened `Arrow Actions`, and activating `Remove Arrow` removed the selected `tree-1-t1-root-t1-c1` route from the canvas.

History and routing checks passed: removal reduced the rendered arrow count from 7 to 6, Undo restored 7, Redo returned to 6, and a final Undo restored the clean 7-arrow demo. Five Tree 1 routes currently render as single-segment aligned paths; the remaining routes retain multi-segment orthogonal paths where their endpoints and obstacles require it.

Persistence check passed: after removing an arrow, localStorage recorded 6 edges, and Reset restored the clean 7-arrow demo. The subsequent browser console review showed no new runtime error output.

Branch-stage verification: Add Joiner mode entered from the toolbar and a single tap on an empty canvas placed one fixed-size, unlabeled 3D joiner; the mode exited after placement and the route header count increased from 8 to 9 nodes. After Reset, Add Joiner mode was re-entered and a precise tap on the centered vertical arrow successfully produced an “Arrow split” confirmation. The attached joiner rendered as a small shaded circle with a bright ring, and the reducer created two directed segments in place of the original arrow; the toast stated that the joiner moves with both route segments.

Browser harness note: the browser reports an inner viewport of 1280×1100 while the annotated screenshot is scaled to approximately 891×768. Coordinate tests must use the reported inner viewport dimensions, otherwise a tap intended for an arrow can land on empty canvas and create a free joiner. This is a test-harness coordinate issue, not evidence of an application placement failure.

Joiner selection test passed: a synthetic touch long-press on the attached joiner opened `Joiner Actions` rather than the underlying arrow. The panel exposes `Edit Color` and `Remove Joiner` and does not expose a label editor, matching the branch contract.

Joiner deletion test passed: activating `Remove Joiner` reduced the Tree 1 node count from 9 back to 8 and restored the original direct route through the removed joiner. Undo restored the attached joiner and its split segments, confirming joiner deletion is one reversible history step.

Attached-joiner movement test passed: a pointer drag moved the joiner from approximately `(641, 478)` to `(697, 533)` in the browser viewport, and both split route segments remained attached. The persisted roadmap state contains the joiner with `kind: "joiner"`, `color: "white"`, and exactly two directed edges through it, confirming localStorage persistence of the joiner structure and movement.

## Branch-stage final review — 2026-08-13

- The approved branch stage compiled successfully with `pnpm check` and `pnpm build` after the final UI pass.
- The build emitted only the existing pnpm configuration warning and the existing large-chunk warning; no TypeScript or production-build failure occurred.
- The trusted visual review confirmed the Obsidian Cartography direction and requested stronger map-sheet archive rhythm, recurring route glyphs, and a clearer full-bleed editor status rail.
- Those suggestions were applied in one cohesive pass to `Home.tsx` and `TreeView.tsx`: the roadmap archive now uses an asymmetrical sheet offset, plotted corner annotations, a recurring route glyph label, and the editor has a compact map-sheet status rail.
- The editor’s branch behavior remains unchanged by the visual pass. Joiner creation, arrow splitting, joiner-first selection, removal/Undo, attached movement, persistence, and reverse-lane geometry were verified before the style pass.
- The style-review registry is stored in `context/ui-registry.md`; non-blocking tokenization findings are stored in `context/IMPRINT_BRANCH_REVIEW.md` and were intentionally not auto-fixed.
- Fresh editor-route verification after the visual pass loaded `/#/tree/1` with the full-bleed canvas, Back control, Add node, Add joiner, Connect nodes, Undo, Redo, Reset, zoom controls, map-sheet status rail, and live canvas footer visible.
- The final browser console review returned no console output, so no new runtime error was observed after the visual changes.
