import type { Box, Point } from "@/lib/collision";
import type { Direction, NodeData } from "@/lib/treeData";
import { getPort, LANE_GAP, OBSTACLE_PADDING, parallelSegmentConflict, routeLength, verifyRoute, type Segment } from "@/lib/routingEngine";

type State = { key: string; direction: Direction | null; length: number; bends: number; path: string[]; stable: string };

function move(point: Point, direction: Direction, distance: number): Point {
  if (direction === "up") return { x: point.x, y: point.y - distance };
  if (direction === "down") return { x: point.x, y: point.y + distance };
  if (direction === "left") return { x: point.x - distance, y: point.y };
  return { x: point.x + distance, y: point.y };
}

function coordinateKey(point: Point): string { return `${point.x},${point.y}`; }

function direction(a: Point, b: Point): Direction {
  if (a.x === b.x) return b.y > a.y ? "down" : "up";
  return b.x > a.x ? "right" : "left";
}

function inside(point: Point, box: Box): boolean {
  return point.x > box.x - OBSTACLE_PADDING && point.x < box.x + box.w + OBSTACLE_PADDING && point.y > box.y - OBSTACLE_PADDING && point.y < box.y + box.h + OBSTACLE_PADDING;
}

function legalSegment(a: Point, b: Point, obstacles: Box[], arrows: Segment[]): boolean {
  if (a.x !== b.x && a.y !== b.y) return false;
  for (const obstacle of obstacles) {
    if (a.x === b.x && a.x > obstacle.x - OBSTACLE_PADDING && a.x < obstacle.x + obstacle.w + OBSTACLE_PADDING && Math.max(a.y, b.y) > obstacle.y - OBSTACLE_PADDING && Math.min(a.y, b.y) < obstacle.y + obstacle.h + OBSTACLE_PADDING) return false;
    if (a.y === b.y && a.y > obstacle.y - OBSTACLE_PADDING && a.y < obstacle.y + obstacle.h + OBSTACLE_PADDING && Math.max(a.x, b.x) > obstacle.x - OBSTACLE_PADDING && Math.min(a.x, b.x) < obstacle.x + obstacle.w + OBSTACLE_PADDING) return false;
  }
  return !arrows.some((arrow) => parallelSegmentConflict({ a, b }, arrow));
}

function coordinates(start: Point, end: Point, obstacles: Box[], arrows: Segment[]): { xs: number[]; ys: number[] } {
  const xs = [start.x, end.x];
  const ys = [start.y, end.y];
  for (const obstacle of obstacles) {
    xs.push(obstacle.x - OBSTACLE_PADDING - 1, obstacle.x + obstacle.w + OBSTACLE_PADDING + 1);
    ys.push(obstacle.y - OBSTACLE_PADDING - 1, obstacle.y + obstacle.h + OBSTACLE_PADDING + 1);
  }
  for (const arrow of arrows) {
    if (arrow.a.y === arrow.b.y) {
      xs.push(arrow.a.x, arrow.b.x);
      ys.push(arrow.a.y - LANE_GAP, arrow.a.y + LANE_GAP);
    } else {
      xs.push(arrow.a.x - LANE_GAP, arrow.a.x + LANE_GAP);
      ys.push(arrow.a.y, arrow.b.y);
    }
  }
  return { xs: Array.from(new Set(xs)).sort((a, b) => a - b), ys: Array.from(new Set(ys)).sort((a, b) => a - b) };
}

function bruteForcePath(start: Point, end: Point, obstacles: Box[], arrows: Segment[]): Point[] | null {
  const { xs, ys } = coordinates(start, end, obstacles, arrows);
  const points = new Map<string, Point>();
  for (const x of xs) for (const y of ys) if (!obstacles.some((obstacle) => inside({ x, y }, obstacle))) points.set(coordinateKey({ x, y }), { x, y });
  points.set(coordinateKey(start), start);
  points.set(coordinateKey(end), end);
  const queue: State[] = [{ key: coordinateKey(start), direction: null, length: 0, bends: 0, path: [coordinateKey(start)], stable: `${start.y},${start.x}` }];
  const best = new Map<string, State>();
  while (queue.length > 0) {
    queue.sort((a, b) => a.length - b.length || a.bends - b.bends || a.stable.localeCompare(b.stable));
    const current = queue.shift()!;
    const stateKey = `${current.key}|${current.direction ?? "start"}`;
    if (best.has(stateKey)) continue;
    best.set(stateKey, current);
    if (current.key === coordinateKey(end)) return current.path.map((key) => points.get(key)!);
    const point = points.get(current.key)!;
    for (const [nextKey, next] of Array.from(points.entries())) {
      if (nextKey === current.key || current.path.includes(nextKey) || !legalSegment(point, next, obstacles, arrows)) continue;
      const nextDirection = direction(point, next);
      queue.push({ key: nextKey, direction: nextDirection, length: current.length + routeLength([point, next]), bends: current.bends + (current.direction && current.direction !== nextDirection ? 1 : 0), path: [...current.path, nextKey], stable: `${current.stable};${next.y},${next.x}` });
    }
  }
  return null;
}

/** Test-only oracle. It uses all visible coordinate pairs, not the production sparse adjacency graph. */
export function getSlowReferenceRouteLength(source: NodeData, target: NodeData, sourceBox: Box, targetBox: Box, obstacles: Box[], arrows: Segment[] = []): number | null {
  const directions: Direction[] = ["up", "right", "down", "left"];
  const candidates: Point[][] = [];
  for (const sourceDirection of directions) {
    for (const targetDirection of directions) {
      const start = getPort(source, sourceBox, sourceDirection);
      const end = getPort(target, targetBox, targetDirection);
      const startOut = move(start, sourceDirection, 18);
      const endIn = move(end, targetDirection, 18);
      if (!legalSegment(start, startOut, obstacles, arrows) || !legalSegment(endIn, end, obstacles, arrows)) continue;
      const middle = bruteForcePath(startOut, endIn, obstacles, arrows);
      if (!middle) continue;
      const points = [start, ...middle, end].filter((point, index, all) => index === 0 || point.x !== all[index - 1].x || point.y !== all[index - 1].y);
      if (verifyRoute(points, obstacles, arrows).clean) candidates.push(points);
    }
  }
  return candidates.length === 0 ? null : Math.min(...candidates.map(routeLength));
}
