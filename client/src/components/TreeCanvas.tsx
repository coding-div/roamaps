/**
 * TreeCanvas style reminder — Obsidian Cartography: graphite field, dotted
 * survey grid, cobalt controls, VIBGYOR route colors, and precise spatial ink.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  getAllEdges as getEdgesFromTree,
  getAllNodes as getNodesFromTree,
  type Direction,
  type NodeData,
  type TreeMap,
  VIBGYOR_COLORS,
} from "@/lib/treeData";
import {
  canPlaceNode,
  CHAR_WIDTH,
  getBoxDimensions,
  getNodeBox,
  getNodeEnvelope,
  NODE_RADIUS,
  type Box,
  type Point,
} from "@/lib/collision";
import { useRoadmaps } from "@/contexts/RoadmapContext";
import { findProgressivePrototypeRoute, PrototypeLaneIndex, type PrototypeNode, type PrototypePort, type PrototypeSegment } from "@/lib/progressiveRouter";
import { toast } from "sonner";
import { Grid3X3, Home, Link2, Minus, MousePointer2, Plus, Redo2, RotateCcw, Undo2 } from "lucide-react";
import ActionPanel from "./ActionPanel";
import NodePopup from "./NodePopup";

interface TreeCanvasProps {
  tree: TreeMap;
}

const GRID_SIZE = 30;
const FONT_SIZE = 12;
const LINE_HEIGHT = 18;
const ROOT_FONT_SIZE = 14;
const ROUTE_CLEARANCE = 18;
const ARROW_LENGTH = 9;
const ARROW_WIDTH = 5;
const ARROW_PRESS_MOVE_THRESHOLD = 10;
// Tablet gesture rule: this is deliberately measured in fixed screen pixels,
// so zoom cannot make a node feel slow to begin following the finger.
const NODE_DRAG_START_THRESHOLD = 4;
const LANE_GAP = 12;
const PORT_DIRECTIONS: Direction[] = ["up", "left", "down", "right"];
const SNAP_TO_GRID_STORAGE_KEY = "roamaps-snap-to-grid-v1";

interface ViewBox { x: number; y: number; w: number; h: number }
interface Segment { a: Point; b: Point }
interface Route { points: Point[]; path: string; targetDirection: Direction; midpoint: Point; clean: boolean }
interface DragState { nodeId: string; pointerId: number; startX: number; startY: number; moved: boolean; x: number; y: number; baselineRoutes: Map<string, Route> }
interface ArrowPressState { pointerId: number; startX: number; startY: number }
interface DragPreview { nodeId: string; x: number; y: number; valid: boolean; invalidReason: "node-overlap" | "route-lane" | null; routes: DerivedRoute[] }
interface PlacementPreview { x: number; y: number; valid: boolean }
type PanelTarget = { type: "node"; nodeId: string } | { type: "arrow"; sourceId: string; targetId: string };
interface TeleportMode { nodeId: string; baselineRoutes: Map<string, Route> }
interface CopyArrowMode { sourceId: string; targetId: string; copyMode: "head" | "tail"; groupId: string }
interface CopyRenderGeometry { visibleSegmentsByKey: Map<string, Segment[]>; selectableSegmentsByKey: Map<string, Segment[]>; sharedSegmentsByKey: Map<string, Segment[]> }

/**
 * Obsidian Cartography movement rule: node centres land on the visible dot
 * intersections (15 + 30n), keeping the map aligned in both coordinate axes.
 */
export function snapNodeCentreToGrid(point: Point): Point {
  const gridOrigin = GRID_SIZE / 2;
  const snapAxis = (value: number) => Math.round((value - gridOrigin) / GRID_SIZE) * GRID_SIZE + gridOrigin;
  return { x: snapAxis(point.x), y: snapAxis(point.y) };
}

/**
 * The map grid is an optional drafting aid. When it is off, node movement
 * retains the exact finger-derived world position before normal validation.
 */
export function resolveDraggedNodeCentre(point: Point, snapToGrid: boolean): Point {
  return snapToGrid ? snapNodeCentreToGrid(point) : point;
}

function routeKey(sourceId: string, targetId: string): string {
  return `${sourceId}->${targetId}`;
}

function introducesNewRouteProblems(baselineRoutes: Map<string, Route>, candidateRoutes: DerivedRoute[]): boolean {
  return candidateRoutes.some(({ source, target, route }) => {
    const previous = baselineRoutes.get(routeKey(source.id, target.id));
    return Boolean(previous?.clean && !route.clean);
  });
}

/** Teleport uses the same placement and clean-route rules as a completed drag. */
export function validateTeleportDestination(
  tree: TreeMap,
  nodeId: string,
  point: Point,
  baselineRoutes: Map<string, Route> = new Map(buildDerivedRoutes(tree).map(({ source, target, route }) => [routeKey(source.id, target.id), route])),
): { valid: boolean; reason: "node-overlap" | "route-lane" | "missing-node" | null } {
  const node = tree.nodeMap[nodeId];
  if (!node) return { valid: false, reason: "missing-node" };
  const candidate = { ...node, x: point.x, y: point.y };
  if (!canPlaceNode(candidate, Object.values(tree.nodeMap), tree.root?.id ?? null, nodeId)) return { valid: false, reason: "node-overlap" };
  const routesForCandidate = buildDerivedRoutes(tree, { nodeId, x: point.x, y: point.y });
  return introducesNewRouteProblems(baselineRoutes, routesForCandidate)
    ? { valid: false, reason: "route-lane" }
    : { valid: true, reason: null };
}

function DotGrid() {
  return (
    <defs>
      <pattern id="dotGrid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
        <circle cx={GRID_SIZE / 2} cy={GRID_SIZE / 2} r={1} fill="#2a2a35" />
      </pattern>
    </defs>
  );
}

function truncateHeading(label: string, boxWidth: number, isRoot: boolean): string {
  const normalized = label.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const maxChars = Math.max(3, Math.floor((boxWidth - 20) / (isRoot ? 8 : CHAR_WIDTH)));
  return normalized.length > maxChars ? `${normalized.slice(0, Math.max(1, maxChars - 1))}…` : normalized;
}

function getPort(node: NodeData, box: Box, direction: Direction): Point {
  if (direction === "up") return { x: node.x, y: node.y - box.h / 2 };
  if (direction === "down") return { x: node.x, y: node.y + box.h / 2 };
  if (direction === "left") return { x: node.x - box.w / 2, y: node.y };
  return { x: node.x + box.w / 2, y: node.y };
}

function directionTowards(from: NodeData, to: NodeData): Direction {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
  return dy >= 0 ? "down" : "up";
}

function oppositeDirection(direction: Direction): Direction {
  if (direction === "up") return "down";
  if (direction === "down") return "up";
  if (direction === "left") return "right";
  return "left";
}

function evenlySpacedPort(node: NodeData, box: Box, direction: Direction, index: number, total: number): PrototypePort {
  const ratio = (index + 1) / (total + 1);
  if (direction === "up") return { direction, point: { x: box.x + box.w * ratio, y: box.y } };
  if (direction === "down") return { direction, point: { x: box.x + box.w * ratio, y: box.y + box.h } };
  if (direction === "left") return { direction, point: { x: box.x, y: box.y + box.h * ratio } };
  return { direction, point: { x: box.x + box.w, y: box.y + box.h * ratio } };
}

function midpointPort(node: NodeData, box: Box, direction: Direction): PrototypePort {
  return { direction, point: getPort(node, box, direction) };
}

interface EdgePortPlan { sourcePorts: PrototypePort[]; targetPorts: PrototypePort[] }
interface PlannedEndpoint {
  key: string;
  role: "source" | "target";
  node: NodeData;
  peer: NodeData;
  direction: Direction;
}
interface FanoutPlacement { groupKey: string; direction: Direction; index: number; total: number }
interface CopyEndpointMember { source: NodeData; target: NodeData }
interface CopyEndpointGroup {
  groupId: string;
  role: "source" | "target";
  node: NodeData;
  members: CopyEndpointMember[];
}

function copyEndpointKey(groupId: string, role: "source" | "target", nodeId: string): string {
  return `${groupId}:${role}:${nodeId}`;
}

function relativeDirections(from: NodeData, to: NodeData): Direction[] {
  const directions: Direction[] = [];
  if (to.x < from.x) directions.push("left");
  if (to.x > from.x) directions.push("right");
  if (to.y < from.y) directions.push("up");
  if (to.y > from.y) directions.push("down");
  return directions;
}

function routeBends(route: Route): number {
  return Math.max(0, route.points.length - 2);
}

function routeLength(route: Route): number {
  return toSegments(route.points).reduce((total, segment) => total + Math.abs(segment.b.x - segment.a.x) + Math.abs(segment.b.y - segment.a.y), 0);
}

/**
 * Copy routes use their actual common initial/final segment as the final
 * tie-breaker. A smaller value means that two otherwise equal diagonal plans
 * separate earlier, as approved for the two-common-side case.
 */
