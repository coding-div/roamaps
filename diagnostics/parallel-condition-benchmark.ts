import { buildDerivedRoutes } from "../client/src/components/TreeCanvas";
import { getNodeBox } from "../client/src/lib/collision";
import { findProgressivePrototypeRoute } from "../client/src/lib/progressiveRouter";
import { getAllEdges, getAllNodes, tree2 } from "../client/src/lib/treeData";

function deriveWithoutParallelLaneChecks() {
  const nodes = getAllNodes(tree2);
  const rootId = tree2.root?.id ?? null;
  const boxes = new Map(nodes.map((node) => [node.id, getNodeBox(node, node.id === rootId)]));
  const edges = [...getAllEdges(tree2)].sort((a, b) => `${a.source.id}->${a.target.id}`.localeCompare(`${b.source.id}->${b.target.id}`));
  return edges.map(({ source, target }) => {
    const sourceBox = boxes.get(source.id)!;
    const targetBox = boxes.get(target.id)!;
    const obstacles = nodes.filter((node) => node.id !== source.id && node.id !== target.id).map((node) => boxes.get(node.id)!);
    return findProgressivePrototypeRoute(
      { id: source.id, x: source.x, y: source.y, box: sourceBox },
      { id: target.id, x: target.x, y: target.y, box: targetBox },
      obstacles,
      { maxBends: 5 },
    );
  });
}

function measure(label: string, work: () => unknown) {
  const samples: number[] = [];
  let result: unknown;
  for (let index = 0; index < 8; index += 1) {
    const started = performance.now();
    result = work();
    samples.push(performance.now() - started);
  }
  samples.sort((a, b) => a - b);
  return { label, routes: Array.isArray(result) ? result.length : 0, medianMs: Number(samples[Math.floor(samples.length / 2)].toFixed(2)), slowestMs: Number(samples[samples.length - 1].toFixed(2)), samples: samples.map((sample) => Number(sample.toFixed(2))) };
}

console.log(JSON.stringify([
  measure("current derived routes with parallel-lane post-check", () => buildDerivedRoutes(tree2)),
  measure("same progressive routing with parallel-lane post-check omitted", deriveWithoutParallelLaneChecks),
], null, 2));
