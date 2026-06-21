import { useCallback, useMemo, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';

type Wave = OscillatorType;

/**
 * Procedural sound effects via the Web Audio API. No audio assets required.
 * Honors the global mute toggle from PlayerContext.
 */
export function useSoundFX() {
  const { muted } = usePlayer();
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctxRef.current = new AC();
    }
    if (ctxRef.current.state === 'suspended') void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const tone = useCallback(
    (freq: number, start: number, duration: number, type: Wave, gain: number) => {
      const ctx = getCtx();
      if (!ctx) return;
      const t0 = ctx.currentTime + start;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      env.gain.setValueAtTime(0.0001, t0);
      env.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(env).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    },
    [getCtx],
  );

  const noiseBurst = useCallback(
    (start: number, duration: number, gain: number) => {
      const ctx = getCtx();
      if (!ctx) return;
      const t0 = ctx.currentTime + start;
      const frames = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frames; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
      }
      const src = ctx.createBufferSource();
      const env = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      src.buffer = buffer;
      env.gain.setValueAtTime(gain, t0);
      src.connect(filter).connect(env).connect(ctx.destination);
      src.start(t0);
      src.stop(t0 + duration);
    },
    [getCtx],
  );

  return useMemo(() => {
    const guard = (fn: () => void) => () => {
      if (muted) return;
      try {
        fn();
      } catch {
        /* audio not available */
      }
    };

    return {
      miss: guard(() => {
        noiseBurst(0, 0.35, 0.18);
        tone(180, 0, 0.3, 'sine', 0.12);
      }),
      hit: guard(() => {
        tone(140, 0, 0.18, 'square', 0.22);
        noiseBurst(0, 0.18, 0.28);
        tone(90, 0.02, 0.25, 'sawtooth', 0.18);
      }),
      sunk: guard(() => {
        [440, 330, 247, 165].forEach((f, i) => tone(f, i * 0.12, 0.22, 'sawtooth', 0.2));
        noiseBurst(0, 0.5, 0.25);
      }),
      yourTurn: guard(() => {
        tone(800, 0, 0.16, 'sine', 0.14);
        tone(1200, 0.08, 0.12, 'sine', 0.08);
      }),
      victory: guard(() => {
        [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.13, 0.3, 'triangle', 0.16));
      }),
      defeat: guard(() => {
        [330, 262, 196].forEach((f, i) => tone(f, i * 0.22, 0.4, 'sine', 0.18));
      }),
      ping: guard(() => tone(660, 0, 0.1, 'sine', 0.08)),
    };
  }, [muted, tone, noiseBurst]);
}
