/**
 * Hash-seeded Tetris packing for torrent piece visualization.
 *
 * One torrent piece → one full classic tetromino (I/O/T/L/J/S/Z).
 * Grid = 4 × pieceCount cells; always fills 100%.
 * Layout + drop order are hash-random so every torrent feels different.
 */

export type TetrominoKind = "I" | "O" | "T" | "L" | "J" | "S" | "Z";

export type Cell = { c: number; r: number };

export type PlacedPiece = {
  id: number;
  kind: TetrominoKind;
  cells: Cell[];
  minC: number;
  minR: number;
  maxC: number;
  maxR: number;
  size: 4;
  /** Lands when complete > dropIndex. */
  dropIndex: number;
};

export type TetrisPacking = {
  cols: number;
  rows: number;
  total: number;
  cells: number;
  pieces: PlacedPiece[];
  cellToPiece: Int16Array;
};

const KINDS: TetrominoKind[] = ["I", "O", "T", "L", "J", "S", "Z"];

/** Classic tetromino orientations (relative). */
const SHAPES: Record<TetrominoKind, Cell[][]> = {
  I: [
    [
      { c: 0, r: 0 },
      { c: 1, r: 0 },
      { c: 2, r: 0 },
      { c: 3, r: 0 },
    ],
    [
      { c: 0, r: 0 },
      { c: 0, r: 1 },
      { c: 0, r: 2 },
      { c: 0, r: 3 },
    ],
  ],
  O: [
    [
      { c: 0, r: 0 },
      { c: 1, r: 0 },
      { c: 0, r: 1 },
      { c: 1, r: 1 },
    ],
  ],
  T: [
    [
      { c: 0, r: 0 },
      { c: 1, r: 0 },
      { c: 2, r: 0 },
      { c: 1, r: 1 },
    ],
    [
      { c: 1, r: 0 },
      { c: 0, r: 1 },
      { c: 1, r: 1 },
      { c: 1, r: 2 },
    ],
    [
      { c: 1, r: 0 },
      { c: 0, r: 1 },
      { c: 1, r: 1 },
      { c: 2, r: 1 },
    ],
    [
      { c: 0, r: 0 },
      { c: 0, r: 1 },
      { c: 1, r: 1 },
      { c: 0, r: 2 },
    ],
  ],
  L: [
    [
      { c: 0, r: 0 },
      { c: 0, r: 1 },
      { c: 0, r: 2 },
      { c: 1, r: 2 },
    ],
    [
      { c: 0, r: 0 },
      { c: 1, r: 0 },
      { c: 2, r: 0 },
      { c: 0, r: 1 },
    ],
    [
      { c: 0, r: 0 },
      { c: 1, r: 0 },
      { c: 1, r: 1 },
      { c: 1, r: 2 },
    ],
    [
      { c: 2, r: 0 },
      { c: 0, r: 1 },
      { c: 1, r: 1 },
      { c: 2, r: 1 },
    ],
  ],
  J: [
    [
      { c: 1, r: 0 },
      { c: 1, r: 1 },
      { c: 1, r: 2 },
      { c: 0, r: 2 },
    ],
    [
      { c: 0, r: 0 },
      { c: 0, r: 1 },
      { c: 1, r: 1 },
      { c: 2, r: 1 },
    ],
    [
      { c: 0, r: 0 },
      { c: 1, r: 0 },
      { c: 0, r: 1 },
      { c: 0, r: 2 },
    ],
    [
      { c: 0, r: 0 },
      { c: 1, r: 0 },
      { c: 2, r: 0 },
      { c: 2, r: 1 },
    ],
  ],
  S: [
    [
      { c: 1, r: 0 },
      { c: 2, r: 0 },
      { c: 0, r: 1 },
      { c: 1, r: 1 },
    ],
    [
      { c: 0, r: 0 },
      { c: 0, r: 1 },
      { c: 1, r: 1 },
      { c: 1, r: 2 },
    ],
  ],
  Z: [
    [
      { c: 0, r: 0 },
      { c: 1, r: 0 },
      { c: 1, r: 1 },
      { c: 2, r: 1 },
    ],
    [
      { c: 1, r: 0 },
      { c: 0, r: 1 },
      { c: 1, r: 1 },
      { c: 0, r: 2 },
    ],
  ],
};

