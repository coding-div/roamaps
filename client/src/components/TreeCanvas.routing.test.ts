import { describe, expect, it } from "vitest";
import { getNodeBox } from "@/lib/collision";
import { allTrees, type NodeData, type TreeMap } from "@/lib/treeData";
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

  it("chooses an adjacent target side for the shortest legal one-bend L-route", () => {
    const source = {
      ...node("source", 0, 0),
      children: [{ targetId: "target", color: "blue" as const }],
    };
    const target = node("target", 180, -120);
    const tree: TreeMap = {
      id: "adjacent-side-l",
      title: "Adjacent-side L",
      description: "",
      root: source,
      nodeMap: { source, target },
      maxDepth: 1,
    };

    const [derived] = buildDerivedRoutes(tree);
    expect(derived.route.clean).toBe(true);
    expect(derived.route.targetDirection).toBe("down");
    expect(derived.route.points).toHaveLength(3);
    expect(derived.route.points[0].x).toBeGreaterThan(source.x);
    expect(derived.route.points[2].y).toBeGreaterThan(target.y);
  });

  it("plans three upward children as a stable symmetric fan-out", () => {
    const source = {
      ...node("source", 0, 0),
      children: [
        { targetId: "right", color: "blue" as const },
        { targetId: "centre", color: "blue" as const },
        { targetId: "left", color: "blue" as const },
      ],
    };
    const left = node("left", -180, -200);
    const centre = node("centre", 0, -200);
    const right = node("right", 180, -200);
    const tree: TreeMap = {
      id: "upward-fan-out",
      title: "Upward fan-out",
      description: "",
      root: source,
      nodeMap: { source, left, centre, right },
      maxDepth: 1,
    };

    const routes = new Map(buildDerivedRoutes(tree).map(({ target, route }) => [target.id, route]));
    const leftRoute = routes.get("left")!;
    const centreRoute = routes.get("centre")!;
    const rightRoute = routes.get("right")!;

    expect([leftRoute, centreRoute, rightRoute].every((route) => route.clean)).toBe(true);
    expect(centreRoute.points).toHaveLength(2);
    expect(centreRoute.targetDirection).toBe("down");
    // The centre child is an obstacle to the outer one-bend candidates, so
    // legal routing correctly retains two bends for the outer siblings.
    expect(leftRoute.points).toHaveLength(4);
    expect(rightRoute.points).toHaveLength(4);
    expect(leftRoute.targetDirection).toBe("down");
    expect(rightRoute.targetDirection).toBe("down");
    expect(leftRoute.points[0].x).toBeLessThan(centreRoute.points[0].x);
    expect(centreRoute.points[0].x).toBeLessThan(rightRoute.points[0].x);
    expect(leftRoute.points[1].x).toBe(leftRoute.points[0].x);
    expect(rightRoute.points[1].x).toBe(rightRoute.points[0].x);
  });

  it("uses the real Tree 2 fan-outs to prefer legal one-bend side pairs", () => {
    const tree2 = allTrees.find((tree) => tree.id === "tree-2");
    expect(tree2).toBeDefined();

    const routes = new Map(buildDerivedRoutes(tree2!).map(({ source, target, route }) => [`${source.id}->${target.id}`, route]));
    const upwardCentre = routes.get("t2-a1->t2-b3")!;
    const upwardLeft = routes.get("t2-a1->t2-b1")!;
    const upwardRight = routes.get("t2-a1->t2-b2")!;
    const leftUpper = routes.get("t2-a2->t2-b4")!;
    const leftLower = routes.get("t2-a2->t2-b5")!;

    expect([upwardCentre, upwardLeft, upwardRight, leftUpper, leftLower].every((route) => route.clean)).toBe(true);
    expect(upwardCentre.points).toHaveLength(2);
    expect([upwardLeft, upwardRight, leftUpper, leftLower].every((route) => route.points.length === 3)).toBe(true);
  });

  it("keeps repeated dense Tree 2 route derivation within the interaction budget", () => {
    const tree2 = allTrees.find((tree) => tree.id === "tree-2");
    expect(tree2).toBeDefined();
    const startedAt = performance.now();

    for (let run = 0; run < 10; run++) {
      expect(buildDerivedRoutes(tree2!).length).toBe(43);
    }

    // This deliberately has generous CI headroom while still rejecting the
    // former 350–1,000 ms full-map path that froze a tablet drag gesture.
    expect(performance.now() - startedAt).toBeLessThan(160);
  });
});
