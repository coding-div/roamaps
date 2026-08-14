# Foundation Browser Check

The hash-routed editor opened at `/#/tree/1` with the dark canvas, existing roadmap nodes and arrows, Add Node, Connect Nodes, Undo, Redo, Reset, zoom controls, and Fit all content. The Add Joiner control is absent. A coordinate short-tap attempt on a blank node did not visibly open the popup, so the next verification step must inspect the target and pointer event path rather than assume the popup is working.

After hot reload, a browser view briefly showed a blank white page while the console reported no output. This is a service/rendering verification issue, not evidence that popup behavior is correct or incorrect; check the development server and reload before further UI testing.

After a full reload, the editor rendered again without the joinerMode error. A second coordinate short-tap on an empty node still did not open a popup, so inspect the rendered SVG attributes and pointer completion logic next.

The live DOM reported all eight node groups with `data-node-id` and active pointer events. The upper empty node measured around x=695–774, y=159–187 in the browser viewport. Clicking within that measured rectangle again caused the browser view to turn blank, so the next step is to inspect the newest runtime log entry for a targeted pointer-up error.

The browser console contained no new runtime error after the measured click. A programmatically dispatched pointerdown/pointerup sequence on the root node also completed without an error, narrowing the remaining verification issue to the short-press timing or popup mount path rather than a missing SVG target.

The dialog was present in the DOM after the programmatic short tap and rendered correctly on the next browser view. It showed the top-left `Main Topic` node heading, an empty-document `No notes yet` state, a close X, and an `Edit Text` button. The earlier blank screenshots were browser capture transitions, not a React render failure.

The visible Edit Text control successfully changed the popup to inline editing with a scrollable textarea, Cancel, and Save controls. The textarea placeholder and the `Local editor history active` status were visible.

A multi-paragraph plain-text document was entered with blank lines and saved. The popup returned to view mode and displayed all paragraphs with their line breaks, confirming unlimited plain-text content and explicit Save behavior.

The popup’s X closed the saved document cleanly and returned to the full canvas. A subsequent programmatic attempt to target `t1-c1` found no matching node in the current DOM, so inspect the live node IDs before testing switching and discard prompts.

The current DOM then reported all expected node IDs, including `t1-c1`, but a second synthetic pointer sequence on that node did not mount a dialog. Its screenshot upload also failed, so refresh/view the page before treating this as an application defect.

A subsequent browser view showed a blank capture, but the console still contained the complete node list and no runtime exception. The editor DOM therefore remained mounted even when the screenshot capture was white; do not treat the capture artifact as a React crash.

After a fresh URL reload, the editor reported zero nodes and localStorage contained both demo trees with `root: null` and empty `nodeMap` objects. This is a real persistence regression that must be diagnosed and fixed before further popup testing.

The visible Reset action restored the demo roadmaps to eight nodes in Tree 1. A direct localStorage inspection confirmed both trees were persisted again with their full node maps; reset recovery works. Demo child headings are intentionally empty under the approved new empty-heading behavior, while `Main Topic` remains the root heading.

A normal coordinate click did not open the root popup, but a timed touch-style pointer sequence on `t1-c1` opened one dialog successfully. The implementation’s short-tap branch therefore works when the pointerdown/up timing reflects a real touch; browser coordinate clicks are not a reliable test for this tablet-specific gesture.

The second-node popup displayed the UI-only `Untitled node` placeholder for its empty saved heading, showed `No notes yet`, and kept the heading at the top-left of the centered popup as specified. A follow-up click using the prior element index was rejected because the browser snapshot had become stale; resnapshot before retrying.

After resnapshot, Edit Text opened the second node’s inline textarea with Cancel and Save controls. The textarea was empty as expected for a new empty document.

Temporary unsaved text was entered, then the popup X was pressed. The popup remained open and displayed the approved confirmation with `Save changes` and `Discard changes`, explaining that unsaved text must be resolved before continuing.

Discard changes closed the popup. A direct localStorage check confirmed the temporary draft was not saved and the node’s stored `popupContent` remained empty.

The second-node popup was reopened successfully through the timed touch-style event sequence and was in view mode with no saved notes, ready for the unsaved-switch test.

Edit Text opened successfully, temporary text was entered, and a timed short tap on `t1-c2` while the editor was active produced the approved `Save your changes?` prompt with Save changes and Discard changes. The current popup remained open pending the user-choice simulation.

The browser screenshot became blank again during the prompt, but a live DOM check showed eight node groups, both roadmap roots, and full localStorage data; this was another capture transition rather than a persistence wipe.

