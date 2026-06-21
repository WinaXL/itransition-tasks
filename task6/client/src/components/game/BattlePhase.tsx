import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BattleGrid } from '../grid/BattleGrid';
import { CellKind } from '../grid/GridCell';
import { ShipSprite } from '../grid/ShipPlacer';
import { GameHeader } from './GameHeader';
import { ChatPanel } from './ChatPanel';
import { useSoundFX } from '../../hooks/useSoundFX';
import { shipAccent } from '../../lib/configs';
import {
  ChatMessage,
  ClientSessionInfo,
  PlacedShip,
  ShotResultPayload,
  VisibleState,
} from '../../types';

interface Props {
  session: ClientSessionInfo;
  view: VisibleState;
  enemyName: string;
  myName: string;
  lastShot: ShotResultPayload | null;
  chat: ChatMessage[];
  onFire: (row: number, col: number) => void;
  onSendChat: (message: string) => void;
  recording: boolean;
  canRecord: boolean;
  replayError: string | null;
  hasReplay: boolean;
  onToggleRecording: () => void;
  onDownloadReplay: () => void;
}

export function BattlePhase({
  session,
  view,
  enemyName,
  myName,
  lastShot,
  chat,
  onFire,
  onSendChat,
  recording,
  canRecord,
  replayError,
  hasReplay,
  onToggleRecording,
  onDownloadReplay,
}: Props) {
  const sfx = useSoundFX();
  const myRole = session.yourRole;
  const myTurn = view.currentTurn === myRole && view.phase === 'battle';
  const [toast, setToast] = useState<string | null>(null);
  const handledShot = useRef<string>('');
  const prevTurn = useRef<boolean>(myTurn);

  const shotKey = lastShot
    ? `${lastShot.shooter}-${lastShot.row}-${lastShot.col}-${lastShot.outcome}`
    : '';

  useEffect(() => {
    if (!lastShot || shotKey === handledShot.current) return;
    handledShot.current = shotKey;
    const mine = lastShot.shooter === myRole;
    if (lastShot.outcome === 'sunk') {
      sfx.sunk();
      setToast(mine ? `You sunk ${enemyName}'s ${lastShot.shipName}!` : `Your ${lastShot.shipName} was sunk!`);
    } else if (lastShot.outcome === 'hit') {
      sfx.hit();
      if (!mine) setToast('Incoming hit on your fleet!');
    } else {
      sfx.miss();
    }
  }, [shotKey, lastShot, myRole, enemyName, sfx]);

  useEffect(() => {
    if (myTurn && !prevTurn.current) sfx.yourTurn();
    prevTurn.current = myTurn;
  }, [myTurn, sfx]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const incoming = useMemo(() => indexShots(view.incomingShots), [view.incomingShots]);
  const outgoing = useMemo(() => indexShots(view.outgoingShots), [view.outgoingShots]);

  const ownCellKind = (r: number, c: number): CellKind => incoming.get(`${r}:${c}`) ?? 'water';
  const enemyCellKind = (r: number, c: number): CellKind => outgoing.get(`${r}:${c}`) ?? 'water';

  const enemySunk = view.revealedEnemyShips.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="fixed left-1/2 top-20 z-40 -translate-x-1/2"
          >
            <div className="panel border-danger/50 px-5 py-2">
              <span className="heading text-sm text-danger">{toast}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <GameHeader
        myTurn={myTurn}
        myName={myName}
        enemyName={enemyName}
        myWins={myRole === 'host' ? session.stats.hostWins : session.stats.guestWins}
        enemyWins={myRole === 'host' ? session.stats.guestWins : session.stats.hostWins}
      />

      <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
        {canRecord && (
          <button
            type="button"
            onClick={onToggleRecording}
            className={`mono flex items-center gap-2 border px-3 py-1.5 text-[0.65rem] uppercase tracking-widest transition ${
              recording
                ? 'border-danger/60 bg-danger/10 text-danger'
                : 'border-ocean-700/60 text-ocean-200 hover:border-sonar/50'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${recording ? 'anim-blink bg-danger' : 'bg-slate-500'}`}
            />
            {recording ? 'REC — Stop Replay' : 'Record Replay'}
          </button>
        )}
        {replayError && <span className="mono text-[0.65rem] text-danger">{replayError}</span>}
        {hasReplay && !recording && (
          <button
            type="button"
            onClick={onDownloadReplay}
            className="mono border border-sonar/40 px-3 py-1.5 text-[0.65rem] uppercase tracking-widest text-sonar"
          >
            Download Replay
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BoardPanel
          title="Enemy Waters"
          subtitle={myTurn ? 'Select a target' : 'Hold fire'}
          accent="danger"
        >
          <BattleGrid
            size={view.gridSize}
            cellKind={enemyCellKind}
            interactive={myTurn}
            fireableCell={(r, c) => myTurn && !outgoing.has(`${r}:${c}`)}
            onCellClick={(r, c) => {
              if (myTurn && !outgoing.has(`${r}:${c}`)) onFire(r, c);
            }}
            sweep={!myTurn}
            overlay={view.revealedEnemyShips.map((s) => (
              <ShipSprite key={s.id} anchor={s.cells[0]} size={s.size} orientation={s.orientation} state="sunk" />
            ))}
          />
          <FleetTracker
            title={`${enemyName}'s fleet`}
            ships={expectedEnemyFleet(session, view.revealedEnemyShips)}
          />
        </BoardPanel>

        <BoardPanel title="Your Waters" subtitle="Defensive grid" accent="ocean">
          <BattleGrid
            size={view.gridSize}
            cellKind={ownCellKind}
            interactive={false}
            overlay={view.ownShips.map((s) => (
              <ShipSprite
                key={s.id}
                anchor={s.cells[0]}
                size={s.size}
                orientation={s.orientation}
                state={s.sunk ? 'sunk' : 'placed'}
              />
            ))}
          />
          <FleetTracker title="Your fleet" ships={view.ownShips} />
        </BoardPanel>
      </div>

      <div className="mt-4 text-center">
        <span className="mono text-[0.65rem] text-slate-500">
          {enemySunk} of {session.config.ships.reduce((s, d) => s + d.count, 0)} enemy ships destroyed
        </span>
      </div>

      <ChatPanel chat={chat} myRole={myRole} onSend={onSendChat} disabled={session.isVsCpu} />
    </div>
  );
}

function indexShots(shots: { row: number; col: number; outcome: CellKind }[]): Map<string, CellKind> {
  const map = new Map<string, CellKind>();
  shots.forEach((s) => map.set(`${s.row}:${s.col}`, s.outcome));
  return map;
}

function BoardPanel({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  accent: 'danger' | 'ocean';
  children: React.ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center p-4">
      <div className="mb-3 w-full">
        <h3 className={`heading text-sm ${accent === 'danger' ? 'text-danger/90' : 'text-ocean-200'}`}>
          {title}
        </h3>
        <span className="mono text-[0.6rem] text-slate-500">{subtitle}</span>
      </div>
      {children}
    </div>
  );
}

interface TrackerShip {
  id?: string;
  name: string;
  size: number;
  sunk: boolean;
}

function FleetTracker({ title, ships }: { title: string; ships: TrackerShip[] }) {
  return (
    <div className="mt-4 w-full">
      <div className="mono mb-2 text-[0.6rem] uppercase tracking-widest text-slate-500">{title}</div>
      <div className="flex flex-wrap gap-2">
        {ships.map((s, i) => (
          <div
            key={s.id ?? `${s.name}-${i}`}
            className={`flex gap-[2px] border p-1 ${
              s.sunk ? 'border-danger/50 opacity-90' : 'border-ocean-700/50'
            }`}
          >
            {Array.from({ length: s.size }).map((_, c) => (
              <span
                key={c}
                className="h-2.5 w-2.5"
                style={{
                  background: s.sunk ? 'var(--color-danger)' : shipAccent(s.size),
                  opacity: s.sunk ? 0.9 : 0.5,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Derive the enemy fleet tracker from config, marking sunk ships revealed so far. */
function expectedEnemyFleet(session: ClientSessionInfo, revealed: PlacedShip[]): TrackerShip[] {
  const sunkByKey = new Map<string, number>();
  revealed.forEach((s) => {
    const k = `${s.name}:${s.size}`;
    sunkByKey.set(k, (sunkByKey.get(k) ?? 0) + 1);
  });
  const result: TrackerShip[] = [];
  for (const def of session.config.ships) {
    const k = `${def.name}:${def.size}`;
    let remainingSunk = sunkByKey.get(k) ?? 0;
    for (let i = 0; i < def.count; i += 1) {
      const sunk = remainingSunk > 0;
      if (sunk) remainingSunk -= 1;
      result.push({ name: def.name, size: def.size, sunk });
    }
  }
  return result;
}
