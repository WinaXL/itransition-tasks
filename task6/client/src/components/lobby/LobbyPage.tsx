import { useState } from 'react';
import { Header } from '../layout/Header';
import { SessionCard } from './SessionCard';
import { PlayerStats } from './PlayerStats';
import { CreateSessionModal } from './CreateSessionModal';
import { VsCpuModal } from './VsCpuModal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useLobby } from '../../hooks/useLobby';

export function LobbyPage() {
  const { sessions, createSession, createVsCpuSession, joinSession, refreshLobby, openCount } = useLobby();
  const [modalOpen, setModalOpen] = useState(false);
  const [cpuModalOpen, setCpuModalOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="heading text-2xl text-ocean-100 sm:text-3xl">Mission Control</h1>
            <p className="mt-1 max-w-xl text-sm text-slate-400">
              Deploy a new battle or join an open mission. Many duels run at once across the fleet.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone="sonar">{openCount} open</Badge>
            <Button variant="ghost" onClick={refreshLobby}>
              ↻ Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="heading text-sm text-ocean-200">Open Missions</h2>
              <span className="h-px flex-1 bg-ocean-700/50" />
            </div>
            {sessions.length === 0 ? (
              <div className="panel flex flex-col items-center justify-center gap-3 p-10 text-center">
                <span className="text-4xl opacity-40">🌊</span>
                <p className="text-sm text-slate-400">
                  No open missions. Be the first to deploy.
                </p>
                <Button variant="primary" onClick={() => setModalOpen(true)}>
                  Create Mission
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {sessions.map((s, i) => (
                  <SessionCard key={s.id} session={s} index={i} onJoin={joinSession} />
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <Button variant="primary" className="w-full" onClick={() => setModalOpen(true)}>
              + Create New Mission
            </Button>
            <Button variant="ghost" className="w-full border border-gold/40 text-gold" onClick={() => setCpuModalOpen(true)}>
              🤖 Play vs Computer
            </Button>
            <PlayerStats />
          </aside>
        </div>
      </main>

      <CreateSessionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={(config) => {
          createSession(config);
          setModalOpen(false);
        }}
      />

      <VsCpuModal
        open={cpuModalOpen}
        onClose={() => setCpuModalOpen(false)}
        onStart={(config, difficulty) => createVsCpuSession(config, difficulty)}
      />
    </div>
  );
}