Discard changes was selected programmatically. After the state update, the dialog belonged to the requested second node, showed `No notes yet`, and the draft remained absent from localStorage. The unsaved-switch flow works.

The popup Close control was confirmed by its `aria-label` and successfully closed the switched popup, leaving the canvas ready for long-press action-menu verification.

A timed 760 ms touch-style long press on the root node opened the node action menu. The menu visibly contained exactly `Recolor`, `Edit Label`, `Resize`, and `Remove Node`, with a close control. The deferred Resize option is exposed separately from the implemented actions as required.

Edit Label opened a separate short-heading editor with a textarea, Save, and Cancel. Clearing the heading and pressing Save kept the editor open and displayed `Enter at least one character before saving.`, confirming that an empty heading cannot be committed.

The valid heading `Anchor` was entered and saved after refreshing one stale browser snapshot. The action editor closed, the root node visibly changed from `Main Topic` to `Anchor`, and the connected arrows remained in place, confirming heading edits do not alter graph structure.

Opening the action menu again and choosing Resize showed the non-destructive `Resize coming soon` toast. The node and graph remained unchanged, confirming resizing is deferred without a misleading partial implementation.

Choosing Remove Node on the current root removed it and its outgoing arrows, leaving seven nodes. Because Reset had intentionally cleared the test document beforehand, the root had no stored popup data at this moment; this correctly exercised the one-sided deletion rule without a confirmation prompt. The next step must restore the root through Undo, save popup content on it, and then verify the required deletion confirmation.

Undo restored the removed root and its outgoing arrows. The node action menu remained open after the structural Undo, so the next popup test must close that menu before sending a timed short tap; the failed popup-open attempt was caused by the active action menu, not treated as an application defect.

The first follow-up used the 760 ms long-press duration again, so it correctly reopened the action menu rather than the popup. The canvas source confirms the long-press timer is 500 ms; a true short tap must release before that threshold.

After closing the action menu and using a 150 ms touch-style pointer sequence, the root popup opened correctly. Edit Text accepted `Deletion confirmation test document.` and Save persisted the content to the root node’s `popupContent` in localStorage.

The saved popup was closed, a 650 ms long press opened the action menu, and choosing Remove Node displayed `CONFIRM REMOVAL` with the explanation that the node contains popup text and that removing it will remove the text too. The dialog offered Remove and Cancel, confirming the required data-bearing deletion guard.

The confirmation Remove action deleted the data-bearing root, leaving seven nodes and a null root in Tree 1. The popup document disappeared with the node as required.

Invoking Undo immediately afterward did not restore the previous eight-node snapshot; Tree 1 became empty with zero nodes. Invoking Redo then restored only the seven-node rootless snapshot. This is a reproducible targeted history bug, not a browser-capture artifact.

Recovery diagnosis: the failure is isolated to roadmap history after the popup/deletion sequence. The reducer’s `UNDO` and `REDO` branches are structurally ordinary, while `UPDATE_POPUP_CONTENT` intentionally rewrites snapshots without adding main-roadmap history. The next test must reset the demo trees and compare a plain node deletion/Undo sequence with a data-bearing popup deletion/Undo sequence before choosing a fix.

Reset restored Tree 1 to the clean built-in eight-node snapshot with `Main Topic` and no popup document. A timed long press, ordinary Remove Node action, and immediate Undo restored all eight nodes and the root correctly. This proves the ordinary node deletion history path works; the defect is specifically exposed by the popup-content/history interaction.

A fresh Reset followed by saving only `Fresh reload history test.` to the root produced eight nodes and the expected stored popup document. Reloading the editor preserved all eight nodes and the popup text, so the persistence path is healthy for this minimal case. The next diagnosis step is to perform data-bearing Remove and Undo after this reload, with no earlier graph actions in the current page session.

The minimal post-reload sequence closed the popup, removed the data-bearing root through the required two-step confirmation, and then invoked Undo. It restored all eight nodes, the root, and `Fresh reload history test.` exactly. Therefore the data-bearing deletion and Undo implementation works in a clean history session.

Redo after that clean Undo invoked the browser confirmation with the exact message `Redo will remove a node and its saved popup document. Continue?`. With confirmation accepted, Redo removed the root and its popup data; a following Undo restored all eight nodes and the popup document again. The original zero-node result came from polluted prior test history, not a reproducible reducer defect. The next verification can proceed from a clean Reset/reload state.
