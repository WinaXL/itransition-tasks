import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../../context/PlayerContext';
import { StatusDot } from '../ui/StatusDot';
import { Tooltip } from '../ui/Tooltip';

export function Header({ inGame = false }: { inGame?: boolean }) {
  const { displayName, stats, connected, muted, toggleMuted } = usePlayer();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b border-ocean-700/40 bg-ocean-950/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <button
          onClick={() => navigate('/')}
          className="group flex items-center gap-3"
          aria-label="Naval Strike home"
        >
          <span className="grid h-9 w-9 place-items-center border border-sonar/40 bg-sonar/10">
            <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" stroke="var(--color-sonar)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="16" cy="7" r="2.5" />
              <path d="M16 9.5V26M9 16h14M7 19a9 9 0 0 0 18 0" />
            </svg>
          </span>
          <span className="heading text-lg leading-none text-ocean-100 sm:text-xl">
            Naval<span className="text-sonar"> Strike</span>
          </span>
        </button>

        <div className="flex items-center gap-3">
          <Tooltip label={muted ? 'Sound off' : 'Sound on'}>
            <button
              onClick={toggleMuted}
              className="grid h-9 w-9 place-items-center border border-ocean-700/60 bg-ocean-900/60 text-ocean-200 transition hover:border-sonar/50 hover:text-sonar"
              aria-label="Toggle sound"
            >
              {muted ? '🔇' : '🔊'}
            </button>
          </Tooltip>

          {displayName && (
            <div className="flex items-center gap-3 border border-ocean-700/60 bg-ocean-900/60 px-3 py-1.5">
              <span className="grid h-7 w-7 place-items-center border border-gold/40 bg-gold/10 text-gold">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M5 16 3 5l5.5 4L12 4l3.5 5L21 5l-2 11H5zm0 2h14v2H5v-2z" />
                </svg>
              </span>
              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <span className="heading text-sm text-ocean-100">{displayName}</span>
                  <StatusDot status={!connected ? 'offline' : inGame ? 'in-game' : 'online'} />
                </div>
                {stats && (
                  <div className="mono text-[0.62rem] text-slate-400">
                    <span className="text-sonar">{stats.wins}W</span> ·{' '}
                    <span className="text-danger">{stats.losses}L</span> ·{' '}
                    {stats.totalShipsSunk} sunk
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
