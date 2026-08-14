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

## Branch-stage user trial revision — 2026-08-13

The user completed all seven numbered tablet trial tasks successfully and then reported nine image observations. The first issue is confirmed as a visual routing problem: two separate directed arrows can share or overlap the same orthogonal corridor, making one appear to connect to the middle of another. This is not intended arrow-to-arrow attachment; only a joiner placed directly on an eligible arrow should split that arrow.

The third image is classified as a targeted arrowhead-rendering bug candidate. The current rule is correct in principle—arrowheads are drawn on arrows whose target is a normal node and suppressed only when the target is a joiner—but the final-segment polygon can still be visually hidden or misplaced in some routed layouts. It requires reproduction before choosing a fix.

The fourth image is classified as a targeted spatial-placement bug: normal rectangular nodes can occupy overlapping positions because independent-node creation and node dragging currently do not enforce separation. The correct prevention behavior remains an open product decision and must be asked one question at a time rather than guessed.

The fifth image is a clarity issue, not a new graph rule. The explicit rule to communicate is: every arrow ending at a normal node has an arrowhead; an arrow ending at a joiner has no arrowhead; an attached joiner may show plain tails/stems, but the joiner itself never receives an arrowhead.

Images six through eight show intended bypass behavior. When a joiner or node with incoming and outgoing arrows is removed, the reducer reconnects each incoming source to each outgoing target, so the route may appear to shift directly to the next node. This is required by the approved branch contract, not an accidental rendering change.

The ninth image is classified as a targeted placement-validation bug. Direct taps on a visible normal node are rejected in Add Joiner mode, but free joiners created on blank canvas are not currently checked against nearby normal-node bounds, so a joiner can be placed visually on top of a node. This must be fixed after the consolidated plan is approved.

No code changes are approved yet. The next step is to revise the remaining observations with the user, resolve the open spacing-prevention decision one question at a time, then present one consolidated fix plan for approval.

## Collision-prevention proposal — user revision

The user wants normal nodes and joiners to have invisible clickable/collision areas around their visible shapes. These areas must never overlap. Nodes may appear visually close, but placement or movement must halt whenever the invisible interaction areas would overlap another node or joiner.

For placement, the user proposes using the joiner placement method for both object types: after activating Add Node or Add Joiner, a tap on empty canvas places the object only if the location is free of nodes, joiners, and arrows and the object’s invisible area would not overlap another node or joiner. If the candidate location is occupied or too close, placement is rejected, the mode turns off, and the user must activate the toolbar option again manually.

Arrows are different from node/joiner collision areas. If the candidate location is not directly on an arrow, routing should go around the arrow without touching it. If the user directly taps an arrow while Add Node or Add Joiner mode is active, placement must halt, the mode must turn off, and the user must activate it again manually. The user confirmed that Add Node must change from immediate center spawning to tap-to-place mode: activate the toolbar option, tap the canvas to place one node, then turn the mode off.

## Proposed stronger overlap solution — not yet approved

Rather than scattering separate overlap checks through Add Node, Add Joiner, and dragging, use one shared spatial rule called an interaction envelope. Each normal node gets a padded rectangular envelope based on its visible box; each joiner gets a padded circular envelope based on its visible radius. The envelope is both the invisible tablet hit area and the collision boundary, so the same rule governs placement, selection, and movement.

Placement would use a preview gate: the candidate is committed only if its envelope does not intersect another node or joiner envelope and the tap was not on an arrow’s transparent hit path. A rejected candidate is never committed, the active mode turns off, and a tablet toast explains why. There is no automatic nearest-space snap, avoiding unexpected movement away from the user’s chosen location.

Movement would use a last-valid-position clamp: the object follows the finger while its envelope is clear, then stops at the last valid position when another envelope would be crossed. This prevents accidental overlap without allowing a node or joiner to jump unpredictably. Existing routing rules remain separate: normal nodes can be routing obstacles, joiners remain non-obstacles as previously approved, and direct arrow taps in placement mode reject the placement.

## User refinement of overlap recovery — approved

The user proposes five refinements. First, an enlarged joiner interaction area must not reject a joiner that is intentionally placed directly on an eligible branch arrow; this is an intentional arrow-splitting exception. Second, a normal node’s protected area must resize when its label grows or shrinks. Third, if label growth would make that envelope overlap another object, additional characters must be refused. Fourth, if a drag ends inside another object’s protected area, the dragged object must return to the exact position from which the drag began. Fifth, if any action would cause overlap—dragging, spawning, or label growth—the mistake should be automatically undone immediately.

