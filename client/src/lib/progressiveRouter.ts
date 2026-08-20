/**
 * Progressive router for the approved staged route search.
 *
 * The module stays pure so the live canvas can adapt its result without
 * changing roadmap history, persistence, or SVG rendering semantics. It finds
 * the first legal bend count (zero through five), then chooses the shortest
 * stable route within that count. It never returns a diagonal fallback.
 */

import type { Box, Point } from "./collision";
import type { Direction } from "./treeData";

export const PROTOTYPE_CLEARANCE = 18;
export const PROTOTYPE_OBSTACLE_PADDING = 10;
export const PROTOTYPE_MIN_FINAL_SEGMENT = 15;

const DIRECTION_ORDER: Direction[] = ["up", "left", "down", "right"];

export interface PrototypeNode {
  id: string;
  x: number;
  y: number;
  box: Box;
}

export interface PrototypeRoute {
  found: boolean;
  points: Point[];
  bends: number;
  length: number;
  sourceDirection: Direction | null;
  targetDirection: Direction | null;
  reason?: "no-legal-route" | "maximum-bends-exhausted";
}

export interface PrototypeOptions {
  /** Search all node sides by default; fixtures may constrain sides deliberately. */
  sourceDirections?: Direction[];
  targetDirections?: Direction[];
  /** Test-only finite area used to create genuine multi-bend obstacle mazes. */
  bounds?: Box;
  maxBends?: number;
}

interface GraphEdge {
  to: number;
  direction: Direction;
  length: number;
}

interface SearchState {
  vertex: number;
  direction: Direction;
  bends: number;
  length: number;
  points: number[];
}

function pointKey(point: Point): string {
  return `${point.x},${point.y}`;
}

function comparePoint(a: Point, b: Point): number {
  return a.y - b.y || a.x - b.x;
}

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

function getPort(node: PrototypeNode, direction: Direction): Point {
  if (direction === "up") return { x: node.x, y: node.box.y };
  if (direction === "down") return { x: node.x, y: node.box.y + node.box.h };
  if (direction === "left") return { x: node.box.x, y: node.y };
  return { x: node.box.x + node.box.w, y: node.y };
}

function directionFrom(a: Point, b: Point): Direction {
  if (a.x === b.x) return b.y >= a.y ? "down" : "up";
  return b.x >= a.x ? "right" : "left";
}

