/**
 * Measurement-only diagnostic — not imported by the app.
 *
 * It evaluates prospective map states using the live progressive router:
 * 1. Teleport validation: a candidate node position with ordinary arrows.
 * 2. Copy arrows: intentional shared trunks inside the same copy group.
 * 3. Combined: copy groups while a candidate node position is validated.
 *
 * It does not read or write localStorage, saved roadmaps, React state, or live
 * application code. Timing includes only isolated routing and legality work.
 */

import { getNodeBox, shapesOverlap, type Point } from "../client/src/lib/collision";
import {
  findProgressivePrototypeRoute,
  PrototypeLaneIndex,
  type PrototypePort,
  type PrototypeSegment,
} from "../client/src/lib/progressiveRouter";
import type { Direction, NodeData, NodeColor } from "../client/src/lib/treeData";

type Mode = "teleport" | "copy" | "combined";

interface EdgeSpec {
  id: string;
  sourceId: string;
  targetId: string;
  groupId?: string;
  sourceDirection?: Direction;
  targetDirection?: Direction;
}

interface RoutedEdge extends EdgeSpec {
  points: Point[];
  bends: number;
}

interface Measurement {
  mode: Mode;
  maps: number;
  medianMs: number;
  p95Ms: number;
  averageMs: number;
  acceptedTeleportMaps: number;
  rejectedTeleportMaps: number;
  routeFailures: number;
  unauthorizedLaneConflicts: number;
  allowedSharedTrunks: number;
  bridgeCrossings: number;
  cleanMaps: number;
}

const ITERATIONS = 80;
const WARMUP_ITERATIONS = 12;
const LANE_PADDING = 12;
const ALL_DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

function node(id: string, x: number, y: number, color: NodeColor = "blue"): NodeData {
  return { id, x, y, label: id, color, children: [] };
}

const BASE_NODES = [
  node("a", -360, 0),
  node("b", 100, -120),
  node("c", 100, 120),
  node("d", 160, 300),
  node("e", 160, 520),
  node("t", 580, 410),
  node("p", -420, -360),
  node("q", -80, -360),
  node("r", 280, -360),
  node("u", -420, 360),
  node("v", -80, 360),
  node("w", 280, 360),
  node("m", -40, 610),
] as const;

const STANDARD_EDGES: EdgeSpec[] = [
  { id: "a-b", sourceId: "a", targetId: "b", sourceDirection: "right", targetDirection: "left" },
  { id: "a-c", sourceId: "a", targetId: "c", sourceDirection: "down", targetDirection: "left" },
  { id: "d-t", sourceId: "d", targetId: "t", sourceDirection: "right", targetDirection: "left" },
  { id: "e-t", sourceId: "e", targetId: "t", sourceDirection: "right", targetDirection: "down" },
  { id: "p-q", sourceId: "p", targetId: "q", sourceDirection: "right", targetDirection: "left" },
  { id: "q-r", sourceId: "q", targetId: "r", sourceDirection: "right", targetDirection: "left" },
  { id: "u-v", sourceId: "u", targetId: "v", sourceDirection: "right", targetDirection: "left" },
  { id: "v-w", sourceId: "v", targetId: "w", sourceDirection: "right", targetDirection: "left" },
  { id: "m-v", sourceId: "m", targetId: "v", sourceDirection: "up", targetDirection: "down" },
];

const COPY_EDGES: EdgeSpec[] = [
  // Head-copy family: a common tail and exact right-side source port.
  { id: "a-b", sourceId: "a", targetId: "b", groupId: "head-family", sourceDirection: "right", targetDirection: "left" },
  { id: "a-c", sourceId: "a", targetId: "c", groupId: "head-family", sourceDirection: "right", targetDirection: "left" },
  // Tail-copy family: a common head and exact left-side target port.
  { id: "d-t", sourceId: "d", targetId: "t", groupId: "tail-family", sourceDirection: "right", targetDirection: "left" },
  { id: "e-t", sourceId: "e", targetId: "t", groupId: "tail-family", sourceDirection: "right", targetDirection: "left" },
  { id: "p-q", sourceId: "p", targetId: "q" },
  { id: "q-r", sourceId: "q", targetId: "r" },
  { id: "u-v", sourceId: "u", targetId: "v" },
  { id: "v-w", sourceId: "v", targetId: "w" },
  { id: "m-v", sourceId: "m", targetId: "v" },
];

