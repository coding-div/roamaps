import { getAllEdges as getEdgesFromTree, getAllNodes as getNodesFromTree, type Direction, type NodeData, type TreeMap } from "@/lib/treeData";
import { getNodeBox, type Box, type Point } from "@/lib/collision";

/**
 * Pure Roamaps routing foundation.
 *
 * This module owns route geometry only. It has no React state, persistence, or
 * rendering dependencies so the searcher and verifier can be tested separately.
 * Crowded attachment ports and junction rails are deliberately out of scope.
 */

export const ROUTE_CLEARANCE = 18;
export const OBSTACLE_PADDING = 10;
export const MIN_ARROW_SEGMENT = 15;
export const LANE_GAP = 12;

export interface Segment {
  a: Point;
  b: Point;
}

export interface Route {
  points: Point[];
  path: string;
  targetDirection: Direction;
  midpoint: Point;
  clean: boolean;
}

export interface DerivedRoute {
  source: NodeData;
  target: NodeData;
  sourceNode: NodeData;
  targetNode: NodeData;
  route: Route;
}

export interface RouteLegality {
  clean: boolean;
  reasons: Array<"nonOrthogonal" | "nodeCollision" | "parallelOverlap" | "selfOverlap" | "shortArrowheadSegment" | "endpointAttachment">;
}

export interface RouteEndpointContext {
  source: NodeData;
  target: NodeData;
  sourceBox: Box;
  targetBox: Box;
}

function routeKey(sourceId: string, targetId: string): string {
  return `${sourceId}->${targetId}`;
}

export function getPort(node: NodeData, box: Box, direction: Direction): Point {
  if (direction === "up") return { x: node.x, y: node.y - box.h / 2 };
  if (direction === "down") return { x: node.x, y: node.y + box.h / 2 };
  if (direction === "left") return { x: node.x - box.w / 2, y: node.y };
  return { x: node.x + box.w / 2, y: node.y };
}

function movePoint(point: Point, direction: Direction, distance: number): Point {
  if (direction === "up") return { x: point.x, y: point.y - distance };
  if (direction === "down") return { x: point.x, y: point.y + distance };
  if (direction === "left") return { x: point.x - distance, y: point.y };
  return { x: point.x + distance, y: point.y };
}

function isHorizontal(segment: Segment): boolean {
  return segment.a.y === segment.b.y;
}

function overlapLength(a1: number, a2: number, b1: number, b2: number): number {
  return Math.min(Math.max(a1, a2), Math.max(b1, b2)) - Math.max(Math.min(a1, a2), Math.min(b1, b2));
}

export function parallelSegmentConflict(a: Segment, b: Segment, minimumSeparation = LANE_GAP): boolean {
  if (isHorizontal(a) !== isHorizontal(b)) return false;
  // Exactly the approved 12-unit centre-line separation is legal. Only a
  // smaller distance is a parallel-lane conflict.
  if (isHorizontal(a)) return Math.abs(a.a.y - b.a.y) < minimumSeparation && overlapLength(a.a.x, a.b.x, b.a.x, b.b.x) > 0;
  return Math.abs(a.a.x - b.a.x) < minimumSeparation && overlapLength(a.a.y, a.b.y, b.a.y, b.b.y) > 0;
}

export function toSegments(points: Point[]): Segment[] {
  return points.slice(1).map((point, index) => ({ a: points[index], b: point }));
}

function simplifyPoints(points: Point[]): Point[] {
  const result: Point[] = [];
  for (const point of points) {
    const previous = result[result.length - 1];
    if (previous && previous.x === point.x && previous.y === point.y) continue;
    const before = result[result.length - 2];
    if (before && previous && ((before.x === previous.x && previous.x === point.x) || (before.y === previous.y && previous.y === point.y))) {
      result[result.length - 1] = point;
    } else result.push(point);
  }
  return result;
}

export function routeLength(points: Point[]): number {
  return points.slice(1).reduce((total, point, index) => total + Math.abs(point.x - points[index].x) + Math.abs(point.y - points[index].y), 0);
}

