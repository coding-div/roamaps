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
