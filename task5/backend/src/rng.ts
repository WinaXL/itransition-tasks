import seedrandom from "seedrandom";

/**
 * A thin, deterministic wrapper around a seeded RNG. Every helper draws from
 * the same underlying stream, so the *order* of calls matters for
 * reproducibility. Two RNGs created from the same seed string produce the
 * exact same sequence.
 */
export class Rng {
  private prng: seedrandom.PRNG;

  constructor(seed: string) {
    this.prng = seedrandom(seed);
  }

  /** Float in [0, 1). */
  next(): number {
    return this.prng();
  }

  /** Signed 32-bit integer, useful for seeding other libraries (e.g. faker). */
  int32(): number {
    return this.prng.int32();
  }

  /** Unsigned 32-bit integer. */
  uint32(): number {
    return this.prng.int32() >>> 0;
  }

  /** Integer in [min, max] inclusive. */
  intBetween(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Float in [min, max). */
  floatBetween(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Pick a random element from an array. */
  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  /** Pick `count` unique elements from an array (Fisher-Yates partial shuffle). */
  pickMany<T>(items: readonly T[], count: number): T[] {
    const copy = items.slice();
    const n = Math.min(count, copy.length);
    for (let i = 0; i < n; i++) {
      const j = i + Math.floor(this.next() * (copy.length - i));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
  }

  /** Returns true with probability `p`. */
  chance(p: number): boolean {
    return this.next() < p;
  }
}

/** Convenience factory. */
export const makeRng = (seed: string): Rng => new Rng(seed);
