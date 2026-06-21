import { GameConfig, ShipDefinition } from './types';

export const ALLOWED_GRID_SIZES = [8, 10, 12] as const;

/** Default fleet for each supported grid size. */
export function defaultShipsFor(gridSize: number): ShipDefinition[] {
  switch (gridSize) {
    case 8:
      return [
        { name: 'Destroyer', size: 2, count: 2 },
        { name: 'Submarine', size: 3, count: 2 },
        { name: 'Battleship', size: 4, count: 1 },
      ];
    case 12:
      return [
        { name: 'Destroyer', size: 2, count: 3 },
        { name: 'Submarine', size: 3, count: 2 },
        { name: 'Cruiser', size: 3, count: 2 },
        { name: 'Battleship', size: 4, count: 2 },
        { name: 'Carrier', size: 5, count: 1 },
      ];
    case 10:
    default:
      return [
        { name: 'Destroyer', size: 2, count: 2 },
        { name: 'Submarine', size: 3, count: 2 },
        { name: 'Cruiser', size: 3, count: 1 },
        { name: 'Battleship', size: 4, count: 1 },
        { name: 'Carrier', size: 5, count: 1 },
      ];
  }
}

/** Clamp/sanitize a client-supplied configuration to safe limits. */
export function sanitizeConfig(input: Partial<GameConfig> | undefined): GameConfig {
  const gridSize = ALLOWED_GRID_SIZES.includes(input?.gridSize as 8 | 10 | 12)
    ? (input!.gridSize as number)
    : 10;

  let ships = Array.isArray(input?.ships) ? input!.ships : defaultShipsFor(gridSize);

  ships = ships
    .filter((s) => s && typeof s.name === 'string')
    .map((s) => ({
      name: String(s.name).slice(0, 20),
      size: Math.min(Math.max(Math.round(s.size), 2), Math.min(gridSize, 6)),
      count: Math.min(Math.max(Math.round(s.count), 0), 6),
    }))
    .filter((s) => s.count > 0);

  if (ships.length === 0) ships = defaultShipsFor(gridSize);

  const totalCells = ships.reduce((sum, s) => sum + s.size * s.count, 0);
  // Keep the board playable: fleet must not exceed ~45% of the board.
  if (totalCells > Math.floor(gridSize * gridSize * 0.45)) {
    ships = defaultShipsFor(gridSize);
  }

  return { gridSize, ships };
}
