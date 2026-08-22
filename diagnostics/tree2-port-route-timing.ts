import { getNodeBox } from "../client/src/lib/collision";
import { findProgressivePrototypeRoute, type PrototypePort } from "../client/src/lib/progressiveRouter";
import { allTrees, getAllEdges, getAllNodes, type Direction, type NodeData } from "../client/src/lib/treeData";

function directionTowards(from: NodeData, to: NodeData): Direction {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
  return dy >= 0 ? "down" : "up";
}

function opposite(direction: Direction): Direction {
  return direction === "up" ? "down" : direction === "down" ? "up" : direction === "left" ? "right" : "left";
}

function port(node: NodeData, box: ReturnType<typeof getNodeBox>, direction: Direction, index: number, total: number): PrototypePort {
  const ratio = (index + 1) / (total + 1);
  if (direction === "up") return { direction, point: { x: box.x + box.w * ratio, y: box.y } };
  if (direction === "down") return { direction, point: { x: box.x + box.w * ratio, y: box.y + box.h } };
  if (direction === "left") return { direction, point: { x: box.x, y: box.y + box.h * ratio } };
  return { direction, point: { x: box.x + box.w, y: box.y + box.h * ratio } };
}

const tree = allTrees.find((item) => item.id === "tree-2")!;
const nodes = getAllNodes(tree);
const edges = getAllEdges(tree).sort((a, b) => `${a.source.id}->${a.target.id}`.localeCompare(`${b.source.id}->${b.target.id}`));
const rootId = tree.root?.id;
const boxes = new Map(nodes.map((node) => [node.id, getNodeBox(node, node.id === rootId)]));
const endpoints = edges.flatMap(({ source, target }) => [
  { key: `${source.id}->${target.id}`, role: "source" as const, node: source, direction: directionTowards(source, target) },
  { key: `${source.id}->${target.id}`, role: "target" as const, node: target, direction: opposite(directionTowards(source, target)) },
]);
const groups = new Map<string, typeof endpoints>();
for (const endpoint of endpoints) {
  const group = groups.get(`${endpoint.node.id}:${endpoint.direction}`) ?? [];
  group.push(endpoint);
  groups.set(`${endpoint.node.id}:${endpoint.direction}`, group);
}
const plans = new Map<string, { sourcePort?: PrototypePort; targetPort?: PrototypePort }>();
for (const group of groups.values()) {
  group.sort((a, b) => a.key.localeCompare(b.key) || a.role.localeCompare(b.role));
  group.forEach((endpoint, index) => {
    const plan = plans.get(endpoint.key) ?? {};
    plan[endpoint.role === "source" ? "sourcePort" : "targetPort"] = port(endpoint.node, boxes.get(endpoint.node.id)!, endpoint.direction, index, group.length);
    plans.set(endpoint.key, plan);
  });
}
for (const { source, target } of edges) {
  const key = `${source.id}->${target.id}`;
  const plan = plans.get(key)!;
  const obstacles = nodes.filter((node) => node.id !== source.id && node.id !== target.id).map((node) => boxes.get(node.id)!);
  const started = performance.now();
  const result = findProgressivePrototypeRoute(
    { id: source.id, x: source.x, y: source.y, box: boxes.get(source.id)! },
    { id: target.id, x: target.x, y: target.y, box: boxes.get(target.id)! },
    obstacles,
    { maxBends: 5, sourcePorts: [plan.sourcePort!], targetPorts: [plan.targetPort!] },
  );
  console.log(JSON.stringify({ key, found: result.found, bends: result.bends, elapsedMs: +(performance.now() - started).toFixed(2) }));
}
