import { useEffect, useRef, useState } from "react";
import { AudioSpec } from "../types";
import { SongPlayer, unlockAudio } from "./player";

// Module-level reference so only ONE song plays at a time across the whole app.
let activeStop: (() => void) | null = null;

/**
 * Manages a SongPlayer for a single song, exposing play/stop, an isPlaying
 * flag, and the live playback position (seconds) for lyric synchronization.
 */
export function useSongPlayer(spec: AudioSpec) {
  const playerRef = useRef<SongPlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const rafRef = useRef<number | null>(null);

  const tick = () => {
    const p = playerRef.current;
    if (p && p.isPlaying) {
      setPosition(p.position());
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const stop = () => {
    playerRef.current?.stop();
    playerRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setIsPlaying(false);
    setPosition(0);
    if (activeStop === stop) activeStop = null;
  };

  const play = async () => {
    try {
      // Resume the AudioContext FIRST, while we are still synchronously inside
      // the click gesture. This is what makes audio work on production HTTPS.
      await unlockAudio();
      if (activeStop && activeStop !== stop) activeStop();
      const player = new SongPlayer(spec);
      playerRef.current = player;
      activeStop = stop;
      await player.play();
      setIsPlaying(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.error("Audio playback failed:", err);
      stop();
    }
  };

  const toggle = () => {
    if (isPlaying) stop();
    else void play();
  };

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isPlaying, position, play, stop, toggle, loopSeconds: playerRef.current?.loopSeconds() ?? 0 };
}
