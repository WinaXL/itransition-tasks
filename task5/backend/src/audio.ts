import { Rng } from "./rng";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Scale interval patterns (semitones from root).
const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  pentatonicMinor: [0, 3, 5, 7, 10],
  pentatonicMajor: [0, 2, 4, 7, 9],
};

const SYNTHS = ["triangle", "sine", "square", "sawtooth", "fmsine", "amsquare"] as const;
const DURATIONS = ["8n", "8n", "4n", "4n", "4n.", "2n", "16n"];

export interface NoteEvent {
  /** Note name like "A4", or null for a rest. */
  note: string | null;
  /** Tone.js duration token, e.g. "8n", "4n". */
  duration: string;
}

export interface AudioSpec {
  bpm: number;
  rootNote: string; // e.g. "C"
  octave: number;
  scaleName: string;
  leadSynth: string;
  bassSynth: string;
  /** Main melodic line. */
  melody: NoteEvent[];
  /** Repeating bass / chord-root line. */
  bass: NoteEvent[];
  /** Total bars in one loop. */
  bars: number;
}

function noteName(semitoneFromC: number, octave: number): string {
  const idx = ((semitoneFromC % 12) + 12) % 12;
  const octShift = Math.floor(semitoneFromC / 12);
  return `${NOTE_NAMES[idx]}${octave + octShift}`;
}

/**
 * Build a deterministic, musical track spec from the content RNG. Because the
 * RNG stream is seeded by the song seed, the exact same melody/tempo replays
 * every time. Tempo, scale, synth timbres and note choices all vary per song.
 */
export function generateAudioSpec(rng: Rng): AudioSpec {
  const bpm = rng.intBetween(72, 140);
  const rootIdx = rng.intBetween(0, 11);
  const rootNote = NOTE_NAMES[rootIdx];
  const octave = rng.intBetween(3, 4);
  const scaleName = rng.pick(Object.keys(SCALES));
  const scale = SCALES[scaleName];
  const leadSynth = rng.pick(SYNTHS);
  const bassSynth = rng.pick(["triangle", "sine", "square"]);
  const bars = rng.intBetween(2, 4);

  const notesPerBar = rng.pick([4, 6, 8]);
  const melody: NoteEvent[] = [];
  let degree = 0;
  for (let b = 0; b < bars; b++) {
    for (let n = 0; n < notesPerBar; n++) {
      if (rng.chance(0.12)) {
        melody.push({ note: null, duration: rng.pick(DURATIONS) });
        continue;
      }
      // Random walk over scale degrees for a coherent melodic contour.
      degree += rng.intBetween(-2, 2);
      degree = Math.max(-3, Math.min(scale.length + 3, degree));
      const octShift = Math.floor(degree / scale.length);
      const within = ((degree % scale.length) + scale.length) % scale.length;
      const semis = rootIdx + scale[within] + octShift * 12;
      melody.push({ note: noteName(semis, octave + 1), duration: rng.pick(DURATIONS) });
    }
  }

  // Bass follows the root and fifth, one note per bar (half notes).
  const bass: NoteEvent[] = [];
  for (let b = 0; b < bars; b++) {
    const useFifth = rng.chance(0.4);
    const semis = rootIdx + (useFifth ? 7 : 0);
    bass.push({ note: noteName(semis, octave - 1), duration: "2n" });
    bass.push({ note: noteName(semis, octave - 1), duration: "2n" });
  }

  return { bpm, rootNote, octave, scaleName, leadSynth, bassSynth, melody, bass, bars };
}

/**
 * Estimate playback time (seconds) for each melody note so the client can sync
 * lyric scrolling without needing to instantiate Tone.js on the server.
 */
export function melodyTimeline(spec: AudioSpec): number[] {
  const secondsPerBeat = 60 / spec.bpm;
  const durToBeats: Record<string, number> = {
    "16n": 0.25,
    "8n": 0.5,
    "4n": 1,
    "4n.": 1.5,
    "2n": 2,
    "1n": 4,
  };
  const times: number[] = [];
  let t = 0;
  for (const ev of spec.melody) {
    times.push(t);
    t += (durToBeats[ev.duration] ?? 1) * secondsPerBeat;
  }
  return times;
}