function routeFromPoints(points: Point[], targetDirection: Direction, clean = true): Route {
  const simplified = simplifyPoints(points);
  const path = simplified.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  let midpoint = simplified[0];
  let longest = -1;
  for (let index = 0; index < simplified.length - 1; index += 1) {
    const length = Math.abs(simplified[index + 1].x - simplified[index].x) + Math.abs(simplified[index + 1].y - simplified[index].y);
    if (length > longest) {
      longest = length;
      midpoint = { x: (simplified[index].x + simplified[index + 1].x) / 2, y: (simplified[index].y + simplified[index + 1].y) / 2 };
    }
  }
  return { points: simplified, path, targetDirection, midpoint, clean };
}

function segmentClearOfBoxes(a: Point, b: Point, obstacles: Box[]): boolean {
  if (a.x !== b.x && a.y !== b.y) return false;
  for (const obstacle of obstacles) {
    if (a.x === b.x) {
      const yMin = Math.min(a.y, b.y);
      const yMax = Math.max(a.y, b.y);
      if (a.x > obstacle.x - OBSTACLE_PADDING && a.x < obstacle.x + obstacle.w + OBSTACLE_PADDING && yMax > obstacle.y - OBSTACLE_PADDING && yMin < obstacle.y + obstacle.h + OBSTACLE_PADDING) return false;
    } else {
      const xMin = Math.min(a.x, b.x);
      const xMax = Math.max(a.x, b.x);
      if (a.y > obstacle.y - OBSTACLE_PADDING && a.y < obstacle.y + obstacle.h + OBSTACLE_PADDING && xMax > obstacle.x - OBSTACLE_PADDING && xMin < obstacle.x + obstacle.w + OBSTACLE_PADDING) return false;
    }
  }
  return true;
}

function routeHasSelfConflict(points: Point[]): boolean {
  const segments = toSegments(points);
  for (let first = 0; first < segments.length; first += 1) {
    for (let second = first + 2; second < segments.length; second += 1) {
      if (parallelSegmentConflict(segments[first], segments[second])) return true;
    }
  }
  return false;
}

/**
 * Independent legality checker. The finder calls this only after producing a
 * candidate; tests can call it directly without using the finder.
 */
function hasValidEndpointAttachment(points: Point[], context: RouteEndpointContext): boolean {
  if (points.length < 2) return false;
  const start = points[0];
  const end = points[points.length - 1];
  const startDirection = DIRECTIONS.find((direction) => {
    const port = getPort(context.source, context.sourceBox, direction);
    return port.x === start.x && port.y === start.y;
  });
  const targetDirection = DIRECTIONS.find((direction) => {
    const port = getPort(context.target, context.targetBox, direction);
    return port.x === end.x && port.y === end.y;
  });
  if (!startDirection || !targetDirection) return false;
  const departure = directionBetween(start, points[1]);
  const arrival = directionBetween(points[points.length - 2], end);
  const expectedArrival: Direction = targetDirection === "up" ? "down" : targetDirection === "down" ? "up" : targetDirection === "left" ? "right" : "left";
  return departure === startDirection && arrival === expectedArrival;
}

export function verifyRoute(points: Point[], obstacles: Box[], arrowObstacles: Segment[] = [], endpointContext?: RouteEndpointContext): RouteLegality {
  const reasons: RouteLegality["reasons"] = [];
  const segments = toSegments(points);
  if (segments.some((segment) => segment.a.x !== segment.b.x && segment.a.y !== segment.b.y)) reasons.push("nonOrthogonal");
  if (segments.some((segment) => !segmentClearOfBoxes(segment.a, segment.b, obstacles))) reasons.push("nodeCollision");
  if (segments.some((segment) => arrowObstacles.some((obstacle) => parallelSegmentConflict(segment, obstacle)))) reasons.push("parallelOverlap");
  if (routeHasSelfConflict(points)) reasons.push("selfOverlap");
  const finalSegment = segments[segments.length - 1];
  if (!finalSegment || routeLength([finalSegment.a, finalSegment.b]) < MIN_ARROW_SEGMENT) reasons.push("shortArrowheadSegment");
  if (endpointContext && !hasValidEndpointAttachment(points, endpointContext)) reasons.push("endpointAttachment");
  return { clean: reasons.length === 0, reasons };
}

type RouteCandidate = {
  points: Point[];
  targetDirection: Direction;
  length: number;
  obstacleCount: number;
  bends: number;
  stableKey: string;
};

const DIRECTIONS: Direction[] = ["up", "right", "down", "left"];

