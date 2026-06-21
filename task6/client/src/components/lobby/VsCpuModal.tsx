import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ALLOWED_GRID_SIZES, defaultShipsFor } from '../../lib/configs';
import { CpuDifficulty } from '../../types';

const DIFFICULTIES: { id: CpuDifficulty; label: string; hint: string }[] = [
  { id: 'easy', label: 'Easy', hint: 'Random fire — good for training.' },
  { id: 'normal', label: 'Normal', hint: 'Hunt and target after hits.' },
  { id: 'hard', label: 'Hard', hint: 'Checkerboard search + hunt mode.' },
];

export function VsCpuModal({
  open,
  onClose,
  onStart,
}: {
  open: boolean;
  onClose: () => void;
  onStart: (config: { gridSize: number; ships: ReturnType<typeof defaultShipsFor> }, difficulty: CpuDifficulty) => void;
}) {
  const [gridSize, setGridSize] = useState(10);
  const [difficulty, setDifficulty] = useState<CpuDifficulty>('normal');

  return (
    <Modal open={open} onClose={onClose} title="Play vs Computer" maxWidth="32rem">
      <div className="space-y-5">
        <p className="text-sm text-slate-400">
          Engage <span className="text-ocean-100">CPU Admiral</span> in a solo mission. CPU games are private and do
          not affect the human leaderboard.
        </p>

        <section>
          <h4 className="mono mb-2 text-[0.7rem] uppercase tracking-widest text-ocean-300">Battlefield</h4>
          <div className="grid grid-cols-3 gap-2">
            {ALLOWED_GRID_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setGridSize(size)}
                className={`border px-3 py-2 text-sm transition ${
                  gridSize === size
                    ? 'border-sonar bg-sonar/10 text-sonar'
                    : 'border-ocean-700/60 text-ocean-200 hover:border-ocean-500/60'
                }`}
              >
                {size}×{size}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h4 className="mono mb-2 text-[0.7rem] uppercase tracking-widest text-ocean-300">Difficulty</h4>
          <div className="space-y-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDifficulty(d.id)}
                className={`flex w-full flex-col items-start border px-3 py-2 text-left transition ${
                  difficulty === d.id
                    ? 'border-gold/60 bg-gold/10'
                    : 'border-ocean-700/60 hover:border-ocean-500/60'
                }`}
              >
                <span className="heading text-xs text-ocean-100">{d.label}</span>
                <span className="mono text-[0.62rem] text-slate-500">{d.hint}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="flex justify-end gap-3 border-t border-ocean-700/60 pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onStart({ gridSize, ships: defaultShipsFor(gridSize) }, difficulty);
              onClose();
            }}
          >
            Deploy vs CPU
          </Button>
        </div>
      </div>
    </Modal>
  );
}
