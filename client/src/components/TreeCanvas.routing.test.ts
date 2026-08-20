import { describe, expect, it } from "vitest";
import { getNodeBox } from "@/lib/collision";
import { allTrees, type NodeData } from "@/lib/treeData";
import { buildDerivedRoutes, getOrthogonalRoute } from "./TreeCanvas";

function node(id: string, x: number, y: number): NodeData {
  return { id, x, y, label: "", color: "blue", children: [], popupContent: "" };
}

describe("getOrthogonalRoute", () => {
  it("uses a clear boundary lane when a third node blocks a vertical route", () => {
    const source = { ...node("source", 0, 0), label: "Main Topic" };
    const target = node("target", 0, -180);
    const blocker = node("blocker", 0, -90);

    const route = getOrthogonalRoute(
      source,
      target,
      getNodeBox(source, true),
      getNodeBox(target, false),
      [getNodeBox(blocker, false)]
    );

    expect(route.clean).toBe(true);
    // Normal blocker half-width is 50; the progressive router keeps the
    // route on its padded boundary at 60, which is a legal ten-unit gap.
    expect(route.points.some((point) => Math.abs(point.x) >= 60)).toBe(true);
  });

  it("never renders a diagonal segment in the dense Tree 2 roadmap", () => {
    const tree2 = allTrees.find((tree) => tree.id === "tree-2");
    expect(tree2).toBeDefined();

    const routes = buildDerivedRoutes(tree2!);
    expect(routes.length).toBeGreaterThan(0);
    for (const { source, target, route } of routes) {
      for (const [index, point] of route.points.slice(1).entries()) {
        const previous = route.points[index];
        expect(
          point.x === previous.x || point.y === previous.y,
          `${source.id}->${target.id} has a diagonal segment from (${previous.x}, ${previous.y}) to (${point.x}, ${point.y})`
        ).toBe(true);
      }
    }
  });
});
