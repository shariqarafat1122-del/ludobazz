
// constants/boardlayout.ts
// Red  = TOP-LEFT     (player1 / creator)
// Green = BOTTOM-RIGHT (player2 / joiner)
// Track is clockwise, 52 cells

export const GRID = 15;
export const CELL = 100 / GRID; // 6.6667% per cell

export const TRACK: [number, number][] = [
  // [0-4]  Red entry row — row 6, cols 1→5
  [6,1],[6,2],[6,3],[6,4],[6,5],
  // [5-10] Up col 5 — rows 5→0
  [5,5],[4,5],[3,5],[2,5],[1,5],[0,5],
  // [11-13] Top edge right — row 0, cols 6,7,8
  [0,6],[0,7],[0,8],
  // [14-18] Down col 8 — rows 1→5
  [1,8],[2,8],[3,8],[4,8],[5,8],
  // [19]   Corner top-right
  [5,9],
  // [20-25] Green entry row — row 6, cols 9→14
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  // [26-31] Green entry — row 8, cols 14→9
  [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],
  // [32]   Corner bottom-right
  [9,9],
  // [33-38] Down col 8 — rows 9→14
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  // [39-40] Bottom edge left — row 14, cols 7,6
  [14,7],[14,6],
  // [41-45] Up col 6 — rows 13→9
  [13,6],[12,6],[11,6],[10,6],[9,6],
  // [46-51] Red return — row 9, cols 5→0
  [9,5],[9,4],[9,3],[9,2],[9,1],[9,0],
];

if (TRACK.length !== 52) {
  console.error('TRACK must be 52 cells, got:', TRACK.length);
}

// Home stretch: 6 colored cells leading to center
export const HOME_PATH: Record<string, [number, number][]> = {
  red:   [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],    // row 7 going RIGHT
  green: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]], // row 7 going LEFT
};

// Yard slot positions — 4 token slots per yard
export const YARD_SLOTS: Record<string, [number, number][]> = {
  red:   [[1,1],[1,3],[3,1],[3,3]],       // TOP-LEFT zone
  green: [[10,10],[10,12],[12,10],[12,12]], // BOTTOM-RIGHT zone
};

export const SAFE_CELLS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

export const TRACK_START: Record<string, number> = {
  red: 0,
  green: 26,
};

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

export const toPercent = (row: number, col: number) => ({
  x: (col + 0.5) * CELL,
  y: (row + 0.5) * CELL,
});

export const getAbsIdx = (relPos: number, color: LudoColor): number => {
  if (relPos < 0 || relPos >= 52) return relPos;
  const start = TRACK_START[color] ?? 0;
  return (start + relPos) % 52;
};

export const getTokenCoord = (
  position: number,
  color: LudoColor,
  slotIdx: number = 0,
): { x: number; y: number } | null => {
  if (position === -1) {
    const slots = YARD_SLOTS[color];
    const slot  = slots?.[slotIdx % slots.length];
    if (!slot) return null;
    return toPercent(slot[0], slot[1]);
  }
  if (position >= 57) return null;
  if (position >= 52) {
    const path = HOME_PATH[color];
    const cell = path?.[Math.min(position - 52, path.length - 1)];
    if (!cell) return null;
    return toPercent(cell[0], cell[1]);
  }
  const absIdx = getAbsIdx(position, color);
  const cell   = TRACK[absIdx];
  if (!cell) return null;
  return toPercent(cell[0], cell[1]);
};

