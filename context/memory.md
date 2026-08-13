# Roamaps session memory

## Current milestone

The approved first editor milestone is implemented in the live WebDev project at `/home/ubuntu/roamaps-live` and synchronized into the GitHub source repository at `/home/ubuntu/roamaps`.

The user’s arrow reference is the geometry ground truth: routes must leave and enter nodes perpendicularly, use right-angle segments, stop at the node boundary, and never run along a node side. Crossing routes use an overpass/bridge treatment. The editor now supports independent node creation, two-node arrow creation, node dragging, undo, redo, and reset. Removing the center/root node is allowed; its connected arrows disappear and its former children remain as independent nodes rather than being promoted.

## Verification

TypeScript checking and production build pass in `/home/ubuntu/roamaps-live`. The live trial route was opened at `/#/tree/1` and confirmed to render the canvas, route status rail, controls, and clean demo state. Browser interaction tests confirmed add node, undo, redo, reset, and two-node arrow creation through DOM pointer events. A synthetic long-press did not open the action panel in the browser harness; root removal should be manually confirmed in the user’s tablet trial.

The pointer-capture handler was hardened after the browser harness reported a synthetic-event `setPointerCapture` exception. A fresh route reload afterwards produced no new browser-console output.

During review, the Home page’s `ADD_TREE` action was found to be unhandled by the history reducer. It was fixed, synchronized to the source repository, and verified by creating and opening `New Roadmap 3` with one root node.

## Recovery findings — next pass

The user’s tablet trial reported that arrows cannot be removed and that directly aligned nodes should use a simpler horizontal or vertical connection when unobstructed. The recover diagnosis classifies this as a targeted bug. Arrow removal is blocked because the arrow hit path cancels its long-press timer on every pointer move; ordinary touch drift prevents the arrow action panel from opening. The reducer/action identity model is already suitable for removal. The routing issue is a missing direct aligned-route preference before the existing orthogonal fallback search.

The proposed recovery plan is saved in `/home/ubuntu/roamaps/RECOVERY_PLAN.md`. It must be approved before code changes. GitHub synchronization is explicit: WebDev edits and checkpoints do not automatically commit or push to `coding-div/roamaps`; changes must be synchronized, committed, and pushed separately.

## Recovery pass completed

The approved recovery changes are implemented in the live WebDev project. Arrow long-press now tolerates small touch drift up to the configured threshold and uses pointer-id-aware capture/cancellation. Clear same-row and same-column routes are preferred when the port-to-port segment is unobstructed; the existing orthogonal candidate search remains the fallback.

Verification passed in the live browser: arrow long-press opened the action panel after 3px synthetic touch drift; Remove Arrow reduced Tree 1 from 7 to 6 edges; Undo restored 7; Redo returned to 6; a final Undo restored 7; localStorage recorded the 6-edge state before Reset; Reset restored the clean 7-edge demo; five aligned demo routes render as one segment; and no new browser-console errors appeared. The live project’s TypeScript check and production build also pass.

## Branch-stage decisions — confirmed

The user confirmed that every object is simply a node; there is no special center/root node. Node removal uses bypass reconnection only when the node has both incoming and outgoing arrows: every incoming source connects to every outgoing target, duplicate directed arrows are skipped, then the removed node and its old arrows disappear. If a node has only incoming or only outgoing arrows, its connected arrows are removed with it. Removing an arrow still removes only that arrow and leaves both endpoint nodes.

The existing A/B two-node connection method must not change. The new branch workflow adds a persistent, visible, selectable, movable joiner that is node-like but smaller and unlabeled. A joiner may be placed on an existing arrow, does not count as a routing obstacle, and remains after branch construction so the result stays editable and visually distinctive. Placing one on an arrow splits that arrow into source → joiner → target. Cycles are allowed. Same-direction duplicate arrows are blocked. Reverse-direction arrows are separate objects and must render on separate parallel lanes rather than overlap.

## Branch-stage risks and safeguards

The implementation must use stable node/joiner IDs, preserve one-step Undo/Redo transactions for each structural operation, skip duplicate links during many-to-many bypass deletion, keep joiners out of obstacle routing, use larger invisible touch targets for small joiners, and validate all affected routes after moving or deleting a joiner. These decisions are recorded before code changes so the next session does not infer behavior from screenshots.

## Delivery

The user wants a clickable live website trial, not a PDF overview. Live preview URL:

`https://3000-ik8qkak4s5d933dh1ybvw-dc124c94.sg1.manus.computer`

The preview is currently not a public published link; the user controls the Publish action in the Manus WebDev interface. The project checkpoint must be saved before the user publishes.

## Workflow next steps

Run the review report without auto-fixing any new findings. Then commit the synchronized source changes to `coding-div/roamaps`, save a WebDev checkpoint for `roamaps-live`, and deliver the live preview plus concise review notes. Any review fixes must wait for the user’s approval.

## Branch-stage implementation completed — 2026-08-13

The approved branch contract is implemented in `/home/ubuntu/roamaps-live`. The data model now distinguishes normal nodes and persistent smaller unlabeled joiners, stores split-arrow metadata, adds theme-safe black and white palette values, and preserves old saved roadmaps through normalization. The reducer supports one-step joiner placement, arrow splitting, joiner movement, all-to-all bypass deletion, duplicate directed-edge prevention, allowed multi-node cycles, blocked self-loops, and existing Undo/Redo/Reset behavior.

The canvas now has an Add Joiner toolbar mode that toggles off when pressed again, places one joiner per activation on empty canvas or a clear arrow segment, rejects normal-node/crossing/short-segment placement, keeps joiners out of routing obstacles, gives joiners selection priority, renders attached tails without arrowheads, and keeps split segments attached while a joiner moves like a node. Reverse arrows use distinct parallel lanes. Home previews intentionally omit joiners; editor statistics include them.

The branch browser trial passed TypeScript checking, production build, Add Joiner placement, arrow splitting, joiner-first selection, joiner removal with Undo, attached-joiner dragging, persistence, clean reload, and a clean final browser console. The final imprint pass applied the trusted archive/card/editor status-rail recommendations; remaining non-blocking tokenization notes are in `context/IMPRINT_BRANCH_REVIEW.md`. The review report is `/home/ubuntu/roamaps-live/BRANCH_REVIEW_REPORT.md`, and the numbered tablet tasks are `/home/ubuntu/roamaps-live/USER_TRIAL_TASKS.md`.

No user-tablet findings have been reported yet for this branch stage. The next recovery/improvement pass must start from the numbered trial-task result rather than assumptions.
