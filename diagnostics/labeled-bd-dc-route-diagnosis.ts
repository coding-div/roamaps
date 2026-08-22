/**
 * Measurement-only reproduction of the user-labeled A/B/C/D screenshot.
 *
 * Coordinate ratios come from the screenshot's visible canvas positions. The
 * fixture intentionally includes A→B and A→C so that B→D and D→C are measured
 * under the same surrounding node and lane pressure as the reported layout.
 */
import { buildDerivedRoutes, buildEdgePortPlans } from "../client/src/components/TreeCanvas";
import { getNodeBox } from "../client/src/lib/collision";
import { getAllEdges, type NodeData, type TreeMap } from "../client/src/lib/treeData";
import { findProgressivePrototypeRoute, type PrototypeSegment } from "../client/src/lib/progressiveRouter";

function node(id: string, x: number, y: number, children: NodeData["children"] = []): NodeData {
  return { id, x, y, label: id.toUpperCase(), color: "blue", children, popupContent: "" };
}

const a = node("a", 536, -444, [
  { targetId: "b", color: "blue" },
  { targetId: "c", color: "blue" },
]);
const b = node("b", 0, 0, [{ targetId: "d", color: "blue" }]);
const c = node("c", 354, 141);
const d = node("d", 518, 458, [{ targetId: "c", color: "blue" }]);

const tree: TreeMap = {
  id: "labeled-bd-dc",
  title: "Labeled B-D / D-C diagnostic",
  description: "Measurement fixture only",
  root: a,
  nodeMap: { a, b, c, d },
  maxDepth: 3,
};

const nodes = Object.values(tree.nodeMap);
const boxes = new Map(nodes.map((current) => [current.id, getNodeBox(current, current.id === tree.root.id)]));
const edges = getAllEdges(tree);
const portPlans = buildEdgePortPlans(edges, boxes, new Map());
const routes = buildDerivedRoutes(tree);

const selected = ["b->d", "d->c"].map((key) => {
  const plan = portPlans.get(key)!;
  const route = routes.find((entry) => `${entry.source.id}->${entry.target.id}` === key)!;
  return {
    edge: key,
    assignedSourcePorts: plan.sourcePorts,
    assignedTargetPorts: plan.targetPorts,
    chosenTargetDirection: route.route.targetDirection,
    clean: route.route.clean,
    bends: Math.max(0, route.route.points.length - 2),
    points: route.route.points,
  };
});
const dToCRightTargetPort = portPlans.get("d->c")!.targetPorts.find((port) => port.direction === "right")!;

function segments(points: Array<{ x: number; y: number }>): PrototypeSegment[] {
  return points.slice(1).map((point, index) => ({ a: points[index], b: point }));
}

function hasStrictCrossing(left: PrototypeSegment, right: PrototypeSegment): boolean {
  const leftHorizontal = left.a.y === left.b.y;
  const rightHorizontal = right.a.y === right.b.y;
  if (leftHorizontal === rightHorizontal) return false;
  const horizontal = leftHorizontal ? left : right;
  const vertical = leftHorizontal ? right : left;
  return vertical.a.x > Math.min(horizontal.a.x, horizontal.b.x)
    && vertical.a.x < Math.max(horizontal.a.x, horizontal.b.x)
    && horizontal.a.y > Math.min(vertical.a.y, vertical.b.y)
    && horizontal.a.y < Math.max(vertical.a.y, vertical.b.y);
}

function crossingCount(points: Array<{ x: number; y: number }>, obstacles: Array<Array<{ x: number; y: number }>>): number {
  return segments(points).reduce((total, candidate) => total + obstacles.flatMap(segments).filter((reserved) => hasStrictCrossing(candidate, reserved)).length, 0);
}

function prototype(current: NodeData) {
  return { id: current.id, x: current.x, y: current.y, box: boxes.get(current.id)! };
}

