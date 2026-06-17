import { Rng } from "./rng";

/**
 * Resolve a fractional average into a concrete integer count using a
 * probabilistic distribution.
 *
 * Example: average = 4.7 -> floor is 4, fraction is 0.7.
 *   - returns 5 with probability 0.7
 *   - returns 4 with probability 0.3
 * Over many draws this averages to exactly 4.7.
 *
 * The draw is taken from the provided RNG so the result is fully
 * reproducible for a given song seed, yet completely independent from the
 * content RNG (titles/covers/audio never observe this stream).
 */
export function resolveFractional(average: number, rng: Rng): number {
  if (average <= 0) return 0;
  const base = Math.floor(average);
  const fraction = average - base;
  return rng.chance(fraction) ? base + 1 : base;
}

/**
 * The number of reviews shown is derived from the like count. We don't want
 * every liked song to have a wall of text, so reviews are a (random) subset
 * of the likes, capped for sanity. With 0 likes there are 0 reviews.
 */
export function reviewCountFromLikes(likes: number, rng: Rng): number {
  if (likes <= 0) return 0;
  // Roughly 40%-100% of likers leave a written review, capped at 8.
  const ratio = rng.floatBetween(0.4, 1.0);
  return Math.min(8, Math.max(1, Math.round(likes * ratio)));
}
