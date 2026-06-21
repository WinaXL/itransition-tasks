import { GameSession } from '../game/SessionManager';
import { PlayerRole } from '../game/types';
import {
  broadcastLeaderboard,
  broadcastLobby,
  emitGameState,
  emitSessionStatsUpdates,
  nameForRole,
  SocketContext,
} from './shared';

function opponentRole(role: PlayerRole): PlayerRole {
  return role === 'host' ? 'guest' : 'host';
}

/** Finalize a finished game: update session + global stats, notify both players. */
export function concludeGame(ctx: SocketContext, session: GameSession, winnerRole: PlayerRole): void {
  const loserRole = opponentRole(winnerRole);
  const winnerName = nameForRole(session, winnerRole);
  const loserName = nameForRole(session, loserRole);

  session.state = 'finished';
  if (winnerRole === 'host') session.stats.hostWins += 1;
  else session.stats.guestWins += 1;

  // CPU games do not affect the human-vs-human leaderboard.
  if (!session.isVsCpu) {
    ctx.names.recordResult(
      winnerName,
      loserName,
      session.gameState.shipsSunkBy(winnerRole),
      session.gameState.shipsSunkBy(loserRole),
    );
    broadcastLeaderboard(ctx);
    emitSessionStatsUpdates(ctx, session);
  }

  ctx.io.to(session.id).emit('game:over', {
    winnerName,
    loserName,
    winnerRole,
    stats: session.stats,
  });
  emitGameState(ctx, session);
  broadcastLobby(ctx);
}

export function emitShotResult(
  ctx: SocketContext,
  session: GameSession,
  shooter: PlayerRole,
  row: number,
  col: number,
  result: {
    outcome: 'miss' | 'hit' | 'sunk';
    shipName?: string;
    sunkShipCells?: { row: number; col: number }[];
    nextTurn: PlayerRole;
    gameOver: boolean;
  },
): void {
  ctx.io.to(session.id).emit('game:shotResult', {
    shooter,
    row,
    col,
    outcome: result.outcome,
    shipName: result.shipName,
    sunkShipCells: result.sunkShipCells,
    nextTurn: result.nextTurn,
    gameOver: result.gameOver,
  });

  if (result.gameOver) {
    concludeGame(ctx, session, shooter);
  } else {
    emitGameState(ctx, session);
  }
}
