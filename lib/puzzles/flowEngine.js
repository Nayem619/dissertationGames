/**
 * Dot-pair path puzzles (Flow-style lite).
 */

/** @typedef {{ sx: number; sy: number; gx: number; gy: number; id: number }} FlowPair */

/**
 * Place random endpoint pairs avoiding overlap where possible.
 * @returns {FlowPair[]}
 */
export function generateFlowDots(rng, sz, pairCount) {
  const dots = [];

  function taken(x, y) {
    return dots.some(
      (p) =>
        (p.sx === x && p.sy === y) ||
        (p.gx === x && p.gy === y)
    );
  }

  let guard = 0;
  for (let i = 0; i < pairCount; i++) {
    let sx, sy, gx, gy, d, k = 0;
    do {
      sx = (rng() * sz) | 0;
      sy = (rng() * sz) | 0;
      gx = (rng() * sz) | 0;
      gy = (rng() * sz) | 0;
      d = Math.abs(sx - gx) + Math.abs(sy - gy);
      guard++;
      k++;
    } while (
      k < 500 &&
      (d < 2 || taken(sx, sy) || taken(gx, gy) || (sx === gx && sy === gy))
    );
    dots.push({ sx, sy, gx, gy, id: i });
  }
  return dots;
}

export function nk(x, y) {
  return `${x}:${y}`;
}

/** First pair whose path does not reach goal */
export function flowActivePairIndex(dots, paths) {
  for (let i = 0; i < dots.length; i++) {
    const d = dots[i];
    const ch = paths[i];
    if (!ch?.length) return i;
    const last = ch[ch.length - 1];
    if (last.x !== d.gx || last.y !== d.gy) return i;
  }
  return -1;
}

export function flowsAllComplete(dots, paths) {
  return flowActivePairIndex(dots, paths) === -1;
}

export function buildOcc(dots, paths) {
  const m = {};
  for (let i = 0; i < dots.length; i++) {
    const d = dots[i];
    m[nk(d.sx, d.sy)] = i;
    m[nk(d.gx, d.gy)] = i;
  }
  for (let i = 0; i < paths.length; i++) {
    for (let j = 0; j < paths[i].length; j++) {
      const { x, y } = paths[i][j];
      m[nk(x, y)] = i;
    }
  }
  return m;
}
