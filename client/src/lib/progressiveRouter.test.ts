import { describe, expect, it } from "vitest";
import type { Box } from "./collision";
import {
  findProgressivePrototypeRoute,
  isOrthogonalPrototypeRoute,
  type PrototypeNode,
} from "./progressiveRouter";

function node(id: string, x: number, y: number, width = 40, height = 30): PrototypeNode {
  return { id, x, y, box: { x: x - width / 2, y: y - height / 2, w: width, h: height } };
}

const bounds: Box = { x: 0, y: 0, w: 900, h: 600 };

function expectClean(result: ReturnType<typeof findProgressivePrototypeRoute>, expectedBends: number) {
  expect(result.found).toBe(true);
  expect(result.bends).toBe(expectedBends);
  expect(isOrthogonalPrototypeRoute(result)).toBe(true);
  expect(result.points.length).toBe(expectedBends + 2);
}

describe("progressiveRouter — staged router", () => {
  it("finds a direct zero-bend path", () => {
    const result = findProgressivePrototypeRoute(node("a", 100, 300), node("b", 700, 300), [], {
      sourceDirections: ["right"],
      targetDirections: ["left"],
      bounds,
    });
    expectClean(result, 0);
  });

  it("finds a one-bend L path with fixed port directions", () => {
    const result = findProgressivePrototypeRoute(node("a", 100, 150), node("b", 700, 450), [], {
      sourceDirections: ["right"],
      targetDirections: ["up"],
      bounds,
    });
    expectClean(result, 1);
  });

  it("finds a genuine four-bend detour around a centered obstacle", () => {
    const source = node("a", 100, 300);
    const target = node("b", 700, 300);
    const obstacle = { x: 370, y: 230, w: 160, h: 140 };
    const constrained = { sourceDirections: ["right" as const], targetDirections: ["left" as const], bounds };
    expect(findProgressivePrototypeRoute(source, target, [obstacle], { ...constrained, maxBends: 3 }).found).toBe(false);
    const result = findProgressivePrototypeRoute(source, target, [obstacle], {
      sourceDirections: ["right"],
      targetDirections: ["left"],
      bounds,
    });
    expectClean(result, 4);
  });

  it("finds a genuine two-bend path when the fixed target port requires it", () => {
    const source = node("a", 100, 100);
    const target = node("b", 700, 500);
    const constrained = { sourceDirections: ["right" as const], targetDirections: ["right" as const], bounds };
    expect(findProgressivePrototypeRoute(source, target, [], { ...constrained, maxBends: 1 }).found).toBe(false);
    expectClean(findProgressivePrototypeRoute(source, target, [], { ...constrained, maxBends: 2 }), 2);
  });

  it("finds a genuine three-bend route around a top-to-bottom wall", () => {
    const source = node("a", 100, 100);
    const target = node("b", 700, 500);
    const wall = { x: 340, y: 0, w: 40, h: 300 };
    const constrained = { sourceDirections: ["right" as const], targetDirections: ["up" as const], bounds };
    expect(findProgressivePrototypeRoute(source, target, [wall], { ...constrained, maxBends: 2 }).found).toBe(false);
    expectClean(findProgressivePrototypeRoute(source, target, [wall], { ...constrained, maxBends: 3 }), 3);
  });

  it("finds a genuine five-bend route through an alternating-wall maze", () => {
    const source = node("a", 100, 100);
    const target = node("b", 700, 500);
    const alternatingWalls = [
      { x: 340, y: 0, w: 40, h: 300 },
      { x: 540, y: 250, w: 40, h: 350 },
    ];
    const constrained = { sourceDirections: ["right" as const], targetDirections: ["up" as const], bounds };
    expect(findProgressivePrototypeRoute(source, target, alternatingWalls, { ...constrained, maxBends: 4 }).found).toBe(false);
    expectClean(findProgressivePrototypeRoute(source, target, alternatingWalls, { ...constrained, maxBends: 5 }), 5);
  });

  it("checks all four source and target sides by finding the direct aligned side pair", () => {
    const result = findProgressivePrototypeRoute(node("a", 150, 300), node("b", 750, 300), [], { bounds });
    expectClean(result, 0);
    expect(result.sourceDirection).toBe("right");
    expect(result.targetDirection).toBe("left");
  });

  it("keeps an explicit port route outside the connected node bodies after leaving its source", () => {
    const source = node("source", 0, 0, 100, 36);
    const target = node("target", -40, -220, 100, 36);
    const result = findProgressivePrototypeRoute(source, target, [], {
      sourcePorts: [{ direction: "left", point: { x: -50, y: 0 } }],
      targetPorts: [{ direction: "down", point: { x: -40, y: -202 } }],
      maxBends: 5,
    });

    expect(result.found).toBe(true);
    expect(isOrthogonalPrototypeRoute(result)).toBe(true);
    if (!result.found) return;
    const sourceInterior = (point: { x: number; y: number }) => point.x > source.box.x && point.x < source.box.x + source.box.w && point.y > source.box.y && point.y < source.box.y + source.box.h;
    const targetInterior = (point: { x: number; y: number }) => point.x > target.box.x && point.x < target.box.x + target.box.w && point.y > target.box.y && point.y < target.box.y + target.box.h;
    expect(result.points.slice(1, -1).some((point) => sourceInterior(point) || targetInterior(point))).toBe(false);
  });

  it("keeps a close Tree 2-style endpoint pair on the exact two-bend fast path", () => {
    const source = node("source", 200, -100, 100, 36);
    const target = node("target", 320, -80, 100, 36);
    const result = findProgressivePrototypeRoute(source, target, [], {
      sourcePorts: [{ direction: "right", point: { x: 250, y: -94 } }],
      targetPorts: [{ direction: "left", point: { x: 270, y: -80 } }],
      maxBends: 5,
    });

    expectClean(result, 2);
    expect(result.points).toEqual([
      { x: 250, y: -94 },
      { x: 268, y: -94 },
      { x: 268, y: -80 },
      { x: 270, y: -80 },
    ]);
  });

  it("rejects a parallel reserved arrow lane when a two-bend repair cannot reach the fixed ports", () => {
    const result = findProgressivePrototypeRoute(node("a", 100, 300), node("b", 700, 300), [], {
      sourceDirections: ["right"],
      targetDirections: ["left"],
      arrowObstacles: [{ a: { x: 200, y: 304 }, b: { x: 600, y: 304 } }],
      lanePadding: 6,
      maxBends: 2,
      bounds,
    });
    expect(result).toMatchObject({ found: false, reason: "no-legal-route", points: [] });
  });

  it("reports no legal route instead of returning a diagonal fallback", () => {
    const result = findProgressivePrototypeRoute(node("a", 120, 300), node("b", 780, 300), [
      { x: 210, y: 0, w: 560, h: 600 },
    ], {
      sourceDirections: ["right"],
      targetDirections: ["left"],
      bounds,
      maxBends: 5,
    });
    expect(result).toMatchObject({ found: false, reason: "no-legal-route", points: [] });
  });

  it("is deterministic when several equal-distance two-bend lanes are legal", () => {
    const source = node("a", 100, 300);
    const target = node("b", 700, 300);
    const obstacles = [{ x: 370, y: 230, w: 160, h: 140 }];
    const first = findProgressivePrototypeRoute(source, target, obstacles, { sourceDirections: ["right"], targetDirections: ["left"], bounds });
    const second = findProgressivePrototypeRoute(source, target, obstacles, { sourceDirections: ["right"], targetDirections: ["left"], bounds });
    expect(first).toEqual(second);
  });

  it("keeps repeated genuine five-bend searches locally responsive", () => {
    const source = node("a", 100, 100);
    const target = node("b", 700, 500);
    const alternatingWalls = [
      { x: 340, y: 0, w: 40, h: 300 },
      { x: 540, y: 250, w: 40, h: 350 },
    ];
    const constrained = { sourceDirections: ["right" as const], targetDirections: ["up" as const], bounds };
    const startedAt = performance.now();

    for (let run = 0; run < 100; run++) {
      expect(findProgressivePrototypeRoute(source, target, alternatingWalls, constrained).bends).toBe(5);
    }

    expect(performance.now() - startedAt).toBeLessThan(1200);
  });
});
