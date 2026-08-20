import { describe, expect, it } from "vitest";
import { getNodeBox } from "@/lib/collision";
import type { NodeData } from "@/lib/treeData";
import { getOrthogonalRoute, verifyRoute } from "@/lib/routingEngine";

function node(id: string, x: number, y: number): NodeData {
  return { id, x, y, label: "", color: "blue", children: [], popupContent: "" };
}

describe("getOrthogonalRoute", () => {
  it("uses a clear boundary lane when a third node blocks a vertical route", () => {
    const source = { ...node("source", 0, 0), label: "Main Topic" };
    const target = node("target", 0, -180);
    const blocker = node("blocker", 0, -90);

    const blockerBox = getNodeBox(blocker, false);
    const route = getOrthogonalRoute(
      source,
      target,
      getNodeBox(source, true),
      getNodeBox(target, false),
      [blockerBox]
    );

    expect(route.clean).toBe(true);
    expect(route.points.some((point) => Math.abs(point.x) >= 62)).toBe(true);
    expect(verifyRoute(route.points, [blockerBox]).clean).toBe(true);
  });
});