function pointKey(point: Point): string {
  return `${point.x},${point.y}`;
}

function directionBetween(a: Point, b: Point): Direction {
  if (a.x === b.x) return b.y > a.y ? "down" : "up";
  return b.x > a.x ? "right" : "left";
}

function graphSegmentLegal(a: Point, b: Point, obstacles: Box[], arrowObstacles: Segment[]): boolean {
  return segmentClearOfBoxes(a, b, obstacles) && !arrowObstacles.some((obstacle) => parallelSegmentConflict({ a, b }, obstacle));
}

function pointInsideObstacle(point: Point, obstacles: Box[]): boolean {
  return obstacles.some((obstacle) => point.x > obstacle.x - OBSTACLE_PADDING && point.x < obstacle.x + obstacle.w + OBSTACLE_PADDING && point.y > obstacle.y - OBSTACLE_PADDING && point.y < obstacle.y + obstacle.h + OBSTACLE_PADDING);
}

function uniqueSorted(values: number[]): number[] {
  return Array.from(new Set(values.map((value) => Math.round(value * 4) / 4))).sort((a, b) => a - b);
}

function collectCriticalCoordinates(terminals: Point[], obstacles: Box[], arrowObstacles: Segment[]): { xs: number[]; ys: number[] } {
  const clearance = OBSTACLE_PADDING + 1;
  const xs = terminals.map((point) => point.x);
  const ys = terminals.map((point) => point.y);
  for (const obstacle of obstacles) {
    xs.push(obstacle.x - clearance, obstacle.x + obstacle.w + clearance);
    ys.push(obstacle.y - clearance, obstacle.y + obstacle.h + clearance);
  }
  for (const segment of arrowObstacles) {
    if (isHorizontal(segment)) {
      xs.push(segment.a.x, segment.b.x);
      ys.push(segment.a.y - LANE_GAP, segment.a.y + LANE_GAP);
    } else {
      xs.push(segment.a.x - LANE_GAP, segment.a.x + LANE_GAP);
      ys.push(segment.a.y, segment.b.y);
    }
  }
  return { xs: uniqueSorted(xs), ys: uniqueSorted(ys) };
}

interface GraphEdge {
  to: string;
  length: number;
  direction: Direction;
}

interface SparseGraph {
  points: Map<string, Point>;
  edges: Map<string, GraphEdge[]>;
}

function buildSparseGraph(terminals: Point[], obstacles: Box[], arrowObstacles: Segment[]): SparseGraph {
  const { xs, ys } = collectCriticalCoordinates(terminals, obstacles, arrowObstacles);
  const points = new Map<string, Point>();
  const rows = new Map<number, Point[]>();
  const columns = new Map<number, Point[]>();
  for (const x of xs) {
    for (const y of ys) {
      const point = { x, y };
      if (pointInsideObstacle(point, obstacles)) continue;
      const key = pointKey(point);
      points.set(key, point);
      const row = rows.get(y) ?? [];
      row.push(point);
      rows.set(y, row);
      const column = columns.get(x) ?? [];
      column.push(point);
      columns.set(x, column);
    }
  }
  // Port-stub terminals must always exist even when they sit on an obstacle boundary.
  for (const point of terminals) {
    const key = pointKey(point);
    if (points.has(key)) continue;
    points.set(key, point);
    const row = rows.get(point.y) ?? [];
    row.push(point);
    rows.set(point.y, row);
    const column = columns.get(point.x) ?? [];
    column.push(point);
    columns.set(point.x, column);
  }
  const edges = new Map<string, GraphEdge[]>();
  const connect = (a: Point, b: Point) => {
    if (!graphSegmentLegal(a, b, obstacles, arrowObstacles)) return;
    const aKey = pointKey(a);
    const bKey = pointKey(b);
    const length = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    if (length === 0) return;
    const forward: GraphEdge = { to: bKey, length, direction: directionBetween(a, b) };
    const backward: GraphEdge = { to: aKey, length, direction: directionBetween(b, a) };
    edges.set(aKey, [...(edges.get(aKey) ?? []), forward]);
    edges.set(bKey, [...(edges.get(bKey) ?? []), backward]);
  };
  for (const row of Array.from(rows.values())) {
    row.sort((a: Point, b: Point) => a.x - b.x);
    for (let index = 1; index < row.length; index += 1) connect(row[index - 1], row[index]);
  }
  for (const column of Array.from(columns.values())) {
    column.sort((a: Point, b: Point) => a.y - b.y);
    for (let index = 1; index < column.length; index += 1) connect(column[index - 1], column[index]);
  }
  return { points, edges };
}

