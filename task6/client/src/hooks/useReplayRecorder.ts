import { useCallback, useEffect, useRef, useState } from 'react';
import { drawReplayFrame, pickRecorderMimeType, ReplayFrameMeta } from '../lib/replayCanvas';
import { GameOverPayload, VisibleState } from '../types';

const MAX_SHOTS = 500;
const MAX_MS = 10 * 60 * 1000;
const CANVAS_W = 920;
const CANVAS_H = 520;

interface UseReplayRecorderArgs {
  sessionId: string | undefined;
  view: VisibleState | null;
  myName: string;
  enemyName: string;
  myRole: 'host' | 'guest';
  gameOver: GameOverPayload | null;
}

export function useReplayRecorder({
  sessionId,
  view,
  myName,
  enemyName,
  myRole,
  gameOver,
}: UseReplayRecorderArgs) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const shotCountRef = useRef(0);
  const lastViewKeyRef = useRef('');
  const [recording, setRecording] = useState(false);
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ensureCanvas = useCallback(() => {
    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      canvasRef.current = canvas;
    }
    return canvasRef.current;
  }, []);

  const paint = useCallback(
    (v: VisibleState, meta: ReplayFrameMeta) => {
      const canvas = ensureCanvas();
      drawReplayFrame(canvas, v, meta);
    },
    [ensureCanvas],
  );

  const stopInternal = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    recorderRef.current = null;
    setRecording(false);
  }, []);

  const startRecording = useCallback(() => {
    if (!view || !sessionId || typeof MediaRecorder === 'undefined') {
      setError('Replay recording is not supported in this browser.');
      return;
    }
    setError(null);
    setDownloadBlob(null);
    chunksRef.current = [];
    shotCountRef.current = 0;
    startedAtRef.current = Date.now();

    const canvas = ensureCanvas();
    paint(view, {
      myName,
      enemyName,
      myTurn: view.currentTurn === myRole,
    });

    const stream = canvas.captureStream(12);
    const mimeType = pickRecorderMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType });
    } catch {
      setError('Could not start replay recorder.');
      return;
    }

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      if (chunksRef.current.length > 0) {
        setDownloadBlob(new Blob(chunksRef.current, { type: mimeType }));
      }
    };

    recorder.start(250);
    recorderRef.current = recorder;
    setRecording(true);
  }, [view, sessionId, ensureCanvas, paint, myName, enemyName, myRole]);

  const stopRecording = useCallback(() => {
    stopInternal();
  }, [stopInternal]);

  const toggleRecording = useCallback(() => {
    if (recording) stopRecording();
    else startRecording();
  }, [recording, startRecording, stopRecording]);

  const downloadReplay = useCallback(() => {
    if (!downloadBlob || !sessionId) return;
    const ext = downloadBlob.type.includes('webm') ? 'webm' : 'mp4';
    const url = URL.createObjectURL(downloadBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `naval-strike-replay-${sessionId.slice(0, 8)}-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [downloadBlob, sessionId]);

  useEffect(() => {
    if (!recording || !view) return;

    const key = JSON.stringify({
      incoming: view.incomingShots.length,
      outgoing: view.outgoingShots.length,
      turn: view.currentTurn,
      phase: view.phase,
      sunk: view.revealedEnemyShips.length,
    });
    if (key === lastViewKeyRef.current) return;
    lastViewKeyRef.current = key;
    shotCountRef.current += 1;

    paint(view, {
      myName,
      enemyName,
      myTurn: view.currentTurn === myRole,
      gameOver: gameOver
        ? {
            won: gameOver.winnerRole === myRole,
            headline: gameOver.winnerRole === myRole ? 'VICTORY' : 'DEFEAT',
          }
        : undefined,
    });

    if (shotCountRef.current >= MAX_SHOTS || Date.now() - startedAtRef.current >= MAX_MS) {
      stopInternal();
    }
  }, [recording, view, myName, enemyName, myRole, gameOver, paint, stopInternal]);

  useEffect(() => {
    if (recording && gameOver && view) {
      paint(view, {
        myName,
        enemyName,
        myTurn: false,
        gameOver: {
          won: gameOver.winnerRole === myRole,
          headline: gameOver.winnerRole === myRole ? 'VICTORY' : 'DEFEAT',
        },
      });
    }
  }, [recording, gameOver, view, myName, enemyName, myRole, paint]);

  useEffect(() => {
    return () => stopInternal();
  }, [stopInternal]);

  return {
    recording,
    toggleRecording,
    stopRecording,
    downloadBlob,
    downloadReplay,
    error,
    canRecord: typeof MediaRecorder !== 'undefined',
  };
}
