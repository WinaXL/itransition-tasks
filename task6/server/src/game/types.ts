export type PlayerRole = 'host' | 'guest';

export type Orientation = 'horizontal' | 'vertical';

export type Phase = 'placement' | 'battle' | 'finished';

export type SessionState = 'waiting' | 'placing' | 'battle' | 'finished';

export type ShotOutcome = 'miss' | 'hit' | 'sunk';

export interface Cell {
  row: number;
  col: number;
}

/** A ship type as configured for a session (a blueprint, possibly with multiple copies). */
export interface ShipDefinition {
  name: string;
  size: number;
  count: number;
}

export interface GameConfig {
  gridSize: number;
  ships: ShipDefinition[];
}

/** A concrete ship instance placed on a board. */
export interface PlacedShip {
  id: string;
  name: string;
  size: number;
  orientation: Orientation;
  cells: Cell[];
  hits: number;
  sunk: boolean;
}

/** A shot fired by a player at the opponent's board. */
export interface Shot {
  row: number;
  col: number;
  outcome: ShotOutcome;
}

export interface PlaceResult {
  ok: boolean;
  error?: string;
  ship?: PlacedShip;
}

export interface ShotResult {
  ok: boolean;
  error?: string;
  outcome?: ShotOutcome;
  shipName?: string;
  sunkShipCells?: Cell[];
  gameOver?: boolean;
  /** Role allowed to move next. */
  nextTurn?: PlayerRole;
}

/** Fog-of-war view of a board for a particular player. */
export interface VisibleState {
  phase: Phase;
  gridSize: number;
  currentTurn: PlayerRole;
  winner: PlayerRole | null;
  /** Your own ships (fully visible). */
  ownShips: PlacedShip[];
  /** Shots the enemy fired at your board. */
  incomingShots: Shot[];
  /** Shots you fired at the enemy board. */
  outgoingShots: Shot[];
  /** Enemy ships that have been fully sunk (revealed). */
  revealedEnemyShips: PlacedShip[];
  ownReady: boolean;
  enemyReady: boolean;
}

export interface PlayerStats {
  name: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalShipsSunk: number;
}
