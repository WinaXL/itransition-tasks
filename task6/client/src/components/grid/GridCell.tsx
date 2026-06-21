import { motion } from 'framer-motion';

export type CellKind = 'water' | 'miss' | 'hit' | 'sunk';

interface GridCellProps {
  kind: CellKind;
  interactive: boolean;
  fireable: boolean;
  onClick?: () => void;
  onEnter?: () => void;
}

export function GridCell({ kind, interactive, fireable, onClick, onEnter }: GridCellProps) {
  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={onClick}
      onMouseEnter={onEnter}
      className="group relative border border-ocean-700/40"
      style={{
        width: 'var(--cell)',
        height: 'var(--cell)',
        cursor: fireable ? 'crosshair' : interactive ? 'pointer' : 'default',
        backgroundColor: 'rgba(3, 18, 36, 0.55)',
        backgroundImage:
          'repeating-linear-gradient(45deg, rgba(77,157,224,0.06) 0, rgba(77,157,224,0.06) 1px, transparent 1px, transparent 6px)',
      }}
    >
      {/* Hover sonar ring for fireable cells */}
      {fireable && (
        <span className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
          <span className="absolute inset-1 border border-sonar/70" />
          <span
            className="absolute inset-0"
            style={{ boxShadow: 'inset 0 0 10px rgba(0,255,136,0.45)' }}
          />
        </span>
      )}

      {kind === 'miss' && (
        <span className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300/80" />
          <span
            className="anim-ripple absolute h-3 w-3 rounded-full border border-slate-200/70"
            style={{ borderRadius: '9999px' }}
          />
        </span>
      )}

      {(kind === 'hit' || kind === 'sunk') && (
        <motion.span
          initial={{ scale: 0.4, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 16 }}
          className="pointer-events-none absolute inset-0 grid place-items-center"
        >
          <span
            className="absolute inset-0.5"
            style={{
              background:
                kind === 'sunk'
                  ? 'radial-gradient(circle, rgba(255,68,68,0.9), rgba(139,26,26,0.85))'
                  : 'radial-gradient(circle, rgba(255,140,40,0.95), rgba(200,40,20,0.7))',
              boxShadow:
                kind === 'sunk'
                  ? '0 0 14px rgba(255,68,68,0.8)'
                  : '0 0 12px rgba(255,120,30,0.7)',
            }}
          />
          <span className="relative text-[0.7rem]">{kind === 'sunk' ? '☠' : '✸'}</span>
        </motion.span>
      )}
    </button>
  );
}
