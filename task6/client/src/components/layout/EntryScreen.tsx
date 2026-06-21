import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { usePlayer } from '../../context/PlayerContext';
import { Button } from '../ui/Button';

export function EntryScreen() {
  const { register, connected } = usePlayer();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    await register(name.trim());
    setBusy(false);
  };

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="mb-2 text-4xl">⚓</div>
        <h1 className="anim-glitch heading text-4xl text-ocean-50 sm:text-5xl">
          Naval<span className="text-sonar"> Strike</span>
        </h1>
        <div className="mx-auto mt-3 h-[2px] w-40 origin-center bg-sonar" style={{ animation: 'underlineSweep 2.6s ease-in-out infinite' }} />
        <p className="mono mt-5 text-xs uppercase tracking-[0.25em] text-ocean-300">
          Real-time multiplayer battleship
        </p>

        <form onSubmit={submit} className="panel mt-8 p-6 text-left">
          <label className="mono mb-2 block text-[0.65rem] uppercase tracking-widest text-ocean-300">
            Enter your callsign
          </label>
          <input
            autoFocus
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Maverick"
            className="field heading text-lg"
          />
          <Button
            type="submit"
            variant="primary"
            className="mt-6 w-full"
            disabled={!name.trim() || busy || !connected}
          >
            {connected ? (busy ? 'Deploying…' : 'Deploy') : 'Connecting…'}
          </Button>
          <p className="mono mt-4 text-[0.6rem] leading-relaxed text-slate-500">
            No password, no email. Your name is just a visual identifier — duplicates become
            "{name.trim() || 'Maverick'} 2", "{name.trim() || 'Maverick'} 3", and so on.
          </p>
        </form>
      </motion.div>
    </div>
  );
}
