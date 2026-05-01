/** Deterministic RNG for seeded puzzle reproducibility */

export function lcg(seed) {
  let x = (seed >>> 0) || 92731;
  return () => {
    x = (Math.imul(1664525, x) + 1013904243) | 0;
    return (x >>> 0) / 4294967296;
  };
}
