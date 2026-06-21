import { randomUUID } from 'crypto';
import { GameState } from './GameState';
import { GameConfig, PlayerRole, SessionState } from './types';

export interface GameSession {
  id: string;
  hostName: string;
  hostSocketId: string;
  guestName: string | null;
  guestSocketId: string | null;
  config: GameConfig;
  state: SessionState;
  gameState: GameState;
  createdAt: number;
  stats: { hostWins: number; guestWins: number };
  rematch: { host: boolean; guest: boolean };
  /** Pending disconnect timer (role that dropped) for graceful reconnection. */
  disconnectTimer?: NodeJS.Timeout;
  disconnectedRole?: PlayerRole;
}

export interface SessionSummary {
  id: string;
  hostName: string;
  gridSize: number;
  shipCount: number;
  state: SessionState;
  createdAt: number;
}

export class SessionManager {
  private sessions = new Map<string, GameSession>();

  create(hostName: string, hostSocketId: string, config: GameConfig): GameSession {
    const id = randomUUID();
    const session: GameSession = {
      id,
      hostName,
      hostSocketId,
      guestName: null,
      guestSocketId: null,
      config,
      state: 'waiting',
      gameState: new GameState(config),
      createdAt: Date.now(),
      stats: { hostWins: 0, guestWins: 0 },
      rematch: { host: false, guest: false },
    };
    this.sessions.set(id, session);
    return session;
  }

  get(id: string): GameSession | undefined {
    return this.sessions.get(id);
  }

  remove(id: string): void {
    const session = this.sessions.get(id);
    if (session?.disconnectTimer) clearTimeout(session.disconnectTimer);
    this.sessions.delete(id);
  }

  all(): GameSession[] {
    return [...this.sessions.values()];
  }

  openSessions(): SessionSummary[] {
    return this.all()
      .filter((s) => s.state === 'waiting')
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((s) => this.toSummary(s));
  }

  activeGameCount(): number {
    return this.all().filter((s) => s.state === 'placing' || s.state === 'battle').length;
  }

  toSummary(session: GameSession): SessionSummary {
    return {
      id: session.id,
      hostName: session.hostName,
      gridSize: session.config.gridSize,
      shipCount: session.config.ships.reduce((sum, s) => sum + s.count, 0),
      state: session.state,
      createdAt: session.createdAt,
    };
  }

  /** Find the session a socket currently belongs to (as host or guest). */
  findBySocket(socketId: string): GameSession | undefined {
    return this.all().find(
      (s) => s.hostSocketId === socketId || s.guestSocketId === socketId,
    );
  }

  /** Find a session a player can reconnect to by display name. */
  findByName(name: string): GameSession | undefined {
    return this.all().find(
      (s) =>
        (s.hostName === name || s.guestName === name) &&
        s.state !== 'finished' &&
        !!s.disconnectedRole,
    );
  }

  roleOf(session: GameSession, socketId: string): PlayerRole | null {
    if (session.hostSocketId === socketId) return 'host';
    if (session.guestSocketId === socketId) return 'guest';
    return null;
  }
}
