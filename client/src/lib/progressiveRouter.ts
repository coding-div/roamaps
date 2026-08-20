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

export interface PrototypePort {
  direction: Direction;
  point: Point;
}

export interface PrototypeSegment {
  a: Point;
  b: Point;
}

/**
 * Exact uniform-grid lookup for reserved arrow segments. The router still
 * performs the same parallel-lane test; the index only removes segments that
 * cannot possibly be close enough to conflict with a candidate segment.
 */
export class PrototypeLaneIndex {
  private readonly buckets = new Map<string, Array<{ index: number; segment: PrototypeSegment }>>();
  private readonly segments: PrototypeSegment[] = [];

  constructor(initialSegments: PrototypeSegment[] = [], private readonly cellSize = 160) {
    initialSegments.forEach((segment) => this.add(segment));
  }

  get size(): number {
    return this.segments.length;
  }

  add(segment: PrototypeSegment): void {
    const index = this.segments.push(segment) - 1;
    const minColumn = Math.floor(Math.min(segment.a.x, segment.b.x) / this.cellSize);
    const maxColumn = Math.floor(Math.max(segment.a.x, segment.b.x) / this.cellSize);
    const minRow = Math.floor(Math.min(segment.a.y, segment.b.y) / this.cellSize);
    const maxRow = Math.floor(Math.max(segment.a.y, segment.b.y) / this.cellSize);
    for (let column = minColumn; column <= maxColumn; column += 1) {
      for (let row = minRow; row <= maxRow; row += 1) {
        const key = `${column}:${row}`;
        const bucket = this.buckets.get(key) ?? [];
        bucket.push({ index, segment });
        this.buckets.set(key, bucket);
      }
    }
  }

  query(a: Point, b: Point, padding: number): PrototypeSegment[] {
    const minColumn = Math.floor((Math.min(a.x, b.x) - padding) / this.cellSize);
    const maxColumn = Math.floor((Math.max(a.x, b.x) + padding) / this.cellSize);
    const minRow = Math.floor((Math.min(a.y, b.y) - padding) / this.cellSize);
    const maxRow = Math.floor((Math.max(a.y, b.y) + padding) / this.cellSize);
    const seen = new Set<number>();
    const result: Array<{ index: number; segment: PrototypeSegment }> = [];
    for (let column = minColumn; column <= maxColumn; column += 1) {
      for (let row = minRow; row <= maxRow; row += 1) {
        for (const entry of this.buckets.get(`${column}:${row}`) ?? []) {
          if (!seen.has(entry.index)) {
            seen.add(entry.index);
            result.push(entry);
          }
        }
      }
    }
    return result.sort((left, right) => left.index - right.index).map((entry) => entry.segment);
  }
}

export interface PrototypeOptions {
  /** Search all node sides by default; fixtures may constrain sides deliberately. */
  sourceDirections?: Direction[];
  targetDirections?: Direction[];
  /** Optional preassigned side ports, used by the live canvas to distribute fan-out evenly. */
  sourcePorts?: PrototypePort[];
  targetPorts?: PrototypePort[];
  /** Optional reserved arrow lanes for a bounded clean-route repair search. */
  arrowObstacles?: PrototypeSegment[];
  /** Exact nearby-lane lookup for the same reserved arrow segments. */
  arrowObstacleIndex?: PrototypeLaneIndex;
  lanePadding?: number;
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

/**
 * The staged router may visit thousands of visibility-graph states in a dense
 * canvas. A binary heap preserves `compareState` ordering without re-sorting
 * the entire pending queue at every visit, keeping live drag work bounded.
 */
class SearchStateHeap {
  private items: SearchState[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: SearchState): void {
    this.items.push(item);
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (compareState(this.items[parent], item) <= 0) break;
      this.items[index] = this.items[parent];
      index = parent;
    }
    this.items[index] = item;
  }

  pop(): SearchState | undefined {
    const first = this.items[0];
    const last = this.items.pop();
    if (!first || !last || this.items.length === 0) return first;

    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= this.items.length) break;
      const child = right < this.items.length && compareState(this.items[right], this.items[left]) < 0 ? right : left;
      if (compareState(this.items[child], last) >= 0) break;
      this.items[index] = this.items[child];
      index = child;
    }
    this.items[index] = last;
    return first;
  }
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

