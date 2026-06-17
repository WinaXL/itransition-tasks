import { AudioSpec } from "../types";

const DUR_TO_BEATS: Record<string, number> = {
  "16n": 0.25,
  "8n": 0.5,
  "4n": 1,
  "4n.": 1.5,
  "2n": 2,
  "1n": 4,
};

const NOTE_INDEX: Record<string, number> = {
  C: 0,
  "C#": 1,
  D: 2,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "A#": 10,
  B: 11,
};

interface ScheduledNote {
  time: number; // seconds from loop start
  freq: number;
  duration: number; // seconds
}

// A single shared AudioContext, created lazily (never at import time, so no
// "AudioContext prevented from starting" warnings on page load).
let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!sharedCtx) {
    const Ctor: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedCtx = new Ctor();
  }
  return sharedCtx;
}

/**
 * Resume the audio context. MUST be awaited from within a user gesture so
 * production browsers (which start the context "suspended") allow playback.
 */
export async function unlockAudio(): Promise<void> {
  const ctx = getCtx();
  if (ctx.state !== "running") {
    await ctx.resume();
  }
}

function noteToFreq(note: string): number | null {
  const m = /^([A-G]#?)(-?\d+)$/.exec(note);
  if (!m) return null;
  const semitone = NOTE_INDEX[m[1]];
  if (semitone === undefined) return null;
  const octave = parseInt(m[2], 10);
  const midi = (octave + 1) * 12 + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function oscType(type: string): OscillatorType {
  switch (type) {
    case "sine":
    case "fmsine":
      return "sine";
    case "square":
    case "amsquare":
      return "square";
    case "sawtooth":
    case "fatsawtooth":
      return "sawtooth";
    case "triangle":
      return "triangle";
    default:
      return "triangle";
  }
}

function buildSchedule(
  events: AudioSpec["melody"],
  secondsPerBeat: number
): { notes: ScheduledNote[]; total: number } {
  const notes: ScheduledNote[] = [];
  let t = 0;
  for (const ev of events) {
    const beats = DUR_TO_BEATS[ev.duration] ?? 1;
    const dur = beats * secondsPerBeat;
    if (ev.note) {
      const freq = noteToFreq(ev.note);
      if (freq) notes.push({ time: t, freq, duration: dur * 0.92 });
    }
    t += dur;
  }
  return { notes, total: t };
}

const LOOKAHEAD_S = 0.3; // schedule this far ahead of the playhead
const TIMER_MS = 50;

/**
 * Plays a procedurally-generated AudioSpec with the raw Web Audio API. The
 * same spec always produces the same audio. A look-ahead scheduler queues each
 * loop iteration just before it is due, giving glitch-free seamless looping.
 */
export class SongPlayer {
  private spec: AudioSpec;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private leadType: OscillatorType;
  private bassType: OscillatorType;
  private melody: ScheduledNote[] = [];
  private bass: ScheduledNote[] = [];
  private loopLength = 0;
  private startTime = 0;
  private nextLoopTime = 0;
  private timer: number | null = null;
  private active = new Set<OscillatorNode>();
  isPlaying = false;

  constructor(spec: AudioSpec) {
    this.spec = spec;
    this.leadType = oscType(spec.leadSynth);
    this.bassType = oscType(spec.bassSynth);
  }

  async play() {
    if (this.isPlaying) return;
    const ctx = getCtx();
    if (ctx.state !== "running") await ctx.resume();
    this.ctx = ctx;

    const secondsPerBeat = 60 / this.spec.bpm;
    const mel = buildSchedule(this.spec.melody, secondsPerBeat);
    const bas = buildSchedule(this.spec.bass, secondsPerBeat);
    this.melody = mel.notes;
    this.bass = bas.notes;
    this.loopLength = Math.max(mel.total, bas.total) || 1;

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    // Gentle low-pass for warmth and to tame harsh saw/square harmonics.
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 3600;
    this.master.connect(filter);
    filter.connect(ctx.destination);

    this.startTime = ctx.currentTime + 0.08;
    this.nextLoopTime = this.startTime;
    this.isPlaying = true;
    this.scheduleAhead();
    this.timer = window.setInterval(() => this.scheduleAhead(), TIMER_MS);
  }

  private scheduleAhead() {
    const ctx = this.ctx;
    if (!ctx || !this.isPlaying) return;
    while (this.nextLoopTime < ctx.currentTime + LOOKAHEAD_S) {
      for (const n of this.melody) {
        this.scheduleVoice(this.nextLoopTime + n.time, n.freq, n.duration, this.leadType, 0.34);
      }
      for (const n of this.bass) {
        this.scheduleVoice(this.nextLoopTime + n.time, n.freq, n.duration, this.bassType, 0.22);
      }
      this.nextLoopTime += this.loopLength;
    }
  }

  private scheduleVoice(
    when: number,
    freq: number,
    dur: number,
    type: OscillatorType,
    peak: number
  ) {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(peak, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(0.06, dur));

    osc.connect(g);
    g.connect(this.master);
    osc.start(when);
    osc.stop(when + Math.max(0.06, dur) + 0.05);

    this.active.add(osc);
    osc.onended = () => {
      this.active.delete(osc);
      try {
        osc.disconnect();
        g.disconnect();
      } catch {
        /* already disconnected */
      }
    };
  }

  stop() {
    this.isPlaying = false;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    for (const osc of this.active) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.active.clear();
    try {
      this.master?.disconnect();
    } catch {
      /* ignore */
    }
    this.master = null;
  }

  /** Current position within the loop, in seconds. */
  position(): number {
    if (!this.isPlaying || !this.ctx || this.loopLength === 0) return 0;
    const elapsed = this.ctx.currentTime - this.startTime;
    if (elapsed < 0) return 0;
    return elapsed % this.loopLength;
  }

  loopSeconds(): number {
    return this.loopLength;
  }
}
