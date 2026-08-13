# Roamaps recovery plan — arrow removal and direct routing

## Reported failures

The tablet trial exposed two issues: existing arrows cannot be removed reliably, and routes remain multi-segment orthogonal even when a clear direct horizontal or vertical connection is possible.

## Recover diagnosis

This is a **targeted bug**, not a polluted-context failure or a changed product decision. The reducer already has stable `REMOVE_ARROW` source/target actions, and the action panel dispatches them correctly. The interaction gap is in the SVG arrow hit area: arrow long-press handling cancels on every `pointermove`. Small touch drift during a tablet long-press therefore clears the timer before the arrow action panel opens. The prior verification recorded arrow creation but never recorded arrow selection/removal, which is why this gap escaped the first trial.

The routing mismatch is also isolated. The route generator always starts with the clearance-and-connector candidate search. It needs an explicit first choice for a clear same-row route using the source’s left/right port and the target’s opposite port, or a clear same-column route using the source’s up/down port and the target’s opposite port. If that direct segment is blocked, the existing obstacle-aware orthogonal candidates should remain the fallback.

## Proposed recovery changes

1. Add arrow press tracking with pointer-id and movement threshold. Small touch drift will not cancel the action panel; meaningful movement or cancellation will.
2. Preserve the stable source/target arrow target and make the arrow hit path capture the pointer when possible.
3. Add direct horizontal and direct vertical route candidates before the multi-segment search, using them only when the segment is clear of node obstacles.
4. Keep the existing manual arrowhead and bridge rendering unchanged unless verification identifies a related defect.
5. Test arrow long-press → Remove Arrow, direct aligned routes, blocked aligned routes, undo/redo after removal, and persistence.
6. Update the durable checklist, memory, browser verification notes, GitHub commit, and WebDev checkpoint after verification.

## Repository saving rule

GitHub is **not updated automatically** by every WebDev edit or checkpoint. The live WebDev project and the GitHub source repository are separate working copies. After approved changes are implemented and verified, the source files must be explicitly synchronized, committed, and pushed to `coding-div/roamaps`. WebDev checkpoints preserve the live trial separately; they do not replace a Git commit.

## Gate

No recovery code should be changed until the user approves this targeted fix plan.