const bToDRequested = findProgressivePrototypeRoute(
  prototype(b),
  prototype(d),
  [boxes.get("a")!, boxes.get("c")!],
  {
    sourcePorts: [{ direction: "down", point: { x: b.x, y: boxes.get("b")!.y + boxes.get("b")!.h } }],
    targetPorts: [{ direction: "left", point: { x: boxes.get("d")!.x, y: d.y } }],
    maxBends: 5,
  },
);
const dToCRequested = findProgressivePrototypeRoute(
  prototype(d),
  prototype(c),
  [boxes.get("a")!, boxes.get("b")!],
  {
    sourcePorts: [{ direction: "up", point: { x: d.x, y: boxes.get("d")!.y } }],
    targetPorts: [dToCRightTargetPort],
    maxBends: 5,
  },
);
const earlyRoutes = ["a->b", "a->c"].map((key) => routes.find((entry) => `${entry.source.id}->${entry.target.id}` === key)!.route.points);
const currentBToD = routes.find((entry) => `${entry.source.id}->${entry.target.id}` === "b->d")!.route.points;
const currentDToC = routes.find((entry) => `${entry.source.id}->${entry.target.id}` === "d->c")!.route.points;
const earlySegments = earlyRoutes.flatMap(segments);
const bToDRequestedWithReservations = findProgressivePrototypeRoute(
  prototype(b),
  prototype(d),
  [boxes.get("a")!, boxes.get("c")!],
  {
    sourcePorts: [{ direction: "down", point: { x: b.x, y: boxes.get("b")!.y + boxes.get("b")!.h } }],
    targetPorts: [{ direction: "left", point: { x: boxes.get("d")!.x, y: d.y } }],
    arrowObstacles: earlySegments,
    lanePadding: 6,
    maxBends: 5,
  },
);
const dToCRequestedWithReservations = findProgressivePrototypeRoute(
  prototype(d),
  prototype(c),
  [boxes.get("a")!, boxes.get("b")!],
  {
    sourcePorts: [{ direction: "up", point: { x: d.x, y: boxes.get("d")!.y } }],
    targetPorts: [dToCRightTargetPort],
    arrowObstacles: [...earlySegments, ...segments(bToDRequestedWithReservations.points)],
    lanePadding: 6,
    maxBends: 5,
  },
);

console.log(JSON.stringify({
  nodeCentres: Object.fromEntries(nodes.map((current) => [current.id, { x: current.x, y: current.y }])),
  earlierReservedRoutes: ["a->b", "a->c"].map((key) => {
    const route = routes.find((entry) => `${entry.source.id}->${entry.target.id}` === key)!.route;
    return { edge: key, points: route.points, clean: route.clean };
  }),
  selected,
  requestedCandidates: {
    bToD: {
      found: bToDRequested.found,
      bends: bToDRequested.bends,
      length: bToDRequested.length,
      points: bToDRequested.points,
      crossingsAgainstEarlierRoutes: crossingCount(bToDRequested.points, earlyRoutes),
    },
    dToC: {
      found: dToCRequested.found,
      bends: dToCRequested.bends,
      length: dToCRequested.length,
      points: dToCRequested.points,
      crossingsAgainstEarlierAndRequestedBToD: crossingCount(dToCRequested.points, [...earlyRoutes, bToDRequested.points]),
    },
    requestedPairUnderLiveLaneReservations: {
      bToD: {
        found: bToDRequestedWithReservations.found,
        bends: bToDRequestedWithReservations.bends,
        points: bToDRequestedWithReservations.points,
      },
      dToC: {
        found: dToCRequestedWithReservations.found,
        bends: dToCRequestedWithReservations.bends,
        points: dToCRequestedWithReservations.points,
      },
    },
    current: {
      bToDCrossingsAgainstEarlierRoutes: crossingCount(currentBToD, earlyRoutes),
      dToCCrossingsAgainstEarlierRoutes: crossingCount(currentDToC, [...earlyRoutes, currentBToD]),
    },
  },
  interpretation: {
    bToDRequestedFirstLeg: "down",
    bToDRequestedShape: "vertical then horizontal into D's left side",
    dToCRequestedFirstLeg: "up",
    dToCRequestedShape: "vertical up then horizontal into C's right side",
  },
}, null, 2));
