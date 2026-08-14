# Arrow-stage browser findings

## 2026-08-14 — live editor inspection

- The restarted Tree 1 editor loaded with the arrow-stage implementation and no visible startup failure.
- The visible canvas shows arrowheads at the normal-node targets in the current demo, including the aligned horizontal and vertical routes.
- The eight `g[data-arrow-id]` groups contain two paths each and no polygon children. This is expected after moving arrowheads into a dedicated post-node SVG layer; the next check must count global polygons and match them to normal-node targets rather than treating the group-local count as a failure.
- The current data includes two joiner-split segments. Their target joiner/normal-node head behavior must be checked separately.

## 2026-08-14 — arrowhead and lane checks

The live SVG contains eight directed edge paths and seven global arrowhead polygons. This matches the intended rule: seven edges end at normal nodes and one edge ends at the visible joiner, so only the normal-node targets receive heads. The rendered heads are placed in the post-node layer and are visible at the target boundaries.

The twelve rendered orthogonal segments have no detected parallel overlap between different edges within the six-unit inspection tolerance. The current demo therefore passes the initial separated-lane check.

The first DOM-order query selected toolbar icon SVGs. The actual canvas is the SVG with `width="100%"`, `height="100%"`, `viewBox="-500 -700 1000 1400"`, and it currently contains eight arrow groups and eleven node groups. The final composition-order check is scoped to that canvas element.

## 2026-08-14 — reverse-arrow recovery

- The first reverse-arrow attempt was correctly rejected by the new clean-route gate, but that exposed an implementation regression: the dry-run required every existing route to remain clean while the opposite-direction lane was being introduced.
- The focused fix now excludes only the reverse counterpart from the current route’s obstacle set; all other reserved arrow segments remain obstacles.
- After reload, the reverse arrow from the right-side node to Main Topic was accepted and a toast confirmed `Arrow added`.
- The live canvas then showed separate forward and reverse paths with distinct lanes and arrowheads at both normal-node boundaries. The global SVG inspection reported 18 path elements (transparent hit path plus visible path for each of 9 edges) and 8 arrowhead polygons, with no polygon for the joiner-target edge.
- The live edge list confirms the two opposite-direction routes use separate paths: `t1-root -> t1-c3` follows the upper corridor while `t1-c3 -> t1-root` follows the lower corridor. Both terminate with visible heads at normal-node boundaries.
- The attached joiner used for the next bypass check is at canvas position `(0, -94)` with a 15-unit transparent interaction circle and a visible 3D body inside it.

## 2026-08-14 — joiner bypass verification

- The attached joiner was opened through the controlled long-press path and removed through the Joiner Actions panel.
- After removal, the incoming and outgoing relationships became separate ordinary directed arrows. The live canvas reported eight visible edge paths and eight arrowhead polygons, with no bundled multi-headed polygon.
- The bypass paths use distinct corridors from the shared joint; the result preserves independent branch geometry rather than forcing one branch to move with another.
- One unrelated free joiner remains in the demo, confirming the removed attached joiner was the target of the test.

## 2026-08-14 — bridge-layer observation

- The current post-removal demo state contains no true interior horizontal–vertical crossings, so the bridge layer correctly reports zero bridge marks in this state. This is not yet a positive bridge test; a controlled crossing scenario remains to be exercised before closing the arrow-stage review.

- The live canvas uses `viewBox="-500 -700 1000 1400"` at a 1280×1100 SVG viewport. The current branch layout includes `t1-c3 -> t1-c6` as a vertical branch from `(220, -18)` to `(220, 160)`, making it suitable for a controlled single-branch drag test.

## 2026-08-14 — stable-tail drag setup

- The first controlled drag script selected a toolbar icon SVG instead of the canvas; no graph mutation was committed.
- The actual canvas is the large SVG at index 2 with `width="100%"`, `height="100%"`, and `viewBox="-500 -700 1000 1400"`. The next controlled pointer test will use this element’s world-to-client transform.

- The controlled t1-c6 drag reached the new position as an invalid preview, showing the red warning outline. On release, t1-c6 remained at its original position and the existing sibling routes were unchanged. This confirms the exact-restoration path; a separate valid-movement scenario is still needed to prove that only the moved branch reroutes.

- A second controlled drag moved t1-c6 from `(100, -100)` to `(330, -100)` on the opposite side of its source. The move committed, the `t1-c3 -> t1-c6` route changed to the new destination, and the unrelated `t1-c3 -> t1-root` and `t1-root -> t1-c3` routes retained their prior paths. This confirms stable joint tails for a valid branch move.

- Moving t1-c6 to `(330, 100)` produced a clean non-crossing route, so the bridge layer correctly reported zero marks for this attempt. The crossing renderer remains derived and active; a forced crossing fixture would be required for a positive bridge count, but the route planner appropriately prefers a clean route when one exists.
