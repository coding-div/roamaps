import type { Box } from "@/lib/collision";

export interface SpatialEntry<T> {
  item: T;
  box: Box;
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * Invisible, in-memory uniform grid for conservative routing queries. It owns
 * no roadmap data and is rebuilt from the current graph whenever a structural
 * action is considered, so persistence remains graph-only.
 */
export class UniformSpatialIndex<T> {
  private readonly buckets = new Map<string, SpatialEntry<T>[]>();

  constructor(entries: SpatialEntry<T>[], private readonly cellSize = 160) {
    for (const entry of entries) this.add(entry);
  }

  private bucketKey(column: number, row: number): string {
    return `${column}:${row}`;
  }

  private add(entry: SpatialEntry<T>): void {
    const minColumn = Math.floor(entry.box.x / this.cellSize);
    const maxColumn = Math.floor((entry.box.x + entry.box.w) / this.cellSize);
    const minRow = Math.floor(entry.box.y / this.cellSize);
    const maxRow = Math.floor((entry.box.y + entry.box.h) / this.cellSize);
    for (let column = minColumn; column <= maxColumn; column += 1) {
      for (let row = minRow; row <= maxRow; row += 1) {
        const key = this.bucketKey(column, row);
        this.buckets.set(key, [...(this.buckets.get(key) ?? []), entry]);
      }
    }
  }

  query(area: Box): T[] {
    const minColumn = Math.floor(area.x / this.cellSize);
    const maxColumn = Math.floor((area.x + area.w) / this.cellSize);
    const minRow = Math.floor(area.y / this.cellSize);
    const maxRow = Math.floor((area.y + area.h) / this.cellSize);
    const seen = new Set<T>();
    const result: T[] = [];
    for (let column = minColumn; column <= maxColumn; column += 1) {
      for (let row = minRow; row <= maxRow; row += 1) {
        for (const entry of this.buckets.get(this.bucketKey(column, row)) ?? []) {
          if (seen.has(entry.item) || !overlaps(entry.box, area)) continue;
          seen.add(entry.item);
          result.push(entry.item);
        }
      }
    }
    return result;
  }
}
