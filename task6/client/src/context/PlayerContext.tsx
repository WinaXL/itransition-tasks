import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { socket } from '../lib/socket';
import { PlayerStats } from '../types';

const NAME_KEY = 'naval-strike:name';
const MUTE_KEY = 'naval-strike:muted';

interface PlayerContextValue {
  displayName: string | null;
  stats: PlayerStats | null;
  leaderboard: PlayerStats[];
  connected: boolean;
  muted: boolean;
  toggleMuted: () => void;
  register: (name: string) => Promise<string>;
  logout: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<PlayerStats[]>([]);
  const [connected, setConnected] = useState(socket.connected);
  const [muted, setMuted] = useState<boolean>(
    () => sessionStorage.getItem(MUTE_KEY) === '1',
  );
  const requestedName = useRef<string | null>(sessionStorage.getItem(NAME_KEY));
  const displayNameRef = useRef<string | null>(null);

  const doRegister = useCallback((name: string): Promise<string> => {
    return new Promise((resolve) => {
      socket.emit('player:register', { name }, ({ displayName: assigned, stats: s }) => {
        setDisplayName(assigned);
        displayNameRef.current = assigned;
        setStats(s);
        sessionStorage.setItem(NAME_KEY, assigned);
        requestedName.current = assigned;
        resolve(assigned);
      });
    });
  }, []);

  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      if (requestedName.current) {
        void doRegister(requestedName.current);
      }
    };
    const onDisconnect = () => setConnected(false);
    const onStats = (s: PlayerStats) => {
      const current = displayNameRef.current;
      if (current && s.name.toLowerCase() === current.toLowerCase()) {
        setStats(s);
      }
    };
    const onLeaderboard = (lb: PlayerStats[]) => {
      setLeaderboard(lb);
      const current = displayNameRef.current;
      if (!current) return;
      const fresh = lb.find((e) => e.name.toLowerCase() === current.toLowerCase());
      if (fresh) setStats(fresh);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('stats:update', onStats);
    socket.on('leaderboard:update', onLeaderboard);
    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('stats:update', onStats);
      socket.off('leaderboard:update', onLeaderboard);
    };
  }, [doRegister]);

  const toggleMuted = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      sessionStorage.setItem(MUTE_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(NAME_KEY);
    requestedName.current = null;
    displayNameRef.current = null;
    setDisplayName(null);
    setStats(null);
  }, []);

  const value = useMemo<PlayerContextValue>(
    () => ({ displayName, stats, leaderboard, connected, muted, toggleMuted, register: doRegister, logout }),
    [displayName, stats, leaderboard, connected, muted, toggleMuted, doRegister, logout],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