function distance(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function simplify(points: Point[]): Point[] {
  const result: Point[] = [];
  for (const point of points) {
    const previous = result[result.length - 1];
    if (previous && previous.x === point.x && previous.y === point.y) continue;
    const before = result[result.length - 2];
    if (
      before &&
      previous &&
      ((before.x === previous.x && previous.x === point.x) ||
        (before.y === previous.y && previous.y === point.y))
    ) {
      result[result.length - 1] = point;
    } else {
      result.push(point);
    }
  }
  return result;
}

function bendCount(points: Point[]): number {
  const simplified = simplify(points);
  return Math.max(0, simplified.length - 2);
}

function routeLength(points: Point[]): number {
  return points.slice(1).reduce((total, point, index) => total + distance(points[index], point), 0);
}

function isRouteClear(points: Point[], obstacles: Box[], bounds?: Box): boolean {
  return points.slice(1).every((point, index) => segmentClear(points[index], point, obstacles, bounds));
}

function compareRoutes(a: PrototypeRoute, b: PrototypeRoute): number {
  return (
    a.bends - b.bends ||
    a.length - b.length ||
    DIRECTION_ORDER.indexOf(a.sourceDirection!) - DIRECTION_ORDER.indexOf(b.sourceDirection!) ||
    DIRECTION_ORDER.indexOf(a.targetDirection!) - DIRECTION_ORDER.indexOf(b.targetDirection!) ||
    pathSignature(a.points).localeCompare(pathSignature(b.points))
  );
}

/**
 * A zero- or one-bend connection needs no visibility graph: once both ports
 * are chosen, its middle segment is fixed. Resolving these common routes here
 * prevents routine dragging from paying for the unbounded obstacle graph that
 * only genuine detours need.
 */
function findSimpleForPorts(
  source: PrototypeNode,
  target: PrototypeNode,
  obstacles: Box[],
  sourceDirection: Direction,
  targetDirection: Direction,
  bounds?: Box,
): PrototypeRoute | null {
  const start = getPort(source, sourceDirection);
  const startOut = move(start, sourceDirection, PROTOTYPE_CLEARANCE);
  const end = getPort(target, targetDirection);
  const endIn = move(end, targetDirection, PROTOTYPE_CLEARANCE);
  const sourceLeavesHorizontally = sourceDirection === "left" || sourceDirection === "right";
  const corner = sourceLeavesHorizontally
    ? { x: endIn.x, y: startOut.y }
    : { x: startOut.x, y: endIn.y };
  const points = simplify([start, startOut, corner, endIn, end]);

  if (points.length < 2 || !isRouteClear(points, obstacles, bounds)) return null;
  const bends = bendCount(points);
  if (bends > 1 || distance(points[points.length - 2], end) < PROTOTYPE_MIN_FINAL_SEGMENT) return null;

  return {
    found: true,
    points,
    bends,
    length: routeLength(points),
    sourceDirection,
    targetDirection,
  };
}

function isInsideExpanded(point: Point, obstacle: Box): boolean {
  return (
    point.x > obstacle.x - PROTOTYPE_OBSTACLE_PADDING &&
    point.x < obstacle.x + obstacle.w + PROTOTYPE_OBSTACLE_PADDING &&
    point.y > obstacle.y - PROTOTYPE_OBSTACLE_PADDING &&
    point.y < obstacle.y + obstacle.h + PROTOTYPE_OBSTACLE_PADDING
  );
}

function isWithinBounds(point: Point, bounds?: Box): boolean {
  if (!bounds) return true;
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.w &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.h
  );
}

function segmentClear(a: Point, b: Point, obstacles: Box[], bounds?: Box): boolean {
  if ((a.x !== b.x && a.y !== b.y) || !isWithinBounds(a, bounds) || !isWithinBounds(b, bounds)) return false;
  for (const obstacle of obstacles) {
    if (a.x === b.x) {
      const low = Math.min(a.y, b.y);
      const high = Math.max(a.y, b.y);
      if (
        a.x > obstacle.x - PROTOTYPE_OBSTACLE_PADDING &&
        a.x < obstacle.x + obstacle.w + PROTOTYPE_OBSTACLE_PADDING &&
        high > obstacle.y - PROTOTYPE_OBSTACLE_PADDING &&
        low < obstacle.y + obstacle.h + PROTOTYPE_OBSTACLE_PADDING
      ) {
        return false;
      }
    } else {
      const low = Math.min(a.x, b.x);
      const high = Math.max(a.x, b.x);
      if (
        a.y > obstacle.y - PROTOTYPE_OBSTACLE_PADDING &&
        a.y < obstacle.y + obstacle.h + PROTOTYPE_OBSTACLE_PADDING &&
        high > obstacle.x - PROTOTYPE_OBSTACLE_PADDING &&
        low < obstacle.x + obstacle.w + PROTOTYPE_OBSTACLE_PADDING
      ) {
        return false;
      }
    }
  }
  return true;
}

