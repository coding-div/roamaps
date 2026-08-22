import { buildDerivedRoutes } from "../client/src/components/TreeCanvas";
import { tree1, tree2, type TreeMap } from "../client/src/lib/treeData";

function cloneTree(tree: TreeMap): TreeMap {
  return structuredClone(tree);
}

function inspect(label: string, tree: TreeMap, override: { nodeId: string; x: number; y: number }, edgeIds: string[]) {
  const routes = buildDerivedRoutes(tree, override);
  const selected = routes.filter((entry) => edgeIds.includes(`${entry.source.id}->${entry.target.id}`));
  console.log(label, JSON.stringify(selected.map((entry) => ({
    edge: `${entry.source.id}->${entry.target.id}`,
    clean: entry.route.clean,
    points: entry.route.points,
  })), null, 2));
}

inspect(
  "Tree 1: c5 receives from c1 and leaves toward c7 through its top side",
  cloneTree(tree1),
  { nodeId: "t1-c5", x: 0, y: 100 },
  ["t1-c1->t1-c5", "t1-c5->t1-c7"],
);

inspect(
  "Tree 2: a1 receives from root and leaves toward upper children through its top side",
  cloneTree(tree2),
  { nodeId: "t2-a1", x: 0, y: 120 },
  ["t2-root->t2-a1", "t2-a1->t2-b1", "t2-a1->t2-b2", "t2-a1->t2-b3"],
);

inspect(
  "Tree 1: c1 shared-side reproduction after port allocation",
  cloneTree(tree1),
  { nodeId: "t1-c1", x: -140, y: 20 },
  ["t1-root->t1-c1", "t1-c1->t1-c4"],
);

function samePoint(a: { x: number; y: number }, b: { x: number; y: number }) {
  return a.x === b.x && a.y === b.y;
}

function findTree1Collision(nodeId: string) {
  const tree = cloneTree(tree1);
  const incoming = Object.values(tree.nodeMap).flatMap((node) => node.children
    .filter((child) => child.targetId === nodeId)
    .map(() => `${node.id}->${nodeId}`));
  const outgoing = tree.nodeMap[nodeId].children.map((child) => `${nodeId}->${child.targetId}`);
  for (let x = -260; x <= 260; x += 20) {
    for (let y = -560; y <= 140; y += 20) {
      const routes = buildDerivedRoutes(tree, { nodeId, x, y });
      const byEdge = new Map(routes.map((entry) => [`${entry.source.id}->${entry.target.id}`, entry]));
      for (const inputKey of incoming) {
        const input = byEdge.get(inputKey)?.route;
        if (!input || input.points.length < 2) continue;
        for (const outputKey of outgoing) {
          const output = byEdge.get(outputKey)?.route;
          if (!output || output.points.length < 2) continue;
          if (samePoint(input.points[input.points.length - 1], output.points[0])) {
            const finding = { nodeId, x, y, inputKey, outputKey, port: input.points[input.points.length - 1], inputClean: input.clean, outputClean: output.clean };
            if (input.clean && output.clean) {
              console.log("Tree 1 shared-side collision in clean routes", finding);
              return;
            }
            console.log("Tree 1 raw fallback coincidence is rejected by the live baseline guard", finding);
            return;
          }
        }
      }
    }
  }
}

findTree1Collision("t1-c1");
findTree1Collision("t1-c3");
findTree1Collision("t1-c5");