interface SearchState {
  node: string;
  direction: Direction | null;
  length: number;
  bends: number;
  previousStateKey: string | null;
  priority: number;
  stableKey: string;
}

function comparePathCost(a: SearchState, b: SearchState): number {
  return a.length - b.length || a.bends - b.bends || a.stableKey.localeCompare(b.stableKey);
}

function compareSearchState(a: SearchState, b: SearchState): number {
  return a.priority - b.priority || comparePathCost(a, b);
}

class SearchMinHeap {
  private readonly values: SearchState[] = [];

  push(value: SearchState): void {
    this.values.push(value);
    let index = this.values.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (compareSearchState(this.values[parent], value) <= 0) break;
      this.values[index] = this.values[parent];
      index = parent;
    }
    this.values[index] = value;
  }

  pop(): SearchState | undefined {
    const first = this.values[0];
    const last = this.values.pop();
    if (!first || !last || this.values.length === 0) return first;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= this.values.length) break;
      const child = right < this.values.length && compareSearchState(this.values[right], this.values[left]) < 0 ? right : left;
      if (compareSearchState(last, this.values[child]) <= 0) break;
      this.values[index] = this.values[child];
      index = child;
    }
    this.values[index] = last;
    return first;
  }

  get length(): number {
    return this.values.length;
  }
}

/**
 * Finds the exact shortest legal orthogonal path through a sparse graph formed
 * by source/target stubs and obstacle/route-lane boundaries. The graph is
 * deterministic and only contains geometrically meaningful coordinates.
 */
function findSparseExactPaths(graph: SparseGraph, start: Point, ends: Point[]): Map<string, Point[]> {
  const { points, edges } = graph;
  const startKey = pointKey(start);
  const endKeys = new Set(ends.map(pointKey));
  if (!points.has(startKey)) return new Map();
  const estimate = (point: Point) => Math.min(...ends.map((end) => Math.abs(end.x - point.x) + Math.abs(end.y - point.y)));
  const queue = new SearchMinHeap();
  queue.push({ node: startKey, direction: null, length: 0, bends: 0, previousStateKey: null, priority: estimate(start), stableKey: `${start.y},${start.x}` });
  const best = new Map<string, SearchState>();
  const found = new Map<string, SearchState>();
  let bestTargetLength: number | null = null;
  while (queue.length > 0) {
    const current = queue.pop()!;
    if (bestTargetLength !== null && current.priority > bestTargetLength) break;
    const stateKey = `${current.node}|${current.direction ?? "start"}`;
    const known = best.get(stateKey);
    if (known && comparePathCost(known, current) <= 0) continue;
    best.set(stateKey, current);
    if (endKeys.has(current.node)) {
      if (bestTargetLength === null) bestTargetLength = current.length;
      if (current.length === bestTargetLength && !found.has(current.node)) found.set(current.node, current);
      continue;
    }
    for (const edge of edges.get(current.node) ?? []) {
      const targetPoint = points.get(edge.to)!;
      const length = current.length + edge.length;
      if (bestTargetLength !== null && length > bestTargetLength) continue;
      queue.push({
        node: edge.to,
        direction: edge.direction,
        length,
        bends: current.bends + (current.direction && current.direction !== edge.direction ? 1 : 0),
        previousStateKey: stateKey,
        priority: length + estimate(targetPoint),
        stableKey: `${current.stableKey};${targetPoint.y},${targetPoint.x}`,
      });
    }
  }
  const paths = new Map<string, Point[]>();
  for (const [endKey, finalState] of Array.from(found.entries())) {
    const path: Point[] = [];
    let state: SearchState | undefined = finalState;
    while (state) {
      path.push(points.get(state.node)!);
      state = state.previousStateKey ? best.get(state.previousStateKey) : undefined;
    }
    paths.set(endKey, path.reverse());
  }
  return paths;
}

function countDistinctRouteObstacles(points: Point[], obstacles: Box[]): number {
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  return obstacles.filter((obstacle) => obstacle.x < maxX && obstacle.x + obstacle.w > minX && obstacle.y < maxY && obstacle.y + obstacle.h > minY).length;
}

