import { getNodeBox, type Box, type Point } from "../client/src/lib/collision";
import type { Direction, NodeData } from "../client/src/lib/treeData";

type Scenario = "all-incoming" | "all-outgoing" | "mixed-1" | "mixed-2" | "mixed-3" | "mixed-4" | "mixed-5";
type Segment = { a: Point; b: Point };
type Leaf = { node: NodeData; centralSide: Direction };

const GAP = 12;
const CLEARANCE = 18;
const PADDING = 10;
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

function makeLeaf(id: string, x: number, y: number, centralSide: Direction): Leaf {
  return { node: { id, x, y, label: "", color: "violet", children: [] }, centralSide };
}

const LEAVES: Leaf[] = [
  ...[-360, -240, -120, 0, 120, 240, 360].map((x, index) => makeLeaf(`top-${index}`, x, -260, "up")),
  ...[-360, -240, -120, 0, 120, 240, 360].map((x, index) => makeLeaf(`bottom-${index}`, x, 260, "down")),
  ...[-90, 90].map((y, index) => makeLeaf(`left-${index}`, -320, y, "left")),
  ...[-90, 90].map((y, index) => makeLeaf(`right-${index}`, 320, y, "right")),
];

function opposite(direction: Direction): Direction {
  if (direction === "up") return "down";
  if (direction === "down") return "up";
  if (direction === "left") return "right";
  return "left";
}

function move(point: Point, direction: Direction, distance: number): Point {
  if (direction === "up") return { x: point.x, y: point.y - distance };
  if (direction === "down") return { x: point.x, y: point.y + distance };
  if (direction === "left") return { x: point.x - distance, y: point.y };
  return { x: point.x + distance, y: point.y };
}

function port(box: Box, side: Direction, index: number, count: number): Point {
  const fraction = (index + 1) / (count + 1);
  if (side === "up") return { x: box.x + box.w * fraction, y: box.y };
  if (side === "down") return { x: box.x + box.w * fraction, y: box.y + box.h };
  if (side === "left") return { x: box.x, y: box.y + box.h * fraction };
  return { x: box.x + box.w, y: box.y + box.h * fraction };
}

function simplify(points: Point[]): Point[] {
  const result: Point[] = [];
  for (const point of points) {
    const previous = result[result.length - 1];
    const before = result[result.length - 2];
    if (previous && point.x === previous.x && point.y === previous.y) continue;
    if (previous && before && ((before.x === previous.x && previous.x === point.x) || (before.y === previous.y && previous.y === point.y))) result[result.length - 1] = point;
    else result.push(point);
  }
  return result;
}

