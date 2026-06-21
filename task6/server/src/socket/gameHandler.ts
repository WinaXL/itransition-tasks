import { config } from '../config';
import { logger } from '../utils/logger';
import { GameSession } from '../game/SessionManager';
import { PlayerRole } from '../game/types';
import { concludeGame, emitShotResult } from './gameActions';
import { cancelCpuTimer, readyCpuFleet, scheduleCpuTurnIfNeeded } from './cpuController';
import {
  broadcastLobby,
  emitGameState,
  nameForRole,
  socketIdForRole,
  SocketContext,
  TypedSocket,
} from './shared';

export { concludeGame } from './gameActions';

function opponentRole(role: PlayerRole): PlayerRole {
  return role === 'host' ? 'guest' : 'host';
}

export function registerGameHandlers(socket: TypedSocket, ctx: SocketContext): void {
  const sessionFor = (): { session: GameSession; role: PlayerRole } | null => {
    const session = ctx.sessions.findBySocket(socket.id);
    if (!session) return null;
    const role = ctx.sessions.roleOf(session, socket.id);
    if (!role) return null;
    return { session, role };
  };

  socket.on('game:placing', ({ placed, total }) => {
    const ctxt = sessionFor();
    if (!ctxt) return;
    const oppId = socketIdForRole(ctxt.session, opponentRole(ctxt.role));
    if (oppId) ctx.io.to(oppId).emit('game:opponentProgress', { placed, total });
  });

  socket.on('game:ready', ({ fleet }) => {
    try {
      const ctxt = sessionFor();
      if (!ctxt) return socket.emit('game:error', { message: 'You are not in a game.' });
      const { session, role } = ctxt;

      const result = session.gameState.submitFleet(role, fleet);
      if (!result.ok) {
        return socket.emit('game:error', { message: result.error ?? 'Invalid fleet.' });
      }
      session.gameState.setReady(role);

      const oppId = socketIdForRole(session, opponentRole(role));
      if (oppId) {
        ctx.io.to(oppId).emit('game:opponentProgress', {
          placed: session.gameState.fleetSize,
          total: session.gameState.fleetSize,
        });
      }

      if (session.isVsCpu && !session.gameState.isReady(session.cpuRole)) {
        readyCpuFleet(session);
        ctx.io.to(session.hostSocketId).emit('game:opponentProgress', {
          placed: session.gameState.fleetSize,
          total: session.gameState.fleetSize,
        });
      }

      if (session.gameState.bothReady()) {
        session.state = 'battle';
        ctx.io.to(session.id).emit('game:start');
      }
      emitGameState(ctx, session);
      scheduleCpuTurnIfNeeded(ctx, session);
    } catch (err) {
      logger.error('game:ready failed', err);
      socket.emit('game:error', { message: 'Could not lock in your fleet.' });
    }
  });

  socket.on('game:fire', ({ row, col }) => {
    try {
      const ctxt = sessionFor();
      if (!ctxt) return;
      const { session, role } = ctxt;

      const result = session.gameState.fire(role, row, col);
      if (!result.ok) {
        return socket.emit('game:error', { message: result.error ?? 'Invalid shot.' });
      }

      emitShotResult(ctx, session, role, row, col, {
        outcome: result.outcome!,
        shipName: result.shipName,
        sunkShipCells: result.sunkShipCells,
        nextTurn: result.nextTurn!,
        gameOver: !!result.gameOver,
      });
      if (!result.gameOver) scheduleCpuTurnIfNeeded(ctx, session);
    } catch (err) {
      logger.error('game:fire failed', err);
      socket.emit('game:error', { message: 'Could not register your shot.' });
    }
  });

  socket.on('game:chat', ({ message }) => {
    const ctxt = sessionFor();
    if (!ctxt) return;
    if (ctxt.session.isVsCpu) return;
    const clean = String(message).slice(0, 200).trim();
    if (!clean) return;
    ctx.io.to(ctxt.session.id).emit('game:chatMessage', {
      from: nameForRole(ctxt.session, ctxt.role),
      role: ctxt.role,
      message: clean,
      timestamp: Date.now(),
    });
  });

  socket.on('game:rematch', () => {
    const ctxt = sessionFor();
    if (!ctxt) return;
    const { session, role } = ctxt;
    if (session.state !== 'finished') return;

    if (session.isVsCpu) {
      cancelCpuTimer(session);
      session.gameState.reset();
      session.rematch = { host: false, guest: false };
      session.state = 'placing';
      emitGameState(ctx, session);
      return;
    }

    session.rematch[role] = true;
    const oppId = socketIdForRole(session, opponentRole(role));
    if (oppId) ctx.io.to(oppId).emit('game:opponentReturned', { name: nameForRole(session, role) });

    if (session.rematch.host && session.rematch.guest) {
      session.gameState.reset();
      session.rematch = { host: false, guest: false };
      session.state = 'placing';
      ctx.io.to(session.id).emit('game:start');
      emitGameState(ctx, session);
    }
  });

  socket.on('game:leave', () => {
    const ctxt = sessionFor();
    if (!ctxt) return;
    handlePlayerExit(ctx, socket, true);
  });
}

/**
 * Remove a socket from its session. If a game was in progress, the opponent
 * wins by forfeit. Used by both explicit leave and disconnect.
 */
export function handlePlayerExit(ctx: SocketContext, socket: TypedSocket, immediate: boolean): void {
  const session = ctx.sessions.findBySocket(socket.id);
  if (!session) return;
  const role = ctx.sessions.roleOf(session, socket.id);
  if (!role) return;

  socket.leave(session.id);
  cancelCpuTimer(session);

  // Waiting host leaving -> just destroy the session.
  if (session.state === 'waiting') {
    ctx.sessions.remove(session.id);
    broadcastLobby(ctx);
    return;
  }

  const oppRole = opponentRole(role);
  const oppId = socketIdForRole(session, oppRole);
  const leaverName = nameForRole(session, role);

  if (role === 'host') {
    session.hostSocketId = '';
  } else {
    session.guestSocketId = null;
  }

  if (session.state === 'finished') {
    if (oppId) ctx.io.to(oppId).emit('game:opponentLeft', { name: leaverName, temporary: false });
    if (!session.hostSocketId && !session.guestSocketId) ctx.sessions.remove(session.id);
    return;
  }

  // Active game.
  if (immediate) {
    if (session.isVsCpu) {
      ctx.sessions.remove(session.id);
      broadcastLobby(ctx);
      return;
    }
    if (oppId) {
      ctx.io.to(oppId).emit('game:opponentLeft', { name: leaverName, temporary: false });
      concludeGame(ctx, session, oppRole);
    }
    ctx.sessions.remove(session.id);
    broadcastLobby(ctx);
  } else {
    if (session.isVsCpu) {
      ctx.sessions.remove(session.id);
      broadcastLobby(ctx);
      return;
    }
    // Graceful: give the player time to reconnect.
    if (oppId) ctx.io.to(oppId).emit('game:opponentLeft', { name: leaverName, temporary: true });
    session.disconnectedRole = role;
    session.disconnectTimer = setTimeout(() => {
      const live = ctx.sessions.get(session.id);
      if (!live || !live.disconnectedRole) return;
      if (oppId) concludeGame(ctx, live, oppRole);
      ctx.sessions.remove(live.id);
      broadcastLobby(ctx);
    }, config.reconnectGraceMs);
  }
}
