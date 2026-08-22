import { getNodeBox, type Box, type Point } from "../client/src/lib/collision";
import { findProgressivePrototypeRoute } from "../client/src/lib/progressiveRouter";
import type { Direction, NodeData } from "../client/src/lib/treeData";

type Segment = { a: Point; b: Point };
type Scenario = "all-incoming" | "all-outgoing" | "mixed-1" | "mixed-2" | "mixed-3" | "mixed-4" | "mixed-5";
type Strategy = "shortest-path" | "port-first-even-spacing";

const MIXED_SCENARIOS = [
  { scenario: "mixed-1", seed: 20260820 },
  { scenario: "mixed-2", seed: 20260821 },
  { scenario: "mixed-3", seed: 20260822 },
  { scenario: "mixed-4", seed: 20260823 },
  { scenario: "mixed-5", seed: 20260824 },
] as const;

interface Leaf {
  node: NodeData;
  centralSide: Direction;
}

const CENTER: NodeData = { id: "center", x: 0, y: 0, label: "", color: "blue", children: [] };
const CENTER_BOX = getNodeBox(CENTER, false);

function leaf(id: string, x: number, y: number, centralSide: Direction): Leaf {
  return { node: { id, x, y, label: "", color: "violet", children: [] }, centralSide };
}

// Seven top, seven bottom, two left, and two right leaves exercise the maximum
// twelve-unit spacing capacity proposed for each normal-node side.
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

function toSegments(points: Point[]): Segment[] {
  return points.slice(1).map((point, index) => ({ a: points[index], b: point }));
}

function isHorizontal(segment: Segment): boolean {
  return segment.a.y === segment.b.y;
}

function overlapLength(a1: number, a2: number, b1: number, b2: number): number {
  return Math.min(Math.max(a1, a2), Math.max(b1, b2)) - Math.max(Math.min(a1, a2), Math.min(b1, b2));
}

function hasParallelConflict(points: Point[], reserved: Segment[]): boolean {
  return toSegments(points).some((segment) => reserved.some((other) => {
    if (isHorizontal(segment) !== isHorizontal(other)) return false;
    if (isHorizontal(segment)) return Math.abs(segment.a.y - other.a.y) <= 6 && overlapLength(segment.a.x, segment.b.x, other.a.x, other.b.x) > 0;
    return Math.abs(segment.a.x - other.a.x) <= 6 && overlapLength(segment.a.y, segment.b.y, other.a.y, other.b.y) > 0;
  }));
}

function evenlySpacedPort(box: Box, direction: Direction, index: number, count: number): Point {
  const fraction = (index + 1) / (count + 1);
  if (direction === "up") return { x: box.x + box.w * fraction, y: box.y };
  if (direction === "down") return { x: box.x + box.w * fraction, y: box.y + box.h };
  if (direction === "left") return { x: box.x, y: box.y + box.h * fraction };
  return { x: box.x + box.w, y: box.y + box.h * fraction };
}

