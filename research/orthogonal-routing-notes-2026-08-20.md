# Orthogonal Routing Reference Notes

**Purpose:** External comparison for the user’s proposed progressive bend-count router. Collected 20 August 2026.

## Relevant findings

The yFiles OrthogonalEdgeRouter documentation describes the same central requirements Roamaps needs: fixed-position nodes, horizontal/vertical-only paths, obstacle avoidance, incremental rerouting after a node moves, minimum edge distance, and source/target port constraints. It also documents monotonic routing as an optional preference—continual progress toward the target—but notes that enforcing monotonicity can force a route through an obstacle, so it must never outrank collision avoidance.

The paper *Orthogonal Connector Routing* by Wybrow, Marriott, and Stuckey describes an algorithm for optimal object-avoiding orthogonal connector routes that minimize a monotonic function of route length and number of bends, and reports performance suitable for interactive rerouting. This supports Roamaps’ deterministic coded approach rather than an AI-trained choice system.

Graphviz maintainers report that orthogonal routing with specified ports/compass points is difficult and may fail or yield suboptimal results. This confirms that fixed entry/exit directions need their own carefully tested routing logic; Roamaps should not rely on generic Graphviz-style behavior.

## Implication for Roamaps

The user’s staged method is a valid fast front-end: direct route first, then paths with increasing bend count. It requires a finite local lane graph so that it can continue beyond three bends when blockers demand it, while still terminating. Routes must be ranked by the approved order: total length, distinct blocking/conflicting lanes avoided, bend count, then deterministic directional tie-break.

## Sources

1. yWorks, “Orthogonal Edge Routing.” http://docs.yworks.com/yfilesflex/doc/dguide-layout/orthogonal_edge_router.html
2. Wybrow, Marriott, Stuckey, “Orthogonal Connector Routing,” Graph Drawing 2009. https://link.springer.com/chapter/10.1007/978-3-642-11805-0_22
3. Graphviz Forum, “Regarding graphviz’s orthogonal edge routing.” https://forum.graphviz.org/t/regarding-graphvizs-orthogonal-edge-routing/1889
