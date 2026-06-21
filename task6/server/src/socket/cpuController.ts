import { GameSession } from '../game/SessionManager';
import { PlayerRole } from '../game/types';
import { buildCpuFleet, cpuThinkDelay, pickCpuShot } from '../game/CpuPlayer';
import { logger } from '../utils/logger';
import { emitShotResult } from './gameActions';
import { SocketContext } from './shared';

export function cancelCpuTimer(session: GameSession): void {
  if (session.cpuTimer) {
    clearTimeout(session.cpuTimer);
    session.cpuTimer = undefined;
  }
}

/** Auto-place and ready the CPU fleet during placement. */
export function readyCpuFleet(session: GameSession): boolean {
  if (!session.isVsCpu) return false;
  const cpuRole = session.cpuRole;
  if (session.gameState.isReady(cpuRole)) return true;

  const fleet = buildCpuFleet(session.gameState, cpuRole);
  const result = session.gameState.submitFleet(cpuRole, fleet);
  if (!result.ok) {
    logger.error('CPU fleet placement failed', result.error);
    return false;
  }
  session.gameState.setReady(cpuRole);
  return true;
}

/** Schedule a CPU turn if it is currently the CPU's move. */
export function scheduleCpuTurnIfNeeded(ctx: SocketContext, session: GameSession): void {
  if (!session.isVsCpu || session.state !== 'battle') return;
  if (session.gameState.phase !== 'battle') return;
  if (session.gameState.currentTurn !== session.cpuRole) return;

  cancelCpuTimer(session);
  const delay = cpuThinkDelay(session.cpuDifficulty);
  session.cpuTimer = setTimeout(() => {
    session.cpuTimer = undefined;
    executeCpuFire(ctx, session);
  }, delay);
}

function executeCpuFire(ctx: SocketContext, session: GameSession): void {
  const live = ctx.sessions.get(session.id);
  if (!live || !live.isVsCpu || live.state !== 'battle') return;

  const cpuRole = live.cpuRole;
  if (live.gameState.currentTurn !== cpuRole) return;

  const target = pickCpuShot(live.gameState, cpuRole, live.cpuDifficulty);
  if (!target) return;

  const result = live.gameState.fire(cpuRole, target.row, target.col);
  if (!result.ok) {
    logger.error('CPU fire failed', result.error);
    return;
  }

  emitShotResult(ctx, live, cpuRole, target.row, target.col, {
    outcome: result.outcome!,
    shipName: result.shipName,
    sunkShipCells: result.sunkShipCells,
    nextTurn: result.nextTurn!,
    gameOver: !!result.gameOver,
  });

  if (!result.gameOver) scheduleCpuTurnIfNeeded(ctx, live);
}

export function cpuRoleFor(session: GameSession): PlayerRole {
  return session.cpuRole;
}