function createVisibilityGraph(pointsToInclude: Point[], obstacles: Box[], bounds?: Box): { points: Point[]; graph: GraphEdge[][]; indexByKey: Map<string, number> } {
  const xs = new Set<number>();
  const ys = new Set<number>();
  for (const point of pointsToInclude) {
    xs.add(point.x);
    ys.add(point.y);
  }
  for (const obstacle of obstacles) {
    xs.add(obstacle.x - PROTOTYPE_OBSTACLE_PADDING);
    xs.add(obstacle.x + obstacle.w + PROTOTYPE_OBSTACLE_PADDING);
    ys.add(obstacle.y - PROTOTYPE_OBSTACLE_PADDING);
    ys.add(obstacle.y + obstacle.h + PROTOTYPE_OBSTACLE_PADDING);
  }
  if (bounds) {
    xs.add(bounds.x);
    xs.add(bounds.x + bounds.w);
    ys.add(bounds.y);
    ys.add(bounds.y + bounds.h);
  }

  const sortedXs = Array.from(xs).sort((a, b) => a - b);
  const sortedYs = Array.from(ys).sort((a, b) => a - b);
  const points: Point[] = [];
  const indexByKey = new Map<string, number>();

  for (const x of sortedXs) {
    for (const y of sortedYs) {
      const point = { x, y };
      if (!isWithinBounds(point, bounds) || obstacles.some((obstacle) => isInsideExpanded(point, obstacle))) continue;
      indexByKey.set(pointKey(point), points.length);
      points.push(point);
    }
  }

  const graph: GraphEdge[][] = points.map(() => []);
  const addEdge = (from: number, to: number) => {
    const a = points[from];
    const b = points[to];
    if (!segmentClear(a, b, obstacles, bounds)) return;
    const length = distance(a, b);
    if (length === 0) return;
    graph[from].push({ to, direction: directionFrom(a, b), length });
    graph[to].push({ to: from, direction: directionFrom(b, a), length });
  };

  for (const y of sortedYs) {
    const row = points
      .map((point, index) => ({ point, index }))
      .filter(({ point }) => point.y === y)
      .sort((a, b) => a.point.x - b.point.x);
    for (let index = 0; index < row.length - 1; index++) addEdge(row[index].index, row[index + 1].index);
  }
  for (const x of sortedXs) {
    const column = points
      .map((point, index) => ({ point, index }))
      .filter(({ point }) => point.x === x)
      .sort((a, b) => a.point.y - b.point.y);
    for (let index = 0; index < column.length - 1; index++) addEdge(column[index].index, column[index + 1].index);
  }

  for (const edges of graph) edges.sort((a, b) => DIRECTION_ORDER.indexOf(a.direction) - DIRECTION_ORDER.indexOf(b.direction) || a.length - b.length || a.to - b.to);
  return { points, graph, indexByKey };
}

function compareState(a: SearchState, b: SearchState): number {
  return (
    a.bends - b.bends ||
    a.length - b.length ||
    DIRECTION_ORDER.indexOf(a.direction) - DIRECTION_ORDER.indexOf(b.direction) ||
    a.vertex - b.vertex
  );
}

function pathSignature(points: Point[]): string {
  return points.map((point) => `${point.y}:${point.x}`).join("|");
}

