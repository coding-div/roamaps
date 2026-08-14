# Collision implementation browser findings

## 2026-08-14 live verification

- The home page loaded successfully with both demo roadmap cards.
- Tree 1 loaded successfully after the collision changes.
- The Add Node toolbar button now changes to `Place node`, confirming tap-to-place mode.
- A canvas tap at a visually open region was rejected with `Space occupied` and the mode turned off. This is not yet accepted as correct because the visible region appeared clear; the coordinate-to-world mapping and collision-envelope geometry need diagnosis before the trial can be considered successful.
- The canvas SVG uses viewBox `-500 -700 1000 1400`; the first inspected SVG was a toolbar icon, so its `0 0 24 24` viewBox was not relevant. The placement rejection needs a second test using a coordinate confirmed to be far from all node envelopes.
- The second rejection is consistent with the actual browser coordinate transform: the tested point mapped near the lower-left edge of an existing node envelope, although it looked open in the scaled screenshot. The next test will use a farther corner before changing collision math.
- The far-corner click did not change the node count, and no toast remained; the browser coordinate landed outside the interactive canvas overlay. A direct event against the canvas SVG is needed for reliable verification.
- The first direct event was dispatched before React finished rendering the armed mode, so it did not exercise placement. The delayed retry could not find the canvas or Add Node button, indicating the browser session DOM changed and must be re-opened before drawing conclusions about the collision helper.
- The editor is stable again with one large canvas SVG, eight existing nodes, and the active `Place node` button. The earlier script failure was only a selector mismatch (`Add node` versus `Place node`), not an application error.
- A controlled tap at a far empty canvas coordinate successfully created a ninth node at world position approximately `(340, 480)`, exited Place Node mode, and left no `Space occupied` message. The new node has a 124×62 rendered rectangle, confirming placement is working with the shared geometry.
- A direct tap on the existing root while Place Node was active was rejected with `Node not placed`; the node count stayed at nine and the mode returned to `Add node`.
- A controlled free joiner placement succeeded in an empty region: the node count became ten, one joiner was present, and the mode returned to `Add joiner`.
- Add Joiner was activated and tapped on the middle of a long existing arrow segment. The action succeeded: node count became eleven, joiner count became two, and arrow count increased from seven to eight, confirming the direct arrow overlap exception and split behavior.
- A controlled drag of a normal node onto the root’s protected area produced the `Space occupied` feedback and restored the node to its previous screen position; the node count remained eleven.
- The existing long-press interaction still opens the normal-node action panel with `Edit Label`, while no joiner action panel was exposed during this normal-node check.
- After restarting the development server, Tree 1 loaded with the persisted eleven-node trial state, both joiners rendered correctly, and the browser console showed no current output or runtime errors. The earlier duplicate-declaration message was stale HMR output from before restart.
- The label editor accepted an oversized 180-character candidate only up to the longest valid 29-character prefix for the available envelope and displayed `No room for more text`; the rejected remainder was not inserted. The first verification script used TypeScript-only syntax in the browser console and was discarded; the corrected browser script passed.
- TypeScript checking and the production build passed before this browser trial.
