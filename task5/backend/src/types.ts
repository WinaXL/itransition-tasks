import { AudioSpec } from "./audio";
import { Cover } from "./cover";

export interface Review {
  author: string;
  text: string;
}

export interface LyricLine {
  text: string;
  /** Seconds from start of playback when this line becomes active. */
  time: number;
}

export interface Song {
  index: number;
  songSeed: string;
  title: string;
  album: string;
  artist: string;
  genre: string;
  cover: Cover;
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
