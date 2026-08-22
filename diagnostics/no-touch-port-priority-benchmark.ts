import { getNodeBox, type Box, type Point } from "../client/src/lib/collision";
import { findProgressivePrototypeRoute } from "../client/src/lib/progressiveRouter";
import type { Direction, NodeData } from "../client/src/lib/treeData";

type Segment = { a: Point; b: Point };
type Scenario = "all-incoming" | "all-outgoing" | "mixed-1" | "mixed-2" | "mixed-3" | "mixed-4" | "mixed-5";
type Order = "current" | "scarce-side-first" | "round-robin-sides";
type Mode = "baseline" | "strict" | "selective-repair" | "bounded-repair";

interface Leaf {
  node: NodeData;
  centralSide: Direction;
}

interface State {
  point: Point;
  direction: Direction;
  bends: number;
  length: number;
  points: Point[];
}

const PADDING = 10;
const CLEARANCE = 18;
const MIN_FINAL_SEGMENT = 15;
const MAX_BENDS = 5;
const DIRECTION_ORDER: Direction[] = ["up", "left", "down", "right"];
const CENTER: NodeData = { id: "center", x: 0, y: 0, label: "", color: "blue", children: [] };
const CENTER_BOX = getNodeBox(CENTER, false);
const MIXED_SCENARIOS = [
  { scenario: "mixed-1", seed: 20260820 },
  { scenario: "mixed-2", seed: 20260821 },
  { scenario: "mixed-3", seed: 20260822 },
  { scenario: "mixed-4", seed: 20260823 },
  { scenario: "mixed-5", seed: 20260824 },
] as const;
const SCENARIOS: Scenario[] = ["all-incoming", "all-outgoing", ...MIXED_SCENARIOS.map((entry) => entry.scenario)];

function leaf(id: string, x: number, y: number, centralSide: Direction): Leaf {
  return { node: { id, x, y, label: "", color: "violet", children: [] }, centralSide };
}

const LEAVES: Leaf[] = [
  ...[-360, -240, -120, 0, 120, 240, 360].map((x, index) => leaf(`top-${index}`, x, -260, "up")),
  ...[-360, -240, -120, 0, 120, 240, 360].map((x, index) => leaf(`bottom-${index}`, x, 260, "down")),
  ...[-90, 90].map((y, index) => leaf(`left-${index}`, -320, y, "left")),
  ...[-90, 90].map((y, index) => leaf(`right-${index}`, 320, y, "right")),
];

function opposite(direction: Direction): Direction {
  if (direction === "up") return "down";
  if (direction === "down") return "up";
  if (direction === "left") return "right";
  return "left";
}

function move(point: Point, direction: Direction, amount: number): Point {
  if (direction === "up") return { x: point.x, y: point.y - amount };
  if (direction === "down") return { x: point.x, y: point.y + amount };
  if (direction === "left") return { x: point.x - amount, y: point.y };
  return { x: point.x + amount, y: point.y };
}

function directionFrom(a: Point, b: Point): Direction {
  if (a.x === b.x) return b.y >= a.y ? "down" : "up";
  return b.x >= a.x ? "right" : "left";
}