function findForPorts(
  source: PrototypeNode,
  target: PrototypeNode,
  obstacles: Box[],
  sourceDirection: Direction,
  targetDirection: Direction,
  options: Required<Pick<PrototypeOptions, "maxBends">> & Pick<PrototypeOptions, "bounds">,
): PrototypeRoute | null {
  const start = getPort(source, sourceDirection);
  const startOut = move(start, sourceDirection, PROTOTYPE_CLEARANCE);
  const end = getPort(target, targetDirection);
  const endIn = move(end, targetDirection, PROTOTYPE_CLEARANCE);
  const finalDirection = opposite(targetDirection);

  if (!segmentClear(start, startOut, obstacles, options.bounds) || !segmentClear(endIn, end, obstacles, options.bounds)) return null;

  const { points, graph, indexByKey } = createVisibilityGraph([startOut, endIn], obstacles, options.bounds);
  const startIndex = indexByKey.get(pointKey(startOut));
  const endIndex = indexByKey.get(pointKey(endIn));
  if (startIndex === undefined || endIndex === undefined) return null;

  const queue: SearchState[] = [{ vertex: startIndex, direction: sourceDirection, bends: 0, length: distance(start, startOut), points: [startIndex] }];
  const best = new Map<string, number>();
  let winner: PrototypeRoute | null = null;

  while (queue.length > 0) {
    queue.sort(compareState);
    const current = queue.shift()!;
    const stateKey = `${current.vertex}:${current.direction}:${current.bends}`;
    if ((best.get(stateKey) ?? Number.POSITIVE_INFINITY) < current.length) continue;

    if (current.vertex === endIndex) {
      const finalBends = current.bends + (current.direction === finalDirection ? 0 : 1);
      const finalLength = current.length + distance(endIn, end);
      if (finalBends <= options.maxBends && distance(endIn, end) >= PROTOTYPE_MIN_FINAL_SEGMENT) {
        const routePoints = simplify([start, ...current.points.map((index) => points[index]), end]);
        const route: PrototypeRoute = {
          found: true,
          points: routePoints,
          bends: bendCount(routePoints),
          length: routeLength(routePoints),
          sourceDirection,
          targetDirection,
        };
        if (
          route.bends <= options.maxBends &&
          (!winner || route.bends < winner.bends || (route.bends === winner.bends && (route.length < winner.length || (route.length === winner.length && pathSignature(route.points) < pathSignature(winner.points)))))
        ) {
          winner = route;
        }
      }
      continue;
    }

    for (const edge of graph[current.vertex]) {
      const extraBend = edge.direction === current.direction ? 0 : 1;
      const bends = current.bends + extraBend;
      if (bends > options.maxBends || edge.direction === opposite(current.direction)) continue;
      const length = current.length + edge.length;
      const nextKey = `${edge.to}:${edge.direction}:${bends}`;
      if ((best.get(nextKey) ?? Number.POSITIVE_INFINITY) <= length) continue;
      best.set(nextKey, length);
      queue.push({ vertex: edge.to, direction: edge.direction, bends, length, points: [...current.points, edge.to] });
    }
  }

  return winner;
}

/**
 * Finds the best legal zero-to-five-bend route. The function is deliberately
 * pure and has no awareness of the application reducer, localStorage, or SVG.
 */
export function findProgressivePrototypeRoute(
  source: PrototypeNode,
  target: PrototypeNode,
  obstacles: Box[],
  options: PrototypeOptions = {},
): PrototypeRoute {
  const maxBends = options.maxBends ?? 5;
  const sourceDirections = options.sourceDirections ?? DIRECTION_ORDER;
  const targetDirections = options.targetDirections ?? DIRECTION_ORDER;
  const simpleCandidates: PrototypeRoute[] = [];

  for (const sourceDirection of sourceDirections) {
    for (const targetDirection of targetDirections) {
      const candidate = findSimpleForPorts(source, target, obstacles, sourceDirection, targetDirection, options.bounds);
      if (candidate) simpleCandidates.push(candidate);
    }
  }

  for (let bendLimit = 0; bendLimit <= Math.min(maxBends, 1); bendLimit++) {
    const candidates = simpleCandidates.filter((candidate) => candidate.bends === bendLimit).sort(compareRoutes);
    if (candidates[0]) return candidates[0];
  }

  for (let bendLimit = 2; bendLimit <= maxBends; bendLimit++) {
    const candidates: PrototypeRoute[] = [];
    for (const sourceDirection of sourceDirections) {
      for (const targetDirection of targetDirections) {
        const candidate = findForPorts(source, target, obstacles, sourceDirection, targetDirection, { maxBends: bendLimit, bounds: options.bounds });
        if (candidate?.bends === bendLimit) candidates.push(candidate);
      }
    }
    candidates.sort(compareRoutes);
    if (candidates[0]) return candidates[0];
  }

  return {
    found: false,
    points: [],
    bends: 0,
    length: 0,
    sourceDirection: null,
    targetDirection: null,
    reason: "no-legal-route",
  };
}

export function isOrthogonalPrototypeRoute(route: PrototypeRoute): boolean {
  return route.points.every((point, index) => index === 0 || point.x === route.points[index - 1].x || point.y === route.points[index - 1].y);
}
