import { randomUUID } from 'crypto';
import {
  Cell,
  GameConfig,
  Orientation,
  Phase,
  PlaceResult,
  PlacedShip,
  PlayerRole,
  Shot,
  ShotResult,
  VisibleState,
} from './types';

/**
 * Pure, side-effect-free Battleship engine. Knows nothing about sockets or IO.
 * All authoritative rules (placement validity, turn order, hit detection) live here.
 */
export class GameState {
  readonly gridSize: number;
  readonly config: GameConfig;

  phase: Phase = 'placement';
  currentTurn: PlayerRole = 'host';
  winner: PlayerRole | null = null;

  private ships: Record<PlayerRole, PlacedShip[]> = { host: [], guest: [] };
  private shots: Record<PlayerRole, Shot[]> = { host: [], guest: [] };
  private ready: Record<PlayerRole, boolean> = { host: false, guest: false };

  constructor(config: GameConfig) {
    this.config = config;
    this.gridSize = config.gridSize;
  }

  /** Total ships required by the configuration. */
  get fleetSize(): number {
    return this.config.ships.reduce((sum, s) => sum + s.count, 0);
  }

  private opponentOf(role: PlayerRole): PlayerRole {
    return role === 'host' ? 'guest' : 'host';
  }

  private inBounds(row: number, col: number): boolean {
    return row >= 0 && col >= 0 && row < this.gridSize && col < this.gridSize;
  }

  private cellsFor(size: number, row: number, col: number, orientation: Orientation): Cell[] {
    const cells: Cell[] = [];
    for (let i = 0; i < size; i += 1) {
      cells.push(
        orientation === 'horizontal'
          ? { row, col: col + i }
          : { row: row + i, col },
      );
    }
    return cells;
  }

  /** Validate a prospective placement against bounds and existing ships of that role. */
  validatePlacement(
    role: PlayerRole,
    size: number,
    row: number,
    col: number,
    orientation: Orientation,
  ): boolean {
    const cells = this.cellsFor(size, row, col, orientation);
    if (cells.some((c) => !this.inBounds(c.row, c.col))) return false;

    const occupied = new Set(
      this.ships[role].flatMap((s) => s.cells.map((c) => `${c.row}:${c.col}`)),
    );
    return cells.every((c) => !occupied.has(`${c.row}:${c.col}`));
  }

  placeShip(
    role: PlayerRole,
    name: string,
    size: number,
    row: number,
    col: number,
    orientation: Orientation,
  ): PlaceResult {
    if (this.phase !== 'placement') {
      return { ok: false, error: 'Cannot place ships outside the placement phase.' };
    }
    if (!this.validatePlacement(role, size, row, col, orientation)) {
      return { ok: false, error: 'Invalid placement: out of bounds or overlapping.' };
    }
    const ship: PlacedShip = {
      id: randomUUID(),
      name,
      size,
      orientation,
      cells: this.cellsFor(size, row, col, orientation),
      hits: 0,
      sunk: false,
    };
    this.ships[role].push(ship);
    return { ok: true, ship };
  }

  clearShips(role: PlayerRole): void {
    if (this.phase !== 'placement') return;
    this.ships[role] = [];
    this.ready[role] = false;
  }

  /** Auto-place a full valid fleet for the given role. */
  randomizeShips(role: PlayerRole): PlacedShip[] {
    this.ships[role] = [];
    const orientations: Orientation[] = ['horizontal', 'vertical'];
    for (const def of this.config.ships) {
      for (let copy = 0; copy < def.count; copy += 1) {
        let placed = false;
        for (let attempt = 0; attempt < 1000 && !placed; attempt += 1) {
          const orientation = orientations[Math.floor(Math.random() * 2)];
          const row = Math.floor(Math.random() * this.gridSize);
          const col = Math.floor(Math.random() * this.gridSize);
          if (this.validatePlacement(role, def.size, row, col, orientation)) {
            this.placeShip(role, def.name, def.size, row, col, orientation);
            placed = true;
          }
        }
      }
    }
    return this.ships[role];
  }

