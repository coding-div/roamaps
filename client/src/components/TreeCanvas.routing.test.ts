import { describe, expect, it } from "vitest";
import { getNodeBox } from "@/lib/collision";
import { allTrees, getAllEdges, type NodeData, type TreeMap } from "@/lib/treeData";
import { buildDerivedRoutes, buildEdgePortPlans, getOrthogonalRoute, resolveDraggedNodeCentre, snapNodeCentreToGrid, validateTeleportDestination } from "./TreeCanvas";

function node(id: string, x: number, y: number): NodeData {
  return { id, x, y, label: "", color: "blue", children: [], popupContent: "" };
}

function sharedSidePlans(tree: TreeMap, override: { nodeId: string; x: number; y: number }) {
  const rootId = tree.root?.id ?? null;
  const positionOf = (current: NodeData): NodeData => current.id === override.nodeId
    ? { ...current, x: override.x, y: override.y }
    : current;
  const positionedNodes = Object.values(tree.nodeMap).map(positionOf);
  const boxes = new Map(positionedNodes.map((current) => [current.id, getNodeBox(current, current.id === rootId)]));
  const edges = getAllEdges(tree).map(({ source, target }) => ({ source: positionOf(source), target: positionOf(target) }));
  return buildEdgePortPlans(edges, boxes, new Map());
}

