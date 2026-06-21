import { useEffect } from 'react';
import { useGameContext } from '../context/GameContext';

/** Lobby slice: open sessions + create/join/cancel actions. */
export function useLobby() {
  const { sessions, refreshLobby, createSession, joinSession, cancelSession } = useGameContext();

  useEffect(() => {
    refreshLobby();
  }, [refreshLobby]);

  return {
    sessions,
    refreshLobby,
    createSession,
    joinSession,
    cancelSession,
    openCount: sessions.length,
  };
}
