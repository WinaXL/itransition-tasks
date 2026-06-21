import { ALLOWED_GRID_SIZES } from '../../lib/configs';

function MiniGrid({ size, active }: { size: number; active: boolean }) {
  return (
    <div
      className="grid gap-[1px]"
      style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: 54 }}
    >
      {Array.from({ length: size * size }).map((_, i) => (
        <span
          key={i}
          className="aspect-square"
          style={{ background: active ? 'rgba(0,255,136,0.5)' : 'rgba(77,157,224,0.3)' }}
        />
      ))}
    </div>
  );
}

export function BattlefieldSizePicker({
  gridSize,
  onSelect,
  label = 'Battlefield size',
  summary,
}: {
  gridSize: number;
  onSelect: (size: number) => void;
  label?: string;
  summary?: string;
}) {
  return (
    <section>
      <h4 className="mono mb-2 text-[0.7rem] uppercase tracking-widest text-ocean-300">{label}</h4>
      <div className="grid grid-cols-3 gap-3">
        {ALLOWED_GRID_SIZES.map((size) => {
          const active = size === gridSize;
          return (
            <button
              key={size}
              type="button"
              onClick={() => onSelect(size)}
              className={`flex flex-col items-center gap-2 border p-3 transition ${
                active
                  ? 'border-sonar bg-sonar/10'
                  : 'border-ocean-700/60 bg-ocean-900/40 hover:border-ocean-500/60'
              }`}
            >
              <MiniGrid size={size} active={active} />
              <span className={`heading text-xs ${active ? 'text-sonar' : 'text-ocean-200'}`}>
                {size}×{size}
              </span>
            </button>
          );
        })}
      </div>
      {summary && (
        <p className="mono mt-2 text-center text-[0.65rem] text-slate-400">{summary}</p>
      )}
    </section>
  );
}
