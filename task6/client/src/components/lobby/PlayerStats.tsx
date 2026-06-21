import { usePlayer } from '../../context/PlayerContext';
import { Badge } from '../ui/Badge';

export function PlayerStats() {
  const { stats, leaderboard, displayName } = usePlayer();

  return (
    <div className="space-y-4">
      <div className="panel p-4">
        <h3 className="heading mb-3 text-sm text-ocean-200">Your Record</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Wins" value={stats?.wins ?? 0} tone="text-sonar" />
          <Stat label="Losses" value={stats?.losses ?? 0} tone="text-danger" />
          <Stat label="Played" value={stats?.gamesPlayed ?? 0} tone="text-ocean-200" />
        </div>
        <div className="mono mt-3 text-center text-[0.62rem] text-slate-400">
          {stats?.totalShipsSunk ?? 0} enemy ships sent to the depths
        </div>
      </div>

      <div className="panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="heading text-sm text-ocean-200">Fleet Leaderboard</h3>
          <Badge tone="gold">Top 5</Badge>
        </div>
        {leaderboard.length === 0 ? (
          <p className="mono text-[0.7rem] text-slate-500">No battles fought yet.</p>
        ) : (
          <ol className="space-y-1.5">
            {leaderboard.map((p, i) => (
              <li
                key={p.name}
                className={`flex items-center justify-between border-l-2 px-2 py-1.5 ${
                  p.name === displayName
                    ? 'border-sonar bg-sonar/10'
                    : 'border-ocean-700/60 bg-ocean-900/40'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="mono w-4 text-[0.7rem] text-gold">{i + 1}</span>
                  <span className="heading text-xs text-ocean-100">{p.name}</span>
                </span>
                <span className="mono text-[0.68rem] text-slate-300">
                  <span className="text-sonar">{p.wins}W</span> / {p.totalShipsSunk}⚓
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="panel-inset py-2">
      <div className={`heading text-2xl ${tone}`}>{value}</div>
      <div className="mono text-[0.6rem] uppercase tracking-wider text-slate-400">{label}</div>
    </div>
  );
}
