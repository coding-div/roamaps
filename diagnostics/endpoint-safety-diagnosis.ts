import { getNodeBox, type Box, type Point } from "../client/src/lib/collision";
import { findProgressivePrototypeRoute } from "../client/src/lib/progressiveRouter";
import type { NodeData } from "../client/src/lib/treeData";

type Segment = { a: Point; b: Point };

function makeNode(id: string, x: number, y: number): NodeData {
  return { id, x, y, label: "", color: "violet", children: [] };
}

function segments(points: Point[]): Segment[] {
  return points.slice(1).map((point, index) => ({ a: points[index], b: point }));
}

function runsAlongBoundary(segment: Segment, box: Box): boolean {
  if (segment.a.x === segment.b.x) {
    const onBoundary = segment.a.x === box.x || segment.a.x === box.x + box.w;
    const low = Math.min(segment.a.y, segment.b.y);
    const high = Math.max(segment.a.y, segment.b.y);
    return onBoundary && high > box.y && low < box.y + box.h;
  }
  const onBoundary = segment.a.y === box.y || segment.a.y === box.y + box.h;
  const low = Math.min(segment.a.x, segment.b.x);
  const high = Math.max(segment.a.x, segment.b.x);
  return onBoundary && high > box.x && low < box.x + box.w;
}

function entersInterior(segment: Segment, box: Box): boolean {
  if (segment.a.x === segment.b.x) {
    const low = Math.min(segment.a.y, segment.b.y);
    const high = Math.max(segment.a.y, segment.b.y);
    return segment.a.x > box.x && segment.a.x < box.x + box.w && high > box.y && low < box.y + box.h;
  }
  const low = Math.min(segment.a.x, segment.b.x);
  const high = Math.max(segment.a.x, segment.b.x);
  return segment.a.y > box.y && segment.a.y < box.y + box.h && high > box.x && low < box.x + box.w;
}

const source = makeNode("source", 0, 0);
const sourceBox = getNodeBox(source, false);
let count = 0;

function boxesOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

for (const x of [-220, -160, -120, -80, -40, 40, 80, 120, 160, 220]) {
  for (const y of [-220, -160, -120, -80, -40, 40, 80, 120, 160, 220]) {
    const target = makeNode("target", x, y);
    const targetBox = getNodeBox(target, false);
    if (boxesOverlap(sourceBox, targetBox)) continue;
    for (const obstacleX of [-180, -120, -60, 0, 60, 120, 180]) {
      for (const obstacleY of [-180, -120, -60, 0, 60, 120, 180]) {
        const obstacle = makeNode("blocker", obstacleX, obstacleY);
        const obstacleBox = getNodeBox(obstacle, false);
        if (boxesOverlap(obstacleBox, sourceBox) || boxesOverlap(obstacleBox, targetBox)) continue;
        const result = findProgressivePrototypeRoute(
          { id: source.id, x: source.x, y: source.y, box: sourceBox },
          { id: target.id, x: target.x, y: target.y, box: targetBox },
          [obstacleBox],
          { maxBends: 5 },
        );
        if (!result.found) continue;
        const routeSegments = segments(result.points);
        const violations = routeSegments.filter((segment) =>
          runsAlongBoundary(segment, sourceBox) ||
          runsAlongBoundary(segment, targetBox) ||
          entersInterior(segment, sourceBox) ||
          entersInterior(segment, targetBox),
        );
        if (violations.length === 0) continue;
        count += 1;
        console.log(JSON.stringify({ target: { x, y }, blocker: { x: obstacleX, y: obstacleY }, points: result.points, violations }));
        if (count >= 12) process.exit(0);
      }
    }
  }
}

console.log(JSON.stringify({ endpointSafetyViolations: count }));
