import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Header } from '../layout/Header';
import { PlacementPhase } from './PlacementPhase';
import { BattlePhase } from './BattlePhase';
import { GameResultModal } from './GameResultModal';
import { useGame } from '../../hooks/useGame';

export function GamePage() {
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
  } = useGame();

  const [showTransition, setShowTransition] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (battleStarted > 0) {
      setShowTransition(true);
      const t = setTimeout(() => setShowTransition(false), 2200);
      return () => clearTimeout(t);
    }
  }, [battleStarted]);

  useEffect(() => {
    if (!opponentNote) return;
    setNote(
      opponentNote.kind === 'left'
        ? opponentNote.temporary
          ? `${opponentNote.name} disconnected — waiting for reconnect…`
          : `${opponentNote.name} left the battle.`
        : `${opponentNote.name} is back.`,
    );
    const t = setTimeout(() => setNote(null), 4000);
    return () => clearTimeout(t);
  }, [opponentNote]);

  if (!session || !view) {
    return (
      <div className="min-h-screen">
        <Header inGame />
        <div className="grid place-items-center py-32">
          <span className="anim-blink mono text-sonar">Establishing uplink…</span>
        </div>
      </div>
    );
  }

  const enemyName = (session.yourRole === 'host' ? session.guestName : session.hostName) ?? 'Opponent';

  return (
    <div className="min-h-screen">
      <Header inGame />

      {note && (
        <div className="sticky top-[57px] z-20 bg-ocean-900/80 py-1.5 text-center backdrop-blur">
          <span className="mono text-[0.7rem] text-gold">{note}</span>
        </div>
      )}

      {view.phase === 'battle' ? (
        <BattlePhase
          session={session}
          view={view}
          enemyName={enemyName}
          lastShot={lastShot}
          chat={chat}
          onFire={fire}
          onSendChat={sendChat}
        />
      ) : (
        <PlacementPhase
          config={session.config}
          ownReady={view.ownReady}
          opponentName={enemyName}
          opponentProgress={opponentProgress}
          onSendPlacing={sendPlacing}
          onReady={submitFleet}
          onLeave={leaveGame}
        />
      )}

      <AnimatePresence>
        {showTransition && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className="fixed inset-0 z-50 grid place-items-center bg-ocean-950/95"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="mb-3 text-5xl">⚓</div>
                <h2 className="heading text-3xl text-sonar sm:text-5xl" style={{ textShadow: '0 0 30px rgba(0,255,136,0.5)' }}>
                  Battle Stations
                </h2>
                <p className="mono mt-3 text-sm tracking-[0.3em] text-ocean-200">— ENGAGE —</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {gameOver && !showTransition && (
        <GameResultModal
          result={gameOver}
          myRole={session.yourRole}
          onRematch={rematch}
          onLeave={leaveGame}
        />
      )}
    </div>
  );
}
