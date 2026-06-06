import { PlayerColor } from '../types';

// Board is 15x15 grid
export const BOARD_SIZE = 15;
export const CELL_SIZE = 100 / 15; // percentage

// Safe squares (star positions) on the main path (0-51)
export const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47];

// Home column start positions for each color (index on main path where they enter home stretch)
export const HOME_ENTRY: Record<PlayerColor, number> = {
  green: 51,   // Green enters home stretch after position 51
  blue: 25,    // Blue enters home stretch after position 25
};

// Starting positions on main path for each color
export const START_POSITION: Record<PlayerColor, number> = {
  green: 0,
  blue: 26,
};

// Home yard positions (pixel grid positions for the 4 pieces in yard)
export const YARD_POSITIONS: Record<PlayerColor, { row: number; col: number }[]> = {
  green: [
    { row: 1.5, col: 9.5 },
    { row: 1.5, col: 11.5 },
    { row: 3.5, col: 9.5 },
    { row: 3.5, col: 11.5 },
  ],
  blue: [
    { row: 9.5, col: 1.5 },
    { row: 9.5, col: 3.5 },
    { row: 11.5, col: 1.5 },
    { row: 11.5, col: 3.5 },
  ],
};

// Main path: array of {row, col} for positions 0..55
// Standard Ludo path (2-player: green starts top-right, blue starts bottom-left)
export const MAIN_PATH: { row: number; col: number }[] = [
  // Green start zone (top-right area going down)
  { row: 6, col: 13 }, // 0  - Green START
  { row: 6, col: 12 },
  { row: 6, col: 11 },
  { row: 6, col: 10 },
  { row: 6, col: 9 },  // 4
  { row: 5, col: 9 },
  { row: 4, col: 9 },
  { row: 3, col: 9 },
  { row: 2, col: 9 },  // 8 - SAFE
  { row: 1, col: 9 },
  { row: 0, col: 9 },
  { row: 0, col: 8 },  // 11
  { row: 0, col: 7 },
  { row: 1, col: 7 },  // 13 - SAFE
  { row: 2, col: 7 },
  { row: 3, col: 7 },
  { row: 4, col: 7 },
  { row: 5, col: 7 },
  { row: 6, col: 7 },  // 18
  { row: 6, col: 6 },
  { row: 6, col: 5 },  // 20
  { row: 6, col: 4 },
  { row: 6, col: 3 },  // 22
  { row: 6, col: 2 },
  { row: 6, col: 1 },
  { row: 6, col: 0 },  // 25
  { row: 7, col: 0 },  // 26 - Blue START
  { row: 8, col: 0 },
  { row: 8, col: 1 },
  { row: 8, col: 2 },
  { row: 8, col: 3 },  // 30
  { row: 8, col: 4 },
  { row: 8, col: 5 },
  { row: 8, col: 6 },
  { row: 8, col: 7 },  // 34 - SAFE
  { row: 9, col: 7 },
  { row: 10, col: 7 },
  { row: 11, col: 7 },
  { row: 12, col: 7 },
  { row: 13, col: 7 },
  { row: 14, col: 7 },
  { row: 14, col: 8 }, // 41
  { row: 14, col: 9 },
  { row: 13, col: 9 }, // 43
  { row: 12, col: 9 },
  { row: 11, col: 9 },
  { row: 10, col: 9 },
  { row: 9, col: 9 },
  { row: 8, col: 9 },  // 48
  { row: 8, col: 10 },
  { row: 8, col: 11 },
  { row: 8, col: 12 },
  { row: 8, col: 13 },
  { row: 8, col: 14 }, // 53
  { row: 7, col: 14 },
  { row: 6, col: 14 }, // 55
];

// Home stretch paths (positions 56+ are home column)
export const HOME_STRETCH: Record<PlayerColor, { row: number; col: number }[]> = {
  green: [
    { row: 7, col: 13 },
    { row: 7, col: 12 },
    { row: 7, col: 11 },
    { row: 7, col: 10 },
    { row: 7, col: 9 },
    { row: 7, col: 8 }, // finish
  ],
  blue: [
    { row: 7, col: 1 },
    { row: 7, col: 2 },
    { row: 7, col: 3 },
    { row: 7, col: 4 },
    { row: 7, col: 5 },
    { row: 7, col: 6 }, // finish
  ],
};

export const HOME_CENTER = { row: 7, col: 7 };

export const COLOR_MAP: Record<PlayerColor, string> = {
  green: '#16a34a',
  blue: '#2563eb',
};

export const COLOR_LIGHT: Record<PlayerColor, string> = {
  green: '#86efac',
  blue: '#93c5fd',
};

export const COLOR_DARK: Record<PlayerColor, string> = {
  green: '#14532d',
  blue: '#1e3a8a',
};