function resolvePorts(node: PrototypeNode, directions: Direction[], supplied?: PrototypePort[]): PrototypePort[] {
  if (supplied?.length) return supplied.filter((port) => directions.includes(port.direction));
  return directions.map((direction) => ({ direction, point: getPort(node, direction) }));
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

function segmentTouchesBox(a: Point, b: Point, box: Box): boolean {
  const right = box.x + box.w;
  const bottom = box.y + box.h;
  if (a.x === b.x) {
    const low = Math.min(a.y, b.y);
    const high = Math.max(a.y, b.y);
    return a.x >= box.x && a.x <= right && high >= box.y && low <= bottom;
  }
  if (a.y === b.y) {
    const low = Math.min(a.x, b.x);
    const high = Math.max(a.x, b.x);
    return a.y >= box.y && a.y <= bottom && high >= box.x && low <= right;
  }
  return true;
}

function pointMatchesPort(point: Point, port: PrototypePort): boolean {
  return point.x === port.point.x && point.y === port.point.y;
}

/** Endpoint boxes are excluded from route obstacles, so audit them after route construction. */
function respectsEndpointBodies(
  points: Point[],
  source: PrototypeNode,
  target: PrototypeNode,
  sourcePort: PrototypePort,
  targetPort: PrototypePort,
): boolean {
  if (points.length < 2 || !pointMatchesPort(points[0], sourcePort) || !pointMatchesPort(points[points.length - 1], targetPort)) return false;
  if (directionFrom(points[0], points[1]) !== sourcePort.direction) return false;
  if (directionFrom(points[points.length - 2], points[points.length - 1]) !== opposite(targetPort.direction)) return false;

  const finalSegmentIndex = points.length - 2;
  return points.slice(1).every((point, index) => {
    const a = points[index];
    const segmentIndex = index;
    return (
      (segmentIndex === 0 || !segmentTouchesBox(a, point, source.box)) &&
      (segmentIndex === finalSegmentIndex || !segmentTouchesBox(a, point, target.box))
    );
  });
}

function parallelSegmentConflict(a: Point, b: Point, c: Point, d: Point, padding: number): boolean {
  const aVertical = a.x === b.x;
  const cVertical = c.x === d.x;
  if (aVertical !== cVertical) return false;
  if (aVertical) {
    if (Math.abs(a.x - c.x) > padding) return false;
    return Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) < Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y));
  }
  if (Math.abs(a.y - c.y) > padding) return false;
  return Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) < Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x));
}

function avoidsArrowLanes(points: Point[], obstacles: PrototypeSegment[] | undefined, padding: number, index?: PrototypeLaneIndex): boolean {
  if (!obstacles?.length && !index?.size) return true;
  return points.slice(1).every((point, segmentIndex) => {
    const nearby = index ? index.query(points[segmentIndex], point, padding) : obstacles ?? [];
    return !nearby.some((obstacle) => parallelSegmentConflict(points[segmentIndex], point, obstacle.a, obstacle.b, padding));
  });
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
  sourcePort: PrototypePort,
  targetPort: PrototypePort,
  options: PrototypeOptions,
): PrototypeRoute | null {
  const { direction: sourceDirection } = sourcePort;
  const { direction: targetDirection } = targetPort;
  const start = sourcePort.point;
  const startOut = move(start, sourceDirection, PROTOTYPE_CLEARANCE);
  const end = targetPort.point;
  const endIn = move(end, targetDirection, PROTOTYPE_CLEARANCE);
  const sourceLeavesHorizontally = sourceDirection === "left" || sourceDirection === "right";
  const corner = sourceLeavesHorizontally
    ? { x: endIn.x, y: startOut.y }
    : { x: startOut.x, y: endIn.y };
  const points = simplify([start, startOut, corner, endIn, end]);

  if (
    points.length < 2 ||
    !isRouteClear(points, obstacles, options.bounds) ||
    !respectsEndpointBodies(points, source, target, sourcePort, targetPort) ||
    !avoidsArrowLanes(points, options.arrowObstacles, options.lanePadding ?? 6, options.arrowObstacleIndex)
  ) return null;
  const bends = bendCount(points);
  // Endpoint-body validation above is the source of truth. A close but legal
  // port pair can simplify to a short final visual segment; the multi-bend
  // search already accepts that same route, so keep it on this exact fast path
  // rather than rebuilding a large visibility graph for a one-bend result.
  if (bends > 1) return null;

  return {
    found: true,
    points,
    bends,
    length: routeLength(points),
    sourceDirection,
    targetDirection,
  };
}

