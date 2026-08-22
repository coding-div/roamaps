import { buildDerivedRoutes } from "../client/src/components/TreeCanvas";
import { getNodeBox } from "../client/src/lib/collision";
import { getAllNodes, tree1, tree2, type TreeMap } from "../client/src/lib/treeData";

const GRID_SIZE = Number(process.env.GRID_SIZE ?? "12");
const SAMPLE_COUNT = Number(process.env.SAMPLE_COUNT ?? "8");

type Point = { x: number; y: number };
type Segment = { a: Point; b: Point };

function cellKey(x: number, y: number) {
  return `${Math.floor(x / GRID_SIZE)},${Math.floor(y / GRID_SIZE)}`;
}

function addRectCells(cells: Set<string>, box: { x: number; y: number; w: number; h: number }) {
  const endX = box.x + box.w - Number.EPSILON;
  const endY = box.y + box.h - Number.EPSILON;
  for (let x = Math.floor(box.x / GRID_SIZE); x <= Math.floor(endX / GRID_SIZE); x += 1) {
    for (let y = Math.floor(box.y / GRID_SIZE); y <= Math.floor(endY / GRID_SIZE); y += 1) {
      cells.add(`${x},${y}`);
    }
  }
}

function addSegmentCells(cells: Set<string>, segment: Segment) {
  const horizontal = Math.abs(segment.a.y - segment.b.y) < 0.001;
  const start = horizontal ? Math.min(segment.a.x, segment.b.x) : Math.min(segment.a.y, segment.b.y);
  const end = horizontal ? Math.max(segment.a.x, segment.b.x) : Math.max(segment.a.y, segment.b.y);
  for (let value = start; value <= end + 0.001; value += GRID_SIZE) {
    const point = horizontal ? { x: value, y: segment.a.y } : { x: segment.a.x, y: value };
    cells.add(cellKey(point.x, point.y));
  }
  cells.add(cellKey(segment.b.x, segment.b.y));
}

function hasEndpointInCell(points: Point[], cell: string) {
  return cellKey(points[0].x, points[0].y) === cell || cellKey(points.at(-1)!.x, points.at(-1)!.y) === cell;
}

function measure(label: string, work: () => unknown) {
  const samples: number[] = [];
  let result: unknown;
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const started = performance.now();
    result = work();
    samples.push(performance.now() - started);
  }
  samples.sort((a, b) => a - b);
  return {
    label,
    medianMs: Number(samples[Math.floor(samples.length / 2)].toFixed(2)),
    slowestMs: Number(samples.at(-1)!.toFixed(2)),
    result,
  };
}

function evaluateGrid(tree: TreeMap) {
  const nodes = getAllNodes(tree);
  const rootId = tree.root?.id ?? null;
  const nodeCells = new Map<string, Set<string>>();
  for (const node of nodes) {
    const cells = new Set<string>();
    addRectCells(cells, getNodeBox(node, node.id === rootId));
    nodeCells.set(node.id, cells);
  }

  const derivedRoutes = buildDerivedRoutes(tree);
  const laneUsers = new Map<string, string[]>();
  const routePoints = new Map<string, Point[]>();
  for (const { sourceNode, targetNode, route } of derivedRoutes) {
    const id = `${sourceNode.id}->${targetNode.id}`;
    routePoints.set(id, route.points);
    for (let index = 1; index < route.points.length; index += 1) {
      const segmentCells = new Set<string>();
      addSegmentCells(segmentCells, { a: route.points[index - 1], b: route.points[index] });
      for (const cell of segmentCells) {
        const users = laneUsers.get(cell) ?? [];
        if (!users.includes(id)) users.push(id);
        laneUsers.set(cell, users);
      }
    }
  }

  let nodeArrowSharedCells = 0;
  for (const cells of nodeCells.values()) {
    for (const cell of cells) if (laneUsers.has(cell)) nodeArrowSharedCells += 1;
  }
  const sharedArrowCells = [...laneUsers.entries()].filter(([, users]) => users.length > 1);
  const endpointOnlySharedCells = sharedArrowCells.filter(([cell, users]) => users.every((id) => hasEndpointInCell(routePoints.get(id)!, cell)));
  const strictRuleFalseRejections = sharedArrowCells.length - endpointOnlySharedCells.length;

  return {
    nodes: nodes.length,
    arrows: derivedRoutes.length,
    nodeCells: [...nodeCells.values()].reduce((total, cells) => total + cells.size, 0),
    arrowLaneCells: laneUsers.size,
    allowedNodeArrowSharedCells: nodeArrowSharedCells,
    sharedArrowCells: sharedArrowCells.length,
    endpointOnlySharedCells: endpointOnlySharedCells.length,
    strictRuleFalseRejections,
  };
}

const reports = [tree1, tree2].map((tree) => {
  const current = measure("current exact derived routes", () => buildDerivedRoutes(tree));
  const grid = measure("12-unit unified occupancy bookkeeping", () => evaluateGrid(tree));
  return {
    tree: tree.name,
    currentMedianMs: current.medianMs,
    gridTotalMedianMs: grid.medianMs,
    gridBookkeepingMedianMs: Number((grid.medianMs - current.medianMs).toFixed(2)),
    occupancy: grid.result,
  };
});

console.log(JSON.stringify({ gridSize: GRID_SIZE, reports }, null, 2));
