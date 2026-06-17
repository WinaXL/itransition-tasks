import { Rng, makeRng } from "./rng";
import { getBank, LocaleId } from "./locales";
import { generateCoverSvg, svgToDataUri } from "./cover";
import { generateAudioSpec, melodyTimeline } from "./audio";
import { resolveFractional, reviewCountFromLikes } from "./likes";
import { LyricLine, Review, Song } from "./types";

export const PAGE_SIZE = 20;

/**
 * Compose a realistic song title from the localized word bank using a few
 * sentence templates so titles don't all look identical.
 */
function makeTitle(rng: Rng, bank: ReturnType<typeof getBank>): string {
  const adj = rng.pick(bank.titleAdjectives);
  const noun = rng.pick(bank.titleNouns);
  const noun2 = rng.pick(bank.titleNouns);
  const template = rng.intBetween(0, 3);
  switch (template) {
    case 0:
      return `${adj} ${noun}`;
    case 1:
      return noun;
    case 2:
      return `${noun} & ${noun2}`;
    default:
      return `${adj} ${noun}`;
  }
}

function makeArtist(rng: Rng, bank: ReturnType<typeof getBank>): string {
  // ~55% band names, ~45% solo (real localized person names from faker).
  if (rng.chance(0.55)) {
    const usePrefix = rng.chance(0.7);
    const prefix = usePrefix ? `${rng.pick(bank.bandPrefixes)} ` : "";
    return `${prefix}${rng.pick(bank.bandNouns)}`;
  }
  // Faker is seeded per-song by the caller before generation.
  return bank.faker.person.fullName();
}

function makeAlbum(rng: Rng, bank: ReturnType<typeof getBank>): string {
  if (rng.chance(0.3)) return bank.single;
  const word = rng.pick(bank.albumWords);
  const adj = rng.pick(bank.titleAdjectives);
  return rng.chance(0.5) ? word : `${adj} ${word}`;
}

function makeLyrics(rng: Rng, bank: ReturnType<typeof getBank>, timeline: number[]): LyricLine[] {
  // 6-10 lines, spread across the melody timeline for synced scrolling.
  const lineCount = rng.intBetween(6, 10);
  const pool = bank.lyricLines.slice();
  const chorus = rng.pick(bank.chorusWords);
  const lines: string[] = [];
  for (let i = 0; i < lineCount; i++) {
    if (i > 0 && i % 4 === 0) {
      lines.push(chorus);
    } else {
      lines.push(rng.pick(pool));
    }
  }
  const total = timeline.length ? timeline[timeline.length - 1] + 1 : lineCount;
  return lines.map((text, i) => ({
    text,
    time: (i / lineCount) * total,
  }));
}

function makeReviews(rng: Rng, bank: ReturnType<typeof getBank>, count: number): Review[] {
  const reviews: Review[] = [];
  for (let i = 0; i < count; i++) {
    reviews.push({
      author: bank.faker.person.firstName(),
      text: rng.pick(bank.reviewSentences),
    });
  }
  return reviews;
}

/**
 * Generate a single song.
 *
 * Nested-seed architecture:
 *  - `songSeed` was drawn from the page's master RNG by the caller.
 *  - `contentRng` (seeded from songSeed) drives ALL core content: title,
 *    artist, album, genre, cover, audio, lyrics. faker is also seeded from the
 *    song seed. None of this observes the likes stream, so changing the likes
 *    parameter can never alter core content.
 *  - `likesRng` (seeded from songSeed + ":likes") drives ONLY the like and
 *    review counts/text.
 */
export function generateSong(
  songSeed: string,
  index: number,
  locale: LocaleId,
  averageLikes: number
): Song {
  const bank = getBank(locale);

  // ---- Core content (independent of likes) ----
  const contentRng = makeRng(songSeed);
  // Seed faker deterministically from the song seed (stable across like changes).
  const fakerSeed = makeRng(`${songSeed}:faker`).uint32();
  bank.faker.seed(fakerSeed);

  const genre = contentRng.pick(bank.genres);
  const title = makeTitle(contentRng, bank);
  const artist = makeArtist(contentRng, bank);
  const album = makeAlbum(contentRng, bank);

  const coverRng = makeRng(`${songSeed}:cover`);
  const coverSvg = generateCoverSvg(coverRng, title, artist);
  const coverDataUri = svgToDataUri(coverSvg);

  const audioRng = makeRng(`${songSeed}:audio`);
  const audio = generateAudioSpec(audioRng);
  const timeline = melodyTimeline(audio);

  const lyricsRng = makeRng(`${songSeed}:lyrics`);
  const lyrics = makeLyrics(lyricsRng, bank, timeline);

  // ---- Likes & reviews (independent stream) ----
  const likesRng = makeRng(`${songSeed}:likes`);
  const likes = resolveFractional(averageLikes, likesRng);
  const reviewCount = reviewCountFromLikes(likes, likesRng);
  // Reviews reuse the faker instance but reseed from the likes stream so review
  // authors are stable for a given likes value yet don't disturb core content.
  bank.faker.seed(makeRng(`${songSeed}:reviewFaker`).uint32());
  const reviews = makeReviews(likesRng, bank, reviewCount);

  return {
    index,
    songSeed,
    title,
    album,
    artist,
    genre,
    coverSvg,
    coverDataUri,
    audio,
    lyrics,
    likes,
    reviewCount,
    reviews,
  };
}

/**
 * Generate a full page (batch) of songs.
 *
 * The master RNG is seeded from `seed + page`, and produces one unique song
 * seed per row. Index continues sequentially across pages (starting at 1).
 */
export function generatePage(
  seed: string,
  page: number,
  locale: LocaleId,
  averageLikes: number
): Song[] {
  const masterRng = makeRng(`${seed}::page::${page}`);
  const songs: Song[] = [];
  const startIndex = (page - 1) * PAGE_SIZE + 1;
  for (let i = 0; i < PAGE_SIZE; i++) {
    // Draw a unique song seed from the master stream.
    const songSeed = `${seed}:${page}:${i}:${masterRng.uint32().toString(36)}`;
    songs.push(generateSong(songSeed, startIndex + i, locale, averageLikes));
  }
  return songs;
}
