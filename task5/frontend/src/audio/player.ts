import * as Tone from "tone";
import { AudioSpec } from "../types";

type OscType = "sine" | "square" | "triangle" | "sawtooth" | "fmsine" | "amsquare" | "fatsawtooth";

const DUR_TO_BEATS: Record<string, number> = {
  "16n": 0.25,
  "8n": 0.5,
  "4n": 1,
  "4n.": 1.5,
  "2n": 2,
  "1n": 4,
};

interface ScheduledNote {
  time: number; // absolute seconds within the loop
  note: string;
  duration: number; // seconds
}

/**
 * Unlock / resume the Web Audio context. MUST be awaited from within a user
 * gesture (e.g. a click handler) before any synthesis happens. Production
 * browsers (HTTPS) start the AudioContext "suspended" and will silently drop
 * audio unless it is resumed in direct response to a user interaction.
 */
export async function unlockAudio(): Promise<void> {
  await Tone.start();
  const ctx = Tone.getContext();
  if (ctx.state !== "running") {
    await ctx.resume();
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
      notes.push({ time: t, note: ev.note, duration: dur * 0.9 });
    }
    t += dur;
  }
  return { notes, total: t };
}

/**
 * Plays a procedurally-generated AudioSpec via Tone.js. The same spec always
 * produces the same audio. Exposes the current loop position (seconds) so the
 * UI can synchronize lyric scrolling.
 */
export class SongPlayer {
  private spec: AudioSpec;
  private lead: Tone.PolySynth | null = null;
  private bass: Tone.Synth | null = null;
  private reverb: Tone.Reverb | null = null;
  private leadPart: Tone.Part | null = null;
  private bassPart: Tone.Part | null = null;
  private loopLength = 0;
  isPlaying = false;

  constructor(spec: AudioSpec) {
    this.spec = spec;
  }

  private oscType(type: string): OscType {
    const allowed: OscType[] = [
      "sine",
      "square",
      "triangle",
      "sawtooth",
      "fmsine",
      "amsquare",
      "fatsawtooth",
    ];
    return (allowed as string[]).includes(type) ? (type as OscType) : "triangle";
  }

  async play() {
    if (this.isPlaying) return;
    // Idempotent safety: the caller already unlocks the context inside the
    // click gesture, but ensure it is running before we synthesize anything.
    await unlockAudio();

    const transport = Tone.getTransport();
    const secondsPerBeat = 60 / this.spec.bpm;

    const melodySched = buildSchedule(this.spec.melody, secondsPerBeat);
    const bassSched = buildSchedule(this.spec.bass, secondsPerBeat);
    this.loopLength = Math.max(melodySched.total, bassSched.total) || 1;

    this.lead = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: this.oscType(this.spec.leadSynth) },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.4, release: 0.5 },
      volume: -8,
    }).toDestination();

    // Reverb generates its impulse response asynchronously. Await it so the
    // node is ready before scheduling; if generation fails (some production
    // environments), continue with the dry signal instead of going silent.
    try {
      const reverb = new Tone.Reverb({ decay: 2.5, wet: 0.25 });
      await reverb.generate();
      reverb.toDestination();
      this.lead.connect(reverb);
      this.reverb = reverb;
    } catch (err) {
      console.warn("Reverb unavailable, playing dry signal:", err);
    }

    this.bass = new Tone.Synth({
      oscillator: { type: this.oscType(this.spec.bassSynth) },
      envelope: { attack: 0.04, decay: 0.3, sustain: 0.6, release: 0.4 },
      volume: -14,
    }).toDestination();

    this.leadPart = new Tone.Part((time, value) => {
      this.lead?.triggerAttackRelease(value.note, value.duration, time);
    }, melodySched.notes.map((n) => [n.time, n] as [number, ScheduledNote]));

    this.bassPart = new Tone.Part((time, value) => {
      this.bass?.triggerAttackRelease(value.note, value.duration, time);
    }, bassSched.notes.map((n) => [n.time, n] as [number, ScheduledNote]));

    this.leadPart.loop = true;
    this.leadPart.loopEnd = this.loopLength;
    this.bassPart.loop = true;
    this.bassPart.loopEnd = this.loopLength;

    transport.bpm.value = this.spec.bpm;
    transport.position = 0;
    this.leadPart.start(0);
    this.bassPart.start(0);
    transport.start();
    this.isPlaying = true;
  }

  stop() {
    const transport = Tone.getTransport();
    transport.stop();
    this.leadPart?.dispose();
    this.bassPart?.dispose();
    this.lead?.dispose();
    this.bass?.dispose();
    this.reverb?.dispose();
    this.leadPart = null;
    this.bassPart = null;
    this.lead = null;
    this.bass = null;
    this.reverb = null;
    this.isPlaying = false;
  }

  /** Current position within the loop, in seconds. */
  position(): number {
    if (!this.isPlaying || this.loopLength === 0) return 0;
    return Tone.getTransport().seconds % this.loopLength;
  }

  loopSeconds(): number {
    return this.loopLength;
  }
}
