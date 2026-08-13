# Roamaps Branch Trial — Tablet Tasks

Please perform these tasks in order on the live website. You do not need to complete every task in one session. If something behaves differently, report the task number and what you saw.

1. Open Tree 1 and confirm the canvas, Add node, Add joiner, Connect nodes, Undo, Redo, Reset, and zoom controls are visible.

2. Tap **Add joiner**, then tap an empty area. Confirm that exactly one small 3D white joiner appears and that Add Joiner mode ends.

3. Activate **Add joiner** again and tap a clear arrow segment, not a crossing and not a node. Confirm that the arrow becomes two segments with a visible joiner between them and no arrowhead on the joiner.

4. Long-press the joiner. Confirm that the joiner action panel opens instead of the underlying arrow panel. Check that there is no label editor, but color and Remove Joiner are available.

5. Drag the attached joiner to another position. Confirm that both connected arrow segments follow it and that it remains attached.

6. Long-press an arrow segment away from the joiner. Confirm that the arrow action panel opens. Remove only that selected segment and confirm the other segment remains.

7. Use Undo, then Redo. Confirm that the segment removal reverses and reapplies correctly.

8. Create a free joiner on empty canvas, then use **Connect nodes** to connect it to a normal node and, if convenient, to another joiner. Confirm that joiners behave like nodes for connections.

9. Drag a free joiner across an existing arrow without using Add Joiner placement. Confirm that it does not automatically attach or split the arrow.

10. Press Add Joiner again while it is waiting for placement. Confirm that the mode cancels. Then press another toolbar action while it is waiting and confirm that no accidental joiner is created.

11. Try tapping directly on a normal node, an arrow crossing, or a very short arrow segment while Add Joiner is active. Confirm that placement is rejected with an explanatory toast.

12. Refresh the browser after creating a small test branch. Confirm that the joiner, arrows, positions, and colors persist in that browser. Use Reset afterward to restore the demo state.

## Reporting format

Please reply with entries such as `Task 3: worked`, `Task 6: the wrong panel opened`, or `Task 12: the joiner disappeared after refresh`. A screenshot is helpful for any visual or layout issue.

