import { shipAccent } from '../../lib/configs';

export interface DockShip {
  key: string;
  name: string;
  size: number;
  placed: boolean;
}

export function ShipDock({
  ships,
  selectedKey,
  onSelect,
}: {
  ships: DockShip[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="space-y-2">
      {ships.map((ship) => {
        const selected = ship.key === selectedKey;
        return (
          <button
            key={ship.key}
            disabled={ship.placed}
            onClick={() => onSelect(ship.key)}
            className={`flex w-full items-center justify-between border px-3 py-2 transition ${
              ship.placed
                ? 'border-ocean-700/40 bg-ocean-900/30 opacity-50'
                : selected
                  ? 'border-sonar bg-sonar/10'
                  : 'border-ocean-700/60 bg-ocean-900/50 hover:border-ocean-500/70'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex gap-[2px]">
                {Array.from({ length: ship.size }).map((_, i) => (
                  <span
                    key={i}
                    className="h-3.5 w-3.5"
                    style={{
                      background: ship.placed ? 'rgba(120,140,160,0.4)' : shipAccent(ship.size),
                    }}
                  />
                ))}
              </div>
              <span className="heading text-xs text-ocean-100">{ship.name}</span>
            </div>
            <span className="mono text-[0.62rem] text-slate-400">
              {ship.placed ? 'DEPLOYED' : selected ? 'SELECTED' : `${ship.size} cells`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
