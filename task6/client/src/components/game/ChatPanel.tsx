import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChatMessage, PlayerRole } from '../../types';

function fmt(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function ChatPanel({
  chat,
  myRole,
  onSend,
}: {
  chat: ChatMessage[];
  myRole: PlayerRole;
  onSend: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const lastSeen = useRef(0);
  const unread = open ? 0 : chat.length - lastSeen.current;

  useEffect(() => {
    if (open) {
      lastSeen.current = chat.length;
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chat, open]);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t.slice(0, 200));
    setText('');
  };

  return (
    <div className="fixed bottom-4 right-4 z-30">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.96 }}
            className="panel mb-3 flex h-80 w-80 flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-ocean-700/60 px-3 py-2">
              <span className="heading text-xs text-ocean-200">Comms Channel</span>
              <button onClick={() => setOpen(false)} className="mono text-slate-400 hover:text-sonar">
                ✕
              </button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {chat.length === 0 && (
                <p className="mono text-[0.65rem] text-slate-500">No transmissions yet.</p>
              )}
              {chat.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col ${m.role === myRole ? 'items-end' : 'items-start'}`}
                >
                  <div className="mono mb-0.5 text-[0.55rem] text-slate-500">
                    <span style={{ color: m.role === 'host' ? 'var(--color-ocean-300)' : 'var(--color-sonar)' }}>
                      {m.from}
                    </span>{' '}
                    {fmt(m.timestamp)}
                  </div>
                  <div
                    className={`max-w-[85%] border px-2.5 py-1.5 text-xs ${
                      m.role === myRole
                        ? 'border-sonar/30 bg-sonar/10 text-ocean-50'
                        : 'border-ocean-600/40 bg-ocean-800/60 text-ocean-100'
                    }`}
                  >
                    {m.message}
                  </div>
                </motion.div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="flex gap-2 border-t border-ocean-700/60 p-2">
              <input
                className="field !border-b-0"
                value={text}
                maxLength={200}
                placeholder="Send a transmission…"
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
              <button onClick={submit} className="btn btn-primary !px-3">
                ➤
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        className="btn btn-primary relative !rounded-none"
      >
        💬 Comms
        {unread > 0 && (
          <span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-danger text-[0.6rem] text-white">
            {unread}
          </span>
        )}
      </button>
    </div>
  );
}
