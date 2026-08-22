# Proposed All Set Bridge-Aware Port-Swap Contract

## Purpose

**All Set remains node-stationary.** It never changes a node’s position. Its new responsibility is first to offer every suitable source and target side at each progressive bend level, then to compare shared-node port assignments that ordinary one-arrow-at-a-time routing can miss, especially when exchanging two ports removes a visible bridge crossing.

## Non-negotiable safety rules

Every candidate remains invalid and is discarded if it causes any of the following:

| Priority | Rule |
|---|---|
| 1 | A route touches or travels through an unrelated node. |
| 2 | A route creates a parallel-lane conflict with an existing route. |
| 3 | Two endpoints claim the same physical port position on one node side. |

The existing progressive router remains unchanged: it searches straight, then one bend, then two, and continues only when no legal result exists at the lower bend level. This work does not enumerate arbitrary five-bend combinations.

## New bridge-aware comparison

After safety validation, All Set compares valid whole-map plans in this order:

| Comparison order | Meaning |
|---|---|
| 1 | Fewer missing or unclean routes. |
| 2 | Fewer bridge crossings between otherwise legal routes. |
| 3 | Fewer total bends. |
| 4 | Shorter total route length. |
| 5 | Stable deterministic route and port order when every earlier measure is equal. |

This means an A-side port exchange wins when it changes a pair from one bridge to zero bridges, even when one member of the pair becomes longer and the other becomes shorter. When two candidates have the same bridge count, the candidate with fewer bends wins even if its total length is a little longer.

## Why all suitable sides must be offered first

The existing ordinary planner begins by locking each source endpoint to its dominant geometric side. That makes it fast, but it can hide a lower-bend route before the progressive router is allowed to search it.

| Tree 2 example | A-right → D-left | A-bottom → D-left |
|---|---:|---:|
| Validity with visible B/C obstacles | Legal | Legal |
| Bends | 2 | 1 |
| Length | 558 | 590 |
| Correct All Set choice | Not preferred | Preferred |

The A-bottom alternative is 32 units longer but has one fewer bend. Because neither option has a node, parallel-lane, same-port, or bridge problem, the progressive bend rule chooses the one-bend route.

## Bounded candidate search

1. All Set calculates four whole-map baseline plans: normal and reversed reservation orders with the ordinary nearest-source-side plan, plus normal and reversed reservation orders with **all four source sides and all four target sides offered to each edge**.
2. The existing progressive router searches those offered pairs as a group: straight first, then one bend, then two, and continues only when the lower-bend level has no legal result. It does not enumerate arbitrary long routes when a shorter level works.
3. All Set applies the hard node, parallel-lane, and same-port rules, then selects the best valid baseline using the score above. This captures a missed one-bend path such as A-bottom → D-left.
4. It counts strict interior bridge crossings in that best baseline. For every crossing pair, it checks whether the two arrows share a physical node side. For example, `C → A` entering A’s bottom side and `A → B` leaving A’s bottom side share A-bottom.
5. For each such pair, it creates one candidate that **exchanges only those two physical port positions**. Every other side and port remains unchanged.
6. It reroutes the full map with the existing exact lane checks, rejects invalid candidates, and chooses the best valid whole-map score.
7. It repeats this bridge-focused evaluation once more only if the first selected exchange strictly improves the map. It stops early when no further strict improvement exists.

The two passes capture the reported swap and one dependent follow-up swap without trying every permutation of every port group. The visible spinner remains active throughout the calculation.

## Measured A/B/C example

The screenshot-scale fixture gives the following result for the two A-bottom assignments.

| Assignment | C → A length | A → B length | Total length | Bridges | Result |
|---|---:|---:|---:|---:|---|
| Current deterministic order | 139⅔ | 715⅓ | 855 | 1 | Not preferred |
| Exchanged A-bottom ports | 106⅓ | 748⅔ | 855 | 0 | Preferred |

Both alternatives are valid one-bend routes. The exchanged result wins because it removes the bridge while keeping the total length unchanged.

## Truthful All Set wording

The completed action would no longer state that the result is globally “best.” Its message would say:

> **All Set checked standard route orders and bridge-related port swaps. Moving nodes may still create different legal routes.**

## Explicitly excluded

This contract does not move nodes, implement Smart Arrange, relax collision or lane rules, replace the progressive router, change saved-roadmap data, or make a new general purpose layout engine.
