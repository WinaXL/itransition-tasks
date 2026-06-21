import { GameState } from './GameState';
import { Orientation, PlayerRole } from './types';

export type CpuDifficulty = 'easy' | 'normal' | 'hard';

export const CPU_NAME = 'CPU Admiral';

export interface FleetEntry {
  name: string;
  size: number;
  row: number;
  col: number;
  orientation: Orientation;
}

/** Build a valid fleet submission for the CPU role using the engine's randomizer. */
export function buildCpuFleet(gameState: GameState, cpuRole: PlayerRole): FleetEntry[] {
  gameState.clearShips(cpuRole);
  const placed = gameState.randomizeShips(cpuRole);
  return placed.map((ship) => ({
    name: ship.name,
    size: ship.size,
    row: ship.cells[0].row,
    col: ship.cells[0].col,
    orientation: ship.orientation,
  }));
}

function unshotCells(gameState: GameState, cpuRole: PlayerRole): { row: number; col: number }[] {
  const size = gameState.gridSize;
  const shots = new Set(
    gameState.getVisibleState(cpuRole).outgoingShots.map((s) => `${s.row}:${s.col}`),
  );
  const cells: { row: number; col: number }[] = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (!shots.has(`${row}:${col}`)) cells.push({ row, col });
    }
  }
  return cells;
}

function adjacentUnshot(
  gameState: GameState,
  cpuRole: PlayerRole,
  hits: { row: number; col: number }[],
): { row: number; col: number }[] {
  const shotSet = new Set(
    gameState.getVisibleState(cpuRole).outgoingShots.map((s) => `${s.row}:${s.col}`),
  );
  const size = gameState.gridSize;
  const candidates: { row: number; col: number }[] = [];
  const seen = new Set<string>();

  for (const hit of hits) {
    for (const [dr, dc] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const row = hit.row + dr;
      const col = hit.col + dc;
      const key = `${row}:${col}`;
      if (row < 0 || col < 0 || row >= size || col >= size) continue;
      if (shotSet.has(key) || seen.has(key)) continue;
      seen.add(key);
      candidates.push({ row, col });
    }
  }
  return candidates;
}

function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)];
}

/** Choose the next CPU shot based on difficulty and current board knowledge. */
export function pickCpuShot(
  gameState: GameState,
  cpuRole: PlayerRole,
  difficulty: CpuDifficulty,
): { row: number; col: number } | null {
  const view = gameState.getVisibleState(cpuRole);
  const hits = view.outgoingShots.filter((s) => s.outcome === 'hit' || s.outcome === 'sunk');
  const candidates = unshotCells(gameState, cpuRole);
  if (candidates.length === 0) return null;

  if (difficulty === 'easy') {
    return pickRandom(candidates);
  }

  const huntTargets = adjacentUnshot(gameState, cpuRole, hits);
  if (huntTargets.length > 0) {
    return pickRandom(huntTargets);
  }

  if (difficulty === 'hard') {
    const parity = candidates.filter((c) => (c.row + c.col) % 2 === 0);
    return pickRandom(parity.length > 0 ? parity : candidates);
  }

  return pickRandom(candidates);
}

/** Natural delay before the CPU fires (ms). */
export function cpuThinkDelay(difficulty: CpuDifficulty): number {
  switch (difficulty) {
    case 'easy':
      return 500 + Math.floor(Math.random() * 400);
    case 'hard':
      return 900 + Math.floor(Math.random() * 300);
    default:
      return 650 + Math.floor(Math.random() * 550);
  }
}