  /**
   * Validate and store an entire client-submitted fleet. Server-authoritative:
   * rejects fleets that don't match the configured ship counts/sizes or that
   * are out of bounds / overlapping.
   */
  submitFleet(
    role: PlayerRole,
    fleet: { name: string; size: number; row: number; col: number; orientation: Orientation }[],
  ): PlaceResult {
    if (this.phase !== 'placement') {
      return { ok: false, error: 'Placement phase is over.' };
    }

    const required = new Map<string, number>();
    for (const def of this.config.ships) {
      required.set(`${def.name}:${def.size}`, def.count);
    }
    const provided = new Map<string, number>();
    for (const ship of fleet) {
      const key = `${ship.name}:${ship.size}`;
      provided.set(key, (provided.get(key) ?? 0) + 1);
    }
    for (const [key, count] of required) {
      if ((provided.get(key) ?? 0) !== count) {
        return { ok: false, error: 'Submitted fleet does not match the session configuration.' };
      }
    }
    if (provided.size !== required.size) {
      return { ok: false, error: 'Submitted fleet contains unexpected ships.' };
    }

    this.ships[role] = [];
    for (const ship of fleet) {
      const result = this.placeShip(role, ship.name, ship.size, ship.row, ship.col, ship.orientation);
      if (!result.ok) {
        this.ships[role] = [];
        return result;
      }
    }
    return { ok: true };
  }

  setReady(role: PlayerRole): boolean {
    if (this.ships[role].length !== this.fleetSize) return false;
    this.ready[role] = true;
    if (this.ready.host && this.ready.guest) {
      this.phase = 'battle';
      this.currentTurn = 'host';
    }
    return true;
  }

  isReady(role: PlayerRole): boolean {
    return this.ready[role];
  }

  bothReady(): boolean {
    return this.ready.host && this.ready.guest;
  }

  fire(role: PlayerRole, row: number, col: number): ShotResult {
    if (this.phase !== 'battle') return { ok: false, error: 'Game is not in the battle phase.' };
    if (this.currentTurn !== role) return { ok: false, error: 'It is not your turn.' };
    if (!this.inBounds(row, col)) return { ok: false, error: 'Shot is out of bounds.' };
    if (this.shots[role].some((s) => s.row === row && s.col === col)) {
      return { ok: false, error: 'You already fired at that cell.' };
    }

    const opponent = this.opponentOf(role);
    const target = this.ships[opponent].find((ship) =>
      ship.cells.some((c) => c.row === row && c.col === col),
    );

    let outcome: ShotResult['outcome'] = 'miss';
    let shipName: string | undefined;
    let sunkShipCells: Cell[] | undefined;

    if (target) {
      target.hits += 1;
      outcome = 'hit';
      if (target.hits >= target.size) {
        target.sunk = true;
        outcome = 'sunk';
        shipName = target.name;
        sunkShipCells = target.cells;
      }
    }

    this.shots[role].push({ row, col, outcome });

    const gameOver = this.ships[opponent].every((s) => s.sunk);
    if (gameOver) {
      this.phase = 'finished';
      this.winner = role;
    } else if (outcome === 'miss') {
      this.currentTurn = opponent;
    }

    return {
      ok: true,
      outcome,
      shipName,
      sunkShipCells,
      gameOver,
      nextTurn: this.currentTurn,
    };
  }

  isGameOver(): boolean {
    return this.phase === 'finished';
  }

  shipsSunkBy(role: PlayerRole): number {
    return this.ships[this.opponentOf(role)].filter((s) => s.sunk).length;
  }

  /** Reset for a rematch keeping the same configuration. */
  reset(): void {
    this.phase = 'placement';
    this.currentTurn = 'host';
    this.winner = null;
    this.ships = { host: [], guest: [] };
    this.shots = { host: [], guest: [] };
    this.ready = { host: false, guest: false };
  }

  getVisibleState(role: PlayerRole): VisibleState {
    const opponent = this.opponentOf(role);
    return {
      phase: this.phase,
      gridSize: this.gridSize,
      currentTurn: this.currentTurn,
      winner: this.winner,
      ownShips: this.ships[role],
      incomingShots: this.shots[opponent],
      outgoingShots: this.shots[role],
      revealedEnemyShips: this.ships[opponent].filter((s) => s.sunk),
      ownReady: this.ready[role],
      enemyReady: this.ready[opponent],
    };
  }
}