/**
 * Contract router: shortest length first, then fewer distinct obstacles, then
 * fewer bends, followed by a stable geometric key. When no complete legal path
 * exists it deliberately returns a non-clean route, allowing the caller to
 * reject the proposed structural action instead of mutating the roadmap.
 */
export function getOrthogonalRoute(source: NodeData, target: NodeData, sourceBox: Box, targetBox: Box, obstacles: Box[], arrowObstacles: Segment[] = []): Route {
  const endpointContext: RouteEndpointContext = { source, target, sourceBox, targetBox };
  const findBestCandidate = (activeObstacles: Box[], activeArrowObstacles: Segment[]): RouteCandidate | null => {
    const candidates: RouteCandidate[] = [];
    const sourceLegs: Array<{ direction: Direction; start: Point; startOut: Point }> = [];
    const targetLegs: Array<{ direction: Direction; end: Point; endIn: Point }> = [];
    for (const sourceDirection of DIRECTIONS) {
      const start = getPort(source, sourceBox, sourceDirection);
      const startOut = movePoint(start, sourceDirection, ROUTE_CLEARANCE);
      if (graphSegmentLegal(start, startOut, activeObstacles, activeArrowObstacles)) sourceLegs.push({ direction: sourceDirection, start, startOut });
    }
    for (const targetDirection of DIRECTIONS) {
      const end = getPort(target, targetBox, targetDirection);
      const endIn = movePoint(end, targetDirection, ROUTE_CLEARANCE);
      if (graphSegmentLegal(endIn, end, activeObstacles, activeArrowObstacles)) targetLegs.push({ direction: targetDirection, end, endIn });
    }
    const graph = buildSparseGraph([...sourceLegs.map((leg) => leg.startOut), ...targetLegs.map((leg) => leg.endIn)], activeObstacles, activeArrowObstacles);
    for (const sourceLeg of sourceLegs) {
      const paths = findSparseExactPaths(graph, sourceLeg.startOut, targetLegs.map((leg) => leg.endIn));
      for (const targetLeg of targetLegs) {
        const middle = paths.get(pointKey(targetLeg.endIn));
        if (!middle) continue;
        const points = simplifyPoints([sourceLeg.start, ...middle, targetLeg.end]);
        const verification = verifyRoute(points, activeObstacles, activeArrowObstacles, endpointContext);
        if (!verification.clean) continue;
        candidates.push({
          points,
          targetDirection: targetLeg.direction,
          length: routeLength(points),
          obstacleCount: countDistinctRouteObstacles(points, obstacles),
          bends: Math.max(points.length - 2, 0),
          stableKey: points.map((point) => `${point.y},${point.x}`).join(";"),
        });
      }
    }
    candidates.sort((a, b) => a.length - b.length || a.obstacleCount - b.obstacleCount || a.bends - b.bends || a.stableKey.localeCompare(b.stableKey));
    return candidates[0] ?? null;
  };

  const activeObstacles: Box[] = [];
  const activeArrowObstacles: Segment[] = [];
  for (let pass = 0; pass <= obstacles.length + arrowObstacles.length; pass += 1) {
    const exact = findBestCandidate(activeObstacles, activeArrowObstacles);
    if (!exact) break;
    const verification = verifyRoute(exact.points, obstacles, arrowObstacles, endpointContext);
    if (verification.clean) return routeFromPoints(exact.points, exact.targetDirection, true);

    const routeSegments = toSegments(exact.points);
    const newObstacleBoxes = obstacles.filter((box) => !activeObstacles.includes(box) && routeSegments.some((segment) => !segmentClearOfBoxes(segment.a, segment.b, [box])));
    const newArrowSegments = arrowObstacles.filter((lane) => !activeArrowObstacles.includes(lane) && routeSegments.some((segment) => parallelSegmentConflict(segment, lane)));
    if (newObstacleBoxes.length === 0 && newArrowSegments.length === 0) break;
    activeObstacles.push(...newObstacleBoxes);
    activeArrowObstacles.push(...newArrowSegments);
  }
  return routeFromPoints([getPort(source, sourceBox, "right"), getPort(target, targetBox, "left")], "left", false);
}

