import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  myTurn: boolean;
  myName: string;
  enemyName: string;
  myWins: number;
  enemyWins: number;
}

export function GameHeader({ myTurn, myName, enemyName, myWins, enemyWins }: Props) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    setSeconds(0);
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [myTurn]);

  return (
    <div className="mb-5 flex flex-col items-center gap-3">
      <div className="flex items-center gap-4">
        <Score name={myName} wins={myWins} highlight={myTurn} side="left" />
        <span className="mono text-xs text-slate-500">VS</span>
        <Score name={enemyName} wins={enemyWins} highlight={!myTurn} side="right" />
      </div>

      <div className="relative h-12 w-64">
        <AnimatePresence mode="wait">
          <motion.div
            key={myTurn ? 'you' : 'enemy'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className={`absolute inset-0 grid place-items-center border ${
              myTurn
                ? 'anim-turn-pulse border-sonar/60 bg-sonar/10'
                : 'border-danger/40 bg-danger/5'
            }`}
          >
            <span className={`heading text-sm ${myTurn ? 'text-sonar' : 'text-danger/90'}`}>
              {myTurn ? 'Your Turn — Fire!' : `${enemyName}'s Turn`}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>
      <span className="mono text-[0.6rem] text-slate-500">turn clock · {seconds}s</span>
    </div>
  );
}

function Score({
  name,
  wins,
  highlight,
  side,
}: {
  name: string;
  wins: number;
  highlight: boolean;
  side: 'left' | 'right';
}) {
  return (
    <div className={`flex flex-col ${side === 'right' ? 'items-end' : 'items-start'}`}>
      <span className={`heading text-sm ${highlight ? 'text-sonar' : 'text-ocean-200'}`}>{name}</span>
      <span className="mono text-[0.62rem] text-gold">{wins} wins</span>
    </div>
  );
}
