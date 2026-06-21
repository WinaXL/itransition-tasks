import { motion } from 'framer-motion';
import { SessionSummary } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

function GridSchematic({ size }: { size: number }) {
  const dots = Math.min(size, 12);
  return (
    <div
      className="grid gap-[2px]"
      style={{ gridTemplateColumns: `repeat(${dots}, 1fr)`, width: dots * 6 }}
    >
      {Array.from({ length: dots * dots }).map((_, i) => (
        <span key={i} className="h-[3px] w-[3px] bg-sonar/40" />
      ))}
    </div>
  );
}

export function SessionCard({
  session,
  index,
  onJoin,
}: {
  session: SessionSummary;
  index: number;
  onJoin: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ x: -24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 260, damping: 26 }}
      className="panel relative overflow-hidden p-4"
      style={{ clipPath: 'polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%)' }}
    >
      <div
        className="absolute right-3 top-3 select-none border-2 border-danger/70 px-2 py-0.5"
        style={{ transform: 'rotate(-7deg)' }}
      >
        <span className="heading text-[0.6rem] tracking-[0.2em] text-danger">Open</span>
      </div>

      <div className="mono mb-1 text-[0.62rem] text-ocean-300/70">
        MISSION · {session.id.slice(0, 8).toUpperCase()}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center border border-gold/40 bg-gold/10 text-gold">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M5 16 3 5l5.5 4L12 4l3.5 5L21 5l-2 11H5z" />
          </svg>
        </span>
        <div>
          <div className="heading text-sm text-ocean-100">{session.hostName}</div>
          <div className="mono text-[0.6rem] text-slate-400">Commanding officer</div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <GridSchematic size={session.gridSize} />
          <div className="flex flex-col gap-1">
            <Badge tone="ocean">{session.gridSize}×{session.gridSize}</Badge>
            <Badge tone="sonar">{session.shipCount} ships</Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="mono flex items-center gap-1.5 text-[0.62rem] text-sonar/80">
          <span className="anim-blink inline-block h-1.5 w-1.5 rounded-full bg-sonar" />
          Awaiting opponent…
        </span>
        <Button variant="primary" onClick={() => onJoin(session.id)}>
          Join Mission
        </Button>
      </div>
    </motion.div>
  );
}
