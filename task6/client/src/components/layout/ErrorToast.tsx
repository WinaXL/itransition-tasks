import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameContext } from '../../context/GameContext';

export function ErrorToast() {
  const { error, clearError } = useGameContext();

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(clearError, 3500);
    return () => clearTimeout(t);
  }, [error, clearError]);

  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2"
        >
          <div className="panel border-danger/50 px-4 py-2">
            <span className="mono text-xs text-danger">⚠ {error}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
