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
import {
  ChatMessage,
  ClientSessionInfo,
  FleetEntry,
  GameConfig,
  GameOverPayload,
  SessionSummary,
  ShotResultPayload,
  VisibleState,
} from '../types';

export interface OpponentNote {
  name: string;
  kind: 'left' | 'returned';
  temporary: boolean;
  id: number;
}

interface GameContextValue {
  sessions: SessionSummary[];
  session: ClientSessionInfo | null;
  view: VisibleState | null;
  opponentProgress: { placed: number; total: number };
  lastShot: ShotResultPayload | null;
  chat: ChatMessage[];
  gameOver: GameOverPayload | null;
  battleStarted: number;
  opponentNote: OpponentNote | null;
  error: string | null;
  pendingNav: string | null;

  refreshLobby: () => void;
  createSession: (config: GameConfig) => void;
  joinSession: (roomId: string) => void;
  cancelSession: (roomId: string) => void;
  sendPlacing: (placed: number, total: number) => void;
  submitFleet: (fleet: FleetEntry[]) => void;
  fire: (row: number, col: number) => void;
  sendChat: (message: string) => void;
  rematch: () => void;
  leaveGame: () => void;

  clearError: () => void;
  clearNav: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [session, setSession] = useState<ClientSessionInfo | null>(null);
  const [view, setView] = useState<VisibleState | null>(null);
  const [opponentProgress, setOpponentProgress] = useState({ placed: 0, total: 0 });
  const [lastShot, setLastShot] = useState<ShotResultPayload | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [gameOver, setGameOver] = useState<GameOverPayload | null>(null);
  const [battleStarted, setBattleStarted] = useState(0);
  const [opponentNote, setOpponentNote] = useState<OpponentNote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const noteId = useRef(0);

  useEffect(() => {
    const onSessions = (list: SessionSummary[]) => setSessions(list);

    const onJoined = ({ session: s }: { session: ClientSessionInfo }) => {
      setSession(s);
      setGameOver(null);
      setChat([]);
      setOpponentProgress({ placed: 0, total: 0 });
      setPendingNav(`/game/${s.id}`);
    };

    const onState = ({ session: s, view: v }: { session: ClientSessionInfo; view: VisibleState }) => {
      setSession(s);
      setView(v);
    };

    const onStart = () => {
      setBattleStarted(Date.now());
      setGameOver(null);
    };

    const onProgress = (p: { placed: number; total: number }) => setOpponentProgress(p);

    const onShot = (payload: ShotResultPayload) => setLastShot({ ...payload });

    const onOver = (payload: GameOverPayload) => setGameOver(payload);

    const onChat = (msg: ChatMessage) => setChat((prev) => [...prev, msg].slice(-50));

    const onOpponentLeft = ({ name, temporary }: { name: string; temporary: boolean }) => {
      noteId.current += 1;
      setOpponentNote({ name, kind: 'left', temporary, id: noteId.current });
    };
    const onOpponentReturned = ({ name }: { name: string }) => {
      noteId.current += 1;
      setOpponentNote({ name, kind: 'returned', temporary: false, id: noteId.current });
    };

    const onError = ({ message }: { message: string }) => setError(message);

    socket.on('lobby:sessions', onSessions);
    socket.on('lobby:joined', onJoined);
    socket.on('lobby:error', onError);
    socket.on('game:state', onState);
    socket.on('game:start', onStart);
    socket.on('game:opponentProgress', onProgress);
    socket.on('game:shotResult', onShot);
    socket.on('game:over', onOver);
    socket.on('game:chatMessage', onChat);
    socket.on('game:opponentLeft', onOpponentLeft);
    socket.on('game:opponentReturned', onOpponentReturned);
    socket.on('game:error', onError);

    return () => {
      socket.off('lobby:sessions', onSessions);
      socket.off('lobby:joined', onJoined);
      socket.off('lobby:error', onError);
      socket.off('game:state', onState);
      socket.off('game:start', onStart);
      socket.off('game:opponentProgress', onProgress);
      socket.off('game:shotResult', onShot);
      socket.off('game:over', onOver);
      socket.off('game:chatMessage', onChat);
      socket.off('game:opponentLeft', onOpponentLeft);
      socket.off('game:opponentReturned', onOpponentReturned);
      socket.off('game:error', onError);
    };
  }, []);

  const refreshLobby = useCallback(() => socket.emit('lobby:list'), []);
  const createSession = useCallback((config: GameConfig) => socket.emit('lobby:create', { config }), []);
  const joinSession = useCallback((roomId: string) => socket.emit('lobby:join', { roomId }), []);
  const cancelSession = useCallback((roomId: string) => {
    socket.emit('lobby:cancel', { roomId });
    setSession(null);
    setView(null);
    setPendingNav('/');
  }, []);
  const sendPlacing = useCallback(
    (placed: number, total: number) => socket.emit('game:placing', { placed, total }),
    [],
  );
  const submitFleet = useCallback((fleet: FleetEntry[]) => socket.emit('game:ready', { fleet }), []);
  const fire = useCallback((row: number, col: number) => socket.emit('game:fire', { row, col }), []);
  const sendChat = useCallback((message: string) => socket.emit('game:chat', { message }), []);
  const rematch = useCallback(() => socket.emit('game:rematch'), []);
  const leaveGame = useCallback(() => {
    socket.emit('game:leave');
    setSession(null);
    setView(null);
    setGameOver(null);
    setPendingNav('/');
    socket.emit('lobby:list');
  }, []);

  const clearError = useCallback(() => setError(null), []);
  const clearNav = useCallback(() => setPendingNav(null), []);

  const value = useMemo<GameContextValue>(
    () => ({
      sessions,
      session,
      view,
      opponentProgress,
      lastShot,
      chat,
      gameOver,
      battleStarted,
      opponentNote,
      error,
      pendingNav,
      refreshLobby,
      createSession,
      joinSession,
      cancelSession,
      sendPlacing,
      submitFleet,
      fire,
      sendChat,
      rematch,
      leaveGame,
      clearError,
      clearNav,
    }),
    [
      sessions,
      session,
      view,
      opponentProgress,
      lastShot,
      chat,
      gameOver,
      battleStarted,
      opponentNote,
      error,
      pendingNav,
      refreshLobby,
      createSession,
      joinSession,
      cancelSession,
      sendPlacing,
      submitFleet,
      fire,
      sendChat,
      rematch,
      leaveGame,
      clearError,
      clearNav,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameContext(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGameContext must be used within GameProvider');
  return ctx;
}
