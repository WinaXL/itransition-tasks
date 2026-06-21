import { NameRegistry } from '../game/NameRegistry';
import { SessionManager } from '../game/SessionManager';
import { logger } from '../utils/logger';
import { registerGameHandlers, handlePlayerExit } from './gameHandler';
import { registerLobbyHandlers } from './lobbyHandler';
import {
  broadcastLeaderboard,
  broadcastLobby,
  buildSessionInfo,
  emitGameState,
  LOBBY_ROOM,
  SocketContext,
  TypedServer,
  TypedSocket,
} from './shared';

export function initSocketServer(io: TypedServer): void {
  const ctx: SocketContext = {
    io,
    sessions: new SessionManager(),
    names: new NameRegistry(),
  };

  io.on('connection', (socket: TypedSocket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('player:register', ({ name }, ack) => {
      const displayName = ctx.names.register(socket.id, name ?? '');
      socket.data.displayName = displayName;
      socket.join(LOBBY_ROOM);

      const stats = ctx.names.getStats(displayName)!;
      ack({ displayName, stats });
      socket.emit('lobby:sessions', ctx.sessions.openSessions());
      broadcastLeaderboard(ctx);

      // Reconnect: re-attach to an in-progress session abandoned under this name.
      const orphan = ctx.sessions.findByName(displayName);
      if (orphan && orphan.disconnectedRole) {
        const role = orphan.disconnectedRole;
        if (role === 'host') orphan.hostSocketId = socket.id;
        else orphan.guestSocketId = socket.id;
        if (orphan.disconnectTimer) clearTimeout(orphan.disconnectTimer);
        orphan.disconnectTimer = undefined;
        orphan.disconnectedRole = undefined;

        socket.leave(LOBBY_ROOM);
        socket.join(orphan.id);
        socket.emit('lobby:joined', { session: buildSessionInfo(orphan, role) });
        emitGameState(ctx, orphan);

        const oppId = role === 'host' ? orphan.guestSocketId : orphan.hostSocketId;
        if (oppId) ctx.io.to(oppId).emit('game:opponentReturned', { name: displayName });
        logger.info(`${displayName} reconnected to session ${orphan.id.slice(0, 8)}`);
      }
    });

    registerLobbyHandlers(socket, ctx);
    registerGameHandlers(socket, ctx);

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      handlePlayerExit(ctx, socket, false);
      ctx.names.release(socket.id);
      broadcastLobby(ctx);
      broadcastLeaderboard(ctx);
    });
  });
}
