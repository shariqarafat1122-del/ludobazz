// ─── Board Layout Constants ───────────────────────────────────────────────────
// Standard 15×15 Ludo grid coordinate system

export const GRID = 15;
export const CELL = 100 / GRID; // percentage per cell

// Main track: 52 cells clockwise, index 0 = Red start
export const TRACK: [number, number][] = [
  // Row 6 going right (Red's row)
  [6,0],[6,1],[6,2],[6,3],[6,4],
  // Col 5 going up
  [5,5],[4,5],[3,5],[2,5],[1,5],[0,5],
  // Top middle
  [0,6],
  // Col 8 going down (Green entry)
  [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],
  // Row 5 corner
  [5,9],
  // Row 6 going right
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  // Row 8 going left (Green's row)
  [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],
  // Row 9 corner
  [9,9],
  // Col 8 going down
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  // Bottom middle
  [14,6],
  // Col 6 going up
  [13,6],[12,6],[11,6],[10,6],[9,6],
  // Row 9 going left
  [9,5],[9,4],[9,3],[9,2],[9,1],[9,0],
  // Left edge
  [8,0],
  // Row 8 going right
  [8,1],[8,2],[8,3],[8,4],[8,5],
  // Into center
  [8,6],
];

// Home stretch paths (toward center, 6 cells each)
export const HOME_PATH = {
  red:    [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]] as [number,number][],
  green:  [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]] as [number,number][],
  yellow: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]] as [number,number][],
  blue:   [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]] as [number,number][],
};

// Yard (base) slot positions for each color
export const YARD_SLOTS = {
  red:    [[1,1],[1,3],[3,1],[3,3]] as [number,number][],
  green:  [[1,11],[1,13],[3,11],[3,13]] as [number,number][],
  yellow: [[11,11],[11,13],[13,11],[13,13]] as [number,number][],
  blue:   [[11,1],[11,3],[13,1],[13,3]] as [number,number][],
};

// Safe squares (absolute track indices)
export const SAFE_CELLS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Start positions on track for each color
export const TRACK_START = { red: 0, green: 26, yellow: 39, blue: 13 };

// Color themes
export const COLOR_THEME = {
  red: {
    primary:   '#ef4444',
    secondary: '#dc2626',
    light:     '#fca5a5',
    dark:      '#7f1d1d',
    glow:      'rgba(239,68,68,0.6)',
    home:      '#fee2e2',
    gradient:  'linear-gradient(135deg, #ef4444, #b91c1c)',
  },
  green: {
    primary:   '#22c55e',
    secondary: '#16a34a',
    light:     '#86efac',
    dark:      '#14532d',
    glow:      'rgba(34,197,94,0.6)',
    home:      '#dcfce7',
    gradient:  'linear-gradient(135deg, #22c55e, #15803d)',
  },
  yellow: {
    primary:   '#eab308',
    secondary: '#ca8a04',
    light:     '#fde047',
    dark:      '#713f12',
    glow:      'rgba(234,179,8,0.6)',
    home:      '#fef9c3',
    gradient:  'linear-gradient(135deg, #eab308, #a16207)',
  },
  blue: {
    primary:   '#3b82f6',
    secondary: '#2563eb',
    light:     '#93c5fd',
    dark:      '#1e3a8a',
    glow:      'rgba(59,130,246,0.6)',
    home:      '#dbeafe',
    gradient:  'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  },
} as const;

export type LudoColor = keyof typeof COLOR_THEME;

// Convert grid [row,col] to SVG percentage coordinates (center of cell)
export const toPercent = (row: number, col: number) => ({
  x: (col + 0.5) * CELL,
  y: (row + 0.5) * CELL,
});

// Get absolute track index for a color at relative position
export const getAbsIdx = (relPos: number, color: LudoColor): number => {
  if (relPos < 0 || relPos >= 52) return relPos;
  return (TRACK_START[color] + relPos) % 52;
};

// Get SVG coordinate for a token at given position
export const getTokenCoord = (
  position: number,
  color: LudoColor,
  slotIdx: number = 0
): { x: number; y: number } | null => {
  if (position === -1) {
    // In yard
    const slot = YARD_SLOTS[color][slotIdx];
    if (!slot) return null;
    return toPercent(slot[0], slot[1]);
  }
  if (position >= 57) return null; // finished - at center

  if (position >= 52) {
    // Home stretch
    const hsIdx = position - 52;
    const path = HOME_PATH[color];
    const cell = path[Math.min(hsIdx, path.length - 1)];
    if (!cell) return null;
    return toPercent(cell[0], cell[1]);
  }

  // Main track
  const absIdx = getAbsIdx(position, color);
  const cell = TRACK[absIdx];
  if (!cell) return null;
  return toPercent(cell[0], cell[1]);
};
