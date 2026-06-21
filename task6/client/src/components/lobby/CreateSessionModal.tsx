import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { defaultShipsFor, shipAccent } from '../../lib/configs';
import { ShipDefinition } from '../../types';
import { BattlefieldSizePicker } from './BattlefieldSizePicker';

export function CreateSessionModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (config: { gridSize: number; ships: ShipDefinition[] }) => void;
}) {
  const [gridSize, setGridSize] = useState(10);
  const [ships, setShips] = useState<ShipDefinition[]>(defaultShipsFor(10));

  const selectSize = (size: number) => {
    setGridSize(size);
    setShips(defaultShipsFor(size));
  };

  const setCount = (index: number, count: number) => {
    setShips((prev) => prev.map((s, i) => (i === index ? { ...s, count } : s)));
  };

  const totalShips = ships.reduce((sum, s) => sum + s.count, 0);
  const totalCells = ships.reduce((sum, s) => sum + s.size * s.count, 0);
  const capacity = Math.floor(gridSize * gridSize * 0.45);
  const overCapacity = totalCells > capacity;

  return (
    <Modal open={open} onClose={onClose} title="Launch New Mission" maxWidth="40rem">
      <div className="space-y-5">
        <BattlefieldSizePicker gridSize={gridSize} onSelect={selectSize} />

        <section>
          <h4 className="mono mb-2 text-[0.7rem] uppercase tracking-widest text-ocean-300">
            Fleet configuration
          </h4>
          <div className="panel-inset divide-y divide-ocean-700/40">
            {ships.map((ship, i) => (
              <div key={ship.name} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="heading w-24 truncate text-xs text-ocean-100">{ship.name}</span>
                  <div className="flex gap-[2px]">
                    {Array.from({ length: ship.size }).map((_, c) => (
                      <span
                        key={c}
                        className="h-3 w-3"
                        style={{ background: shipAccent(ship.size) }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="grid h-6 w-6 place-items-center border border-ocean-700/60 text-ocean-200 hover:border-sonar/50"
                    onClick={() => setCount(i, Math.max(0, ship.count - 1))}
                  >
                    −
                  </button>
                  <span className="mono w-6 text-center text-sm text-sonar">{ship.count}</span>
                  <button
                    className="grid h-6 w-6 place-items-center border border-ocean-700/60 text-ocean-200 hover:border-sonar/50"
                    onClick={() => setCount(i, Math.min(5, ship.count + 1))}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <button
              className="mono text-[0.65rem] text-ocean-300 underline-offset-2 hover:text-sonar hover:underline"
              onClick={() => setShips(defaultShipsFor(gridSize))}
            >
              Reset to defaults
            </button>
            <span className={`mono text-[0.65rem] ${overCapacity ? 'text-danger' : 'text-slate-400'}`}>
              {totalShips} ships · {totalCells}/{capacity} cells
            </span>
          </div>
        </section>

        {overCapacity && (
          <p className="mono text-[0.7rem] text-danger">
            Fleet too large for this battlefield — reduce ship counts.
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-ocean-700/60 pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={totalShips === 0 || overCapacity}
            onClick={() => onCreate({ gridSize, ships: ships.filter((s) => s.count > 0) })}
          >
            Launch Mission
          </Button>
        </div>
      </div>
    </Modal>
  );
}
