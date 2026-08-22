/**
 * Measurement-only reconstruction of the user-marked A/B/C part of Tree 2.
 *
 * The screenshot has A at roughly (95,105), C at (193,198), and the moved B
 * at (460,540). Both edges use separate, evenly-spaced positions on A's
 * bottom side. The current order puts C→A at the left third and A→B at the
 * right third; exchanging those two positions preserves legal attachments
 * while changing one bridge crossing into no bridge.
 */
import { getNodeBox, type Box, type Point } from "../client/src/lib/collision";
import type { NodeData } from "../client/src/lib/treeData";
import { findProgressivePrototypeRoute, type PrototypeSegment } from "../client/src/lib/progressiveRouter";

function node(id: string, x: number, y: number): NodeData {
  return { id, x, y, label: id.toUpperCase(), color: "green", children: [], popupContent: "" };
}

const a = node("a", 95, 105);
const c = node("c", 193, 198);
const b = node("b", 460, 540);
const boxes = new Map([[a.id, getNodeBox(a, false)], [b.id, getNodeBox(b, false)], [c.id, getNodeBox(c, false)]]);

function boxOf(current: NodeData): Box {
  return boxes.get(current.id)!;
}

function prototype(current: NodeData) {
  return { id: current.id, x: current.x, y: current.y, box: boxOf(current) };
}

function bottomPort(current: NodeData, ratio: number): Point {
  const box = boxOf(current);
  return { x: box.x + box.w * ratio, y: box.y + box.h };
}

function leftPort(current: NodeData): Point {
  const box = boxOf(current);
  return { x: box.x, y: current.y };
}

function segments(points: Point[]): PrototypeSegment[] {
  return points.slice(1).map((point, index) => ({ a: points[index], b: point }));
}

function strictCrossing(left: PrototypeSegment, right: PrototypeSegment): boolean {
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

function routeLength(points: Point[]): number {
  return points.slice(1).reduce((total, point, index) => total + Math.abs(point.x - points[index].x) + Math.abs(point.y - points[index].y), 0);
}

function evaluate(label: string, cToARatio: number, aToBRatio: number) {
  const cToA = findProgressivePrototypeRoute(
    prototype(c),
    prototype(a),
    [boxOf(b)],
    {
      sourcePorts: [{ direction: "left", point: leftPort(c) }],
      targetPorts: [{ direction: "down", point: bottomPort(a, cToARatio) }],
      maxBends: 5,
    },
  );
  const aToB = findProgressivePrototypeRoute(
    prototype(a),
    prototype(b),
    [boxOf(c)],
    {
      sourcePorts: [{ direction: "down", point: bottomPort(a, aToBRatio) }],
      targetPorts: [{ direction: "left", point: leftPort(b) }],
      maxBends: 5,
    },
  );
  const bridges = segments(cToA.points).reduce((total, candidate) => total + segments(aToB.points).filter((reserved) => strictCrossing(candidate, reserved)).length, 0);
  return {
    label,
    portsAtA: { cToA: bottomPort(a, cToARatio), aToB: bottomPort(a, aToBRatio) },
    cToA: { found: cToA.found, bends: cToA.bends, length: routeLength(cToA.points), points: cToA.points },
    aToB: { found: aToB.found, bends: aToB.bends, length: routeLength(aToB.points), points: aToB.points },
    bridgeCrossings: bridges,
    totalLength: routeLength(cToA.points) + routeLength(aToB.points),
  };
}

const currentAssignment = evaluate("current deterministic order", 1 / 3, 2 / 3);
const exchangedAssignment = evaluate("requested exchanged A-bottom ports", 2 / 3, 1 / 3);

console.log(JSON.stringify({
  fixture: {
    source: "A/B/C screen-scale reconstruction from the user-supplied Tree 2 screenshot",
    nodeCentres: Object.fromEntries([a, b, c].map((current) => [current.id, { x: current.x, y: current.y }])),
    rule: "Compare the two routes as a pair; fewer bridge crossings outrank individual route length.",
  },
  currentAssignment,
  exchangedAssignment,
  result: {
    currentBridges: currentAssignment.bridgeCrossings,
    exchangedBridges: exchangedAssignment.bridgeCrossings,
    cToAChangesBy: exchangedAssignment.cToA.length - currentAssignment.cToA.length,
    aToBChangesBy: exchangedAssignment.aToB.length - currentAssignment.aToB.length,
    totalLengthChangesBy: exchangedAssignment.totalLength - currentAssignment.totalLength,
    preferred: exchangedAssignment.bridgeCrossings < currentAssignment.bridgeCrossings ? "exchanged A-side positions" : "current deterministic order",
  },
}, null, 2));
