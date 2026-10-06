/**
 * Seedable PRNG (mulberry32) for gameplay decisions: spawns, AI, knockdown rolls, loot.
 * With a fixed seed and the same inputs a run replays exactly, which the studio and the
 * test suite rely on. Purely cosmetic randomness (sparks, shake, particles, audio) stays
 * on Math.random so it can't shift the gameplay sequence.
 */
export class Random {
  constructor(seed = Date.now()) {
    this.seed(seed);
  }

  seed(value) {
    this.state = value >>> 0;
    this.initialSeed = this.state;
  }

  next() {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

export const rng = new Random();