function cloneNodes(teleport: boolean): NodeData[] {
  return BASE_NODES.map((entry) => {
    if (!teleport || entry.id !== "q") return { ...entry, children: [] };
    // Deliberately empty, non-overlapping candidate place that changes nearby lanes.
    return { ...entry, x: -35, y: -250, children: [] };
  });
}

function segments(points: Point[]): PrototypeSegment[] {
  return points.slice(1).map((point, index) => ({ a: points[index], b: point }));
}

function exactOverlap(first: PrototypeSegment, second: PrototypeSegment): boolean {
  const firstHorizontal = first.a.y === first.b.y;
  const secondHorizontal = second.a.y === second.b.y;
  if (firstHorizontal !== secondHorizontal) return false;
  if (firstHorizontal) {
    if (first.a.y !== second.a.y) return false;
    return Math.min(Math.max(first.a.x, first.b.x), Math.max(second.a.x, second.b.x)) > Math.max(Math.min(first.a.x, first.b.x), Math.min(second.a.x, second.b.x));
  }
  if (first.a.x !== second.a.x) return false;
  return Math.min(Math.max(first.a.y, first.b.y), Math.max(second.a.y, second.b.y)) > Math.max(Math.min(first.a.y, first.b.y), Math.min(second.a.y, second.b.y));
}

function bridgeCrossing(first: PrototypeSegment, second: PrototypeSegment): boolean {
  const firstHorizontal = first.a.y === first.b.y;
  const secondHorizontal = second.a.y === second.b.y;
  if (firstHorizontal === secondHorizontal) return false;
  const horizontal = firstHorizontal ? first : second;
  const vertical = firstHorizontal ? second : first;
  const minX = Math.min(horizontal.a.x, horizontal.b.x);
  const maxX = Math.max(horizontal.a.x, horizontal.b.x);
  const minY = Math.min(vertical.a.y, vertical.b.y);
  const maxY = Math.max(vertical.a.y, vertical.b.y);
  return vertical.a.x > minX && vertical.a.x < maxX && horizontal.a.y > minY && horizontal.a.y < maxY;
}

function suppliedPort(entry: NodeData, direction: Direction): PrototypePort {
  const box = getNodeBox(entry, false);
  if (direction === "up") return { direction, point: { x: entry.x, y: box.y } };
  if (direction === "down") return { direction, point: { x: entry.x, y: box.y + box.h } };
  if (direction === "left") return { direction, point: { x: box.x, y: entry.y } };
  return { direction, point: { x: box.x + box.w, y: entry.y } };
}