function sharedEndpointTrunkLength(routes: Route[], role: "source" | "target"): number {
  if (routes.length < 2 || routes.some((route) => route.points.length < 2)) return 0;
  const reference = role === "source"
    ? { a: routes[0].points[0], b: routes[0].points[1] }
    : { a: routes[0].points[routes[0].points.length - 1], b: routes[0].points[routes[0].points.length - 2] };
  const referenceHorizontal = reference.a.y === reference.b.y;
  const referenceSign = referenceHorizontal ? Math.sign(reference.b.x - reference.a.x) : Math.sign(reference.b.y - reference.a.y);
  let sharedLength = Math.abs(reference.b.x - reference.a.x) + Math.abs(reference.b.y - reference.a.y);
  for (const route of routes.slice(1)) {
    const segment = role === "source"
      ? { a: route.points[0], b: route.points[1] }
      : { a: route.points[route.points.length - 1], b: route.points[route.points.length - 2] };
    const horizontal = segment.a.y === segment.b.y;
    const sign = horizontal ? Math.sign(segment.b.x - segment.a.x) : Math.sign(segment.b.y - segment.a.y);
    if (!pointEquals(reference.a, segment.a) || horizontal !== referenceHorizontal || sign !== referenceSign) return 0;
    sharedLength = Math.min(sharedLength, Math.abs(segment.b.x - segment.a.x) + Math.abs(segment.b.y - segment.a.y));
  }
  return sharedLength;
}

/**
 * A copy family has a common endpoint only when at least two of its members
 * meet the same node. We score every side that all peer nodes share relative
 * to that endpoint. This keeps copy sharing below legal routing, bend count,
 * and total path length, while using the shorter trunk only for an otherwise
 * equal diagonal choice.
 */
function buildCopyEndpointDirections(
  edges: Array<{ source: NodeData; target: NodeData; groupId?: string }>,
  displayNodes: NodeData[],
  boxes: Map<string, Box>,
): Map<string, Direction> {
  const groups = new Map<string, CopyEndpointGroup>();
  for (const edge of edges) {
    if (!edge.groupId) continue;
    for (const role of ["source", "target"] as const) {
      const node = role === "source" ? edge.source : edge.target;
      const key = copyEndpointKey(edge.groupId, role, node.id);
      const group = groups.get(key) ?? { groupId: edge.groupId, role, node, members: [] };
      group.members.push({ source: edge.source, target: edge.target });
      groups.set(key, group);
    }
  }

  const preferences = new Map<string, Direction>();
  for (const [key, group] of Array.from(groups.entries())) {
    if (group.members.length < 2) continue;
    const commonDirections = PORT_DIRECTIONS.filter((direction: Direction) => group.members.every(({ source, target }: CopyEndpointMember) => {
      const peer = group.role === "source" ? target : source;
      return relativeDirections(group.node, peer).includes(direction);
    }));
    if (!commonDirections.length) continue;

    const candidates: Array<{ direction: Direction; routeErrors: number; bends: number; length: number; trunk: number }> = commonDirections.map((direction: Direction) => {
      const routes: Route[] = group.members.map(({ source, target }: CopyEndpointMember) => {
        const sourceBox = boxes.get(source.id)!;
        const targetBox = boxes.get(target.id)!;
        const obstacles = displayNodes
          .filter((node) => node.id !== source.id && node.id !== target.id)
          .map((node) => boxes.get(node.id)!);
        const sourcePorts = group.role === "source"
          ? [midpointPort(source, sourceBox, direction)]
          : PORT_DIRECTIONS.map((candidate) => midpointPort(source, sourceBox, candidate));
        const targetPorts = group.role === "target"
          ? [midpointPort(target, targetBox, direction)]
          : PORT_DIRECTIONS.map((candidate) => midpointPort(target, targetBox, candidate));
        return getOrthogonalRoute(source, target, sourceBox, targetBox, obstacles, [], { sourcePorts, targetPorts });
      });
      return {
        direction,
        routeErrors: routes.filter((route: Route) => !route.clean).length,
        bends: routes.reduce((total: number, route: Route) => total + routeBends(route), 0),
        length: routes.reduce((total: number, route: Route) => total + routeLength(route), 0),
        trunk: sharedEndpointTrunkLength(routes, group.role),
      };
    });
    candidates.sort((left, right) => (
      left.routeErrors - right.routeErrors
      || left.bends - right.bends
      || left.length - right.length
      || left.trunk - right.trunk
      || PORT_DIRECTIONS.indexOf(left.direction) - PORT_DIRECTIONS.indexOf(right.direction)
    ));
    preferences.set(key, candidates[0].direction);
  }
  return preferences;
}

function compareAlongSide(direction: Direction, a: NodeData, b: NodeData): number {
  const primary = direction === "up" || direction === "down" ? a.x - b.x : a.y - b.y;
  const secondary = direction === "up" || direction === "down" ? a.y - b.y : a.x - b.x;
  return primary || secondary || a.id.localeCompare(b.id);
}

/**
 * A group is only constrained when several outgoing arrows leave the same
 * source toward the same geometric side. Keeping this information separate
 * from the router lets ordinary edges retain independent target-side choice.
 */
function buildFanoutPlacements(edges: Array<{ source: NodeData; target: NodeData }>): Map<string, FanoutPlacement> {
  const candidates = new Map<string, Array<{ source: NodeData; target: NodeData }>>();
  for (const edge of edges) {
    const direction = directionTowards(edge.source, edge.target);
    const groupKey = `${edge.source.id}:${direction}`;
    const group = candidates.get(groupKey) ?? [];
    group.push(edge);
    candidates.set(groupKey, group);
  }

  const placements = new Map<string, FanoutPlacement>();
  for (const [groupKey, group] of Array.from(candidates.entries())) {
    if (group.length < 2) continue;
    const direction = groupKey.slice(groupKey.lastIndexOf(":") + 1) as Direction;
    group
      .sort((a: { source: NodeData; target: NodeData }, b: { source: NodeData; target: NodeData }) => compareAlongSide(direction, a.target, b.target) || routeKey(a.source.id, a.target.id).localeCompare(routeKey(b.source.id, b.target.id)))
      .forEach((edge: { source: NodeData; target: NodeData }, index: number) => placements.set(routeKey(edge.source.id, edge.target.id), { groupKey, direction, index, total: group.length }));
  }
  return placements;
}

export function buildEdgePortPlans(
  edges: Array<{ source: NodeData; target: NodeData; groupId?: string }>,
  boxes: Map<string, Box>,
  fanoutPlacements: Map<string, FanoutPlacement>,
  copyEndpointDirections: Map<string, Direction> = new Map(),
): Map<string, EdgePortPlan> {
  const endpoints: PlannedEndpoint[] = edges.flatMap(({ source, target, groupId }) => {
    const key = routeKey(source.id, target.id);
    const fanout = fanoutPlacements.get(key);
    // Obsidian Cartography routing: every edge first exits the source through
    // its geometrically nearest side, then evaluates every target side. This
    // preserves the approved node → closest-side → position priority while
    // retaining adjacent-side one-bend routes without multiplying each dense
    // Tree 2 search by four. A fan-out still uses its shared facing source side.
    const sourceCopyDirection = groupId ? copyEndpointDirections.get(copyEndpointKey(groupId, "source", source.id)) : undefined;
    const targetCopyDirection = groupId ? copyEndpointDirections.get(copyEndpointKey(groupId, "target", target.id)) : undefined;
    const sourceDirections = [sourceCopyDirection ?? fanout?.direction ?? directionTowards(source, target)];
    const targetDirections = targetCopyDirection ? [targetCopyDirection] : PORT_DIRECTIONS;
    return [
      ...sourceDirections.map((direction) => ({
        key,
        role: "source" as const,
        node: source,
        peer: target,
        direction,
      })),
      ...targetDirections.map((direction) => ({
        key,
        role: "target" as const,
        node: target,
        peer: source,
        direction,
      })),
    ];
  });
  const grouped = new Map<string, PlannedEndpoint[]>();
  for (const endpoint of endpoints) {
    // A physical node side owns one shared allocation pool. Source and target
    // endpoints remain directed when routing, but must never independently
    // claim the same side midpoint during a drag.
    const groupKey = `${endpoint.node.id}:${endpoint.direction}`;
    const group = grouped.get(groupKey) ?? [];
    group.push(endpoint);
    grouped.set(groupKey, group);
  }
  const plans = new Map<string, EdgePortPlan>();
  for (const group of Array.from(grouped.values()) as PlannedEndpoint[][]) {
    group.sort((a: PlannedEndpoint, b: PlannedEndpoint) => (
      compareAlongSide(a.direction, a.peer, b.peer)
      || a.key.localeCompare(b.key)
      || (a.role === b.role ? 0 : a.role === "source" ? -1 : 1)
    ));
    group.forEach((endpoint: PlannedEndpoint, index: number) => {
      const box = boxes.get(endpoint.node.id)!;
      const port = evenlySpacedPort(endpoint.node, box, endpoint.direction, index, group.length);
      const plan: EdgePortPlan = plans.get(endpoint.key) ?? { sourcePorts: [], targetPorts: [] };
      plan[endpoint.role === "source" ? "sourcePorts" : "targetPorts"].push(port);
      plans.set(endpoint.key, plan);
    });
  }
  for (const plan of Array.from(plans.values())) {
    plan.sourcePorts.sort((a: PrototypePort, b: PrototypePort) => PORT_DIRECTIONS.indexOf(a.direction) - PORT_DIRECTIONS.indexOf(b.direction));
    plan.targetPorts.sort((a: PrototypePort, b: PrototypePort) => PORT_DIRECTIONS.indexOf(a.direction) - PORT_DIRECTIONS.indexOf(b.direction));
  }
  // A copy group is an equal-member family, not an original plus aliases. If
  // two members meet the same node on the same side, the first reservation owns
  // that physical port and later members reuse it. Different sides stay free
  // to separate naturally when the map geometry changes.
  const sharedGroupPorts = new Map<string, PrototypePort>();
  for (const edge of edges) {
    if (!edge.groupId) continue;
    const plan = plans.get(routeKey(edge.source.id, edge.target.id));
    if (!plan) continue;
    for (const [role, node] of [["source", edge.source], ["target", edge.target]] as const) {
      const property = role === "source" ? "sourcePorts" : "targetPorts";
      plan[property] = plan[property].map((port) => {
        const key = `${edge.groupId}:${role}:${node.id}:${port.direction}`;
        const firstReserved = sharedGroupPorts.get(key);
        if (firstReserved) return firstReserved;
        sharedGroupPorts.set(key, port);
        return port;
      });
    }
  }
  return plans;
}

