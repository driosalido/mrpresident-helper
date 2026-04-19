export type Rng = () => number; // returns 0..1

/** Deterministic seeded RNG (mulberry32). Use in tests. */
export function makeSeededRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let _rng: Rng = Math.random;

export function setRng(rng: Rng) {
  _rng = rng;
}

function roll(sides: number): number {
  return Math.floor(_rng() * sides) + 1;
}

export function rollD6(): number[] {
  return [roll(6)];
}

export function rollD10(): number[] {
  const r = roll(10);
  // GMT convention: 0 = 10
  return [r];
}

export function roll2D10(): number[] {
  return [roll(10), roll(10)];
}

export function rollByKind(kind: 'd6' | 'd10' | '2d10'): number[] {
  switch (kind) {
    case 'd6':  return rollD6();
    case 'd10': return rollD10();
    case '2d10': return roll2D10();
  }
}
