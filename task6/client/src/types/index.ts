export type PlayerRole = 'host' | 'guest';
export type CpuDifficulty = 'easy' | 'normal' | 'hard';
export type Orientation = 'horizontal' | 'vertical';
export type Phase = 'placement' | 'battle' | 'finished';
export type SessionState = 'waiting' | 'placing' | 'battle' | 'finished';
export type ShotOutcome = 'miss' | 'hit' | 'sunk';

export const CPU_NAME = 'CPU Admiral';

export interface Cell {
  row: number;
  col: number;
}

export interface ShipDefinition {
  name: string;
  size: number;
  count: number;
}

export interface GameConfig {
  gridSize: number;
  ships: ShipDefinition[];
}

export interface PlacedShip {
  id: string;
  name: string;
  size: number;
  orientation: Orientation;
  cells: Cell[];
  hits: number;
  sunk: boolean;
}

export interface Shot {
  row: number;
  col: number;
  outcome: ShotOutcome;
}

export interface VisibleState {
  phase: Phase;
  gridSize: number;
  currentTurn: PlayerRole;
  winner: PlayerRole | null;
  ownShips: PlacedShip[];
  incomingShots: Shot[];
  outgoingShots: Shot[];
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

export interface SessionSummary {
  id: string;
  hostName: string;
  gridSize: number;
  shipCount: number;
  state: SessionState;
  createdAt: number;
}

export interface ClientSessionInfo {
  id: string;
  hostName: string;
  guestName: string | null;
  config: GameConfig;
  state: SessionState;
  stats: { hostWins: number; guestWins: number };
  yourRole: PlayerRole;
  isVsCpu: boolean;
}

export interface ChatMessage {
  from: string;
  role: PlayerRole;
  message: string;
  timestamp: number;
}

export interface FleetEntry {
  name: string;
  size: number;
  row: number;
  col: number;
  orientation: Orientation;
}

export interface ShotResultPayload {
  shooter: PlayerRole;
  row: number;
  col: number;
  outcome: ShotOutcome;
  shipName?: string;
  sunkShipCells?: Cell[];
  nextTurn: PlayerRole;
  gameOver: boolean;
}

export interface GameOverPayload {
  winnerName: string;
  loserName: string;
  winnerRole: PlayerRole;
  stats: { hostWins: number; guestWins: number };
}

/* ── Typed Socket.io contract ──────────────────────────────── */
export interface ServerToClientEvents {
  'lobby:sessions': (sessions: SessionSummary[]) => void;
  'lobby:joined': (payload: { session: ClientSessionInfo }) => void;
  'lobby:error': (payload: { message: string }) => void;
  'game:state': (payload: { session: ClientSessionInfo; view: VisibleState }) => void;
  'game:start': () => void;
  'game:opponentProgress': (payload: { placed: number; total: number }) => void;
  'game:shotResult': (payload: ShotResultPayload) => void;
  'game:over': (payload: GameOverPayload) => void;
  'game:chatMessage': (payload: ChatMessage) => void;
  'game:opponentLeft': (payload: { name: string; temporary: boolean }) => void;
  'game:opponentReturned': (payload: { name: string }) => void;
  'game:error': (payload: { message: string }) => void;
  'leaderboard:update': (leaderboard: PlayerStats[]) => void;
  'stats:update': (stats: PlayerStats) => void;
}

export interface ClientToServerEvents {
  'player:register': (
    payload: { name: string },
    ack: (response: { displayName: string; stats: PlayerStats }) => void,
  ) => void;
  'lobby:list': () => void;
  'lobby:create': (payload: { config: GameConfig }) => void;
  'lobby:createVsCpu': (payload: { config: GameConfig; difficulty: CpuDifficulty }) => void;
  'lobby:join': (payload: { roomId: string }) => void;
  'lobby:cancel': (payload: { roomId: string }) => void;
  'game:placing': (payload: { placed: number; total: number }) => void;
  'game:ready': (payload: { fleet: FleetEntry[] }) => void;
  'game:fire': (payload: { row: number; col: number }) => void;
  'game:chat': (payload: { message: string }) => void;
  'game:rematch': () => void;
  'game:leave': () => void;
}
