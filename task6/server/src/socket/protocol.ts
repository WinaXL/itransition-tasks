import {
  Cell,
  GameConfig,
  Orientation,
  PlayerRole,
  PlayerStats,
  SessionState,
  ShotOutcome,
  VisibleState,
} from '../game/types';
import { SessionSummary } from '../game/SessionManager';

export interface FleetEntry {
  name: string;
  size: number;
  row: number;
  col: number;
  orientation: Orientation;
}

/** Session metadata sent to clients (no fog-of-war board data). */
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

/* ── Client → Server ───────────────────────────────────────── */
export interface ClientToServerEvents {
  'player:register': (
    payload: { name: string },
    ack: (response: { displayName: string; stats: PlayerStats }) => void,
  ) => void;
  'lobby:list': () => void;
  'lobby:create': (payload: { config: GameConfig }) => void;
  'lobby:createVsCpu': (payload: { config: GameConfig; difficulty: 'easy' | 'normal' | 'hard' }) => void;
  'lobby:join': (payload: { roomId: string }) => void;
  'lobby:cancel': (payload: { roomId: string }) => void;
  'game:placing': (payload: { placed: number; total: number }) => void;
  'game:ready': (payload: { fleet: FleetEntry[] }) => void;
  'game:fire': (payload: { row: number; col: number }) => void;
  'game:chat': (payload: { message: string }) => void;
  'game:rematch': () => void;
  'game:leave': () => void;
}

/* ── Server → Client ───────────────────────────────────────── */
export interface ServerToClientEvents {
  'lobby:sessions': (sessions: SessionSummary[]) => void;
  'lobby:joined': (payload: { session: ClientSessionInfo }) => void;
  'lobby:error': (payload: { message: string }) => void;
  'game:state': (payload: { session: ClientSessionInfo; view: VisibleState }) => void;
  'game:start': () => void;
  'game:opponentProgress': (payload: { placed: number; total: number }) => void;
  'game:shotResult': (payload: {
    shooter: PlayerRole;
    row: number;
    col: number;
    outcome: ShotOutcome;
    shipName?: string;
    sunkShipCells?: Cell[];
    nextTurn: PlayerRole;
    gameOver: boolean;
  }) => void;
  'game:over': (payload: {
    winnerName: string;
    loserName: string;
    winnerRole: PlayerRole;
    stats: { hostWins: number; guestWins: number };
  }) => void;
  'game:chatMessage': (payload: ChatMessage) => void;
  'game:opponentLeft': (payload: { name: string; temporary: boolean }) => void;
  'game:opponentReturned': (payload: { name: string }) => void;
  'game:error': (payload: { message: string }) => void;
  'leaderboard:update': (leaderboard: PlayerStats[]) => void;
  'stats:update': (stats: PlayerStats) => void;
}

export interface SocketData {
  displayName?: string;
}
