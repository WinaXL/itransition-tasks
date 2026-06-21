import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { useSoundFX } from '../../hooks/useSoundFX';
import { GameOverPayload, PlayerRole } from '../../types';

export function GameResultModal({
  result,
  myRole,
  isVsCpu = false,
  onRematch,
  onLeave,
  hasReplay = false,
  onDownloadReplay,
  onStopRecording,
  recording = false,
}: {
  result: GameOverPayload;
  myRole: PlayerRole;
  isVsCpu?: boolean;
  onRematch: () => void;
  onLeave: () => void;
  hasReplay?: boolean;
  onDownloadReplay?: () => void;
  onStopRecording?: () => void;
  recording?: boolean;
}) {
  const sfx = useSoundFX();
  const won = result.winnerRole === myRole;
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (won) sfx.victory();
    else sfx.defeat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-ocean-950/85 backdrop-blur-md" />
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        className="panel relative w-full max-w-md p-8 text-center"
        style={{ borderColor: won ? 'rgba(0,255,136,0.5)' : 'rgba(255,68,68,0.5)' }}
      >
        <div className="mb-2 text-5xl">{won ? '🏆' : '💀'}</div>
        <h2
          className="heading text-4xl"
          style={{
            color: won ? 'var(--color-sonar)' : 'var(--color-danger)',
            textShadow: won ? '0 0 24px rgba(0,255,136,0.5)' : '0 0 24px rgba(255,68,68,0.5)',
          }}
        >
          {won ? 'Victory' : 'Defeat'}
        </h2>
        <p className="mono mt-3 text-sm text-slate-300">
          {won ? (
            <>You crushed <span className="text-ocean-100">{result.loserName}</span>.</>
          ) : (
            <><span className="text-ocean-100">{result.winnerName}</span> sank your fleet.</>
          )}
        </p>

        <div className="mono mt-5 flex items-center justify-center gap-4 border-y border-ocean-700/50 py-3 text-sm">
          <span className="text-sonar">{result.stats.hostWins}</span>
          <span className="text-[0.6rem] text-slate-500">SERIES</span>
          <span className="text-sonar">{result.stats.guestWins}</span>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {hasReplay && onDownloadReplay && (
            <Button variant="ghost" onClick={onDownloadReplay}>
              ⬇ Download Replay Video
            </Button>
          )}
          {recording && onStopRecording && (
            <Button variant="ghost" onClick={onStopRecording}>
              ■ Stop Recording
            </Button>
          )}
          {isVsCpu ? (
            <Button variant="primary" onClick={onRematch}>
              ⟳ Play Again
            </Button>
          ) : requested ? (
            <div className="anim-blink mono py-2 text-sm text-sonar">Waiting for opponent…</div>
          ) : (
            <Button
              variant="primary"
              onClick={() => {
                setRequested(true);
                onRematch();
              }}
            >
              ⟳ Play Again
            </Button>
          )}
          <Button variant="ghost" onClick={onLeave}>
            Return to Lobby
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