function length(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function port(node: NodeData, box: Box, side: Direction, index: number, count: number): Point {
  const fraction = node.id === CENTER.id ? (index + 1) / (count + 1) : 0.5;
  if (side === "up") return { x: box.x + box.w * fraction, y: box.y };
  if (side === "down") return { x: box.x + box.w * fraction, y: box.y + box.h };
  if (side === "left") return { x: box.x, y: box.y + box.h * fraction };
  return { x: box.x + box.w, y: box.y + box.h * fraction };
}

function seededIncomingIds(seed: number): Set<string> {
  let state = seed;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const ids = LEAVES.map((entry) => entry.node.id);
  for (let index = ids.length - 1; index > 0; index -= 1) {
    const other = Math.floor(next() * (index + 1));
    [ids[index], ids[other]] = [ids[other], ids[index]];
  }
  return new Set(ids.slice(0, 9));
}

function incomingFor(scenario: Scenario, entry: Leaf): boolean {
  if (scenario === "all-incoming") return true;
  if (scenario === "all-outgoing") return false;
  const seed = MIXED_SCENARIOS.find((candidate) => candidate.scenario === scenario)!.seed;
  return seededIncomingIds(seed).has(entry.node.id);
}

function insideExpanded(point: Point, box: Box): boolean {
  return point.x > box.x - PADDING && point.x < box.x + box.w + PADDING && point.y > box.y - PADDING && point.y < box.y + box.h + PADDING;
}

function nodeClear(a: Point, b: Point, obstacles: Box[]): boolean {
  if (a.x !== b.x && a.y !== b.y) return false;
  return obstacles.every((box) => {
    if (a.x === b.x) {
      const low = Math.min(a.y, b.y);
      const high = Math.max(a.y, b.y);
      return !(a.x > box.x - PADDING && a.x < box.x + box.w + PADDING && high > box.y - PADDING && low < box.y + box.h + PADDING);
    }
    const low = Math.min(a.x, b.x);
    const high = Math.max(a.x, b.x);
    return !(a.y > box.y - PADDING && a.y < box.y + box.h + PADDING && high > box.x - PADDING && low < box.x + box.w + PADDING);
  });
}

function rangeIncludes(a: number, b: number, value: number): boolean {
  return value >= Math.min(a, b) && value <= Math.max(a, b);
}

function strictlyInside(a: number, b: number, value: number): boolean {
  return value > Math.min(a, b) && value < Math.max(a, b);
}

function parallelLaneConflict(candidate: Segment, existing: Segment): boolean {
  const candidateHorizontal = candidate.a.y === candidate.b.y;
  const existingHorizontal = existing.a.y === existing.b.y;
  if (candidateHorizontal !== existingHorizontal) return false;
  if (candidateHorizontal) {
    return Math.abs(candidate.a.y - existing.a.y) <= 6 && Math.min(Math.max(candidate.a.x, candidate.b.x), Math.max(existing.a.x, existing.b.x)) - Math.max(Math.min(candidate.a.x, candidate.b.x), Math.min(existing.a.x, existing.b.x)) > 0;
  }
  return Math.abs(candidate.a.x - existing.a.x) <= 6 && Math.min(Math.max(candidate.a.y, candidate.b.y), Math.max(existing.a.y, existing.b.y)) - Math.max(Math.min(candidate.a.y, candidate.b.y), Math.min(existing.a.y, existing.b.y)) > 0;
}

function nonBridgeTouch(candidate: Segment, existing: Segment): boolean {
  const candidateHorizontal = candidate.a.y === candidate.b.y;
  const existingHorizontal = existing.a.y === existing.b.y;
  if (candidateHorizontal === existingHorizontal) {
    return [candidate.a, candidate.b].some((point) => [existing.a, existing.b].some((other) => point.x === other.x && point.y === other.y));
  }
  const horizontal = candidateHorizontal ? candidate : existing;
  const vertical = candidateHorizontal ? existing : candidate;
  if (!rangeIncludes(horizontal.a.x, horizontal.b.x, vertical.a.x) || !rangeIncludes(vertical.a.y, vertical.b.y, horizontal.a.y)) return false;
  // A crossing may render as a bridge only when it occurs inside both segments.
  return !(strictlyInside(horizontal.a.x, horizontal.b.x, vertical.a.x) && strictlyInside(vertical.a.y, vertical.b.y, horizontal.a.y));
}

function arrowClear(a: Point, b: Point, reserved: Segment[]): boolean {
  const candidate = { a, b };
  return reserved.every((existing) => !parallelLaneConflict(candidate, existing) && !nonBridgeTouch(candidate, existing));
}

function pointKey(point: Point): string {
  return `${point.x},${point.y}`;
}

function compareState(a: State, b: State): number {
  return a.length - b.length || a.bends - b.bends || DIRECTION_ORDER.indexOf(a.direction) - DIRECTION_ORDER.indexOf(b.direction) || pointKey(a.point).localeCompare(pointKey(b.point));
}

function buildPoints(startOut: Point, endIn: Point, obstacles: Box[]): Point[] {
  const xs = new Set<number>([startOut.x, endIn.x]);
  const ys = new Set<number>([startOut.y, endIn.y]);
  for (const box of obstacles) {
    xs.add(box.x - PADDING);
    xs.add(box.x + box.w + PADDING);
    ys.add(box.y - PADDING);
    ys.add(box.y + box.h + PADDING);
  }
  return Array.from(xs).flatMap((x) => Array.from(ys).map((y) => ({ x, y }))).filter((point) => !obstacles.some((box) => insideExpanded(point, box)));
}

function findNoTouchRoute(start: Point, startOut: Point, endIn: Point, end: Point, sourceDirection: Direction, targetDirection: Direction, obstacles: Box[], reserved: Segment[], maxBends = MAX_BENDS): Point[] | null {
  if (!nodeClear(start, startOut, obstacles) || !nodeClear(endIn, end, obstacles) || !arrowClear(start, startOut, reserved) || !arrowClear(endIn, end, reserved)) return null;
  const points = buildPoints(startOut, endIn, obstacles);
  const startKey = pointKey(startOut);
  const endKey = pointKey(endIn);
  const startPoint = points.find((point) => pointKey(point) === startKey);
  const endPoint = points.find((point) => pointKey(point) === endKey);
  if (!startPoint || !endPoint) return null;

  const queue: State[] = [{ point: startPoint, direction: sourceDirection, bends: 0, length: length(start, startOut), points: [start, startOut] }];
  const best = new Map<string, number>();
  while (queue.length > 0) {
    queue.sort(compareState);
    const current = queue.shift()!;
    const currentKey = `${pointKey(current.point)}:${current.direction}:${current.bends}`;
    if ((best.get(currentKey) ?? Number.POSITIVE_INFINITY) < current.length) continue;

    if (pointKey(current.point) === endKey) {
      const finalDirection = opposite(targetDirection);
      const finalBends = current.bends + (current.direction === finalDirection ? 0 : 1);
      if (finalBends <= maxBends && length(endIn, end) >= MIN_FINAL_SEGMENT) return [...current.points, end];
    }

    for (const next of points) {
      if (next.x !== current.point.x && next.y !== current.point.y) continue;
      const segmentLength = length(current.point, next);
      if (segmentLength === 0 || !nodeClear(current.point, next, obstacles) || !arrowClear(current.point, next, reserved)) continue;
      const direction = directionFrom(current.point, next);
      if (direction === opposite(current.direction)) continue;
      const bends = current.bends + (direction === current.direction ? 0 : 1);
      if (bends > maxBends) continue;
      const nextLength = current.length + segmentLength;
      const nextKey = `${pointKey(next)}:${direction}:${bends}`;
      if ((best.get(nextKey) ?? Number.POSITIVE_INFINITY) <= nextLength) continue;
      best.set(nextKey, nextLength);
      queue.push({ point: next, direction, bends, length: nextLength, points: [...current.points, next] });
    }
  }
  return null;
}

function segments(points: Point[]): Segment[] {
  return points.slice(1).map((point, index) => ({ a: points[index], b: point }));
}

function countBridgeCrossings(candidate: Segment[], reserved: Segment[]): number {
  return candidate.reduce((total, next) => total + reserved.filter((existing) => !nonBridgeTouch(next, existing) && (next.a.y === next.b.y) !== (existing.a.y === existing.b.y) && rangeIncludes(next.a.x, next.b.x, existing.a.x) && rangeIncludes(existing.a.y, existing.b.y, next.a.y)).length, 0);
}

interface Summary {
  scenario: Scenario;
  order: Order;
  mode: Mode;
  found: number;
  noRoute: number;
  clean: number;
  conflicts: number;
  bridgeCrossings: number;
  repaired: number;
}

function orderLeaves(order: Order, bySide: Map<Direction, Leaf[]>): Leaf[] {
  if (order === "current") return LEAVES;
  if (order === "scarce-side-first") {
    return [...LEAVES].sort((a, b) => {
      const capacityDelta = bySide.get(a.centralSide)!.length - bySide.get(b.centralSide)!.length;
      return capacityDelta || a.node.id.localeCompare(b.node.id);
    });
  }

  const sideOrder: Direction[] = ["up", "down", "left", "right"];
  const ordered: Leaf[] = [];
  const maxCount = Math.max(...sideOrder.map((side) => bySide.get(side)?.length ?? 0));
  for (let index = 0; index < maxCount; index += 1) {
    for (const side of sideOrder) {
      const entry = bySide.get(side)?.[index];
      if (entry) ordered.push(entry);
    }
  }
  return ordered;
}

function routerNode(node: NodeData, box: Box, side: Direction, routePort: Point | null) {
  return {
    id: node.id,
    x: routePort && (side === "up" || side === "down") ? routePort.x : node.x,
    y: routePort && (side === "left" || side === "right") ? routePort.y : node.y,
    box,
  };
}

function hasReservedConflict(points: Point[], reserved: Segment[]): boolean {
  return segments(points).some((segment) => reserved.some((existing) => parallelLaneConflict(segment, existing) || nonBridgeTouch(segment, existing)));
}

function derive(scenario: Scenario, order: Order, mode: Mode): Summary {
  const boxes = new Map(LEAVES.map((entry) => [entry.node.id, getNodeBox(entry.node, false)]));
  const bySide = new Map<Direction, Leaf[]>();
  for (const entry of LEAVES) bySide.set(entry.centralSide, [...(bySide.get(entry.centralSide) ?? []), entry]);
  for (const entries of bySide.values()) entries.sort((a, b) => a.node.id.localeCompare(b.node.id));
  const reserved: Segment[] = [];
  let found = 0;
  let noRoute = 0;
  let bridgeCrossings = 0;
  let repaired = 0;
  const selectedRoutes: Point[][] = [];

  for (const entry of orderLeaves(order, bySide)) {
    const incoming = incomingFor(scenario, entry);
    const centralEntries = bySide.get(entry.centralSide)!;
    const index = centralEntries.findIndex((candidate) => candidate.node.id === entry.node.id);
    const leafBox = boxes.get(entry.node.id)!;
    const source = incoming ? entry.node : CENTER;
    const target = incoming ? CENTER : entry.node;
    const sourceBox = incoming ? leafBox : CENTER_BOX;
    const targetBox = incoming ? CENTER_BOX : leafBox;
    const sourceDirection = incoming ? opposite(entry.centralSide) : entry.centralSide;
    const targetDirection = incoming ? entry.centralSide : opposite(entry.centralSide);
    const start = port(source, sourceBox, sourceDirection, incoming ? 0 : index, incoming ? 1 : centralEntries.length);
    const end = port(target, targetBox, targetDirection, incoming ? index : 0, incoming ? centralEntries.length : 1);
    const startOut = move(start, sourceDirection, CLEARANCE);
    const endIn = move(end, targetDirection, CLEARANCE);
    const obstacles = [CENTER, ...LEAVES.map((candidate) => candidate.node)]
      .filter((node) => node.id !== source.id && node.id !== target.id)
      .map((node) => node.id === CENTER.id ? CENTER_BOX : boxes.get(node.id)!);
    let route: Point[] | null;
    if (mode === "strict") {
      route = findNoTouchRoute(start, startOut, endIn, end, sourceDirection, targetDirection, obstacles, reserved);
    } else {
      const baseline = findProgressivePrototypeRoute(
        routerNode(source, sourceBox, sourceDirection, incoming ? null : start),
        routerNode(target, targetBox, targetDirection, incoming ? end : null),
        obstacles,
        {
          ...(incoming ? { targetDirections: [targetDirection] } : { sourceDirections: [sourceDirection] }),
          maxBends: MAX_BENDS,
        },
      );
      if (!baseline.found) {
        route = null;
      } else if (mode === "baseline" || !hasReservedConflict(baseline.points, reserved)) {
        route = baseline.points;
      } else {
        const strictRepair = findNoTouchRoute(
          start,
          startOut,
          endIn,
          end,
          sourceDirection,
          targetDirection,
          obstacles,
          reserved,
          mode === "bounded-repair" ? 2 : MAX_BENDS,
        );
        route = strictRepair ?? baseline.points;
        if (strictRepair) repaired += 1;
      }
    }
    if (!route) {
      noRoute += 1;
      continue;
    }
    const routeSegments = segments(route);
    bridgeCrossings += countBridgeCrossings(routeSegments, reserved);
    selectedRoutes.push(route);
    reserved.push(...routeSegments);
    found += 1;
  }

  const acceptedSegments: Segment[] = [];
  let clean = 0;
  let conflicts = 0;
  for (const selected of selectedRoutes) {
    if (hasReservedConflict(selected, acceptedSegments)) conflicts += 1;
    else clean += 1;
    acceptedSegments.push(...segments(selected));
  }
  return { scenario, order, mode, found, noRoute, clean, conflicts, bridgeCrossings, repaired };
}

function measure(scenario: Scenario, order: Order, mode: Mode) {
  for (let index = 0; index < 3; index += 1) derive(scenario, order, mode);
  const samples: number[] = [];
  let summary = derive(scenario, order, mode);
  for (let index = 0; index < 15; index += 1) {
    const started = performance.now();
    summary = derive(scenario, order, mode);
    samples.push(performance.now() - started);
  }
  samples.sort((a, b) => a - b);
  return {
    ...summary,
    medianMs: Number(samples[Math.floor(samples.length / 2)].toFixed(3)),
    p95Ms: Number(samples[Math.ceil(samples.length * 0.95) - 1].toFixed(3)),
  };
}

function averageMixed(results: Array<ReturnType<typeof measure>>, order: Order, mode: Mode) {
  const mixed = results.filter((result) => result.order === order && result.mode === mode && result.scenario.startsWith("mixed-"));
  const average = (key: "found" | "noRoute" | "clean" | "conflicts" | "bridgeCrossings" | "repaired" | "medianMs" | "p95Ms") => Number((mixed.reduce((total, result) => total + result[key], 0) / mixed.length).toFixed(3));
  return {
    cases: mixed.length,
    averageFound: average("found"),
    averageNoRoute: average("noRoute"),
    averageClean: average("clean"),
    averageConflicts: average("conflicts"),
    averageBridgeCrossings: average("bridgeCrossings"),
    averageRepaired: average("repaired"),
    averageMedianMs: average("medianMs"),
    averageP95Ms: average("p95Ms"),
  };
}

const orders: Order[] = ["current"];
const modes: Mode[] = ["baseline", "bounded-repair"];
const results = orders.flatMap((order) => modes.flatMap((mode) => SCENARIOS.map((scenario) => measure(scenario, order, mode))));
console.log(JSON.stringify({
  notes: {
    priority: "Baseline mode: evenly spaced ports then the fast port-first route. Bounded repair: keep that baseline route when clean; only a conflicting arrow receives a no-touch detour search capped at two bends, falling back to its baseline route if no detour exists.",
    bridgeRule: "A perpendicular intersection is permitted only when the intersection lies strictly inside both segments; a T-contact or shared endpoint is rejected.",
    scope: "Diagnostic-only implementation. The live router, editor state, and saved roadmaps are unchanged.",
  },
  results,
  mixedAverages: orders.flatMap((order) => modes.map((mode) => averageMixed(results, order, mode))),
}, null, 2));