Recommended refinement: implement the last rule as a transaction rejection rather than creating a visible extra Undo history entry. Tentative movement or label changes are previewed; only valid results are committed. If invalid, the object or label returns to its last committed state, accompanied by a short tablet message. This gives the user the same automatic correction without polluting Undo/Redo with an action that never became valid. Joiner-on-arrow placement is allowed on any eligible existing arrow segment, including a segment created by an earlier arrow split, provided the segment has sufficient room and no node/crossing conflict.

The user clarified the label-history distinction. During label editing, if one newly typed or pasted character or line would make the node envelope overlap another object, only that attempted addition is rejected; the already-valid label remains and there is no Redo for the rejected addition. After the user saves a valid label edit, it is one ordinary history transaction. A later user Undo reverses the entire saved label change and restores the previous text.

The user approved the final edge cases: saved roadmaps contain no overlap; only normal node bodies and joiner circles count as collision envelopes, not attached tails/stems; invalid drags show a temporary warning and restore the exact pre-drag position; middle insertion and paste preserve surrounding text while keeping the longest valid inserted beginning; and blocked label growth displays “No room for more text.” The complete approved design is recorded in `/home/ubuntu/roamaps/COLLISION_IMPLEMENTATION_CONTRACT.md`. Implementation remains gated on the final contract approval message, after which the code may be changed.

## Collision-prevention implementation completed — 2026-08-14

The user approved the complete collision contract and explicitly required protection of all earlier routing, arrow, joiner, history, persistence, and tablet-pointer fixes. The live project now has a shared shape-aware collision module at `client/src/lib/collision.ts`. Normal nodes use label-sized rectangular envelopes expanded by 12 world units; joiners use circular envelopes expanded by 6 world units. The same geometry supports placement, selection hit areas, dragging validation, label fitting, and reducer-level guards.

Add Node now uses one-shot tap-to-place behavior like Add Joiner. Both modes show a ghost preview, reject occupied or too-close node/joiner envelopes, reject direct arrow taps when appropriate, turn off after one attempt, and require manual reactivation. Add Joiner preserves the intentional exception for direct placement on any eligible arrow segment, including a segment created by an earlier split. Joiners remain excluded from routing obstacles, and attached tails/stems remain outside the joiner collision envelope.

Dragging now previews invalid positions with a red outline and restores the exact pre-drag position on an overlapping release. Valid movement remains one normal Undoable action. The reducer rejects invalid movement and placement before history commit, so automatic rejection creates no extra visible Undo/Redo step. Label editing validates the resized envelope continuously, accepts the longest valid inserted beginning for typing and paste—including middle insertion—preserves surrounding text, and displays “No room for more text” when growth is blocked. A saved valid label edit remains one complete user-history transaction.

Regression safeguards were preserved: perpendicular direct routes and orthogonal fallback routing, crossing bridges, reverse-arrow lanes, manual arrowheads, joiner split metadata and tails, joiner-first selection, long-press arrow removal with touch drift tolerance, bypass deletion, cycles, duplicate prevention, undo/redo/reset, and localStorage persistence. Reducer guards now protect placement, movement, label updates, and joiner-on-arrow placement even if an action arrives outside the visible controls.

Verification passed: `pnpm check`, `pnpm build`, `git diff --check`, clean development-server restart, and a post-restart browser console check. The browser trial confirmed tap-to-place Add Node, rejection on a node envelope, free joiner placement, joiner-on-long-arrow splitting, invalid node-drag rollback with “Space occupied,” normal-node Edit Label availability, and longest-valid label rejection (a 180-character candidate retained a 29-character valid prefix and displayed the approved message). Full evidence is in `/home/ubuntu/roamaps-live/collision-browser-findings.md`.

The earlier duplicate-declaration message was stale HMR output from before the clean server restart; the restarted server reported TypeScript with zero errors and the current browser console had no runtime errors. A visual review was captured for the landing page and editor. The screenshot helper’s `/tree/1` path rendered the landing composition because Roamaps uses hash routing; direct browser navigation to `/#/tree/1` rendered the full editor correctly, so no unrelated landing-page redesign was made during this functional collision milestone.

## Architecture reset — foundation-only contract approved — 2026-08-14