function nodeEncodedForPort(node: NodeData, box: Box, direction: Direction, port: Point | null) {
  // The production router derives top/bottom ports from node.x and left/right
  // ports from node.y. For this isolated comparison, force one permitted side
  // and encode only that port coordinate without changing production code.
  return {
    id: node.id,
    x: port && (direction === "up" || direction === "down") ? port.x : node.x,
    y: port && (direction === "left" || direction === "right") ? port.y : node.y,
    box,
  };
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

function isIncoming(scenario: Scenario, entry: Leaf, mixedIncoming: Set<string>): boolean {
  if (scenario === "all-incoming") return true;
  if (scenario === "all-outgoing") return false;
  return mixedIncoming.has(entry.node.id);
}

interface Summary {
  scenario: Scenario;
  strategy: Strategy;
  found: number;
  noRoute: number;
  clean: number;
  parallelConflicts: number;
}

function derive(scenario: Scenario, strategy: Strategy): Summary {
  const mixedSeed = MIXED_SCENARIOS.find((entry) => entry.scenario === scenario)?.seed;
  const mixedIncoming = mixedSeed === undefined ? new Set<string>() : seededIncomingIds(mixedSeed);
  const leafBoxes = new Map(LEAVES.map((entry) => [entry.node.id, getNodeBox(entry.node, false)]));
  const bySide = new Map<Direction, Leaf[]>();
  for (const entry of LEAVES) bySide.set(entry.centralSide, [...(bySide.get(entry.centralSide) ?? []), entry]);
  for (const entries of bySide.values()) entries.sort((a, b) => a.node.id.localeCompare(b.node.id));

  const reserved: Segment[] = [];
  let found = 0;
  let noRoute = 0;
  let clean = 0;
  let parallelConflicts = 0;

  for (const entry of LEAVES) {
    const incoming = isIncoming(scenario, entry, mixedIncoming);
    const centralEntries = bySide.get(entry.centralSide)!;
    const portIndex = centralEntries.findIndex((candidate) => candidate.node.id === entry.node.id);
    const portFirst = strategy === "port-first-even-spacing";
    const centralPort = portFirst ? evenlySpacedPort(CENTER_BOX, entry.centralSide, portIndex, centralEntries.length) : null;
    const leafBox = leafBoxes.get(entry.node.id)!;

    const source = incoming ? entry.node : CENTER;
    const target = incoming ? CENTER : entry.node;
    const sourceBox = incoming ? leafBox : CENTER_BOX;
    const targetBox = incoming ? CENTER_BOX : leafBox;
    const sourceDirection = incoming ? opposite(entry.centralSide) : entry.centralSide;
    const targetDirection = incoming ? entry.centralSide : opposite(entry.centralSide);
    const sourcePort = incoming ? null : centralPort;
    const targetPort = incoming ? centralPort : null;
    const obstacles = [CENTER, ...LEAVES.map((candidate) => candidate.node)]
      .filter((node) => node.id !== source.id && node.id !== target.id)
      .map((node) => node.id === CENTER.id ? CENTER_BOX : leafBoxes.get(node.id)!);

    const route = findProgressivePrototypeRoute(
      nodeEncodedForPort(source, sourceBox, sourceDirection, sourcePort),
      nodeEncodedForPort(target, targetBox, targetDirection, targetPort),
      obstacles,
      {
        ...(portFirst && (incoming ? { targetDirections: [targetDirection] } : { sourceDirections: [sourceDirection] })),
        maxBends: 5,
      },
    );

    if (!route.found) {
      noRoute += 1;
      continue;
    }
    found += 1;
    if (hasParallelConflict(route.points, reserved)) parallelConflicts += 1;
    else clean += 1;
    reserved.push(...toSegments(route.points));
  }

  return { scenario, strategy, found, noRoute, clean, parallelConflicts };
}

function measure(scenario: Scenario, strategy: Strategy) {
  for (let index = 0; index < 6; index += 1) derive(scenario, strategy);
  const samples: number[] = [];
  let summary = derive(scenario, strategy);
  for (let index = 0; index < 60; index += 1) {
    const started = performance.now();
    summary = derive(scenario, strategy);
    samples.push(performance.now() - started);
  }
  samples.sort((a, b) => a - b);
  return {
    ...summary,
    medianMs: Number(samples[Math.floor(samples.length / 2)].toFixed(3)),
    p95Ms: Number(samples[Math.ceil(samples.length * 0.95) - 1].toFixed(3)),
    slowestMs: Number(samples[samples.length - 1].toFixed(3)),
  };
}

function averageMixed(results: Array<ReturnType<typeof measure>>, strategy: Strategy) {
  const mixed = results.filter((result) => result.strategy === strategy && result.scenario.startsWith("mixed-"));
  const average = (key: "found" | "noRoute" | "clean" | "parallelConflicts" | "medianMs" | "p95Ms") =>
    Number((mixed.reduce((total, result) => total + result[key], 0) / mixed.length).toFixed(3));
  return {
    strategy,
    cases: mixed.length,
    averageFound: average("found"),
    averageNoRoute: average("noRoute"),
    averageClean: average("clean"),
    averageParallelConflicts: average("parallelConflicts"),
    averageMedianMs: average("medianMs"),
    averageP95Ms: average("p95Ms"),
  };
}

const scenarios: Scenario[] = ["all-incoming", "all-outgoing", ...MIXED_SCENARIOS.map((entry) => entry.scenario)];
const results = scenarios.flatMap((scenario) => [
  measure(scenario, "shortest-path"),
  measure(scenario, "port-first-even-spacing"),
]);

console.log(JSON.stringify({
  notes: {
    node: "Normal 100×36 central node with 18 non-overlapping leaves: 7 above, 7 below, 2 left, and 2 right.",
    mixedScenarios: "Five matched deterministic pseudo-random selections: each has 9 incoming and 9 outgoing connections. mixed-1 keeps the earlier seed 20260820; both strategies receive the same five seeds.",
    shortestPath: "Current comparison: all four central-node sides remain available; the progressive router selects the first legal minimum-bend route, then its shortest candidate.",
    portFirst: "Experimental comparison: connection side is assigned from the leaf location, then evenly spaced ports use i/(count+1), preserving 12.5-unit top/bottom and 12-unit left/right gaps.",
  },
  results,
  mixedAverages: [
    averageMixed(results, "shortest-path"),
    averageMixed(results, "port-first-even-spacing"),
  ],
}, null, 2));
