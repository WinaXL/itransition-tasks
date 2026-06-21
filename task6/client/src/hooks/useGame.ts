import { useGameContext } from '../context/GameContext';

/** Game slice: active session, fog-of-war view, and gameplay actions. */
export function useGame() {
  const {
    session,
    view,
    opponentProgress,
    lastShot,
    chat,
    gameOver,
    battleStarted,
    opponentNote,
    sendPlacing,
    submitFleet,
    fire,
    sendChat,
    rematch,
    leaveGame,
  } = useGameContext();

  return {
    session,
    view,
    opponentProgress,
    lastShot,
    chat,
    gameOver,
    battleStarted,
    opponentNote,
    sendPlacing,
    submitFleet,
    fire,
    sendChat,
    rematch,
    leaveGame,
  };
}