The user and agent concluded that the visible circular joiner system, branch rails, stem-and-fan reconnection, attachable arrows, and other advanced routing mechanisms were overengineered for the current product stage. The next trial returns to a clean foundation: ordinary nodes and ordinary directed arrows only. The previous arrow-stage geometry remains useful where it supports clear orthogonal routes, perpendicular node boundaries, arrowheads, bridge crossings, reverse-direction separation, collision-safe movement, undo/redo, reset, and localStorage, but all joiner-specific behavior is superseded and must be removed before implementation.

The locked foundation rules are: nodes can be added, removed, recolored, relabeled, and moved, with resizing deferred; arrows can be added, removed, recolored, and move with their nodes, connect exactly two nodes, allow one arrow per direction for a pair, block self-loops, and allow reverse-direction arrows; the toolbar keeps Add Node and Connect Nodes; arrows never pass through node bodies and form bridge arches at true crossings; visible node shapes cannot overlap; two arrows cannot share a horizontal or vertical segment; routes use the shortest clear orthogonal path; deleting a node with both incoming and outgoing arrows preserves the current direct bypass reconnection, while stem-and-fan is deferred; deleting a node with only incoming or only outgoing arrows removes the node and all connected arrows; every committed action is atomic and undoable, rejected actions create no history entry, and Undo, Redo, Reset, and localStorage remain fundamental; zoom buttons, pinch zoom, empty-canvas pan, and Home fit-to-content remain; and short-tapping a node opens its popup while long-pressing opens Edit Label, Recolor, Remove, and a deferred Resize placeholder.

The popup-first model is now explicit. Each node has a short map heading and a separate unlimited plain-text popup document. The short heading is edited through long-press → Edit Label and must contain at least one character when saved. A new node starts with an empty heading and empty document. Short tap opens one centered popup at a time; its top-left header shows the node heading, or the UI-only placeholder “Untitled node” when the saved heading is empty. An empty document shows a “No notes yet” hint without storing that hint. Edit Text makes the entire document editable inline, with indefinite vertical scrolling and no word or space limit. Save commits the document inside the popup editor; X during editing, or switching to another node during editing, offers Save changes or Discard changes. Popup document editing stays outside the main roadmap Undo/Redo history and uses local editor history for the active editing session. A node containing popup data requires confirmation before deliberate removal or an Undo that would remove it; deletion and restoration always include the node heading, document, and connected graph state together.

Node appearance and size remain fixed in this trial. The old MAX_LABEL_LENGTH rule is removed. Font/label-size sliders, node resize handles, movable route corners, attachable arrows, branch rails, stem-and-fan reconnection, and all joiner actions/data/rendering are deferred or removed as specified in the approved contract. The user approved `FOUNDATION_CONTRACT.md` on 2026-08-14, after which implementation began in the live project.

## Foundation-only implementation completed — 2026-08-14

The live project now implements the approved ordinary-node and ordinary-arrow foundation. The data model removed joiner kinds, split metadata, and the old label limit, and added `popupContent` as a separate persisted field. The reducer removed joiner actions, retained atomic graph history, added popup-content updates outside main roadmap history, normalized legacy saved data safely, and preserves complete node records—including popup documents—through structural deletion Undo/Redo.

The canvas keeps the proven perpendicular direct routes, orthogonal obstacle-aware fallback, reverse-direction lane separation, bridge crossings, arrowheads, node-safe routing, node movement, arrow removal, collision-safe placement, pan, zoom, pinch, and Home fit-to-content. The toolbar now exposes Add Node and Connect Nodes without Add Joiner. Long press opens Edit Label, Recolor, Resize placeholder, and Remove; short tap opens one centered NodePopup with a node-heading header, unlimited plain-text body, explicit Save, X-only clean close, and Save changes / Discard changes prompts for unsaved close or node switching. Empty headings are rejected on save; empty popup documents show a UI-only `No notes yet` hint.

Recovery diagnosis found one apparent data-bearing Undo failure during a polluted browser test history. A clean Reset/reload reproduction removed a data-bearing root, restored all eight nodes and the saved popup document through Undo, confirmed Redo’s destructive warning, removed the root again, and restored it once more. The failure was classified as test-state pollution rather than a reproducible reducer defect; the evidence is recorded in `/home/ubuntu/foundation-browser-check.md`.

TypeScript checking and production build pass after the foundation reset. The final review found no new blocker or major interaction issue. The visual pass preserved the existing Obsidian Cartography landing/editor language and added a documented foundation popup pattern: graphite document surface, cobalt route-marker edge, mono node-document metadata, and restrained Save/Discard actions. The remaining known design debt is non-blocking hard-coded color tokenization, intentionally deferred to a separate cleanup.
