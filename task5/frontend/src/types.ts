export interface NoteEvent {
  note: string | null;
  duration: string;
}

export interface AudioSpec {
  bpm: number;
  rootNote: string;
  octave: number;
  scaleName: string;
  leadSynth: string;
  bassSynth: string;
  melody: NoteEvent[];
  bass: NoteEvent[];
  bars: number;
}

export interface Review {
  author: string;
  text: string;
}

export interface LyricLine {
  text: string;
  time: number;
}

export interface Song {
  index: number;
  songSeed: string;
  title: string;
  album: string;
  artist: string;
  genre: string;
  coverSvg: string;
  coverDataUri: string;
  audio: AudioSpec;
  lyrics: LyricLine[];
  likes: number;
  reviewCount: number;
  reviews: Review[];
}

export interface SongsResponse {
  seed: string;
  page: number;
  locale: string;
  likes: number;
  pageSize: number;
  songs: Song[];
}

export type LocaleId = "en" | "de" | "uk";
export type ViewMode = "table" | "gallery";
