import { buildDerivedRoutes } from "../client/src/components/TreeCanvas";
import { canPlaceNode, getNodeBox, type Box, type Point } from "../client/src/lib/collision";
import { tree1, type NodeData, type TreeMap } from "../client/src/lib/treeData";

type Segment = { a: Point; b: Point };

function isHorizontal(segment: Segment): boolean {
  return segment.a.y === segment.b.y;
}

function overlapLength(a1: number, a2: number, b1: number, b2: number): number {
  return Math.min(Math.max(a1, a2), Math.max(b1, b2)) - Math.max(Math.min(a1, a2), Math.min(b1, b2));
}

function parallelConflict(a: Segment, b: Segment, padding = 6): boolean {
  if (isHorizontal(a) !== isHorizontal(b)) return false;
  if (isHorizontal(a)) return Math.abs(a.a.y - b.a.y) <= padding && overlapLength(a.a.x, a.b.x, b.a.x, b.b.x) > 0;
  return Math.abs(a.a.x - b.a.x) <= padding && overlapLength(a.a.y, a.b.y, b.a.y, b.b.y) > 0;
}

function key(sourceId: string, targetId: string) {
  return `${sourceId}->${targetId}`;
}

function segments(points: Point[]): Segment[] {
  return points.slice(1).map((point, index) => ({ a: points[index], b: point }));
}

function overlapsTargetBoundary(segment: Segment, box: Box): boolean {
  if (segment.a.x === segment.b.x) {
    const onVerticalBoundary = segment.a.x === box.x || segment.a.x === box.x + box.w;
    const low = Math.min(segment.a.y, segment.b.y);
    const high = Math.max(segment.a.y, segment.b.y);
    return onVerticalBoundary && high > box.y && low < box.y + box.h;
  }
  const onHorizontalBoundary = segment.a.y === box.y || segment.a.y === box.y + box.h;
  const low = Math.min(segment.a.x, segment.b.x);
  const high = Math.max(segment.a.x, segment.b.x);
  return onHorizontalBoundary && high > box.x && low < box.x + box.w;
}

function candidateIntroducesProblem(baseline: Map<string, { clean: boolean }>, candidateTree: TreeMap): Array<unknown> {
  const routes = buildDerivedRoutes(candidateTree);
  return routes
    .filter(({ source, target, route }) => baseline.get(key(source.id, target.id))?.clean && !route.clean)
    .map(({ source, target, route }) => ({
      edge: key(source.id, target.id),
      points: route.points,
      parallelConflictsWith: routes
        .filter((other) => key(other.source.id, other.target.id) !== key(source.id, target.id))
        .filter((other) => segments(route.points).some((segment) => segments(other.route.points).some((otherSegment) => parallelConflict(segment, otherSegment))))
        .map((other) => key(other.source.id, other.target.id)),
    }));
}

function withMove(tree: TreeMap, nodeId: string, x: number, y: number): TreeMap {
  const nodeMap = Object.fromEntries(
    Object.entries(tree.nodeMap).map(([id, node]) => [id, id === nodeId ? { ...node, x, y } : { ...node }]),
  ) as Record<string, NodeData>;
  return { ...tree, nodeMap, root: tree.root ? nodeMap[tree.root.id] : null };
}

const baselineTree = structuredClone(tree1);
const baselineRoutes = buildDerivedRoutes(baselineTree);
const baseline = new Map(baselineRoutes.map(({ source, target, route }) => [key(source.id, target.id), route]));

console.log("DEFAULT TREE 1 ROUTES");
for (const { source, target, route } of baselineRoutes) {
  const targetBox = getNodeBox(target, target.id === baselineTree.root?.id);
  const boundarySegments = segments(route.points)
    .slice(0, -1)
    .filter((segment) => overlapsTargetBoundary(segment, targetBox));
  console.log(JSON.stringify({ edge: key(source.id, target.id), clean: route.clean, points: route.points, targetBoundaryHug: boundarySegments }));
}

console.log("\nVALID NODE MOVES THAT THE CURRENT CLEANNESS GATE REJECTS");
const offsets = [-180, -120, -60, 60, 120, 180];
let found = 0;
for (const node of Object.values(baselineTree.nodeMap)) {
  if (node.id === baselineTree.root?.id) continue;
  for (const dx of offsets) {
    for (const dy of offsets) {
      const candidate = { ...node, x: node.x + dx, y: node.y + dy };
      if (!canPlaceNode(candidate, Object.values(baselineTree.nodeMap), baselineTree.root?.id ?? null, node.id)) continue;
      const movedTree = withMove(baselineTree, node.id, candidate.x, candidate.y);
      const affected = candidateIntroducesProblem(baseline, movedTree);
      if (affected.length === 0) continue;
      console.log(JSON.stringify({ moved: node.id, to: { x: candidate.x, y: candidate.y }, affected }));
      found += 1;
      if (found >= 12) process.exit(0);
    }
  }
}
console.log(JSON.stringify({ found }));
