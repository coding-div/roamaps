/**
 * Measurement-only reconstruction of the user-marked Tree 2 A→D screenshot.
 *
 * Positions use the screenshot's visible node-centre proportions. It compares
 * A-right → D-left (the current two-bend shape) against A-bottom → D-left
 * (the user-described one-bend shape), under the visible B and C obstacles.
 */
import { getNodeBox, type Box, type Point } from "../client/src/lib/collision";
import type { NodeData } from "../client/src/lib/treeData";
import { findProgressivePrototypeRoute } from "../client/src/lib/progressiveRouter";

function node(id: string, x: number, y: number): NodeData {
  return { id, x, y, label: id.toUpperCase(), color: "blue", children: [], popupContent: "" };
}

const a = node("a", 69, 160);
const b = node("b", 339, 151);
const c = node("c", 188, 340);
const d = node("d", 516, 371);
const boxes = new Map([a, b, c, d].map((current) => [current.id, getNodeBox(current, false)]));

function boxOf(current: NodeData): Box {
  return boxes.get(current.id)!;
}

function prototype(current: NodeData) {
  return { id: current.id, x: current.x, y: current.y, box: boxOf(current) };
}

function port(current: NodeData, direction: "up" | "down" | "left" | "right"): Point {
  const box = boxOf(current);
  if (direction === "up") return { x: current.x, y: box.y };
  if (direction === "down") return { x: current.x, y: box.y + box.h };
  if (direction === "left") return { x: box.x, y: current.y };
  return { x: box.x + box.w, y: current.y };
}

function routeLength(points: Point[]): number {
  return points.slice(1).reduce((total, point, index) => total + Math.abs(point.x - points[index].x) + Math.abs(point.y - points[index].y), 0);
}

function measure(label: string, sourceDirection: "up" | "down" | "left" | "right") {
  const result = findProgressivePrototypeRoute(
    prototype(a),
    prototype(d),
    [boxOf(b), boxOf(c)],
    {
      sourcePorts: [{ direction: sourceDirection, point: port(a, sourceDirection) }],
      targetPorts: [{ direction: "left", point: port(d, "left") }],
      maxBends: 5,
    },
  );
  return {
    label,
    sourcePort: port(a, sourceDirection),
    targetPort: port(d, "left"),
    found: result.found,
    bends: result.bends,
    length: routeLength(result.points),
    points: result.points,
  };
}

const currentRightExit = measure("current A-right exit", "right");
const requestedBottomExit = measure("requested A-bottom exit", "down");

console.log(JSON.stringify({
  fixture: {
    source: "A/B/C/D screen-scale reconstruction from the user-supplied Tree 2 screenshot",
    nodeCentres: Object.fromEntries([a, b, c, d].map((current) => [current.id, { x: current.x, y: current.y }])),
    obstacleNodes: ["b", "c"],
  },
  currentRightExit,
  requestedBottomExit,
  result: {
    bendReduction: currentRightExit.bends - requestedBottomExit.bends,
    lengthReduction: currentRightExit.length - requestedBottomExit.length,
    preferred: requestedBottomExit.found && requestedBottomExit.bends < currentRightExit.bends
      ? "A-bottom → D-left"
      : "no measured one-bend improvement",
  },
}, null, 2));