function segments(points: Point[]): Segment[] {
  return points.slice(1).map((point, index) => ({ a: points[index], b: point }));
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

function isIncoming(scenario: Scenario, leaf: Leaf): boolean {
  if (scenario === "all-incoming") return true;
  if (scenario === "all-outgoing") return false;
  const seed = MIXED_SCENARIOS.find((entry) => entry.scenario === scenario)!.seed;
  return seededIncomingIds(seed).has(leaf.node.id);
}

function rangeOverlap(a1: number, a2: number, b1: number, b2: number): number {
  return Math.min(Math.max(a1, a2), Math.max(b1, b2)) - Math.max(Math.min(a1, a2), Math.min(b1, b2));
}

function parallelConflict(a: Segment, b: Segment): boolean {
  const aHorizontal = a.a.y === a.b.y;
  const bHorizontal = b.a.y === b.b.y;
  if (aHorizontal !== bHorizontal) return false;
  if (aHorizontal) return Math.abs(a.a.y - b.a.y) <= GAP / 2 && rangeOverlap(a.a.x, a.b.x, b.a.x, b.b.x) > 0;
  return Math.abs(a.a.x - b.a.x) <= GAP / 2 && rangeOverlap(a.a.y, a.b.y, b.a.y, b.b.y) > 0;
}

function inclusive(a: number, b: number, value: number): boolean {
  return value >= Math.min(a, b) && value <= Math.max(a, b);
}

function strictlyInside(a: number, b: number, value: number): boolean {
  return value > Math.min(a, b) && value < Math.max(a, b);
}

function nonBridgeTouch(a: Segment, b: Segment): boolean {
  const aHorizontal = a.a.y === a.b.y;
  const bHorizontal = b.a.y === b.b.y;
  if (aHorizontal === bHorizontal) return [a.a, a.b].some((point) => [b.a, b.b].some((other) => point.x === other.x && point.y === other.y));
  const horizontal = aHorizontal ? a : b;
  const vertical = aHorizontal ? b : a;
  if (!inclusive(horizontal.a.x, horizontal.b.x, vertical.a.x) || !inclusive(vertical.a.y, vertical.b.y, horizontal.a.y)) return false;
  return !(strictlyInside(horizontal.a.x, horizontal.b.x, vertical.a.x) && strictlyInside(vertical.a.y, vertical.b.y, horizontal.a.y));
}

function segmentClear(a: Point, b: Point, obstacle: Box): boolean {
  if (a.x === b.x) {
    const low = Math.min(a.y, b.y);
    const high = Math.max(a.y, b.y);
    return !(a.x > obstacle.x - PADDING && a.x < obstacle.x + obstacle.w + PADDING && high > obstacle.y - PADDING && low < obstacle.y + obstacle.h + PADDING);
  }
  const low = Math.min(a.x, b.x);
  const high = Math.max(a.x, b.x);
  return !(a.y > obstacle.y - PADDING && a.y < obstacle.y + obstacle.h + PADDING && high > obstacle.x - PADDING && low < obstacle.x + obstacle.w + PADDING);
}

function buildOuterToCenter(leaf: Leaf, portIndex: number, sideCount: number): Point[] {
  const leafBox = getNodeBox(leaf.node, false);
  const outerSide = opposite(leaf.centralSide);
  const outerPort = port(leafBox, outerSide, 0, 1);
  const outerOut = move(outerPort, outerSide, CLEARANCE);
  const centralPort = port(CENTER_BOX, leaf.centralSide, portIndex, sideCount);
  const centralIn = move(centralPort, leaf.centralSide, CLEARANCE);
  const laneOffset = (portIndex + 1) * GAP;
  const rail = leaf.centralSide === "up"
    ? { x: 0, y: centralIn.y - laneOffset }
    : leaf.centralSide === "down"
      ? { x: 0, y: centralIn.y + laneOffset }
      : leaf.centralSide === "left"
        ? { x: centralIn.x - laneOffset, y: 0 }
        : { x: centralIn.x + laneOffset, y: 0 };
  const outerRail = leaf.centralSide === "up" || leaf.centralSide === "down"
    ? { x: outerOut.x, y: rail.y }
    : { x: rail.x, y: outerOut.y };
  const centralRail = leaf.centralSide === "up" || leaf.centralSide === "down"
    ? { x: centralIn.x, y: rail.y }
    : { x: rail.x, y: centralIn.y };
  return simplify([outerPort, outerOut, outerRail, centralRail, centralIn, centralPort]);
}

interface Result {
  scenario: Scenario;
  found: number;
  noRoute: number;
  clean: number;
  conflicts: number;
  bridgeCrossings: number;
  maxBends: number;
  nodeViolations: number;
  conflictPairs: string[];
  nodeViolationPairs: string[];
}

function derive(scenario: Scenario): Result {
  const bySide = new Map<Direction, Leaf[]>();
  for (const leaf of LEAVES) bySide.set(leaf.centralSide, [...(bySide.get(leaf.centralSide) ?? []), leaf]);
  for (const leaves of bySide.values()) leaves.sort((a, b) => a.node.id.localeCompare(b.node.id));
  const routes = LEAVES.map((leaf) => {
    const group = bySide.get(leaf.centralSide)!;
    const index = group.findIndex((entry) => entry.node.id === leaf.node.id);
    const points = buildOuterToCenter(leaf, index, group.length);
    return { leaf, points: isIncoming(scenario, leaf) ? points : [...points].reverse() };
  });
  const allSegments = routes.flatMap((route) => segments(route.points).map((segment) => ({ ...segment, id: route.leaf.node.id })));
  let clean = 0;
  let conflicts = 0;
  let bridgeCrossings = 0;
  let maxBends = 0;
  const conflictPairs = new Set<string>();
  for (const route of routes) {
    const routeSegments = segments(route.points);
    maxBends = Math.max(maxBends, Math.max(0, route.points.length - 2));
    const otherSegments = allSegments.filter((segment) => segment.id !== route.leaf.node.id);
    const conflict = routeSegments.some((segment) => otherSegments.some((other) => {
      const hasConflict = parallelConflict(segment, other) || nonBridgeTouch(segment, other);
      if (hasConflict) conflictPairs.add([route.leaf.node.id, other.id].sort().join(" ↔ "));
      return hasConflict;
    }));
    if (conflict) conflicts += 1;
    else clean += 1;
    bridgeCrossings += routeSegments.reduce((total, segment) => total + otherSegments.filter((other) => {
      const horizontal = (segment.a.y === segment.b.y) !== (other.a.y === other.b.y);
      if (!horizontal) return false;
      const h = segment.a.y === segment.b.y ? segment : other;
      const v = segment.a.y === segment.b.y ? other : segment;
      return strictlyInside(h.a.x, h.b.x, v.a.x) && strictlyInside(v.a.y, v.b.y, h.a.y);
    }).length, 0);
  }
  const nodeBoxes = [
    { id: CENTER.id, box: CENTER_BOX },
    ...LEAVES.map((leaf) => ({ id: leaf.node.id, box: getNodeBox(leaf.node, false) })),
  ];
  const nodeViolationPairs = new Set<string>();
  const nodeViolations = routes.reduce((total, route) => total + segments(route.points).reduce((segmentTotal, segment) => {
    const endpointIds = new Set([CENTER.id, route.leaf.node.id]);
    const violations = nodeBoxes.filter((entry) => !endpointIds.has(entry.id) && !segmentClear(segment.a, segment.b, entry.box));
    for (const violation of violations) nodeViolationPairs.add(`${route.leaf.node.id} → ${violation.id}`);
    return segmentTotal + violations.length;
  }, 0), 0);
  return { scenario, found: routes.length, noRoute: 0, clean, conflicts, bridgeCrossings: bridgeCrossings / 2, maxBends, nodeViolations, conflictPairs: [...conflictPairs], nodeViolationPairs: [...nodeViolationPairs] };
}

function measure(scenario: Scenario) {
  for (let index = 0; index < 20; index += 1) derive(scenario);
  const samples: number[] = [];
  let result = derive(scenario);
  for (let index = 0; index < 120; index += 1) {
    const started = performance.now();
    result = derive(scenario);
    samples.push(performance.now() - started);
  }
  samples.sort((a, b) => a - b);
  return { ...result, medianMs: Number(samples[Math.floor(samples.length / 2)].toFixed(4)), p95Ms: Number(samples[Math.ceil(samples.length * 0.95) - 1].toFixed(4)) };
}

function mixedAverage(results: Array<ReturnType<typeof measure>>) {
  const mixed = results.filter((result) => result.scenario.startsWith("mixed-"));
  const average = (key: "found" | "noRoute" | "clean" | "conflicts" | "bridgeCrossings" | "maxBends" | "nodeViolations" | "medianMs" | "p95Ms") => Number((mixed.reduce((total, result) => total + result[key], 0) / mixed.length).toFixed(4));
  return { cases: mixed.length, averageFound: average("found"), averageNoRoute: average("noRoute"), averageClean: average("clean"), averageConflicts: average("conflicts"), averageBridgeCrossings: average("bridgeCrossings"), averageMaxBends: average("maxBends"), averageNodeViolations: average("nodeViolations"), averageMedianMs: average("medianMs"), averageP95Ms: average("p95Ms") };
}

const results = SCENARIOS.map(measure);
console.log(JSON.stringify({
  notes: {
    model: "Test-only global node-channel allocator: each evenly spaced central port receives one preallocated 12-unit clearance lane. Routes use that assigned lane rather than competing greedily for the same shortest lane.",
    priority: "Evenly spaced ports and unique per-side channel assignment; no parallel contact or non-bridge touch; true interior perpendicular crossings may bridge; each route is then a deterministic two-bend path.",
    scope: "No production routing, saved roadmap, or live editor behavior is changed.",
  },
  results,
  mixedAverage: mixedAverage(results),
}, null, 2));