function routeMap(mode: Mode): Omit<Measurement, "maps" | "medianMs" | "p95Ms" | "averageMs"> {
  const useTeleport = mode === "teleport" || mode === "combined";
  const useCopies = mode === "copy" || mode === "combined";
  const nodes = cloneNodes(useTeleport);
  const byId = new Map(nodes.map((entry) => [entry.id, entry]));
  const teleportNode = byId.get("q")!;
  const isTeleportLegal = !nodes.some((entry) => entry.id !== teleportNode.id && shapesOverlap(
    { kind: "rect", ...getNodeBox(teleportNode, false) },
    { kind: "rect", ...getNodeBox(entry, false) },
  ));
  const edges = useCopies ? COPY_EDGES : STANDARD_EDGES;
  const routes: RoutedEdge[] = [];
  let routeFailures = 0;

  for (const edge of edges) {
    const source = byId.get(edge.sourceId)!;
    const target = byId.get(edge.targetId)!;
    const obstacles = nodes
      .filter((entry) => entry.id !== source.id && entry.id !== target.id)
      .map((entry) => getNodeBox(entry, false));
    const blocked = routes
      .filter((route) => route.groupId !== edge.groupId)
      .flatMap((route) => segments(route.points));
    const sourceDirections = edge.sourceDirection ? [edge.sourceDirection] : ALL_DIRECTIONS;
    const targetDirections = edge.targetDirection ? [edge.targetDirection] : ALL_DIRECTIONS;
    const result = findProgressivePrototypeRoute(
      { id: source.id, x: source.x, y: source.y, box: getNodeBox(source, false) },
      { id: target.id, x: target.x, y: target.y, box: getNodeBox(target, false) },
      obstacles,
      {
        sourceDirections,
        targetDirections,
        sourcePorts: edge.sourceDirection ? [suppliedPort(source, edge.sourceDirection)] : undefined,
        targetPorts: edge.targetDirection ? [suppliedPort(target, edge.targetDirection)] : undefined,
        arrowObstacles: blocked,
        arrowObstacleIndex: new PrototypeLaneIndex(blocked),
        lanePadding: LANE_PADDING,
        maxBends: 5,
      },
    );
    if (!result.found) {
      routeFailures += 1;
      continue;
    }
    routes.push({ ...edge, points: result.points, bends: result.bends });
  }

  let unauthorizedLaneConflicts = 0;
  let allowedSharedTrunks = 0;
  let bridgeCrossings = 0;
  for (let left = 0; left < routes.length; left += 1) {
    for (let right = left + 1; right < routes.length; right += 1) {
      const sameGroup = Boolean(routes[left].groupId && routes[left].groupId === routes[right].groupId);
      for (const first of segments(routes[left].points)) {
        for (const second of segments(routes[right].points)) {
          if (exactOverlap(first, second)) {
            if (sameGroup) allowedSharedTrunks += 1;
            else unauthorizedLaneConflicts += 1;
          }
          if (bridgeCrossing(first, second)) bridgeCrossings += 1;
        }
      }
    }
  }

  return {
    mode,
    acceptedTeleportMaps: useTeleport && isTeleportLegal && routeFailures === 0 ? 1 : 0,
    rejectedTeleportMaps: useTeleport && (!isTeleportLegal || routeFailures > 0) ? 1 : 0,
    routeFailures,
    unauthorizedLaneConflicts,
    allowedSharedTrunks,
    bridgeCrossings,
    cleanMaps: routeFailures === 0 && unauthorizedLaneConflicts === 0 ? 1 : 0,
  };
}

function percentile(values: number[], probability: number): number {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.min(ordered.length - 1, Math.floor((ordered.length - 1) * probability))];
}

function measure(mode: Mode): Measurement {
  for (let index = 0; index < WARMUP_ITERATIONS; index += 1) routeMap(mode);
  const timings: number[] = [];
  const totals = {
    acceptedTeleportMaps: 0,
    rejectedTeleportMaps: 0,
    routeFailures: 0,
    unauthorizedLaneConflicts: 0,
    allowedSharedTrunks: 0,
    bridgeCrossings: 0,
    cleanMaps: 0,
  };
  for (let index = 0; index < ITERATIONS; index += 1) {
    const start = performance.now();
    const summary = routeMap(mode);
    timings.push(performance.now() - start);
    for (const key of Object.keys(totals) as Array<keyof typeof totals>) totals[key] += summary[key];
  }
  return {
    mode,
    maps: ITERATIONS,
    medianMs: percentile(timings, 0.5),
    p95Ms: percentile(timings, 0.95),
    averageMs: timings.reduce((total, value) => total + value, 0) / timings.length,
    ...totals,
  };
}

const results = (["teleport", "copy", "combined"] as Mode[]).map(measure);
console.table(results.map((result) => ({
  scenario: result.mode,
  maps: result.maps,
  "median ms/map": result.medianMs.toFixed(3),
  "p95 ms/map": result.p95Ms.toFixed(3),
  "average ms/map": result.averageMs.toFixed(3),
  accepted: result.acceptedTeleportMaps,
  rejected: result.rejectedTeleportMaps,
  failures: result.routeFailures,
  conflicts: result.unauthorizedLaneConflicts,
  "allowed shared": result.allowedSharedTrunks,
  bridges: result.bridgeCrossings,
  clean: result.cleanMaps,
})));