function compareFanoutReservation(
  a: { source: NodeData; target: NodeData },
  b: { source: NodeData; target: NodeData },
  placements: Map<string, FanoutPlacement>,
): number {
  const aPlacement = placements.get(routeKey(a.source.id, a.target.id));
  const bPlacement = placements.get(routeKey(b.source.id, b.target.id));
  if (aPlacement?.groupKey === bPlacement?.groupKey && aPlacement && bPlacement) {
    const aDistance = Math.abs(aPlacement.index - (aPlacement.total - 1) / 2);
    const bDistance = Math.abs(bPlacement.index - (bPlacement.total - 1) / 2);
    return aDistance - bDistance || aPlacement.index - bPlacement.index || routeKey(a.source.id, a.target.id).localeCompare(routeKey(b.source.id, b.target.id));
  }
  return routeKey(a.source.id, a.target.id).localeCompare(routeKey(b.source.id, b.target.id));
}

function isHorizontal(segment: Segment): boolean { return segment.a.y === segment.b.y; }

function overlapLength(a1: number, a2: number, b1: number, b2: number): number {
  return Math.min(Math.max(a1, a2), Math.max(b1, b2)) - Math.max(Math.min(a1, a2), Math.min(b1, b2));
}

function parallelSegmentConflict(a: Segment, b: Segment, padding = LANE_GAP / 2): boolean {
  if (isHorizontal(a) !== isHorizontal(b)) return false;
  if (isHorizontal(a)) return Math.abs(a.a.y - b.a.y) <= padding && overlapLength(a.a.x, a.b.x, b.a.x, b.b.x) > 0;
  return Math.abs(a.a.x - b.a.x) <= padding && overlapLength(a.a.y, a.b.y, b.a.y, b.b.y) > 0;
}

function routeHasSelfConflict(points: Point[]): boolean {
  const segments = toSegments(points);
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 2; j < segments.length; j++) {
      if (parallelSegmentConflict(segments[i], segments[j])) return true;
    }
  }
  return false;
}

