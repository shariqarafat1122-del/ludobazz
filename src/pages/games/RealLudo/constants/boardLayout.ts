// constants/boardLayout.ts - FULLY FIXED

export const GRID = 15;
export const CELL = 100 / GRID; // 6.6667% per cell

/**
 * Standard Ludo 52-cell main track
 * Index 0  = Red's entry cell
 * Index 26 = Green's entry cell
 * Clockwise direction
 */
export const TRACK: [number, number][] = [
  // ── RED start zone (row 6, going right from col 1→5) ──
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],   // 0–4

  // ── Top-left corner, going UP ──
  [5, 5], [4, 5], [3, 5], [2, 5], [1, 5], [0, 5], // 5–10

  // ── Top edge, going RIGHT ──
  [0, 6], [0, 7], [0, 8],                    // 11–13

  // ── Right of top, going DOWN ──
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],   // 14–18

  // ── Top-right corner ──
  [5, 9],                                     // 19

  // ── GREEN start zone (row 6, going right col 9→14) ──
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], // 20–25

  // ── GREEN entry = 26 ──
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], // 26–31

  // ── Bottom-right corner ──
  [9, 9],                                     // 32

  // ── Right side, going DOWN ──
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], // 33–38

  // ── Bottom edge, going LEFT ──
  [14, 7], [14, 6],                           // 39–40

  // ── Left of bottom, going UP ──
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], // 41–45

  // ── RED return zone (row 9, going left col 5→0) ──
  [9, 5], [9, 4], [9, 3], [9, 2], [9, 1], [9, 0], // 46–51
];

// Verify
if (TRACK.length !== 52) {
  console.error('TRACK must be 52 cells, got:', TRACK.length);
}

// ─── Home stretch paths (5 colored cells + final center approach) ──────────
export const HOME_PATH: Record<string, [number, number][]> = {
  red:   [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],   // RED goes right along row 7
  green: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]], // GREEN goes left along row 7
};

// ─── Yard slot positions ────────────────────────────────────────────────────
export const YARD_SLOTS: Record<string, [number, number][]> = {
  red:   [[1,1],[1,3],[3,1],[3,3]],
  green: [[1,10],[1,12],[3,10],[3,12]],
};

// ─── Safe squares on main track ────────────────────────────────────────────
export const SAFE_CELLS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// ─── Track start positions ──────────────────────────────────────────────────
export const TRACK_START: Record<string, number> = {
  red: 0,
  green: 26,
};

// ─── Color themes ───────────────────────────────────────────────────────────
export const COLOR_THEME = {
  red: {
    primary:   '#ef4444',
    secondary: '#dc2626',
    light:     '#fca5a5',
    dark:      '#7f1d1d',
    glow:      'rgba(239,68,68,0.7)',
    home:      '#fee2e2',
    gradient:  'linear-gradient(135deg, #ef4444, #b91c1c)',
  },
  green: {
    primary:   '#22c55e',
    secondary: '#16a34a',
    light:     '#86efac',
    dark:      '#14532d',
    glow:      'rgba(34,197,94,0.7)',
    home:      '#dcfce7',
    gradient:  'linear-gradient(135deg, #22c55e, #15803d)',
  },
  yellow: {
    primary:   '#eab308',
    secondary: '#ca8a04',
    light:     '#fde047',
    dark:      '#713f12',
    glow:      'rgba(234,179,8,0.7)',
    home:      '#fef9c3',
    gradient:  'linear-gradient(135deg, #eab308, #a16207)',
  },
  blue: {
    primary:   '#3b82f6',
    secondary: '#2563eb',
    light:     '#93c5fd',
    dark:      '#1e3a8a',
    glow:      'rgba(59,130,246,0.7)',
    home:      '#dbeafe',
    gradient:  'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  },
} as const;

export type LudoColor = keyof typeof COLOR_THEME;

// ─── Utility: grid → SVG percent (cell center) ──────────────────────────────
export const toPercent = (row: number, col: number) => ({
  x: (col + 0.5) * CELL,
  y: (row + 0.5) * CELL,
});

// ─── Absolute track index for a color ───────────────────────────────────────
export const getAbsIdx = (relPos: number, color: LudoColor): number => {
  if (relPos < 0 || relPos >= 52) return relPos;
  const start = TRACK_START[color] ?? 0;
  return (start + relPos) % 52;
};

// ─── Token SVG coordinate ───────────────────────────────────────────────────
export const getTokenCoord = (
  position: number,
  color: LudoColor,
  slotIdx: number = 0,
): { x: number; y: number } | null => {

  // In yard (base)
  if (position === -1) {
    const slots = YARD_SLOTS[color];
    const slot  = slots?.[slotIdx % slots.length];
    if (!slot) return null;
    return toPercent(slot[0], slot[1]);
  }

  // Finished / won
  if (position >= 57) return null;

  // Home stretch (position 52–56)
  if (position >= 52) {
    const path = HOME_PATH[color];
    const cell = path?.[Math.min(position - 52, path.length - 1)];
    if (!cell) return null;
    return toPercent(cell[0], cell[1]);
  }

  // Main track
  const absIdx = getAbsIdx(position, color);
  const cell   = TRACK[absIdx];
  if (!cell) return null;
  return toPercent(cell[0], cell[1]);
};
