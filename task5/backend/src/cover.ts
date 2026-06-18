import { Rng } from "./rng";

/**
 * Real, photographic album covers (no more geometric shapes). We pick a theme
 * keyword deterministically from the song's cover RNG and request a matching
 * photo from LoremFlickr, locking it with a numeric seed so the SAME image is
 * always returned for the same song. A Picsum URL (also seeded) is provided as
 * a fallback in case LoremFlickr is unreachable.
 *
 * The title/artist are no longer baked into the image; instead the frontend
 * renders one of several typography overlays on top, chosen via `style`.
 */

const SIZE = 600;

// Curated single-word themes (single words keep the LoremFlickr tag clean).
// Includes the reviewer's requested subjects: lakes, clouds, dogs, people…
const THEMES: string[] = [
  "lake",
  "clouds",
  "dog",
  "people",
  "mountains",
  "forest",
  "city",
  "ocean",
  "sunset",
  "vinyl",
  "concert",
  "desert",
  "flowers",
  "rain",
  "nature",
  "retro",
  "autumn",
  "snow",
  "street",
  "cat",
  "waterfall",
  "skyline",
  "portrait",
  "coffee",
  "neon",
];

export const COVER_STYLE_COUNT = 5;

export interface Cover {
  /** Primary, photographic image URL (deterministic per seed). */
  imageUrl: string;
  /** Fallback image URL if the primary source fails. */
  fallbackUrl: string;
  /** Theme keyword used for the image query. */
  theme: string;
  /** Typography overlay variant (0..COVER_STYLE_COUNT-1). */
  style: number;
}

export function generateCover(rng: Rng): Cover {
  const theme = rng.pick(THEMES);
  const lock = rng.uint32();
  const style = rng.intBetween(0, COVER_STYLE_COUNT - 1);

  const imageUrl = `https://loremflickr.com/${SIZE}/${SIZE}/${encodeURIComponent(
    theme
  )}?lock=${lock}`;
  const fallbackUrl = `https://picsum.photos/seed/${lock}/${SIZE}/${SIZE}`;

  return { imageUrl, fallbackUrl, theme, style };
}