/**
 * For fixed ports with matching horizontal or vertical approach directions,
 * a two-bend route differs only by its middle lane. Trying padded obstacle
 * boundaries directly returns the same legal candidates as the visibility
 * graph without constructing that graph for routine dense-editor detours.
 */
function findTwoBendForPorts(
  source: PrototypeNode,
  target: PrototypeNode,
  obstacles: Box[],
  sourcePort: PrototypePort,
  targetPort: PrototypePort,
  options: PrototypeOptions,
): PrototypeRoute | null {
  const start = sourcePort.point;
  const startOut = move(start, sourcePort.direction, PROTOTYPE_CLEARANCE);
  const end = targetPort.point;
  const endIn = move(end, targetPort.direction, PROTOTYPE_CLEARANCE);
  const finalDirection = opposite(targetPort.direction);
  const sourceHorizontal = sourcePort.direction === "left" || sourcePort.direction === "right";
  const finalHorizontal = finalDirection === "left" || finalDirection === "right";
  if (sourceHorizontal !== finalHorizontal) return null;

  const lanes = (sourceHorizontal
    ? [startOut.x, endIn.x, ...obstacles.flatMap((box) => [box.x - PROTOTYPE_OBSTACLE_PADDING, box.x + box.w + PROTOTYPE_OBSTACLE_PADDING])]
    : [startOut.y, endIn.y, ...obstacles.flatMap((box) => [box.y - PROTOTYPE_OBSTACLE_PADDING, box.y + box.h + PROTOTYPE_OBSTACLE_PADDING])]
  ).filter((lane, index, values) => values.indexOf(lane) === index).sort((a, b) => a - b);
  const candidates: PrototypeRoute[] = [];

  // When the target port sits just beyond the source clearance, a legal
  // two-bend route can arrive at the endpoint directly. Requiring a second
  // clearance point behind that target would make the path backtrack and fall
  // through to the expensive visibility graph, even though the rendered route
  // itself is already an exact, endpoint-safe candidate.
  const directEndpointPoints = sourceHorizontal
    ? simplify([start, startOut, { x: startOut.x, y: end.y }, end])
    : simplify([start, startOut, { x: end.x, y: startOut.y }, end]);
  if (
    bendCount(directEndpointPoints) === 2 &&
    isRouteClear(directEndpointPoints, obstacles, options.bounds) &&
    respectsEndpointBodies(directEndpointPoints, source, target, sourcePort, targetPort) &&
    avoidsArrowLanes(directEndpointPoints, options.arrowObstacles, options.lanePadding ?? 6, options.arrowObstacleIndex)
  ) {
    candidates.push({
      found: true,
      points: directEndpointPoints,
      bends: 2,
      length: routeLength(directEndpointPoints),
      sourceDirection: sourcePort.direction,
      targetDirection: targetPort.direction,
    });
  }

  for (const lane of lanes) {
    const leavesCorrectly = sourceHorizontal
      ? (sourcePort.direction === "right" ? lane >= startOut.x : lane <= startOut.x)
      : (sourcePort.direction === "down" ? lane >= startOut.y : lane <= startOut.y);
    const arrivesCorrectly = sourceHorizontal
      ? (finalDirection === "right" ? lane <= endIn.x : lane >= endIn.x)
      : (finalDirection === "down" ? lane <= endIn.y : lane >= endIn.y);
    if (!leavesCorrectly || !arrivesCorrectly) continue;

    const points = sourceHorizontal
      ? simplify([start, startOut, { x: lane, y: startOut.y }, { x: lane, y: endIn.y }, endIn, end])
      : simplify([start, startOut, { x: startOut.x, y: lane }, { x: endIn.x, y: lane }, endIn, end]);
    if (
      bendCount(points) !== 2 ||
      !isRouteClear(points, obstacles, options.bounds) ||
      !respectsEndpointBodies(points, source, target, sourcePort, targetPort) ||
      !avoidsArrowLanes(points, options.arrowObstacles, options.lanePadding ?? 6, options.arrowObstacleIndex)
    ) continue;
    candidates.push({
      found: true,
      points,
      bends: 2,
      length: routeLength(points),
      sourceDirection: sourcePort.direction,
      targetDirection: targetPort.direction,
    });
  }

  candidates.sort(compareRoutes);
  return candidates[0] ?? null;
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
  sourcePort: PrototypePort,
  targetPort: PrototypePort,
  options: Required<Pick<PrototypeOptions, "maxBends">> & Pick<PrototypeOptions, "bounds">,
  routeOptions: PrototypeOptions,
): PrototypeRoute | null {
  const { direction: sourceDirection } = sourcePort;
  const { direction: targetDirection } = targetPort;
  const start = sourcePort.point;
  const startOut = move(start, sourceDirection, PROTOTYPE_CLEARANCE);
  const end = targetPort.point;
  const endIn = move(end, targetDirection, PROTOTYPE_CLEARANCE);
  const finalDirection = opposite(targetDirection);

  if (!segmentClear(start, startOut, obstacles, options.bounds) || !segmentClear(endIn, end, obstacles, options.bounds)) return null;

  const { points, graph, indexByKey } = createVisibilityGraph([startOut, endIn], obstacles, options.bounds);
  const startIndex = indexByKey.get(pointKey(startOut));
  const endIndex = indexByKey.get(pointKey(endIn));
  if (startIndex === undefined || endIndex === undefined) return null;

  const queue = new SearchStateHeap();
  queue.push({ vertex: startIndex, direction: sourceDirection, bends: 0, length: distance(start, startOut), points: [startIndex] });
  const best = new Map<string, number>();
  let winner: PrototypeRoute | null = null;

  while (queue.size > 0) {
    const current = queue.pop()!;
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
          respectsEndpointBodies(route.points, source, target, sourcePort, targetPort) &&
          avoidsArrowLanes(route.points, routeOptions.arrowObstacles, routeOptions.lanePadding ?? 6, routeOptions.arrowObstacleIndex) &&
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
  const sourcePorts = resolvePorts(source, sourceDirections, options.sourcePorts);
  const targetPorts = resolvePorts(target, targetDirections, options.targetPorts);
  const simpleCandidates: PrototypeRoute[] = [];

  for (const sourcePort of sourcePorts) {
    for (const targetPort of targetPorts) {
      const candidate = findSimpleForPorts(source, target, obstacles, sourcePort, targetPort, options);
      if (candidate) simpleCandidates.push(candidate);
    }
  }

  for (let bendLimit = 0; bendLimit <= Math.min(maxBends, 1); bendLimit++) {
    const candidates = simpleCandidates.filter((candidate) => candidate.bends === bendLimit).sort(compareRoutes);
    if (candidates[0]) return candidates[0];
  }

  if (maxBends >= 2) {
    const twoBendCandidates: PrototypeRoute[] = [];
    for (const sourcePort of sourcePorts) {
      for (const targetPort of targetPorts) {
        const candidate = findTwoBendForPorts(source, target, obstacles, sourcePort, targetPort, options);
        if (candidate) twoBendCandidates.push(candidate);
      }
    }
    twoBendCandidates.sort(compareRoutes);
    if (twoBendCandidates[0]) return twoBendCandidates[0];
  }

  // Callers that request a bounded two-bend repair have already exhausted the
  // complete zero-, one-, and two-bend candidate families above. Do not build
  // a visibility graph that can only produce a route outside that repair
  // contract.
  if (maxBends <= 2) {
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

  // `findForPorts` already ranks every reachable candidate by bend count, then
  // length. Running it once at the maximum allowed bend count preserves the
  // staged 2–5-bend result while avoiding four identical visibility-graph
  // constructions for every explicit port pair during a drag preview.
  const multiBendCandidates: PrototypeRoute[] = [];
  for (const sourcePort of sourcePorts) {
    for (const targetPort of targetPorts) {
      const candidate = findForPorts(source, target, obstacles, sourcePort, targetPort, { maxBends, bounds: options.bounds }, options);
      if (candidate && candidate.bends >= 2) multiBendCandidates.push(candidate);
    }
  }
  multiBendCandidates.sort(compareRoutes);
  if (multiBendCandidates[0]) return multiBendCandidates[0];

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
