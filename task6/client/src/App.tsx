import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { GameProvider, useGameContext } from './context/GameContext';
import { OceanBackground } from './components/layout/OceanBackground';
import { EntryScreen } from './components/layout/EntryScreen';
import { ErrorToast } from './components/layout/ErrorToast';
import { LobbyPage } from './components/lobby/LobbyPage';
import { GamePage } from './components/game/GamePage';

/** Applies context-driven navigation requests (join/leave/cancel). */
function NavigationBridge() {
  const { pendingNav, clearNav } = useGameContext();
  const navigate = useNavigate();
  useEffect(() => {
    if (pendingNav) {
      navigate(pendingNav);
      clearNav();
    }
  }, [pendingNav, navigate, clearNav]);
  return null;
}

function Routed() {
  const { displayName } = usePlayer();
  return (
    <>
      <NavigationBridge />
      <Routes>
        <Route path="/" element={displayName ? <LobbyPage /> : <EntryScreen />} />
        <Route path="/game/:roomId" element={displayName ? <GamePage /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <PlayerProvider>
        <GameProvider>
          <OceanBackground />
          <Routed />
          <ErrorToast />
        </GameProvider>
      </PlayerProvider>
    </BrowserRouter>
  );
}
