# Isolated Progressive Router Prototype

**Date:** 2026-08-20  
**Status:** Verified in isolation. **Not connected to the live editor.**

## Purpose

This prototype tests the user-approved staged orthogonal routing idea without changing Roamaps behavior. It checks legal paths from **zero through five bends**, starts and ends perpendicularly at node sides, and returns no route rather than a diagonal fallback when the configured limit is exhausted.

The implementation is located at:

- `client/src/lib/progressiveRouterPrototype.ts`
- `client/src/lib/progressiveRouterPrototype.test.ts`

Neither file is imported by `TreeCanvas`, the roadmap reducer, or any user-facing application component.

## Selection Behavior

For every permitted source-side and target-side pair, the prototype creates a finite set of meaningful horizontal and vertical lanes: node ports, nearby obstacle boundaries with safety padding, and optional test bounds. It searches those lanes with the following order:

1. Lowest number of legal bends: zero, then one, through five.
2. Shortest total length among paths with the same bend count.
3. Stable direction and coordinate tie-breaks for repeatable results.

The router permits a route to go temporarily away from its destination when an obstacle makes that necessary. It forbids 180-degree immediate reversals, node penetration, diagonal segments, and diagonal no-solution fallback.

## Verified Test Evidence

| Scenario | Evidence |
|---|---|
| Direct connection | Fixed-port zero-bend route found. |
| One-bend connection | Fixed-port L route found. |
| Two bends | Fixed target-side constraint makes fewer bends impossible. |
| Three bends | A partial wall blocks every two-bend alternative. |
| Four bends | A central obstacle blocks every route with three or fewer bends. |
| Five bends | Alternating walls form a genuine five-bend maze; the same request correctly fails when capped at four bends. |
| No solution | Returns `no-legal-route` and an empty point list, never a diagonal line. |
| Repeatability | Equal alternatives produce exactly the same result on repeated runs. |
| Local responsiveness | 100 five-bend searches complete under the test guard of 1.2 seconds. |

TypeScript checking passes, and a source scan confirms the prototype is isolated from live editor code.

## Recommended Test Process Before Any Integration

1. Keep the prototype test-only while adding every user-found routing issue as a permanent fixture.
2. Add property tests that verify every returned segment is orthogonal, every segment is clear of obstacles, port direction is correct, and no route overlaps itself.
3. Run it in **shadow mode** on the real Tree 2 graph: calculate its suggested route without drawing it or rejecting any action; compare it to the recovered live router.
4. Measure route calculation on Android-tablet-relevant cases, including repeated node drags in Tree 2. The 240 ms pending-state threshold remains the required interaction safeguard if a calculation becomes slow.
5. Define crowded node-port/fan-out behavior before strict all-routes-legal rejection is connected to the editor. This is still deferred product work.

## Decision Gate

The prototype must remain disconnected until the user explicitly approves integration after the real Tree 2 shadow comparison, crowded-port decision, tablet performance measurements, route/history/persistence regression tests, and pending-calculation behavior are complete.