function routeHasArrowConflict(points: Point[], arrowObstacles: Segment[], arrowLaneIndex?: PrototypeLaneIndex): boolean {
  return toSegments(points).some((segment) => {
    const nearby = arrowLaneIndex ? arrowLaneIndex.query(segment.a, segment.b, LANE_GAP / 2) : arrowObstacles;
    return nearby.some((obstacle) => parallelSegmentConflict(segment, obstacle));
  });
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

function routeFromPoints(points: Point[], targetDirection: Direction, clean = true): Route {
  const simplified = simplifyPoints(points);
  const path = simplified.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  let midpoint = simplified[0];
  let longest = -1;
  for (let i = 0; i < simplified.length - 1; i++) {
    const length = Math.abs(simplified[i + 1].x - simplified[i].x) + Math.abs(simplified[i + 1].y - simplified[i].y);
    if (length > longest) {
      longest = length;
      midpoint = { x: (simplified[i].x + simplified[i + 1].x) / 2, y: (simplified[i].y + simplified[i + 1].y) / 2 };
    }
  }
  return { points: simplified, path, targetDirection, midpoint, clean };
}

function getReverseLane(source: NodeData, target: NodeData, allEdges: Array<{ source: NodeData; target: NodeData }>): Point {
  const hasReverse = allEdges.some((edge) => edge.source.id === target.id && edge.target.id === source.id);
  if (!hasReverse) return { x: 0, y: 0 };
  const sign = `${source.id}->${target.id}` < `${target.id}->${source.id}` ? 1 : -1;
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: (-dy / length) * LANE_GAP * sign, y: (dx / length) * LANE_GAP * sign };
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

function nodeToPrototype(node: NodeData, box: Box): PrototypeNode {
  return { id: node.id, x: node.x, y: node.y, box };
}

function noRoute(): Route {
  return { points: [], path: "", targetDirection: "left", midpoint: { x: 0, y: 0 }, clean: false };
}

export function getOrthogonalRoute(
  source: NodeData,
  target: NodeData,
  sourceBox: Box,
  targetBox: Box,
  obstacles: Box[],
  arrowObstacles: Segment[] = [],
  portPlan?: EdgePortPlan,
  arrowLaneIndex?: PrototypeLaneIndex,
): Route {
  const sourcePorts = portPlan?.sourcePorts ?? [midpointPort(source, sourceBox, directionTowards(source, target))];
  // Target sides deliberately remain independent for ordinary edges. The
  // progressive router ranks the legal choices by bend count and path length.
  const targetPorts = portPlan?.targetPorts ?? PORT_DIRECTIONS.map((direction) => midpointPort(target, targetBox, direction));
  const routerOptions = { maxBends: 5, sourcePorts, targetPorts };
  const primaryResult = findProgressivePrototypeRoute(nodeToPrototype(source, sourceBox), nodeToPrototype(target, targetBox), obstacles, routerOptions);
  // Keep each planned side choice, but retry its midpoint if the distributed
  // port is blocked. This preserves fan-out geometry while avoiding an
  // unconstrained second search during dense drag previews.
  const midpointResult = !primaryResult.found
    ? findProgressivePrototypeRoute(nodeToPrototype(source, sourceBox), nodeToPrototype(target, targetBox), obstacles, {
      maxBends: 2,
      sourcePorts: sourcePorts.map((port) => midpointPort(source, sourceBox, port.direction)),
      targetPorts: targetPorts.map((port) => midpointPort(target, targetBox, port.direction)),
    })
    : null;
  const result = primaryResult.found ? primaryResult : midpointResult;
  if (!result || !result.found || !result.targetDirection) return noRoute();

  const hasArrowObstacles = arrowObstacles.length > 0 || (arrowLaneIndex?.size ?? 0) > 0;
  const baseRoute = routeFromPoints(result.points, result.targetDirection, !routeHasSelfConflict(result.points) && !routeHasArrowConflict(result.points, arrowObstacles, arrowLaneIndex));
  if (baseRoute.clean || !hasArrowObstacles) return baseRoute;

  const repaired = findProgressivePrototypeRoute(nodeToPrototype(source, sourceBox), nodeToPrototype(target, targetBox), obstacles, {
    maxBends: 2,
    sourcePorts,
    targetPorts,
    arrowObstacles: arrowObstacles as PrototypeSegment[],
    arrowObstacleIndex: arrowLaneIndex ?? new PrototypeLaneIndex(arrowObstacles as PrototypeSegment[]),
    lanePadding: LANE_GAP / 2,
  });
  if (!repaired.found || !repaired.targetDirection) return baseRoute;
  return routeFromPoints(repaired.points, repaired.targetDirection, !routeHasSelfConflict(repaired.points) && !routeHasArrowConflict(repaired.points, arrowObstacles, arrowLaneIndex));
}

function toSegments(points: Point[]): Segment[] {
  return points.slice(1).map((point, index) => ({ a: points[index], b: point }));
}

function pointEquals(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

function segmentsAreCollinear(a: Segment, b: Segment): boolean {
  return isHorizontal(a) === isHorizontal(b) && (isHorizontal(a) ? a.a.y === b.a.y : a.a.x === b.a.x);
}

function subtractCollinearOverlaps(segment: Segment, obstacles: Segment[]): Segment[] {
  const horizontal = isHorizontal(segment);
  const start = horizontal ? segment.a.x : segment.a.y;
  const end = horizontal ? segment.b.x : segment.b.y;
  const low = Math.min(start, end);
  const high = Math.max(start, end);
  const cuts = obstacles
    .filter((obstacle) => segmentsAreCollinear(segment, obstacle))
    .map((obstacle) => ({
      start: Math.max(low, Math.min(horizontal ? obstacle.a.x : obstacle.a.y, horizontal ? obstacle.b.x : obstacle.b.y)),
      end: Math.min(high, Math.max(horizontal ? obstacle.a.x : obstacle.a.y, horizontal ? obstacle.b.x : obstacle.b.y)),
    }))
    .filter((cut) => cut.end > cut.start)
    .sort((a, b) => a.start - b.start);
  if (!cuts.length) return [segment];

  const merged: Array<{ start: number; end: number }> = [];
  for (const cut of cuts) {
    const previous = merged[merged.length - 1];
    if (previous && cut.start <= previous.end) previous.end = Math.max(previous.end, cut.end);
    else merged.push({ ...cut });
  }
  const toPoint = (value: number): Point => horizontal ? { x: value, y: segment.a.y } : { x: segment.a.x, y: value };
  const pieces: Segment[] = [];
  let cursor = low;
  for (const cut of merged) {
    if (cut.start > cursor) pieces.push({ a: toPoint(cursor), b: toPoint(cut.start) });
    cursor = Math.max(cursor, cut.end);
  }
  if (cursor < high) pieces.push({ a: toPoint(cursor), b: toPoint(high) });
  return start <= end ? pieces : pieces.map((piece) => ({ a: piece.b, b: piece.a })).reverse();
}

function collinearOverlaps(segment: Segment, obstacles: Segment[]): Segment[] {
  const horizontal = isHorizontal(segment);
  const segmentStart = horizontal ? segment.a.x : segment.a.y;
  const segmentEnd = horizontal ? segment.b.x : segment.b.y;
  const low = Math.min(segmentStart, segmentEnd);
  const high = Math.max(segmentStart, segmentEnd);
  return obstacles
    .filter((obstacle) => segmentsAreCollinear(segment, obstacle))
    .map((obstacle) => {
      const obstacleStart = horizontal ? obstacle.a.x : obstacle.a.y;
      const obstacleEnd = horizontal ? obstacle.b.x : obstacle.b.y;
      const start = Math.max(low, Math.min(obstacleStart, obstacleEnd));
      const end = Math.min(high, Math.max(obstacleStart, obstacleEnd));
      if (end <= start) return null;
      return horizontal
        ? { a: { x: start, y: segment.a.y }, b: { x: end, y: segment.a.y } }
        : { a: { x: segment.a.x, y: start }, b: { x: segment.a.x, y: end } };
    })
    .filter((item): item is Segment => Boolean(item));
}

function pathFromSegment(segment: Segment): string {
  return `M ${segment.a.x} ${segment.a.y} L ${segment.b.x} ${segment.b.y}`;
}

function nearestPointOnRoute(point: Point, route: Route): { point: Point; segmentLength: number; distance: number; segment: Segment } | null {
  let best: { point: Point; segmentLength: number; distance: number; segment: Segment } | null = null;
  for (const segment of toSegments(route.points)) {
    const horizontal = isHorizontal(segment);
    const minX = Math.min(segment.a.x, segment.b.x);
    const maxX = Math.max(segment.a.x, segment.b.x);
    const minY = Math.min(segment.a.y, segment.b.y);
    const maxY = Math.max(segment.a.y, segment.b.y);
    const projected = horizontal
      ? { x: Math.min(maxX, Math.max(minX, point.x)), y: segment.a.y }
      : { x: segment.a.x, y: Math.min(maxY, Math.max(minY, point.y)) };
    const distance = Math.hypot(point.x - projected.x, point.y - projected.y);
    if (!best || distance < best.distance) best = { point: projected, segmentLength: Math.abs(segment.b.x - segment.a.x) + Math.abs(segment.b.y - segment.a.y), distance, segment };
  }
  return best;
}

function strictCrossing(a: Segment, b: Segment): Point | null {
  const aH = isHorizontal(a);
  const bH = isHorizontal(b);
  if (aH === bH) return null;
  const horizontal = aH ? a : b;
  const vertical = aH ? b : a;
  const minX = Math.min(horizontal.a.x, horizontal.b.x);
  const maxX = Math.max(horizontal.a.x, horizontal.b.x);
  const minY = Math.min(vertical.a.y, vertical.b.y);
  const maxY = Math.max(vertical.a.y, vertical.b.y);
  if (vertical.a.x > minX && vertical.a.x < maxX && horizontal.a.y > minY && horizontal.a.y < maxY) return { x: vertical.a.x, y: horizontal.a.y };
  return null;
}

function getArrowHead(route: Route): string {
  const tip = route.points[route.points.length - 1];
  const before = route.points[route.points.length - 2] ?? tip;
  const length = Math.hypot(tip.x - before.x, tip.y - before.y) || 1;
  const ux = (tip.x - before.x) / length;
  const uy = (tip.y - before.y) / length;
  const base = { x: tip.x - ux * ARROW_LENGTH, y: tip.y - uy * ARROW_LENGTH };
  const px = -uy * ARROW_WIDTH;
  const py = ux * ARROW_WIDTH;
  return `${tip.x},${tip.y} ${base.x + px},${base.y + py} ${base.x - px},${base.y - py}`;
}

function bridgePath(point: Point, segment: Segment): string {
  if (isHorizontal(segment)) return `M ${point.x - 7} ${point.y} Q ${point.x} ${point.y - 9} ${point.x + 7} ${point.y}`;
  return `M ${point.x} ${point.y - 7} Q ${point.x + 9} ${point.y} ${point.x} ${point.y + 7}`;
}

function buildTextLines(label: string, boxW: number, isRoot: boolean): string[] {
  if (!label || label.trim() === "") return [];
  const charsPerLine = Math.max(5, Math.floor((boxW - 16) / (isRoot ? 8 : CHAR_WIDTH)));
  const lines: string[] = [];
  for (const rawLine of label.split("\n")) {
    if (!rawLine) lines.push("");
    else for (let start = 0; start < rawLine.length; start += charsPerLine) lines.push(rawLine.slice(start, start + charsPerLine));
  }
  return lines;
}

export interface DerivedRoute {
  source: NodeData;
  target: NodeData;
  sourceNode: NodeData;
  targetNode: NodeData;
  groupId?: string;
  reservationIndex: number;
  route: Route;
}

export interface RouteRefreshScore {
  routeErrors: number;
  bends: number;
  length: number;
}

export function getRouteRefreshScore(routes: DerivedRoute[]): RouteRefreshScore {
  return routes.reduce<RouteRefreshScore>((score, { route }) => {
    const length = route.points.slice(1).reduce((total, point, index) => total + Math.hypot(point.x - route.points[index].x, point.y - route.points[index].y), 0);
    return {
      routeErrors: score.routeErrors + (route.clean ? 0 : 1),
      bends: score.bends + Math.max(0, route.points.length - 2),
      length: score.length + length,
    };
  }, { routeErrors: 0, bends: 0, length: 0 });
}

export function compareRouteRefreshScores(left: RouteRefreshScore, right: RouteRefreshScore): number {
  return left.routeErrors - right.routeErrors || left.bends - right.bends || left.length - right.length;
}

export function buildDerivedRoutes(
  tree: TreeMap,
  override?: { nodeId: string; x: number; y: number },
  routeTimings?: number[],
  reservationOrder: "normal" | "reversed" = "normal",
): DerivedRoute[] {
  const nodes = getNodesFromTree(tree);
  const edges = getEdgesFromTree(tree);
  const rootId = tree.root?.id ?? null;
  const positionOf = (node: NodeData): NodeData => override?.nodeId === node.id ? { ...node, x: override.x, y: override.y } : node;
  const displayNodes = nodes.map(positionOf);
  const boxes = new Map(displayNodes.map((node) => [node.id, getNodeBox(node, node.id === rootId)]));
  const orderedEdges = [...edges].sort((a, b) => `${a.source.id}->${a.target.id}`.localeCompare(`${b.source.id}->${b.target.id}`));
  const positionedEdges = orderedEdges.map(({ source, target, groupId }) => ({ source: positionOf(source), target: positionOf(target), groupId }));
  const fanoutPlacements = buildFanoutPlacements(positionedEdges);
  const copyEndpointDirections = buildCopyEndpointDirections(positionedEdges, displayNodes, boxes);
  const portPlans = buildEdgePortPlans(positionedEdges, boxes, fanoutPlacements, copyEndpointDirections);
  const reservationEdges = [...positionedEdges].sort((a, b) => {
    const comparison = compareFanoutReservation(a, b, fanoutPlacements);
    return reservationOrder === "reversed" ? -comparison : comparison;
  });
  const reservedRoutes: Array<{ key: string; segments: Segment[]; groupId?: string }> = [];
  const reservedLaneIndex = new PrototypeLaneIndex();
  const routesByKey = new Map<string, DerivedRoute>();
  for (const [reservationIndex, { source: sourceNode, target: targetNode, groupId }] of Array.from(reservationEdges.entries())) {
    const sourceBox = boxes.get(sourceNode.id)!;
    const targetBox = boxes.get(targetNode.id)!;
    const obstacleBoxes = displayNodes.filter((node) => node.id !== sourceNode.id && node.id !== targetNode.id).map((node) => boxes.get(node.id)!);
    const reverseKey = `${targetNode.id}->${sourceNode.id}`;
    const reverseReservation = reservedRoutes.find((entry) => entry.key === reverseKey);
    // Reverse edges remain mutually exempt. Copy-group members are also
    // exempt so compatible members can keep one shared physical trunk.
    const needsFilteredReservations = Boolean(reverseReservation || groupId);
    const arrowObstacles = needsFilteredReservations
      ? reservedRoutes
        .filter((entry) => entry.key !== reverseKey && (!groupId || entry.groupId !== groupId))
        .flatMap((entry) => entry.segments)
      : [];
    const arrowLaneIndex = needsFilteredReservations ? new PrototypeLaneIndex(arrowObstacles) : reservedLaneIndex;
    const routeStartedAt = routeTimings ? performance.now() : 0;
    const baseRoute = getOrthogonalRoute(sourceNode, targetNode, sourceBox, targetBox, obstacleBoxes, arrowObstacles, portPlans.get(routeKey(sourceNode.id, targetNode.id)), arrowLaneIndex);
    const laneRoute = baseRoute.points.length < 2
      ? baseRoute
      : applyReverseLane(baseRoute, sourceNode, targetNode, sourceBox, targetBox, getReverseLane(sourceNode, targetNode, orderedEdges));
    const clean = laneRoute.clean && !routeHasSelfConflict(laneRoute.points) && !routeHasArrowConflict(laneRoute.points, arrowObstacles, arrowLaneIndex);
    const route = clean === laneRoute.clean ? laneRoute : { ...laneRoute, clean };
    if (route.points.length >= 2) {
      const segments = toSegments(route.points);
      reservedRoutes.push({ key: routeKey(sourceNode.id, targetNode.id), segments, groupId });
      segments.forEach((segment) => reservedLaneIndex.add(segment));
    }
    if (routeTimings) routeTimings.push(performance.now() - routeStartedAt);
    routesByKey.set(routeKey(sourceNode.id, targetNode.id), { source: sourceNode, target: targetNode, sourceNode, targetNode, groupId, reservationIndex, route });
  }
  return orderedEdges.map(({ source, target }) => routesByKey.get(routeKey(source.id, target.id))!);
}

export default function TreeCanvas({ tree }: TreeCanvasProps) {
  const { dispatch, canUndo, canRedo } = useRoadmaps();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [addNodeMode, setAddNodeMode] = useState(false);
  const [connectMode, setConnectMode] = useState(false);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<DragPreview | null>(null);
  const [placementPreview, setPlacementPreview] = useState<PlacementPreview | null>(null);
  const [teleportMode, setTeleportMode] = useState<TeleportMode | null>(null);
  const [copyArrowMode, setCopyArrowMode] = useState<CopyArrowMode | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(() => {
    try {
      return localStorage.getItem(SNAP_TO_GRID_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const dragRef = useRef<DragState | null>(null);
  const [viewBox, setViewBox] = useState<ViewBox>(() => tree.maxDepth <= 3 ? { x: -500, y: -700, w: 1000, h: 1400 } : { x: -1400, y: -1600, w: 2800, h: 3200 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const initialPinchDistance = useRef<number | null>(null);
  const initialViewBoxOnPinch = useRef<ViewBox | null>(null);
  const pinchCenter = useRef({ x: 0, y: 0 });
  const isPinching = useRef(false);
  const [actionPanelTarget, setActionPanelTarget] = useState<PanelTarget | null>(null);
  const [actionPanelScreenPos, setActionPanelScreenPos] = useState({ x: 0, y: 0 });
  const [popupNodeId, setPopupNodeId] = useState<string | null>(null);
  const [pendingPopupNodeId, setPendingPopupNodeId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressActive = useRef(false);
  const arrowPressRef = useRef<ArrowPressState | null>(null);
  // The committed route set is calculated once per roadmap change. Pointer
  // handlers and render reuse it so a dense Tree 2 long press never starts by
  // synchronously deriving all routes a second time.
  const committedRoutes = useMemo(() => buildDerivedRoutes(tree), [tree]);

  useEffect(() => {
    try {
      localStorage.setItem(SNAP_TO_GRID_STORAGE_KEY, String(snapToGrid));
    } catch {
      // The editor remains usable when browser storage is unavailable.
    }
  }, [snapToGrid]);

  const worldPoint = useCallback((clientX: number, clientY: number): Point | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const viewAspect = viewBox.w / viewBox.h;
    const screenAspect = rect.width / Math.max(rect.height, 1);
    const renderedWidth = screenAspect > viewAspect ? rect.height * viewAspect : rect.width;
    const renderedHeight = screenAspect > viewAspect ? rect.height : rect.width / viewAspect;
    const offsetX = (rect.width - renderedWidth) / 2;
    const offsetY = (rect.height - renderedHeight) / 2;
    return {
      x: viewBox.x + ((clientX - rect.left - offsetX) / renderedWidth) * viewBox.w,
      y: viewBox.y + ((clientY - rect.top - offsetY) / renderedHeight) * viewBox.h,
    };
  }, [viewBox]);

  const zoomByFactor = useCallback((factor: number, centerFracX = 0.5, centerFracY = 0.5) => {
    setViewBox((previous) => {
      const newW = previous.w * factor;
      const newH = previous.h * factor;
      if (newW > 8000 || newW < 150) return previous;
      return { x: previous.x + (previous.w - newW) * centerFracX, y: previous.y + (previous.h - newH) * centerFracY, w: newW, h: newH };
    });
  }, []);

  const resetView = useCallback(() => setViewBox(tree.maxDepth <= 3 ? { x: -500, y: -700, w: 1000, h: 1400 } : { x: -1400, y: -1600, w: 2800, h: 3200 }), [tree.maxDepth]);

  const fitToContent = useCallback(() => {
    const svg = svgRef.current;
    const nodes = getNodesFromTree(tree);
    if (!svg || nodes.length === 0) {
      resetView();
      return;
    }
    const rootId = tree.root?.id ?? null;
    const boxes = nodes.map((node) => getNodeBox(node, node.id === rootId));
    const contentRoutes = committedRoutes;
    const points = [...boxes.flatMap((box) => [{ x: box.x, y: box.y }, { x: box.x + box.w, y: box.y + box.h }]), ...contentRoutes.flatMap(({ route }) => route.points)];
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    const rect = svg.getBoundingClientRect();
    const aspect = rect.width / Math.max(rect.height, 1);
    const contentW = Math.max(maxX - minX, 160) + 180;
    const contentH = Math.max(maxY - minY, 160) + 180;
    const width = Math.max(contentW, contentH * aspect);
    const height = Math.max(contentH, contentW / Math.max(aspect, 0.1));
    setViewBox({ x: (minX + maxX - width) / 2, y: (minY + maxY - height) / 2, w: width, h: height });
  }, [tree, resetView, committedRoutes]);

  const endLongPress = useCallback(() => {
    longPressActive.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  }, []);

  function startLongPress(target: PanelTarget, world: Point) {
    endLongPress();
    longPressActive.current = true;
    longPressTimer.current = setTimeout(() => {
      if (!longPressActive.current || dragRef.current?.moved) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      setActionPanelScreenPos({ x: (world.x - viewBox.x) * rect.width / viewBox.w, y: (world.y - viewBox.y) * rect.height / viewBox.h });
      setActionPanelTarget(target);
      longPressActive.current = false;
    }, 500);
  }

  function openNodePopup(nodeId: string) {
    if (popupNodeId && popupNodeId !== nodeId) setPendingPopupNodeId(nodeId);
    else setPopupNodeId(nodeId);
  }

  function selectForConnection(nodeId: string) {
    if (!connectMode) return;
    if (!connectSourceId) {
      setConnectSourceId(nodeId);
      toast.message("Source selected", { description: "Tap another node to draw the arrow." });
      return;
    }
    if (connectSourceId === nodeId) {
      toast.message("Choose a different node", { description: "An arrow needs two different nodes." });
      return;
    }
    const source = tree.nodeMap[connectSourceId];
    if (source?.children.some((child) => child.targetId === nodeId)) {
      toast.message("Arrow already exists");
    } else {
      const testNodeMap = Object.fromEntries(Object.entries(tree.nodeMap).map(([id, current]) => [id, { ...current, children: current.children.map((child) => ({ ...child })) }]));
      const testSource = testNodeMap[connectSourceId];
      if (!testSource || !testNodeMap[nodeId]) {
        toast.message("Arrow not added");
      } else {
        testSource.children.push({ targetId: nodeId, color: "blue" });
        const testTree = { ...tree, nodeMap: testNodeMap, root: tree.root ? testNodeMap[tree.root.id] ?? null : null };
        const baselineRoutes = new Map(committedRoutes.map(({ source, target, route }) => [routeKey(source.id, target.id), route]));
        const introducesProblems = introducesNewRouteProblems(baselineRoutes, buildDerivedRoutes(testTree));
        if (introducesProblems) toast.message("Route would disrupt existing arrows", { description: "Move a node or choose another direction before adding this arrow." });
        else {
          dispatch({ type: "ADD_ARROW", treeId: tree.id, sourceId: connectSourceId, targetId: nodeId, color: "blue" });
          toast.success("Arrow added");
        }
      }
    }
    setConnectSourceId(null);
    setConnectMode(false);
  }

  function beginTeleport(nodeId: string) {
    setAddNodeMode(false);
    setConnectMode(false);
    setConnectSourceId(null);
    setCopyArrowMode(null);
    setPlacementPreview(null);
    setTeleportMode({ nodeId, baselineRoutes: new Map(committedRoutes.map(({ source, target, route }) => [routeKey(source.id, target.id), route])) });
    setActionPanelTarget(null);
    toast.message("Teleport ready", { description: "Tap one empty canvas space for the new node position." });
  }

  function rejectTeleport(message: string, description: string) {
    setTeleportMode(null);
    toast.message(message, { description });
  }

  function completeTeleport(point: Point) {
    const currentTeleport = teleportMode;
    if (!currentTeleport) return;
    setTeleportMode(null);
    const validation = validateTeleportDestination(tree, currentTeleport.nodeId, point, currentTeleport.baselineRoutes);
    if (!validation.valid) {
      rejectTeleport(
        validation.reason === "node-overlap" ? "Space occupied" : "No free arrow lane in five bends",
        validation.reason === "node-overlap" ? "Choose a clear canvas area for the node." : "This move would make an existing arrow unclean."
      );
      return;
    }
    dispatch({ type: "MOVE_NODE", treeId: tree.id, nodeId: currentTeleport.nodeId, x: point.x, y: point.y });
    toast.success("Node teleported");
  }

  function createCopyGroupId(): string {
    return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${tree.id}-copy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function beginCopyArrow(sourceId: string, targetId: string, copyMode: "head" | "tail") {
    const original = tree.nodeMap[sourceId]?.children.find((child) => child.targetId === targetId);
    if (!original) return;
    setAddNodeMode(false);
    setConnectMode(false);
    setConnectSourceId(null);
    setTeleportMode(null);
    setPlacementPreview(null);
    setCopyArrowMode({ sourceId, targetId, copyMode, groupId: original.groupId ?? createCopyGroupId() });
    setActionPanelTarget(null);
    toast.message(copyMode === "head" ? "Copy head ready" : "Copy tail ready", {
      description: copyMode === "head" ? "Tap a new destination node." : "Tap a new source node.",
    });
  }

  function completeCopyArrow(destinationNodeId: string) {
    const currentCopy = copyArrowMode;
    if (!currentCopy) return;
    const originalSource = tree.nodeMap[currentCopy.sourceId];
    const originalChild = originalSource?.children.find((child) => child.targetId === currentCopy.targetId);
    if (!originalSource || !originalChild) {
      setCopyArrowMode(null);
      return;
    }
    const newSourceId = currentCopy.copyMode === "head" ? currentCopy.sourceId : destinationNodeId;
    const newTargetId = currentCopy.copyMode === "head" ? destinationNodeId : currentCopy.targetId;
    const newSource = tree.nodeMap[newSourceId];
    if (!newSource || newSourceId === newTargetId) {
      toast.message("Choose a different node", { description: "A copied arrow needs two different nodes." });
      return;
    }
    if (newSource.children.some((child) => child.targetId === newTargetId)) {
      toast.message("Arrow already exists", { description: "That directed connection is already on the roadmap." });
      return;
    }
    const testNodeMap = Object.fromEntries(Object.entries(tree.nodeMap).map(([id, node]) => [id, { ...node, children: node.children.map((child) => ({ ...child })) }]));
    const groupId = originalChild.groupId ?? currentCopy.groupId;
    testNodeMap[currentCopy.sourceId].children = testNodeMap[currentCopy.sourceId].children.map((child) => child.targetId === currentCopy.targetId ? { ...child, groupId } : child);
    testNodeMap[newSourceId].children.push({ targetId: newTargetId, color: originalChild.color, groupId });
    const testTree = { ...tree, nodeMap: testNodeMap, root: tree.root ? testNodeMap[tree.root.id] ?? null : null };
    const candidateRoutes = buildDerivedRoutes(testTree);
    const newRoute = candidateRoutes.find(({ source, target }) => source.id === newSourceId && target.id === newTargetId)?.route;
    const baselineRoutes = new Map(committedRoutes.map(({ source, target, route }) => [routeKey(source.id, target.id), route]));
    if (!newRoute?.clean || introducesNewRouteProblems(baselineRoutes, candidateRoutes)) {
      toast.message("Copy would disrupt arrow lanes", { description: "Choose another node or move a node first." });
      return;
    }
    dispatch({ type: "ADD_COPY_ARROW", treeId: tree.id, sourceId: currentCopy.sourceId, targetId: currentCopy.targetId, destinationNodeId, copyMode: currentCopy.copyMode, groupId });
    setCopyArrowMode(null);
    toast.success("Copy arrow added");
  }

  function makePlacementNode(point: Point): NodeData {
    return {
      id: `${tree.id}-placement-preview`,
      x: point.x,
      y: point.y,
      label: "",
      color: "violet",
      popupContent: "",
      children: [],
    };
  }

  function rejectPlacement(message: string, description?: string) {
    setAddNodeMode(false);
    setPlacementPreview(null);
    toast.message(message, description ? { description } : undefined);
  }

  function updatePlacementPreview(point: Point, blockedByArrow = false) {
    const candidate = makePlacementNode(point);
    const valid = !blockedByArrow && canPlaceNode(candidate, Object.values(tree.nodeMap), tree.root?.id ?? null);
    setPlacementPreview({ x: point.x, y: point.y, valid });
  }

  function addIndependentNode(point: Point) {
    const nodeId = `${tree.id}-node-${Date.now()}`;
    const node: NodeData = { id: nodeId, x: point.x, y: point.y, label: "", color: "violet", popupContent: "", children: [] };
    if (!canPlaceNode(node, Object.values(tree.nodeMap), tree.root?.id ?? null)) {
      rejectPlacement("Space occupied", "Choose an open area for the node.");
      return;
    }
    dispatch({ type: "ADD_NODE", treeId: tree.id, node });
    setAddNodeMode(false);
    setPlacementPreview(null);
    toast.success("Node placed");
  }

  function beginNodePointer(e: React.PointerEvent<SVGGElement>, node: NodeData) {
    e.preventDefault();
    e.stopPropagation();
    if (teleportMode) {
      rejectTeleport("Teleport needs empty space", "Nodes and arrows cannot be used as a teleport destination.");
      return;
    }
    if (copyArrowMode) {
      completeCopyArrow(node.id);
      return;
    }
    if (addNodeMode) {
      rejectPlacement("Node not placed", "Tap an empty canvas area.");
      return;
    }
    if (connectMode) {
      selectForConnection(node.id);
      return;
    }
    const point = worldPoint(e.clientX, e.clientY);
    if (!point) return;
    const baselineRoutes = new Map(committedRoutes.map(({ source, target, route }) => [routeKey(source.id, target.id), route]));
    dragRef.current = { nodeId: node.id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false, x: node.x, y: node.y, baselineRoutes };
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // Synthetic events and a cancelled touch may not have an active pointer to capture.
    }
    startLongPress({ type: "node", nodeId: node.id }, { x: node.x, y: node.y });
  }

  function moveNodePointer(e: React.PointerEvent<SVGGElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const delta = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
    if (delta > NODE_DRAG_START_THRESHOLD) {
      drag.moved = true;
      endLongPress();
      const point = worldPoint(e.clientX, e.clientY);
      const startPoint = worldPoint(drag.startX, drag.startY);
      if (point && startPoint) {
        const node = tree.nodeMap[drag.nodeId];
        if (!node) return;
        const centre = resolveDraggedNodeCentre({ x: drag.x + point.x - startPoint.x, y: drag.y + point.y - startPoint.y }, snapToGrid);
        const candidate = { ...node, ...centre };
        const routesForCandidate = buildDerivedRoutes(tree, { nodeId: drag.nodeId, x: candidate.x, y: candidate.y });
        const nodeFits = canPlaceNode(candidate, Object.values(tree.nodeMap), tree.root?.id ?? null, drag.nodeId);
        const routeProblem = nodeFits && introducesNewRouteProblems(drag.baselineRoutes, routesForCandidate);
        setDragPosition({
          nodeId: drag.nodeId,
          x: candidate.x,
          y: candidate.y,
          valid: nodeFits && !routeProblem,
          invalidReason: !nodeFits ? "node-overlap" : routeProblem ? "route-lane" : null,
          routes: routesForCandidate,
        });
      }
    }
  }

  function finishNodePointer(e: React.PointerEvent<SVGGElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const point = dragPosition?.nodeId === drag.nodeId ? dragPosition : null;
    const shortTap = !drag.moved && longPressActive.current;
    endLongPress();
    if (drag.moved && point) {
      if (point.valid) dispatch({ type: "MOVE_NODE", treeId: tree.id, nodeId: drag.nodeId, x: point.x, y: point.y });
      else if (point.invalidReason === "route-lane") toast.message("No free arrow lane in five bends", { description: "The node returned to its previous position." });
      else toast.message("Space occupied", { description: "The object returned to its previous position." });
    }
    if (shortTap) {
      setActionPanelTarget(null);
      openNodePopup(drag.nodeId);
    }
    setDragPosition(null);
    dragRef.current = null;
  }

  function beginArrowPointer(e: React.PointerEvent<SVGPathElement>, sourceId: string, targetId: string, route: Route) {
    e.preventDefault();
    e.stopPropagation();
    if (teleportMode) {
      rejectTeleport("Teleport needs empty space", "Nodes and arrows cannot be used as a teleport destination.");
      return;
    }
    if (copyArrowMode) {
      toast.message("Choose a node", { description: "The copied arrow needs a node at its new endpoint." });
      return;
    }
    if (addNodeMode) {
      rejectPlacement("Node not placed", "A node cannot be placed directly on an arrow.");
      return;
    }
    arrowPressRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY };
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // Synthetic events and cancelled touches may not have an active pointer to capture.
    }
    startLongPress({ type: "arrow", sourceId, targetId }, route.midpoint);
  }

  function moveArrowPointer(e: React.PointerEvent<SVGPathElement>) {
    const press = arrowPressRef.current;
    if (!press || press.pointerId !== e.pointerId) return;
    if (Math.hypot(e.clientX - press.startX, e.clientY - press.startY) > ARROW_PRESS_MOVE_THRESHOLD) {
      endLongPress();
      arrowPressRef.current = null;
    }
  }

  function finishArrowPointer(e: React.PointerEvent<SVGPathElement>) {
    if (arrowPressRef.current?.pointerId !== e.pointerId) return;
    endLongPress();
    arrowPressRef.current = null;
  }

  function handleTouchStart(e: React.TouchEvent) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (addNodeMode || teleportMode || copyArrowMode) {
      setIsPanning(false);
      return;
    }
    if (e.touches.length === 2) {
      e.preventDefault();
      isPinching.current = true;
      const [a, b] = [e.touches[0], e.touches[1]];
      initialPinchDistance.current = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      initialViewBoxOnPinch.current = { ...viewBox };
      pinchCenter.current = { x: ((a.clientX + b.clientX) / 2 - rect.left) / rect.width, y: ((a.clientY + b.clientY) / 2 - rect.top) / rect.height };
      setIsPanning(false);
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      // Node and arrow presses belong to the SVG gesture system. Cancelling the
      // native touch start here prevents Android from treating a long press as
      // page-text selection, while leaving ordinary page scrolling untouched.
      if (target?.closest("[data-node-id]") || target?.closest("[data-arrow-id]")) {
        e.preventDefault();
        return;
      }
      setIsPanning(true);
      panStart.current = { x: touch.clientX, y: touch.clientY };
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (e.touches.length === 2 && isPinching.current && initialPinchDistance.current && initialViewBoxOnPinch.current) {
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const scale = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY) / initialPinchDistance.current;
      const initial = initialViewBoxOnPinch.current;
      const newW = initial.w / scale;
      const newH = initial.h / scale;
      if (newW > 8000 || newW < 150) return;
      setViewBox({ x: initial.x + (initial.w - newW) * pinchCenter.current.x, y: initial.y + (initial.h - newH) * pinchCenter.current.y, w: newW, h: newH });
    } else if (e.touches.length === 1 && isPanning) {
      const touch = e.touches[0];
      const dx = ((touch.clientX - panStart.current.x) / rect.width) * viewBox.w;
      const dy = ((touch.clientY - panStart.current.y) / rect.height) * viewBox.h;
      setViewBox((previous) => ({ ...previous, x: previous.x - dx, y: previous.y - dy }));
      panStart.current = { x: touch.clientX, y: touch.clientY };
    }
  }

  function handleMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if ((e.target as Element).closest("[data-node-id]") || (e.target as Element).closest("[data-arrow-id]")) return;
    if (addNodeMode || teleportMode || copyArrowMode) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY };
  }

  function handleSvgPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const target = e.target as Element;
    const isNonEmptyCanvas = Boolean(target.closest("[data-node-id]") || target.closest("[data-arrow-id]"));
    if (teleportMode) {
      if (isNonEmptyCanvas) {
        rejectTeleport("Teleport needs empty space", "Nodes and arrows cannot be used as a teleport destination.");
        return;
      }
      const point = worldPoint(e.clientX, e.clientY);
      if (point) completeTeleport(point);
      return;
    }
    if (copyArrowMode) {
      if (!isNonEmptyCanvas) toast.message("Choose a node", { description: "The copied arrow needs a node at its new endpoint." });
      return;
    }
    if (!addNodeMode || isNonEmptyCanvas) return;
    const point = worldPoint(e.clientX, e.clientY);
    if (!point) return;
    addIndependentNode(point);
  }

  function handleSvgPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!addNodeMode) return;
    const point = worldPoint(e.clientX, e.clientY);
    if (point) updatePlacementPreview(point, Boolean((e.target as Element).closest("[data-arrow-id]")));
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!isPanning) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const dx = ((e.clientX - panStart.current.x) / rect.width) * viewBox.w;
    const dy = ((e.clientY - panStart.current.y) / rect.height) * viewBox.h;
    setViewBox((previous) => ({ ...previous, x: previous.x - dx, y: previous.y - dy }));
    panStart.current = { x: e.clientX, y: e.clientY };
  }

  const nodes = getNodesFromTree(tree);
  const rootId = tree.root?.id ?? null;
  const positionOverride = dragPosition ? { nodeId: dragPosition.nodeId, x: dragPosition.x, y: dragPosition.y } : undefined;
  const positionOf = (node: NodeData): NodeData => positionOverride?.nodeId === node.id ? { ...node, x: positionOverride.x, y: positionOverride.y } : node;
  const displayNodes = useMemo(() => nodes.map(positionOf), [nodes, positionOverride?.nodeId, positionOverride?.x, positionOverride?.y]);
  const routes = dragPosition?.routes ?? committedRoutes;
  const bridgePoints = useMemo(() => routes.map((current, index) => {
    const currentSegments = toSegments(current.route.points);
    const crossings: Array<{ point: Point; segment: Segment }> = [];
    for (let otherIndex = 0; otherIndex < index; otherIndex++) {
      for (const currentSegment of currentSegments) for (const otherSegment of toSegments(routes[otherIndex].route.points)) {
        const point = strictCrossing(currentSegment, otherSegment);
        if (point && !crossings.some((item) => Math.abs(item.point.x - point.x) < 1 && Math.abs(item.point.y - point.y) < 1)) crossings.push({ point, segment: currentSegment });
      }
    }
    return crossings;
  }), [routes]);

  const copyRenderGeometry = useMemo<CopyRenderGeometry>(() => {
    const visibleSegmentsByKey = new Map<string, Segment[]>();
    const selectableSegmentsByKey = new Map<string, Segment[]>();
    const sharedSegmentsByKey = new Map<string, Segment[]>();
    const ordered = [...routes].sort((left, right) => left.reservationIndex - right.reservationIndex);
    for (const current of ordered) {
      const key = routeKey(current.source.id, current.target.id);
      const segments = toSegments(current.route.points);
      if (!current.groupId || segments.length === 0) {
        visibleSegmentsByKey.set(key, segments);
        selectableSegmentsByKey.set(key, segments);
        sharedSegmentsByKey.set(key, []);
        continue;
      }
      const currentStart = current.route.points[0];
      const currentEnd = current.route.points[current.route.points.length - 1];
      const peers = routes.filter((other) => {
        if (other === current || other.groupId !== current.groupId) return false;
        const otherStart = other.route.points[0];
        const otherEnd = other.route.points[other.route.points.length - 1];
        return Boolean(currentStart && currentEnd && otherStart && otherEnd && (pointEquals(currentStart, otherStart) || pointEquals(currentEnd, otherEnd)));
      });
      const earlierPeerSegments = peers.filter((other) => other.reservationIndex < current.reservationIndex).flatMap((other) => toSegments(other.route.points));
      const allPeerSegments = peers.flatMap((other) => toSegments(other.route.points));
      visibleSegmentsByKey.set(key, segments.flatMap((segment) => subtractCollinearOverlaps(segment, earlierPeerSegments)));
      selectableSegmentsByKey.set(key, segments.flatMap((segment) => subtractCollinearOverlaps(segment, allPeerSegments)));
      sharedSegmentsByKey.set(key, segments.flatMap((segment) => collinearOverlaps(segment, allPeerSegments)));
    }
    return { visibleSegmentsByKey, selectableSegmentsByKey, sharedSegmentsByKey };
  }, [routes]);

  function renderEdges(): ReactNode[] {
    return routes.map(({ source, target, route }, index) => {
      if (route.points.length < 2) return null;
      const arrowColor = source.children.find((child) => child.targetId === target.id)?.color ?? "blue";
      const key = `${tree.id}-${source.id}-${target.id}`;
      const routeId = routeKey(source.id, target.id);
      const visibleSegments = copyRenderGeometry.visibleSegmentsByKey.get(routeId) ?? toSegments(route.points);
      const selectableSegments = copyRenderGeometry.selectableSegmentsByKey.get(routeId) ?? toSegments(route.points);
      const sharedSegments = copyRenderGeometry.sharedSegmentsByKey.get(routeId) ?? [];
      return (
        <g key={key} data-arrow-id={key}>
          {selectableSegments.map((segment, segmentIndex) => <path key={`${key}-hit-${segmentIndex}`} d={pathFromSegment(segment)} fill="none" stroke="transparent" strokeWidth={18} style={{ cursor: "pointer" }} onPointerDown={(e) => beginArrowPointer(e, source.id, target.id, route)} onPointerMove={moveArrowPointer} onPointerUp={finishArrowPointer} onPointerCancel={finishArrowPointer} />)}
          {sharedSegments.map((segment, segmentIndex) => <path key={`${key}-shared-hit-${segmentIndex}`} d={pathFromSegment(segment)} fill="none" stroke="transparent" strokeWidth={18} pointerEvents={addNodeMode || teleportMode || copyArrowMode ? "stroke" : "none"} onPointerDown={(e) => beginArrowPointer(e, source.id, target.id, route)} />)}
          {visibleSegments.map((segment, segmentIndex) => <path key={`${key}-ink-${segmentIndex}`} d={pathFromSegment(segment)} fill="none" stroke={VIBGYOR_COLORS[arrowColor]} strokeWidth={2} strokeOpacity={0.72} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />)}
          {bridgePoints[index].map(({ point, segment }, crossingIndex) => (
            <g key={`${key}-bridge-${crossingIndex}`} pointerEvents="none">
              <circle cx={point.x} cy={point.y} r={5.5} fill="#0a0a0f" />
              <path d={bridgePath(point, segment)} fill="none" stroke={VIBGYOR_COLORS[arrowColor]} strokeWidth={2} strokeLinecap="round" />
            </g>
          ))}
        </g>
      );
    });
  }

  function renderArrowheads(): ReactNode[] {
    return routes.map(({ source, target, route }) => {
      if (route.points.length < 2) return null;
      const arrowColor = source.children.find((child) => child.targetId === target.id)?.color ?? "blue";
      const key = `${tree.id}-${source.id}-${target.id}-head`;
      return <polygon key={key} points={getArrowHead(route)} fill={VIBGYOR_COLORS[arrowColor]} opacity={route.clean ? 0.9 : 0.55} pointerEvents="none" />;
    });
  }

  function renderNodes(): ReactNode[] {
    return displayNodes.map((node) => {
      const isRoot = node.id === rootId;
      const selected = connectSourceId === node.id;
      const invalidDrag = dragPosition?.nodeId === node.id && !dragPosition.valid;
      const routeLaneDrag = dragPosition?.nodeId === node.id && dragPosition.invalidReason === "route-lane";
      const size = getBoxDimensions(node.label, isRoot);
      const envelope = getNodeEnvelope(node, isRoot);
      const heading = truncateHeading(node.label, size.w, isRoot);
      return (
        <g key={`${tree.id}-${node.id}`} data-node-id={node.id} className="tree-node-group" style={{ cursor: connectMode ? "crosshair" : dragPosition?.nodeId === node.id ? "grabbing" : "grab" }} onPointerDown={(e) => beginNodePointer(e, node)} onPointerMove={moveNodePointer} onPointerUp={finishNodePointer} onPointerCancel={finishNodePointer}>
          <rect x={envelope.x} y={envelope.y} width={envelope.w} height={envelope.h} rx={NODE_RADIUS + 8} fill="transparent" pointerEvents="all" />
          <rect x={node.x - size.w / 2} y={node.y - size.h / 2} width={size.w} height={size.h} rx={NODE_RADIUS} fill="#13131a" stroke={invalidDrag ? routeLaneDrag ? "#f59e0b" : "#ef4444" : selected ? "#f2f4fa" : VIBGYOR_COLORS[node.color]} strokeWidth={invalidDrag || selected ? 3 : isRoot ? 2 : 1.5} strokeOpacity={invalidDrag || selected ? 1 : 0.82} />
          {heading && <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="central" fill="#e4e4e7" fontSize={isRoot ? ROOT_FONT_SIZE : FONT_SIZE} fontWeight={isRoot ? 600 : 500} fontFamily="'Space Grotesk', sans-serif" pointerEvents="none">{heading}</text>}
        </g>
      );
    });
  }

  function renderPlacementPreview(): ReactNode {
    if (!placementPreview) return null;
    const invalid = !placementPreview.valid;
    const previewNode = makePlacementNode({ x: placementPreview.x, y: placementPreview.y });
    const size = getBoxDimensions(previewNode.label, false);
    return <g pointerEvents="none" opacity={0.78}>
      <rect x={placementPreview.x - size.w / 2} y={placementPreview.y - size.h / 2} width={size.w} height={size.h} rx={NODE_RADIUS} fill="#13131a" fillOpacity={0.75} stroke={invalid ? "#ef4444" : "#8bb7ff"} strokeWidth={2.5} strokeDasharray="8 5" />
    </g>;
  }

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const prevent = (event: TouchEvent) => { if (event.touches.length > 1) event.preventDefault(); };
    element.addEventListener("touchmove", prevent, { passive: false });
    return () => element.removeEventListener("touchmove", prevent);
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const preventNativeSelection = (event: Event) => event.preventDefault();
    svg.addEventListener("selectstart", preventNativeSelection);
    svg.addEventListener("dragstart", preventNativeSelection);
    return () => {
      svg.removeEventListener("selectstart", preventNativeSelection);
      svg.removeEventListener("dragstart", preventNativeSelection);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative h-full w-full select-none overflow-hidden" style={{ background: "#0a0a0f", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}>
      <svg ref={svgRef} width="100%" height="100%" viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`} onPointerDown={handleSvgPointerDown} onPointerMove={handleSvgPointerMove} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={() => setIsPanning(false)} onMouseLeave={() => { setIsPanning(false); setPlacementPreview(null); }} onContextMenu={(e) => e.preventDefault()} onWheel={(e) => { e.preventDefault(); const rect = svgRef.current?.getBoundingClientRect(); if (rect) zoomByFactor(e.deltaY > 0 ? 1.12 : 0.89, (e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height); }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={() => { setIsPanning(false); isPinching.current = false; initialPinchDistance.current = null; }} style={{ cursor: addNodeMode ? "crosshair" : isPanning ? "grabbing" : "grab", touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}>
        <DotGrid />
        <rect width="10000" height="10000" x={-5000} y={-5000} fill="url(#dotGrid)" />
        {renderEdges()}
        {renderNodes()}
        {renderArrowheads()}
        {renderPlacementPreview()}
      </svg>

      <div className="absolute left-5 top-16 z-10 flex max-w-[calc(100%-2.5rem)] flex-wrap items-center gap-2">
        <button onClick={() => { setAddNodeMode((mode) => !mode); setConnectMode(false); setConnectSourceId(null); setTeleportMode(null); setCopyArrowMode(null); setPlacementPreview(null); }} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all active:scale-95 ${addNodeMode ? "border-[#8bb7ff] bg-[#8bb7ff]/15 text-white" : "border-[#2a2a35] bg-[#13131a] text-[#c4c4cc] hover:border-[#3B82F6]/60 hover:text-white"}`} title="Place one node"><Plus className="h-4 w-4" />{addNodeMode ? "Place node" : "Add node"}</button>
        <button onClick={() => { setConnectMode((mode) => !mode); setAddNodeMode(false); setConnectSourceId(null); setTeleportMode(null); setCopyArrowMode(null); setPlacementPreview(null); }} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all active:scale-95 ${connectMode ? "border-[#3B82F6] bg-[#3B82F6]/15 text-white" : "border-[#2a2a35] bg-[#13131a] text-[#c4c4cc] hover:border-[#3B82F6]/60 hover:text-white"}`} title="Connect two nodes"><Link2 className="h-4 w-4" /><span>{connectMode ? (connectSourceId ? "Select target" : "Select source") : "Connect nodes"}</span></button>
        {connectMode && <button onClick={() => { setConnectMode(false); setConnectSourceId(null); }} className="rounded-lg border border-[#2a2a35] bg-[#13131a] p-2 text-[#8a8a95] hover:text-white" title="Cancel connection mode"><MousePointer2 className="h-4 w-4" /></button>}
        {teleportMode && <button onClick={() => setTeleportMode(null)} className="flex items-center gap-2 rounded-lg border border-[#8bb7ff] bg-[#8bb7ff]/15 px-3 py-2 text-xs text-white transition-all active:scale-95" title="Cancel teleport"><MousePointer2 className="h-4 w-4" />Teleport: tap empty space</button>}
        {copyArrowMode && <button onClick={() => setCopyArrowMode(null)} className="flex items-center gap-2 rounded-lg border border-[#8bb7ff] bg-[#8bb7ff]/15 px-3 py-2 text-xs text-white transition-all active:scale-95" title="Cancel copy arrow"><MousePointer2 className="h-4 w-4" />Copy: choose {copyArrowMode.copyMode === "head" ? "destination" : "source"}</button>}
        <button
          onClick={() => setSnapToGrid((enabled) => !enabled)}
          aria-pressed={snapToGrid}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all active:scale-95 ${snapToGrid ? "border-[#6f92ff] bg-[#4c7dff]/15 text-white" : "border-[#2a2a35] bg-[#13131a] text-[#9ba3b7] hover:border-[#3B82F6]/60 hover:text-white"}`}
          title={snapToGrid ? "Grid snap is on — drag to align nodes to dots" : "Grid snap is off — drag nodes freely"}
        >
          <Grid3X3 className="h-4 w-4" />Snap {snapToGrid ? "on" : "off"}
        </button>
        <div className="flex items-center gap-1 rounded-lg border border-[#2a2a35] bg-[#13131a] p-1">
          <button onClick={() => { if (canUndo) dispatch({ type: "UNDO" }); }} disabled={!canUndo} aria-disabled={!canUndo} className="rounded-md p-2 text-[#c4c4cc] transition-colors hover:bg-[#1e1e2a] hover:text-white disabled:pointer-events-none disabled:cursor-not-allowed disabled:text-[#4a4a56] disabled:hover:bg-transparent disabled:hover:text-[#4a4a56]" title="Undo"><Undo2 className="h-4 w-4" /></button>
          <button onClick={() => { if (canRedo) dispatch({ type: "REDO" }); }} disabled={!canRedo} aria-disabled={!canRedo} className="rounded-md p-2 text-[#c4c4cc] transition-colors hover:bg-[#1e1e2a] hover:text-white disabled:pointer-events-none disabled:cursor-not-allowed disabled:text-[#4a4a56] disabled:hover:bg-transparent disabled:hover:text-[#4a4a56]" title="Redo"><Redo2 className="h-4 w-4" /></button>
          <button onClick={() => { setConnectMode(false); setConnectSourceId(null); setTeleportMode(null); setCopyArrowMode(null); dispatch({ type: "RESET" }); toast.success("Demo roadmaps restored"); }} className="rounded-md p-2 text-[#c4c4cc] transition-colors hover:bg-[#1e1e2a] hover:text-white" title="Reset demo roadmaps"><RotateCcw className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2">
        <button onClick={() => zoomByFactor(0.8)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#2a2a35] bg-[#13131a] text-[#e4e4e7] transition-all hover:border-[#3a3a45] hover:bg-[#1a1a24] active:scale-95" title="Zoom in"><Plus className="h-5 w-5" strokeWidth={1.5} /></button>
        <button onClick={() => zoomByFactor(1.25)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#2a2a35] bg-[#13131a] text-[#e4e4e7] transition-all hover:border-[#3a3a45] hover:bg-[#1a1a24] active:scale-95" title="Zoom out"><Minus className="h-5 w-5" strokeWidth={1.5} /></button>
        <button onClick={fitToContent} className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#2a2a35] bg-[#13131a] text-[#e4e4e7] transition-all hover:border-[#3a3a45] hover:bg-[#1a1a24] active:scale-95" title="Fit all content"><Home className="h-5 w-5" strokeWidth={1.5} /></button>
      </div>

      {actionPanelTarget && <ActionPanel x={actionPanelScreenPos.x} y={actionPanelScreenPos.y} target={actionPanelTarget} tree={tree} dispatch={dispatch} onTeleport={beginTeleport} onCopyArrow={beginCopyArrow} onClose={() => setActionPanelTarget(null)} />}
      {popupNodeId && tree.nodeMap[popupNodeId] && <NodePopup
        node={tree.nodeMap[popupNodeId]}
        treeId={tree.id}
        dispatch={dispatch}
        onClose={() => { setPopupNodeId(null); setPendingPopupNodeId(null); }}
        switchTarget={pendingPopupNodeId ? tree.nodeMap[pendingPopupNodeId] ?? null : null}
        onSwitchTargetHandled={() => setPendingPopupNodeId(null)}
        onSwitchTo={(nodeId) => setPopupNodeId(nodeId)}
      />}
    </div>
  );
}
