import type { Box } from "@/lib/collision";
import { LANE_GAP, OBSTACLE_PADDING, ROUTE_CLEARANCE, toSegments, type DerivedRoute, type Segment } from "@/lib/routingEngine";
import { UniformSpatialIndex } from "@/lib/routingSpatialIndex";

export interface AffectedRoute {
  key: string;
  sourceId: string;
  targetId: string;
  route: DerivedRoute["route"];
}

function segmentBox(segment: Segment): Box {
  return {
    x: Math.min(segment.a.x, segment.b.x),
    y: Math.min(segment.a.y, segment.b.y),
    w: Math.max(Math.abs(segment.a.x - segment.b.x), 1),
    h: Math.max(Math.abs(segment.a.y - segment.b.y), 1),
  };
}

function expand(box: Box, amount: number): Box {
  return { x: box.x - amount, y: box.y - amount, w: box.w + amount * 2, h: box.h + amount * 2 };
}

/**
 * Returns a safe, deterministic superset of routes that may change after a
 * node move. Once one reserved route is affected, all later routes are also
 * recalculated because reservation order can make their legal lanes change.
 */
export function findConservativelyAffectedRouteKeys(routes: AffectedRoute[], changedNodeId: string, before: Box, after: Box): string[] {
  const ordered = [...routes].sort((a, b) => a.key.localeCompare(b.key));
  const entries = ordered.flatMap((entry) => toSegments(entry.route.points).map((segment) => ({ item: entry.key, box: segmentBox(segment) })));
  const index = new UniformSpatialIndex(entries);
  const influence = ROUTE_CLEARANCE + OBSTACLE_PADDING + LANE_GAP;
  const nearby = new Set<string>([...index.query(expand(before, influence)), ...index.query(expand(after, influence))]);
  const firstAffected = ordered.findIndex((entry) => entry.sourceId === changedNodeId || entry.targetId === changedNodeId || nearby.has(entry.key));
  return firstAffected < 0 ? [] : ordered.slice(firstAffected).map((entry) => entry.key);
}
