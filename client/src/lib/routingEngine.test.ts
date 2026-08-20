import { describe, expect, it } from "vitest";
import { getNodeBox } from "@/lib/collision";
import { tree2, type NodeData, type TreeMap } from "@/lib/treeData";
import { findConservativelyAffectedRouteKeys } from "./affectedRoutes";
import { buildDerivedRoutes, getOrthogonalRoute, toSegments, verifyRoute } from "./routingEngine";
import { getSlowReferenceRouteLength } from "./routingReference";

function node(id: string, x: number, y: number): NodeData {
  return { id, x, y, label: "", color: "blue", children: [], popupContent: "" };
}

describe("verifyRoute", () => {
  it("rejects a route that shares a parallel lane with an existing arrow", () => {
    const result = verifyRoute(
      [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      [],
      [{ a: { x: 40, y: 6 }, b: { x: 140, y: 6 } }],
    );
    expect(result.clean).toBe(false);
    expect(result.reasons).toContain("parallelOverlap");
  });

  it("accepts exactly the approved 12-unit centre-line lane separation", () => {
    const result = verifyRoute(
      [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      [],
      [{ a: { x: 40, y: 12 }, b: { x: 140, y: 12 } }],
    );
    expect(result.clean).toBe(true);
  });

  it("rejects a route that uses a node boundary point but leaves in the wrong perpendicular direction", () => {
    const source = node("source", 0, 0);
    const target = node("target", 300, 0);
    const result = verifyRoute(
      [{ x: -50, y: 0 }, { x: 250, y: 0 }],
      [],
      [],
      { source, target, sourceBox: getNodeBox(source, false), targetBox: getNodeBox(target, false) },
    );

    expect(result.clean).toBe(false);
    expect(result.reasons).toContain("endpointAttachment");
  });
});

describe("exact orthogonal route search", () => {
  it("keeps an unobstructed aligned connection as a direct two-point route", () => {
    const source = node("source", 0, 0);
    const target = node("target", 300, 0);
    const route = getOrthogonalRoute(source, target, getNodeBox(source, false), getNodeBox(target, false), []);

    expect(route.clean).toBe(true);
    expect(route.points).toHaveLength(2);
    expect(verifyRoute(route.points, []).clean).toBe(true);
  });

  it("routes both directions between a node pair without sharing a parallel lane", () => {
    const left = { ...node("left", 0, 0), children: [{ targetId: "right", color: "blue" as const }] };
    const right = { ...node("right", 300, 0), children: [{ targetId: "left", color: "green" as const }] };
    const tree: TreeMap = { id: "reverse", title: "", description: "", root: null, nodeMap: { left, right }, maxDepth: 1 };
    const routes = buildDerivedRoutes(tree);

    expect(routes).toHaveLength(2);
    expect(routes.every((entry) => entry.route.clean)).toBe(true);
    expect(verifyRoute(routes[1].route.points, [], toSegments(routes[0].route.points)).clean).toBe(true);
  });

  it("routes the replacement connection cleanly after an intermediate node is deleted and its path is reconnected", () => {
    const source = { ...node("source", -180, 0), children: [{ targetId: "target", color: "blue" as const }] };
    const target = node("target", 180, 0);
    const reconnectedTree: TreeMap = { id: "reconnected", title: "", description: "", root: null, nodeMap: { source, target }, maxDepth: 1 };

    const routes = buildDerivedRoutes(reconnectedTree);

    expect(routes).toHaveLength(1);
    expect(routes[0].source.id).toBe("source");
    expect(routes[0].target.id).toBe("target");
    expect(routes[0].route.clean).toBe(true);
    expect(routes[0].route.points).toHaveLength(2);
  });

  it("allows close, non-overlapping nodes when the available direct arrow segment is legal", () => {
    const source = node("source", 0, 0);
    const target = node("target", 120, 0);
    const route = getOrthogonalRoute(source, target, getNodeBox(source, false), getNodeBox(target, false), []);

    expect(route.clean).toBe(true);
    expect(route.points).toHaveLength(2);
  });

  it("returns a non-clean route when every legal departure lane is blocked", () => {
    const source = node("source", 0, 0);
    const target = node("target", 250, 250);
    const blockers = [
      { x: 70, y: -40, w: 40, h: 80 },
      { x: -110, y: -40, w: 40, h: 80 },
      { x: -40, y: -110, w: 80, h: 80 },
      { x: -40, y: 30, w: 80, h: 80 },
    ];
    const route = getOrthogonalRoute(source, target, getNodeBox(source, false), getNodeBox(target, false), blockers);

    expect(route.clean).toBe(false);
  });

  it("finds a clean detour around multiple blockers rather than crossing either node", () => {
    const source = node("source", -200, 0);
    const target = node("target", 200, 0);
    const blockers = [getNodeBox(node("blocker-a", -80, 0), false), getNodeBox(node("blocker-b", 80, 0), false)];
    const route = getOrthogonalRoute(source, target, getNodeBox(source, false), getNodeBox(target, false), blockers);

    expect(route.clean).toBe(true);
    expect(route.points.length).toBeGreaterThanOrEqual(4);
    expect(verifyRoute(route.points, blockers).clean).toBe(true);
  });

  it("matches the independent slow solver’s shortest legal route length", () => {
    const source = node("source", -200, 0);
    const target = node("target", 200, 0);
    const blockers = [getNodeBox(node("blocker-a", -80, 0), false), getNodeBox(node("blocker-b", 80, 0), false)];
    const production = getOrthogonalRoute(source, target, getNodeBox(source, false), getNodeBox(target, false), blockers);
    const referenceLength = getSlowReferenceRouteLength(source, target, getNodeBox(source, false), getNodeBox(target, false), blockers);

    expect(production.clean).toBe(true);
    expect(referenceLength).not.toBeNull();
    expect(production.points.slice(1).reduce((total, point, index) => total + Math.abs(point.x - production.points[index].x) + Math.abs(point.y - production.points[index].y), 0)).toBe(referenceLength);
  });
});

describe("conservative affected-route selection", () => {
  it("includes the changed node’s routes and every later reserved route", () => {
    const a = { ...node("a", 0, 0), children: [{ targetId: "b", color: "blue" as const }] };
    const b = { ...node("b", 240, 0), children: [{ targetId: "c", color: "green" as const }] };
    const c = node("c", 480, 0);
    const tree: TreeMap = { id: "affected", title: "", description: "", root: null, nodeMap: { a, b, c }, maxDepth: 1 };
    const routes = buildDerivedRoutes(tree).map((entry) => ({ key: `${entry.source.id}->${entry.target.id}`, sourceId: entry.source.id, targetId: entry.target.id, route: entry.route }));
    const before = getNodeBox(b, false);
    const after = { ...before, x: before.x + 80 };

    expect(findConservativelyAffectedRouteKeys(routes, "b", before, after)).toEqual(["a->b", "b->c"]);
  });
});

describe("built-in dense roadmap", () => {
  it("marks a legacy crowded-port fan-out as illegal instead of inventing an unapproved shared attachment lane", () => {
    const routes = buildDerivedRoutes(tree2);

    expect(routes).not.toHaveLength(0);
    expect(routes.filter((entry) => !entry.route.clean).map((entry) => `${entry.source.id}->${entry.target.id}`)).toEqual(["t2-root->t2-a5"]);
  });
});
