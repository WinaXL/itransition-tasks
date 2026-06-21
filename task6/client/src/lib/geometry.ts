import { Cell, Orientation } from '../types';

export function cellsFor(size: number, row: number, col: number, orientation: Orientation): Cell[] {
  const cells: Cell[] = [];
  for (let i = 0; i < size; i += 1) {
    cells.push(
      orientation === 'horizontal' ? { row, col: col + i } : { row: row + i, col },
    );
  }
  return cells;
}

export function inBounds(cells: Cell[], gridSize: number): boolean {
  return cells.every((c) => c.row >= 0 && c.col >= 0 && c.row < gridSize && c.col < gridSize);
}

export function key(row: number, col: number): string {
  return `${row}:${col}`;
}

export interface LocalShip {
  key: string;
  name: string;
  size: number;
  anchor: Cell;
  orientation: Orientation;
  cells: Cell[];
}

export function isValidPlacement(
  size: number,
  row: number,
  col: number,
  orientation: Orientation,
  gridSize: number,
  occupied: Set<string>,
): boolean {
  const cells = cellsFor(size, row, col, orientation);
  if (!inBounds(cells, gridSize)) return false;
  return cells.every((c) => !occupied.has(key(c.row, c.col)));
}