function getReverseLane(source: NodeData, target: NodeData, allEdges: Array<{ source: NodeData; target: NodeData }>): Point {
  const hasReverse = allEdges.some((edge) => edge.source.id === target.id && edge.target.id === source.id);
  if (!hasReverse) return { x: 0, y: 0 };
  const sign = `${source.id}->${target.id}` < `${target.id}->${source.id}` ? -1 : 1;
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  if (Math.abs(dx) >= Math.abs(dy)) return { x: 0, y: LANE_GAP * sign };
  return { x: LANE_GAP * sign, y: 0 };
}

function applyReverseLane(route: Route, source: NodeData, target: NodeData, sourceBox: Box, targetBox: Box, lane: Point): Route {
  if (lane.x === 0 && lane.y === 0) return route;
  const alignedHorizontal = source.y === target.y && route.points.length === 2;
  const alignedVertical = source.x === target.x && route.points.length === 2;
  if (alignedHorizontal) {
    const direction: Direction = lane.y < 0 ? "up" : "down";
    const start = getPort(source, sourceBox, direction);
    const end = getPort(target, targetBox, direction);
    const laneY = source.y + (direction === "up" ? -(Math.max(sourceBox.h, targetBox.h) / 2 + ROUTE_CLEARANCE + LANE_GAP) : Math.max(sourceBox.h, targetBox.h) / 2 + ROUTE_CLEARANCE + LANE_GAP);
    return routeFromPoints([start, { x: start.x, y: laneY }, { x: end.x, y: laneY }, end], direction, route.clean);
  }
  if (alignedVertical) {
    const direction: Direction = lane.x < 0 ? "left" : "right";
    const start = getPort(source, sourceBox, direction);
    const end = getPort(target, targetBox, direction);
    const laneX = source.x + (direction === "left" ? -(Math.max(sourceBox.w, targetBox.w) / 2 + ROUTE_CLEARANCE + LANE_GAP) : Math.max(sourceBox.w, targetBox.w) / 2 + ROUTE_CLEARANCE + LANE_GAP);
    return routeFromPoints([start, { x: laneX, y: start.y }, { x: laneX, y: end.y }, end], direction, route.clean);
  }
  return route;
}

export function buildDerivedRoutes(tree: TreeMap, override?: { nodeId: string; x: number; y: number }): DerivedRoute[] {
  const nodes = getNodesFromTree(tree);
  const edges = getEdgesFromTree(tree);
  const rootId = tree.root?.id ?? null;
  const positionOf = (node: NodeData): NodeData => override?.nodeId === node.id ? { ...node, x: override.x, y: override.y } : node;
  const displayNodes = nodes.map(positionOf);
  const boxes = new Map(displayNodes.map((node) => [node.id, getNodeBox(node, node.id === rootId)]));
  const orderedEdges = [...edges].sort((first, second) => `${first.source.id}->${first.target.id}`.localeCompare(`${second.source.id}->${second.target.id}`));
  const reservedRoutes: Array<{ key: string; segments: Segment[] }> = [];
  return orderedEdges.map(({ source, target }) => {
    const sourceNode = positionOf(source);
    const targetNode = positionOf(target);
    const sourceBox = boxes.get(source.id)!;
    const targetBox = boxes.get(target.id)!;
    const obstacleBoxes = displayNodes.filter((node) => node.id !== source.id && node.id !== target.id).map((node) => boxes.get(node.id)!);
    const reverseKey = `${target.id}->${source.id}`;
    const arrowObstacles = reservedRoutes.filter((entry) => entry.key !== reverseKey).flatMap((entry) => entry.segments);
    const baseRoute = getOrthogonalRoute(sourceNode, targetNode, sourceBox, targetBox, obstacleBoxes, arrowObstacles);
    const laneRoute = applyReverseLane(baseRoute, sourceNode, targetNode, sourceBox, targetBox, getReverseLane(source, target, orderedEdges));
    const verification = verifyRoute(laneRoute.points, obstacleBoxes, arrowObstacles, { source: sourceNode, target: targetNode, sourceBox, targetBox });
    const route = verification.clean === laneRoute.clean ? laneRoute : { ...laneRoute, clean: verification.clean };
    reservedRoutes.push({ key: routeKey(source.id, target.id), segments: toSegments(route.points) });
    return { source, target, sourceNode, targetNode, route };
  });
}
