/**
 * Sliding on ice grid until obstructed.
 */

/** @typedef {{ sz: number; walls: boolean[][]; px: number; py: number; gx: number; gy: number }} IceBoard */

export function generateIceBoard(rng, sz, seedPart) {
  const walls = [];
  const density = 0.09 + seedPart * 0.016;
  for (let y = 0; y < sz; y++) {
    const row = [];
    for (let x = 0; x < sz; x++) {
      const border =
        x === 0 || y === 0 || x === sz - 1 || y === sz - 1;
      const hole = rng() < density && !border;
      row.push(!!hole);
    }
    walls.push(row);
  }
  const px = 1;
  const py = 1;
  let gx = sz - 2;
  let gy = sz - 2;
  walls[py][px] = false;
  walls[gy][gx] = false;
  /** ensure solvable heuristic: carve random path */
  let cx = px;
  let cy = py;
  let steps = 0;
  while ((cx !== gx || cy !== gy) && steps++ < sz * sz * 4) {
    const horiz = rng() < 0.5;
    if (horiz) {
      const dir = cx < gx ? 1 : -1;
      const nx = Math.min(sz - 2, Math.max(1, cx + dir));
      walls[cy][nx] = false;
      cx = nx;
    } else {
      const dir = cy < gy ? 1 : -1;
      const ny = Math.min(sz - 2, Math.max(1, cy + dir));
      walls[ny][cx] = false;
      cy = ny;
    }
  }
  return { sz, walls, px, py, gx, gy };
}

/**
 * @param {'n'|'e'|'s'|'w'} dir
 * @returns {{ x: number; y: number } | null}
 */
export function iceSlide(board, px, py, dir) {
  const { sz, walls } = board;
  const d = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] }[dir];
  let x = px;
  let y = py;
  while (true) {
    const nx = x + d[0];
    const ny = y + d[1];
    if (nx < 0 || ny < 0 || nx >= sz || ny >= sz) break;
    if (walls[ny][nx]) break;
    x = nx;
    y = ny;
  }
  return { x, y };
}