describe("getOrthogonalRoute", () => {
  it("snaps node centres to the visible dot-grid intersections in both coordinate directions", () => {
    expect(snapNodeCentreToGrid({ x: 13, y: 31 })).toEqual({ x: 15, y: 45 });
    expect(snapNodeCentreToGrid({ x: -2, y: -31 })).toEqual({ x: -15, y: -45 });
    expect(snapNodeCentreToGrid({ x: 15, y: -15 })).toEqual({ x: 15, y: -15 });
  });

  it("keeps free-form node movement exact when optional grid snap is off", () => {
    const point = { x: 13, y: -31 };
    expect(resolveDraggedNodeCentre(point, false)).toEqual(point);
    expect(resolveDraggedNodeCentre(point, true)).toEqual({ x: 15, y: -45 });
  });

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

  it("keeps the real Tree 2 fan-outs clean and orthogonal after shared-side ports are rebalanced", () => {
    const tree2 = allTrees.find((tree) => tree.id === "tree-2");
    expect(tree2).toBeDefined();

    const routes = new Map(buildDerivedRoutes(tree2!).map(({ source, target, route }) => [`${source.id}->${target.id}`, route]));
    const upwardCentre = routes.get("t2-a1->t2-b3")!;
    const upwardLeft = routes.get("t2-a1->t2-b1")!;
    const upwardRight = routes.get("t2-a1->t2-b2")!;
    const leftUpper = routes.get("t2-a2->t2-b4")!;
    const leftLower = routes.get("t2-a2->t2-b5")!;

    const selectedRoutes = [upwardCentre, upwardLeft, upwardRight, leftUpper, leftLower];
    expect(selectedRoutes.every((route) => route.clean)).toBe(true);
    for (const route of selectedRoutes) {
      for (const [index, point] of route.points.slice(1).entries()) {
        const previous = route.points[index];
        expect(point.x === previous.x || point.y === previous.y).toBe(true);
      }
    }
  });

  it("allocates Tree 1 incoming and outgoing top-side endpoints together instead of at one midpoint", () => {
    const tree1 = allTrees.find((tree) => tree.id === "tree-1");
    expect(tree1).toBeDefined();

    const plans = sharedSidePlans(tree1!, { nodeId: "t1-c1", x: -140, y: 20 });
    const incoming = plans.get("t1-root->t1-c1")!.targetPorts.find((port) => port.direction === "up")!;
    const outgoing = plans.get("t1-c1->t1-c4")!.sourcePorts.find((port) => port.direction === "up")!;
    const secondOutgoing = plans.get("t1-c1->t1-c5")!.sourcePorts.find((port) => port.direction === "up")!;

    expect(incoming.point.y).toBe(2);
    expect(outgoing.point.y).toBe(2);
    expect(incoming.point.x).not.toBe(outgoing.point.x);
    expect([incoming.point.x, outgoing.point.x, secondOutgoing.point.x].sort((a, b) => a - b)).toEqual([-165, -140, -115]);
  });

  it("allocates Tree 2 shared top-side fan-in and fan-out ports as one evenly spaced pool", () => {
    const tree2 = allTrees.find((tree) => tree.id === "tree-2");
    expect(tree2).toBeDefined();

    const plans = sharedSidePlans(tree2!, { nodeId: "t2-a1", x: 0, y: 120 });
    const endpoints = [
      plans.get("t2-root->t2-a1")!.targetPorts.find((port) => port.direction === "up")!,
      plans.get("t2-a1->t2-b1")!.sourcePorts.find((port) => port.direction === "up")!,
      plans.get("t2-a1->t2-b2")!.sourcePorts.find((port) => port.direction === "up")!,
      plans.get("t2-a1->t2-b3")!.sourcePorts.find((port) => port.direction === "up")!,
    ];

    expect(endpoints.every((port) => port.point.y === 102)).toBe(true);
    expect(new Set(endpoints.map((port) => port.point.x)).size).toBe(4);
    expect(endpoints.map((port) => port.point.x).sort((a, b) => a - b)).toEqual([-30, -10, 10, 30]);
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

  it("accepts a Teleport to a valid empty position", () => {
    const root = node("root", 0, 0);
    const movable = node("movable", 220, 0);
    const tree: TreeMap = { id: "teleport-valid", title: "Teleport", description: "", root, nodeMap: { root, movable }, maxDepth: 1 };

    expect(validateTeleportDestination(tree, "movable", { x: 320, y: 180 })).toEqual({ valid: true, reason: null });
  });

  it("rejects a Teleport to an occupied position", () => {
    const root = node("root", 0, 0);
    const movable = node("movable", 220, 0);
    const tree: TreeMap = { id: "teleport-occupied", title: "Teleport", description: "", root, nodeMap: { root, movable }, maxDepth: 1 };

    expect(validateTeleportDestination(tree, "movable", { x: 0, y: 0 })).toEqual({ valid: false, reason: "node-overlap" });
  });

  it("gives copy-arrow members a common port and a shared clean trunk", () => {
    const source = {
      ...node("source", 0, 0),
      children: [
        { targetId: "upper", color: "blue" as const, groupId: "copy-1" },
        { targetId: "lower", color: "red" as const, groupId: "copy-1" },
      ],
    };
    const upper = node("upper", 300, -80);
    const lower = node("lower", 300, 80);
    const tree: TreeMap = { id: "copy-trunk", title: "Copy", description: "", root: source, nodeMap: { source, upper, lower }, maxDepth: 1 };
    const routes = buildDerivedRoutes(tree);

    expect(routes).toHaveLength(2);
    expect(routes.every(({ route }) => route.clean)).toBe(true);
    expect(routes[0].route.points[0]).toEqual(routes[1].route.points[0]);
    expect(routes[0].groupId).toBe("copy-1");
    expect(routes[1].groupId).toBe("copy-1");
  });

  it("uses one vertical departure trunk when Head-copy destinations are both above their source", () => {
    const source = {
      ...node("source", 0, 0),
      children: [
        { targetId: "upperLeft", color: "blue" as const, groupId: "copy-up" },
        { targetId: "upperRight", color: "red" as const, groupId: "copy-up" },
      ],
    };
    const upperLeft = node("upperLeft", -260, -220);
    const upperRight = node("upperRight", 260, -220);
    const tree: TreeMap = { id: "copy-up-trunk", title: "Copy", description: "", root: source, nodeMap: { source, upperLeft, upperRight }, maxDepth: 1 };
    const routes = buildDerivedRoutes(tree).map(({ route }) => route);

    expect(routes.every((route) => route.clean)).toBe(true);
    expect(routes[0].points[0]).toEqual(routes[1].points[0]);
    expect(routes[0].points[1]).toEqual(routes[1].points[1]);
    expect(routes[0].points[1].y).toBeLessThan(routes[0].points[0].y);
  });

  it("uses one horizontal departure trunk when Head-copy destinations are both right of their source", () => {
    const source = {
      ...node("source", 0, 0),
      children: [
        { targetId: "rightUpper", color: "blue" as const, groupId: "copy-right" },
        { targetId: "rightLower", color: "red" as const, groupId: "copy-right" },
      ],
    };
    const rightUpper = node("rightUpper", 280, -150);
    const rightLower = node("rightLower", 280, 150);
    const tree: TreeMap = { id: "copy-right-trunk", title: "Copy", description: "", root: source, nodeMap: { source, rightUpper, rightLower }, maxDepth: 1 };
    const routes = buildDerivedRoutes(tree).map(({ route }) => route);

    expect(routes.every((route) => route.clean)).toBe(true);
    expect(routes[0].points[0]).toEqual(routes[1].points[0]);
    expect(routes[0].points[1]).toEqual(routes[1].points[1]);
    expect(routes[0].points[1].x).toBeGreaterThan(routes[0].points[0].x);
  });

  it("uses one shared target-side trunk for Tail copies whose sources are both above the destination", () => {
    const root = node("root", -900, 900);
    const upperLeft = {
      ...node("upper-left", -220, -240),
      children: [{ targetId: "target", color: "blue" as const, groupId: "copy-target-up" }],
    };
    const upperRight = {
      ...node("upper-right", 220, -240),
      children: [{ targetId: "target", color: "red" as const, groupId: "copy-target-up" }],
    };
    const target = node("target", 0, 0);
    const tree: TreeMap = { id: "copy-target-trunk", title: "Copy", description: "", root, nodeMap: { root, upperLeft, upperRight, target }, maxDepth: 1 };
    const routes = buildDerivedRoutes(tree).map(({ route }) => route);

    expect(routes.every((route) => route.clean)).toBe(true);
    expect(routes[0].points.at(-1)).toEqual(routes[1].points.at(-1));
    expect(routes[0].points.at(-2)).toEqual(routes[1].points.at(-2));
    expect(routes[0].points.at(-2)!.y).toBeLessThan(routes[0].points.at(-1)!.y);
  });

  it("prefers the shorter shared trunk when equally good diagonal copy directions are available", () => {
    const source = {
      ...node("source", 0, 0),
      children: [
        { targetId: "upperRightWide", color: "blue" as const, groupId: "copy-diagonal" },
        { targetId: "upperRightTall", color: "red" as const, groupId: "copy-diagonal" },
      ],
    };
    // Both targets are above-right. A right or an up trunk gives the same
    // bends and total route length; the right trunk is shorter.
    const upperRightWide = node("upperRightWide", 300, -180);
    const upperRightTall = node("upperRightTall", 180, -300);
    const tree: TreeMap = { id: "copy-diagonal-trunk", title: "Copy", description: "", root: source, nodeMap: { source, upperRightWide, upperRightTall }, maxDepth: 1 };
    const routes = buildDerivedRoutes(tree).map(({ route }) => route);

    expect(routes.every((route) => route.clean)).toBe(true);
    expect(routes[0].points[0]).toEqual(routes[1].points[0]);
    // The wider branch continues horizontally after the shorter branch splits.
    // Their collinear first segments still overlap from their shared port to
    // x=180, so rendering extracts a 100-unit rightward trunk from the
    // root's wider right-side port.
    expect(routes[0].points[1].y).toBe(routes[0].points[0].y);
    expect(routes[1].points[1].y).toBe(routes[1].points[0].y);
    expect(routes[0].points[1].x).toBeGreaterThan(routes[0].points[0].x);
    expect(routes[1].points[1].x).toBeGreaterThan(routes[1].points[0].x);
    const sharedTrunk = Math.min(
      Math.abs(routes[0].points[1].x - routes[0].points[0].x),
      Math.abs(routes[1].points[1].x - routes[1].points[0].x),
    );
    expect(sharedTrunk).toBe(100);
  });

  it("lets a copy group separate when its members no longer share a physical port", () => {
    const source = {
      ...node("source", 0, 0),
      children: [
        { targetId: "right", color: "blue" as const, groupId: "copy-2" },
        { targetId: "left", color: "red" as const, groupId: "copy-2" },
      ],
    };
    const right = node("right", 300, 0);
    const left = node("left", -300, 0);
    const tree: TreeMap = { id: "copy-separate", title: "Copy", description: "", root: source, nodeMap: { source, right, left }, maxDepth: 1 };
    const routes = buildDerivedRoutes(tree);

    expect(routes.every(({ route }) => route.clean)).toBe(true);
    expect(routes[0].route.points[0]).not.toEqual(routes[1].route.points[0]);
  });
});
