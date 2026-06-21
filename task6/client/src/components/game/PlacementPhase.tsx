import { useEffect, useMemo, useState } from 'react';
import { BattleGrid } from '../grid/BattleGrid';
import { ShipSprite } from '../grid/ShipPlacer';
import { ShipDock, DockShip } from './ShipDock';
import { EnemyStatus } from './EnemyStatus';
import { Button } from '../ui/Button';
import { GameConfig, Orientation } from '../../types';
import { cellsFor, isValidPlacement, key, LocalShip } from '../../lib/geometry';

interface Props {
  config: GameConfig;
  ownReady: boolean;
  opponentName: string;
  opponentProgress: { placed: number; total: number };
  onSendPlacing: (placed: number, total: number) => void;
  onReady: (fleet: { name: string; size: number; row: number; col: number; orientation: Orientation }[]) => void;
  onLeave: () => void;
}

export function PlacementPhase({
  config,
  ownReady,
  opponentName,
  opponentProgress,
  onSendPlacing,
  onReady,
  onLeave,
}: Props) {
  const fleet = useMemo(
    () =>
      config.ships.flatMap((def, di) =>
        Array.from({ length: def.count }).map((_, ci) => ({
          key: `${di}-${ci}`,
          name: def.name,
          size: def.size,
        })),
      ),
    [config],
  );

  const [placed, setPlaced] = useState<LocalShip[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<Orientation>('horizontal');
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);

  const occupied = useMemo(() => {
    const set = new Set<string>();
    placed.forEach((s) => s.cells.forEach((c) => set.add(key(c.row, c.col))));
    return set;
  }, [placed]);

  const dockShips: DockShip[] = fleet.map((f) => ({
    ...f,
    placed: placed.some((p) => p.key === f.key),
  }));
  const allPlaced = placed.length === fleet.length;

  useEffect(() => {
    const next = fleet.find((f) => !placed.some((p) => p.key === f.key));
    setSelectedKey(next ? next.key : null);
  }, [fleet, placed]);

  useEffect(() => {
    onSendPlacing(placed.length, fleet.length);
  }, [placed.length, fleet.length, onSendPlacing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        setOrientation((o) => (o === 'horizontal' ? 'vertical' : 'horizontal'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const selected = fleet.find((f) => f.key === selectedKey) ?? null;

  const previewValid =
    selected && hover
      ? isValidPlacement(selected.size, hover.row, hover.col, orientation, config.gridSize, occupied)
      : false;

  const handleClick = (row: number, col: number) => {
    const existing = placed.find((s) => s.cells.some((c) => c.row === row && c.col === col));
    if (existing) {
      setPlaced((prev) => prev.filter((s) => s.key !== existing.key));
      setSelectedKey(existing.key);
      return;
    }
    if (!selected) return;
    if (!isValidPlacement(selected.size, row, col, orientation, config.gridSize, occupied)) return;
    setPlaced((prev) => [
      ...prev,
      {
        key: selected.key,
        name: selected.name,
        size: selected.size,
        anchor: { row, col },
        orientation,
        cells: cellsFor(selected.size, row, col, orientation),
      },
    ]);
  };

  const randomize = () => {
    const result: LocalShip[] = [];
    const used = new Set<string>();
    for (const f of fleet) {
      let done = false;
      for (let attempt = 0; attempt < 1000 && !done; attempt += 1) {
        const o: Orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
        const row = Math.floor(Math.random() * config.gridSize);
        const col = Math.floor(Math.random() * config.gridSize);
        if (isValidPlacement(f.size, row, col, o, config.gridSize, used)) {
          const cells = cellsFor(f.size, row, col, o);
          cells.forEach((c) => used.add(key(c.row, c.col)));
          result.push({ key: f.key, name: f.name, size: f.size, anchor: { row, col }, orientation: o, cells });
          done = true;
        }
      }
    }
    setPlaced(result);
  };

  const submit = () => {
    onReady(
      placed.map((p) => ({
        name: p.name,
        size: p.size,
        row: p.anchor.row,
        col: p.anchor.col,
        orientation: p.orientation,
      })),
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="heading text-xl text-ocean-100">Place Your Fleet</h2>
          <div className="mt-2 h-1.5 w-56 overflow-hidden bg-ocean-900">
            <div
              className="h-full bg-sonar transition-all"
              style={{ width: `${(placed.length / fleet.length) * 100}%` }}
            />
          </div>
          <span className="mono text-[0.65rem] text-slate-400">
            {placed.length}/{fleet.length} ships positioned
          </span>
        </div>
        <EnemyStatus
          name={opponentName}
          subtitle={
            opponentProgress.total > 0
              ? `Placing ships… ${opponentProgress.placed}/${opponentProgress.total}`
              : 'Deploying fleet…'
          }
          sunk={0}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_320px]">
        <div className="panel flex items-center justify-center p-4">
          {ownReady ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="anim-blink text-3xl">🛰️</span>
              <p className="heading text-sonar">Fleet locked in</p>
              <p className="mono text-xs text-slate-400">Waiting for {opponentName} to deploy…</p>
            </div>
          ) : (
            <BattleGrid
              size={config.gridSize}
              cellKind={() => 'water'}
              interactive
              onCellClick={handleClick}
              onCellEnter={(r, c) => setHover({ row: r, col: c })}
              onLeave={() => setHover(null)}
              overlay={
                <>
                  {placed.map((s) => (
                    <ShipSprite
                      key={s.key}
                      anchor={s.anchor}
                      size={s.size}
                      orientation={s.orientation}
                      state="placed"
                    />
                  ))}
                  {selected && hover && (
                    <ShipSprite
                      anchor={hover}
                      size={selected.size}
                      orientation={orientation}
                      state={previewValid ? 'valid' : 'invalid'}
                    />
                  )}
                </>
              }
            />
          )}
        </div>

        {!ownReady && (
          <div className="space-y-4">
            <div className="panel p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="heading text-sm text-ocean-200">Ship Dock</h3>
                <Button variant="ghost" onClick={() => setOrientation((o) => (o === 'horizontal' ? 'vertical' : 'horizontal'))}>
                  {orientation === 'horizontal' ? '↔ Horiz' : '↕ Vert'}
                </Button>
              </div>
              <ShipDock ships={dockShips} selectedKey={selectedKey} onSelect={setSelectedKey} />
              <p className="mono mt-3 text-[0.6rem] leading-relaxed text-slate-500">
                Click a cell to place · click a ship to remove · press R to rotate
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="ghost" onClick={randomize}>
                🎲 Randomize
              </Button>
              <Button variant="ghost" onClick={() => setPlaced([])}>
                ✕ Clear
              </Button>
            </div>
            <Button variant="primary" className="w-full" disabled={!allPlaced} onClick={submit}>
              Ready for Battle
            </Button>
            <Button variant="danger" className="w-full" onClick={onLeave}>
              Abandon Mission
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
