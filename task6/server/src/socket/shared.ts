import { Server, Socket } from 'socket.io';
import { NameRegistry } from '../game/NameRegistry';
import { GameSession, SessionManager } from '../game/SessionManager';
import { PlayerRole } from '../game/types';
import {
  ClientSessionInfo,
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from './protocol';

export type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export const LOBBY_ROOM = 'lobby';

export interface SocketContext {
  io: TypedServer;
  sessions: SessionManager;
  names: NameRegistry;
}

export function buildSessionInfo(session: GameSession, role: PlayerRole): ClientSessionInfo {
  return {
    id: session.id,
    hostName: session.hostName,
    guestName: session.guestName,
    config: session.config,
    state: session.state,
    stats: session.stats,
    yourRole: role,
  };
}

export function broadcastLobby(ctx: SocketContext): void {
  ctx.io.to(LOBBY_ROOM).emit('lobby:sessions', ctx.sessions.openSessions());
}

export function broadcastLeaderboard(ctx: SocketContext): void {
  ctx.io.emit('leaderboard:update', ctx.names.leaderboard());
}

/** Emit each player's fog-of-war view + session meta individually. */
export function emitGameState(ctx: SocketContext, session: GameSession): void {
  const targets: { socketId: string | null; role: PlayerRole }[] = [
    { socketId: session.hostSocketId, role: 'host' },
    { socketId: session.guestSocketId, role: 'guest' },
  ];
  for (const { socketId, role } of targets) {
    if (!socketId) continue;
    ctx.io.to(socketId).emit('game:state', {
      session: buildSessionInfo(session, role),
      view: session.gameState.getVisibleState(role),
    });
  }
}

export function socketIdForRole(session: GameSession, role: PlayerRole): string | null {
  return role === 'host' ? session.hostSocketId : session.guestSocketId;
}

export function nameForRole(session: GameSession, role: PlayerRole): string {
  return (role === 'host' ? session.hostName : session.guestName) ?? 'Unknown';
}