type RawPiece = { kind: TetrominoKind; cells: Cell[] };

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashToSeed(hash: string): number {
  let h = 2166136261;
  for (let i = 0; i < hash.length; i++) {
    h ^= hash.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
}

/** Even×even playfield near classic Tetris width (~10). */
export function bestGrid(pieceCount: number): { cols: number; rows: number } {
  const cells = pieceCount * 4;
  if (cells <= 0) return { cols: 0, rows: 0 };
  if (cells === 4) return { cols: 2, rows: 2 };

  const widthTarget =
    cells >= 120 ? 10 : cells >= 40 ? 8 : Math.max(4, Math.ceil(Math.sqrt(cells)));

  let best = { cols: 2, rows: cells / 2 };
  let bestScore = Infinity;

  for (let cols = 2; cols <= cells / 2; cols += 2) {
    if (cells % cols !== 0) continue;
    const rows = cells / cols;
    if (rows % 2 !== 0) continue;
    const aspect = rows / cols;
    const widthPenalty = Math.abs(cols - widthTarget) * 1.4;
    const aspectPenalty =
      aspect < 0.45
        ? (0.45 - aspect) * 28
        : aspect > 3.2
          ? (aspect - 3.2) * 14
          : 0;
    // Mild preference for dims that fit I / 4×4 chunks
    const fitBonus = (cols % 4 === 0 ? -2 : 0) + (rows % 4 === 0 ? -2 : 0);
    const score = widthPenalty + aspectPenalty + fitBonus;
    if (score < bestScore) {
      bestScore = score;
      best = { cols, rows };
    }
  }
  return best;
}

function bounds(cells: Cell[]) {
  let minC = Infinity;
  let minR = Infinity;
  let maxC = -Infinity;
  let maxR = -Infinity;
  for (const p of cells) {
    minC = Math.min(minC, p.c);
    minR = Math.min(minR, p.r);
    maxC = Math.max(maxC, p.c);
    maxR = Math.max(maxR, p.r);
  }
  return { minC, minR, maxC, maxR };
}

function canPlace(
  occ: Uint8Array,
  cols: number,
  rows: number,
  shape: Cell[],
  atC: number,
  atR: number,
): boolean {
  for (const p of shape) {
    const c = atC + p.c;
    const r = atR + p.r;
    if (c < 0 || r < 0 || c >= cols || r >= rows) return false;
    if (occ[r * cols + c]) return false;
  }
  return true;
}

function setShape(
  occ: Uint8Array,
  cols: number,
  shape: Cell[],
  atC: number,
  atR: number,
  value: number,
): void {
  for (const p of shape) {
    occ[(atR + p.r) * cols + (atC + p.c)] = value;
  }
}

type Placement = { kind: TetrominoKind; shape: Cell[]; atC: number; atR: number };

/** All placements of classic pieces that cover cell (sc,sr) on a free board region. */
function placementsCovering(
  occ: Uint8Array,
  cols: number,
  rows: number,
  sc: number,
  sr: number,
  rng: () => number,
): Placement[] {
  const out: Placement[] = [];
  const kinds = KINDS.slice();
  shuffleInPlace(kinds, rng);
  for (const kind of kinds) {
    const orients = SHAPES[kind];
    const oi = orients.map((_, i) => i);
    shuffleInPlace(oi, rng);
    for (const o of oi) {
      const shape = orients[o]!;
      const ai = shape.map((_, i) => i);
      shuffleInPlace(ai, rng);
      for (const a of ai) {
        const anchor = shape[a]!;
        const atC = sc - anchor.c;
        const atR = sr - anchor.r;
        if (canPlace(occ, cols, rows, shape, atC, atR)) {
          out.push({ kind, shape, atC, atR });
        }
      }
    }
  }
  shuffleInPlace(out, rng);
  return out;
}

/**
 * Random classic-tetromino tiling of an entire even×even board via backtracking.
 * Fast enough for typical popup sizes; retries with fresh shuffle if needed.
 */
function randomTileBoard(
  cols: number,
  rows: number,
  rng: () => number,
): RawPiece[] | null {
  const occ = new Uint8Array(cols * rows);
  const pieces: RawPiece[] = [];

  function firstEmpty(): number {
    for (let i = 0; i < occ.length; i++) if (!occ[i]) return i;
    return -1;
  }

  function dfs(): boolean {
    const idx = firstEmpty();
    if (idx < 0) return true;
    const sc = idx % cols;
    const sr = Math.floor(idx / cols);
    const opts = placementsCovering(occ, cols, rows, sc, sr, rng);
    for (const opt of opts) {
      setShape(occ, cols, opt.shape, opt.atC, opt.atR, 1);
      pieces.push({
        kind: opt.kind,
        cells: opt.shape.map((p) => ({ c: opt.atC + p.c, r: opt.atR + p.r })),
      });
      if (dfs()) return true;
      pieces.pop();
      setShape(occ, cols, opt.shape, opt.atC, opt.atR, 0);
    }
    return false;
  }

  if (dfs()) return pieces;
  return null;
}

/**
 * For larger boards: tile random 4×4 / 4×2 / 2×4 windows (largest first),
 * each with its own RNG classic packing — snappy + random per hash.
 */
function randomTileByWindows(
  cols: number,
  rows: number,
  rng: () => number,
): RawPiece[] {
  const occupied = new Uint8Array(cols * rows);
  const pieces: RawPiece[] = [];

  type Win = { c: number; r: number; w: number; h: number };

  function free(win: Win): boolean {
    for (let r = win.r; r < win.r + win.h; r++) {
      for (let c = win.c; c < win.c + win.w; c++) {
        if (occupied[r * cols + c]) return false;
      }
    }
    return true;
  }

  function mark(win: Win): void {
    for (let r = win.r; r < win.r + win.h; r++) {
      for (let c = win.c; c < win.c + win.w; c++) {
        occupied[r * cols + c] = 1;
      }
    }
  }

  function claim(win: Win): void {
    if (!free(win)) return;
    const local = randomTileBoard(win.w, win.h, rng);
    if (!local) {
      if (win.w === 2 && win.h === 2) {
        pieces.push({
          kind: "O",
          cells: [
            { c: win.c, r: win.r },
            { c: win.c + 1, r: win.r },
            { c: win.c, r: win.r + 1 },
            { c: win.c + 1, r: win.r + 1 },
          ],
        });
        mark(win);
      }
      return;
    }
    for (const p of local) {
      pieces.push({
        kind: p.kind,
        cells: p.cells.map((cell) => ({
          c: cell.c + win.c,
          r: cell.r + win.r,
        })),
      });
    }
    mark(win);
  }

  const big: Win[] = [];
  for (let r = 0; r + 3 < rows; r += 4) {
    for (let c = 0; c + 3 < cols; c += 4) {
      big.push({ c, r, w: 4, h: 4 });
    }
  }
  shuffleInPlace(big, rng);
  for (const win of big) claim(win);

  const mid: Win[] = [];
  for (let r = 0; r + 1 < rows; r += 2) {
    for (let c = 0; c + 3 < cols; c += 4) {
      mid.push({ c, r, w: 4, h: 2 });
    }
  }
  for (let r = 0; r + 3 < rows; r += 4) {
    for (let c = 0; c + 1 < cols; c += 2) {
      mid.push({ c, r, w: 2, h: 4 });
    }
  }
  shuffleInPlace(mid, rng);
  for (const win of mid) claim(win);

  const small: Win[] = [];
  for (let r = 0; r + 1 < rows; r += 2) {
    for (let c = 0; c + 1 < cols; c += 2) {
      small.push({ c, r, w: 2, h: 2 });
    }
  }
  shuffleInPlace(small, rng);
  for (const win of small) claim(win);

  return pieces;
}

function baseOTiling(cols: number, rows: number): RawPiece[] {
  const pieces: RawPiece[] = [];
  for (let r = 0; r < rows; r += 2) {
    for (let c = 0; c < cols; c += 2) {
      pieces.push({
        kind: "O",
        cells: [
          { c, r },
          { c: c + 1, r },
          { c, r: r + 1 },
          { c: c + 1, r: r + 1 },
        ],
      });
    }
  }
  return pieces;
}

function assertValid(
  cols: number,
  rows: number,
  pieces: RawPiece[],
  total: number,
): boolean {
  if (pieces.length !== total) return false;
  const seen = new Set<number>();
  for (const p of pieces) {
    if (p.cells.length !== 4) return false;
    if (!KINDS.includes(p.kind)) return false;
    for (const cell of p.cells) {
      if (cell.c < 0 || cell.r < 0 || cell.c >= cols || cell.r >= rows) {
        return false;
      }
      const k = cell.r * cols + cell.c;
      if (seen.has(k)) return false;
      seen.add(k);
    }
  }
  return seen.size === cols * rows;
}

/** True if the rigid piece can move down one row on this board. */
function canMoveDown(
  cells: Cell[],
  occ: Uint8Array,
  cols: number,
  rows: number,
): boolean {
  for (const cell of cells) {
    const nr = cell.r + 1;
    if (nr >= rows) return false;
    // Still above the well — free to fall
    if (nr < 0) continue;
    if (occ[nr * cols + cell.c]) return false;
  }
  return true;
}

/**
 * Could this piece have hard-dropped straight down into its final cells
 * given the current stack? (classic Tetris gravity, no horizontal moves mid-fall)
 */
function canGravityLand(
  piece: RawPiece,
  occ: Uint8Array,
  cols: number,
  rows: number,
): boolean {
  for (const cell of piece.cells) {
    if (occ[cell.r * cols + cell.c]) return false;
  }
  // Must be resting (cannot move down)
  if (canMoveDown(piece.cells, occ, cols, rows)) return false;

  // Clear vertical path from above: every higher pose must be empty
  for (let up = 1; up <= rows + 4; up++) {
    const shifted = piece.cells.map((cell) => ({
      c: cell.c,
      r: cell.r - up,
    }));
    const anyOnBoard = shifted.some((c) => c.r >= 0);
    if (!anyOnBoard) break;
    for (const cell of shifted) {
      if (cell.r < 0 || cell.r >= rows) continue;
      if (occ[cell.r * cols + cell.c]) return false;
    }
  }
  return true;
}

/**
 * Reorder pieces into a Tetris-like drop sequence (bottom stack builds up).
 * `preOcc` = already-settled cells (floor / lower bands).
 * Returns null if this set cannot be played with straight gravity drops.
 */
function gravityOrder(
  pieces: RawPiece[],
  cols: number,
  rows: number,
  rng: () => number,
  preOcc?: Uint8Array,
): RawPiece[] | null {
  const remaining = pieces.map((p) => ({
    kind: p.kind,
    cells: p.cells.map((c) => ({ ...c })),
  }));
  const ordered: RawPiece[] = [];
  const occ = preOcc ? Uint8Array.from(preOcc) : new Uint8Array(cols * rows);

  while (remaining.length > 0) {
    const candidates: number[] = [];
    for (let i = 0; i < remaining.length; i++) {
      if (canGravityLand(remaining[i]!, occ, cols, rows)) candidates.push(i);
    }
    if (candidates.length === 0) return null;

    candidates.sort((ia, ib) => {
      const ba = bounds(remaining[ia]!.cells);
      const bb = bounds(remaining[ib]!.cells);
      if (bb.maxR !== ba.maxR) return bb.maxR - ba.maxR;
      return rng() - 0.5;
    });
    const pool = candidates.slice(0, Math.min(4, candidates.length));
    const pick = pool[Math.floor(rng() * pool.length)]!;
    const piece = remaining.splice(pick, 1)[0]!;
    for (const cell of piece.cells) {
      occ[cell.r * cols + cell.c] = 1;
    }
    ordered.push(piece);
  }
  return ordered;
}

/**
 * Simulate Tetris hard-drops (no line clears) until the well is full.
 * Hash-seeded 7-bag + scored placements → different “games” per torrent.
 */
function playTetrisFill(
  cols: number,
  rows: number,
  total: number,
  rng: () => number,
): RawPiece[] | null {
  const occ = new Uint8Array(cols * rows);
  const pieces: RawPiece[] = [];
  const bag: TetrominoKind[] = [];

  function nextKind(): TetrominoKind {
    if (bag.length === 0) {
      bag.push(...KINDS);
      shuffleInPlace(bag, rng);
    }
    return bag.pop()!;
  }

  function hardDrop(shape: Cell[], atC: number): Cell[] | null {
    // Normalize shape so minC=0, then offset by atC; start with minR at -4
    let minC = Infinity;
    let minR = Infinity;
    for (const p of shape) {
      minC = Math.min(minC, p.c);
      minR = Math.min(minR, p.r);
    }
    let cells = shape.map((p) => ({
      c: atC + (p.c - minC),
      r: p.r - minR - 4,
    }));
    for (const cell of cells) {
      if (cell.c < 0 || cell.c >= cols) return null;
    }
    // If spawn overlaps existing (top-out), invalid
    const overlaps = () =>
      cells.some(
        (cell) =>
          cell.r >= 0 &&
          cell.r < rows &&
          occ[cell.r * cols + cell.c] !== 0,
      );
    if (overlaps()) return null;

    while (canMoveDown(cells, occ, cols, rows)) {
      cells = cells.map((cell) => ({ c: cell.c, r: cell.r + 1 }));
    }
    // Must land fully on board
    if (cells.some((cell) => cell.r < 0 || cell.r >= rows)) return null;
    if (overlaps()) return null;
    return cells;
  }

  function scoreLanding(cells: Cell[]): number {
    // Reject roofed holes immediately
    const trial = Uint8Array.from(occ);
    for (const cell of cells) trial[cell.r * cols + cell.c] = 1;
    for (let c = 0; c < cols; c++) {
      let seenEmpty = false;
      for (let r = rows - 1; r >= 0; r--) {
        if (!trial[r * cols + c]) seenEmpty = true;
        else if (seenEmpty) return -1e9; // filled above empty = hole
      }
    }

    let score = 0;
    for (const cell of cells) {
      const below = cell.r + 1;
      if (below >= rows || occ[below * cols + cell.c]) score += 5;
      for (const dc of [-1, 1]) {
        const nc = cell.c + dc;
        if (nc < 0 || nc >= cols) score += 1;
        else if (occ[cell.r * cols + nc]) score += 2;
      }
      score += cell.r * 0.35;
    }
    return score;
  }

  for (let n = 0; n < total; n++) {
    const kind = nextKind();
    let best: Cell[] | null = null;
    let bestScore = -Infinity;
    const orients = SHAPES[kind].slice();
    shuffleInPlace(orients, rng);

    for (const shape of orients) {
      let minC = Infinity;
      let maxC = -Infinity;
      for (const p of shape) {
        minC = Math.min(minC, p.c);
        maxC = Math.max(maxC, p.c);
      }
      const width = maxC - minC + 1;
      const xs = Array.from({ length: cols - width + 1 }, (_, i) => i);
      shuffleInPlace(xs, rng);
      for (const x of xs) {
        const landed = hardDrop(shape, x);
        if (!landed) continue;
        const s = scoreLanding(landed) + rng() * 0.35;
        if (s > bestScore) {
          bestScore = s;
          best = landed;
        }
      }
    }

    if (!best) return null;
    for (const cell of best) occ[cell.r * cols + cell.c] = 1;
    pieces.push({ kind, cells: best });
  }

  for (let i = 0; i < occ.length; i++) {
    if (!occ[i]) return null; // holes — not a perfect fill
  }
  return pieces;
}

/**
 * Guaranteed fill: build the well in 2-/4-row bands from the bottom up.
 * Each band is a random classic tiling, dropped with gravity onto the stack.
 */
function playBandedFill(
  cols: number,
  rows: number,
  rng: () => number,
): RawPiece[] {
  const pieces: RawPiece[] = [];
  const occ = new Uint8Array(cols * rows);

  let r = rows;
  while (r > 0) {
    // Prefer 4-row bands (fits T/S/Z); otherwise 2-row
    let bandH = 2;
    if (r >= 4 && (r % 4 === 0 || rng() > 0.35)) bandH = 4;
    if (r < bandH) bandH = 2;
    r -= bandH;

    let local: RawPiece[] | null = null;
    for (let attempt = 0; attempt < 20 && !local; attempt++) {
      local = randomTileBoard(cols, bandH, rng);
    }
    if (!local) {
      local = [];
      for (let br = 0; br < bandH; br += 2) {
        for (let c = 0; c < cols; c += 2) {
          local.push({
            kind: "O",
            cells: [
              { c, r: br },
              { c: c + 1, r: br },
              { c, r: br + 1 },
              { c: c + 1, r: br + 1 },
            ],
          });
        }
      }
    }

    const offset = local.map((p) => ({
      kind: p.kind,
      cells: p.cells.map((cell) => ({ c: cell.c, r: cell.r + r })),
    }));

    const ordered = gravityOrder(offset, cols, rows, rng, occ);
    const seq =
      ordered ??
      [...offset].sort((a, b) => bounds(b.cells).maxR - bounds(a.cells).maxR);

    for (const p of seq) {
      pieces.push(p);
      for (const cell of p.cells) {
        occ[cell.r * cols + cell.c] = 1;
      }
    }
  }

  return pieces;
}

/**
 * Pack `pieceCount` classic tetrominoes by “playing” Tetris (gravity stack, no clears).
 * Drop order is the play order; end state is always a full well.
 */
export function packTetris(hash: string, pieceCount: number): TetrisPacking {
  const total = Math.max(0, pieceCount);
  const cells = total * 4;
  const { cols, rows } = bestGrid(total);
  const cellToPiece = new Int16Array(cols * rows).fill(-1);
  const rng = mulberry32(hashToSeed(hash) ^ (total * 0x9e3779b9));

  if (total === 0) {
    return { cols, rows, total, cells, pieces: [], cellToPiece };
  }

  let raw: RawPiece[] | null = null;

  // Organic playthrough when it manages a perfect fill
  for (let attempt = 0; attempt < 12 && !raw; attempt++) {
    raw = playTetrisFill(cols, rows, total, rng);
  }

  // Reliable: banded gravity stack (always fills, still hash-random)
  if (!raw) {
    raw = playBandedFill(cols, rows, rng);
  }

  if (!assertValid(cols, rows, raw, total)) {
    raw = baseOTiling(cols, rows);
    raw = gravityOrder(raw, cols, rows, rng) ?? raw;
  }

  const pieces: PlacedPiece[] = raw.map((p, i) => {
    const b = bounds(p.cells);
    for (const cell of p.cells) {
      cellToPiece[cell.r * cols + cell.c] = i;
    }
    return {
      id: i,
      kind: p.kind,
      cells: p.cells,
      ...b,
      size: 4,
      dropIndex: i,
    };
  });

  return { cols, rows, total, cells, pieces, cellToPiece };
}

export function landedCount(packing: TetrisPacking, complete: number): number {
  return Math.max(0, Math.min(complete, packing.total));
}

export type KindCounts = Record<TetrominoKind, number>;

export function kindMix(packing: TetrisPacking): KindCounts {
  const c: KindCounts = { I: 0, O: 0, T: 0, L: 0, J: 0, S: 0, Z: 0 };
  for (const p of packing.pieces) c[p.kind] += 1;
  return c;
}

export const TETROMINO_LABEL: Record<TetrominoKind, string> = {
  I: "I",
  O: "O",
  T: "T",
  L: "L",
  J: "J",
  S: "S",
  Z: "Z",
};
