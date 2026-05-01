/**
 * Rotate-to-connect pipes. NESW bitmask: N=1, E=8, S=4, W=2 (Phaser-style quad).
 */

/** Random base mask horizontal (E|W)=10 vertical (N|S)=5 corner (N|E)=9 */
export function randomPipeMask(rng) {
  const r = rng();
  if (r < 0.52) return 10;
  if (r < 0.78) return 5;
  return 9;
}

/** @typedef {{ bases: number[][]; rots: number[][]; sz: number }} PipeBoard */

export function generatePipeBoard(rng, sz) {
  const bases = [];
  const rots = [];
  for (let y = 0; y < sz; y++) {
    const br = [];
    const rr = [];
    for (let x = 0; x < sz; x++) {
      br.push(randomPipeMask(rng));
      rr.push(((rng() * 4) | 0) % 4);
    }
    bases.push(br);
    rots.push(rr);
  }
  return { bases, rots, sz };
}

/** Open side after rotations: spin full mask */
export function openMask(mask, rotations) {
  let m = mask & 15;
  let t = rotations % 4;
  while (t-- > 0) {
    const n = !!(m & 1);
    const e = !!(m & 8);
    const s = !!(m & 4);
    const w = !!(m & 2);
    m = (w ? 1 : 0) | (n ? 8 : 0) | (e ? 4 : 0) | (s ? 2 : 0);
  }
  return m;
}

/** Flood from virtual west into column 0; goal east at last column */
export function pipeConnectsGoals(board) {
  const { bases, rots, sz } = board;
  const vis = {};
  const key = (x, y) => `${x}:${y}`;
  const q = [];
  function push(nx, ny, inboundBit) {
    const k = key(nx, ny);
    if (vis[k]) return;
    const nm = openMask(bases[ny][nx], rots[ny][nx]);
    if ((nm & inboundBit) === 0) return;
    vis[k] = 1;
    q.push([nx, ny]);
  }
  for (let y = 0; y < sz; y++) {
    const om = openMask(bases[y][0], rots[y][0]);
    if ((om & 2) === 0) continue;
    q.push([0, y]);
    vis[key(0, y)] = 1;
  }
  while (q.length) {
    const cur = q.shift();
    const x = cur[0];
    const y = cur[1];
    const m = openMask(bases[y][x], rots[y][x]);
    if ((m & 8) !== 0 && x === sz - 1) return true;
    const tryN = !!(m & 1);
    const tryE = !!(m & 8);
    const tryS = !!(m & 4);
    const tryW = !!(m & 2);

    /** neighbor checks */
    if (tryN && y > 0) push(x, y - 1, 4);
    if (tryE && x + 1 < sz) push(x + 1, y, 2);
    if (tryS && y + 1 < sz) push(x, y + 1, 1);
    if (tryW && x > 0) push(x - 1, y, 8);
  }
  return false;
}
