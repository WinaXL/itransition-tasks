import { ShipDefinition } from '../types';

export const ALLOWED_GRID_SIZES = [8, 10, 12] as const;

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

/** Ship colors used for dock/segment rendering, keyed by size. */
export function shipAccent(size: number): string {
  switch (size) {
    case 2:
      return '#4d9de0';
    case 3:
      return '#2b9e8f';
    case 4:
      return '#c9a227';
    case 5:
      return '#c95b3b';
    default:
      return '#8ba3c7';
  }
}
