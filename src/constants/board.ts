import type { PlayerColor } from '../types/ludo';

export const BOARD_SIZE = 15;
export const SAFE_POSITIONS = [0, 8, 13, 21, 26, 34, 39, 47];
export const HOME_POSITION = 57;
export const PLATFORM_CUT_PERCENT = 10;

export const START_POSITIONS: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
};

export interface CellPosition {
  row: number;
  col: number;
}

// 52 main path cells on 15x15 board
export const MAIN_PATH: CellPosition[] = [
  { row: 6, col: 1 }, { row: 6, col: 2 }, { row: 6, col: 3 },
  { row: 6, col: 4 }, { row: 6, col: 5 }, { row: 5, col: 5 },
  { row: 4, col: 5 }, { row: 3, col: 5 }, { row: 2, col: 5 },
  { row: 1, col: 5 }, { row: 0, col: 5 }, { row: 0, col: 6 },
  { row: 0, col: 7 }, { row: 0, col: 8 }, { row: 0, col: 9 },
  { row: 1, col: 9 }, { row: 2, col: 9 }, { row: 3, col: 9 },
  { row: 4, col: 9 }, { row: 5, col: 9 }, { row: 6, col: 9 },
  { row: 6, col: 10 }, { row: 6, col: 11 }, { row: 6, col: 12 },
  { row: 6, col: 13 }, { row: 6, col: 14 }, { row: 7, col: 14 },
  { row: 8, col: 14 }, { row: 9, col: 14 }, { row: 9, col: 13 },
  { row: 9, col: 12 }, { row: 9, col: 11 }, { row: 9, col: 10 },
  { row: 9, col: 9 }, { row: 9, col: 8 }, { row: 9, col: 7 },
  { row: 9, col: 6 }, { row: 9, col: 5 }, { row: 10, col: 5 },
  { row: 11, col: 5 }, { row: 12, col: 5 }, { row: 13, col: 5 },
  { row: 14, col: 5 }, { row: 14, col: 6 }, { row: 14, col: 7 },
  { row: 14, col: 8 }, { row: 14, col: 9 }, { row: 13, col: 9 },
  { row: 12, col: 9 }, { row: 11, col: 9 }, { row: 10, col: 9 },
  { row: 8, col: 5 }, // 51
];

export const HOME_PATHS: Record<PlayerColor, CellPosition[]> = {
  red: [
    { row: 7, col: 1 }, { row: 7, col: 2 }, { row: 7, col: 3 },
    { row: 7, col: 4 }, { row: 7, col: 5 }, { row: 7, col: 6 },
  ],
  green: [
    { row: 1, col: 7 }, { row: 2, col: 7 }, { row: 3, col: 7 },
    { row: 4, col: 7 }, { row: 5, col: 7 }, { row: 6, col: 7 },
  ],
};

export const HOME_BASE_POSITIONS: Record<PlayerColor, CellPosition[]> = {
  red: [
    { row: 1, col: 1 }, { row: 1, col: 3 },
    { row: 3, col: 1 }, { row: 3, col: 3 },
  ],
  green: [
    { row: 1, col: 11 }, { row: 1, col: 13 },
    { row: 3, col: 11 }, { row: 3, col: 13 },
  ],
};

export const COLOR_STYLES: Record<PlayerColor, {
  primary: string;
  light: string;
  dark: string;
  gradient: string;
  glow: string;
  text: string;
  border: string;
  rgb: string;
}> = {
  red: {
    primary: '#ef4444',
    light: '#fca5a5',
    dark: '#991b1b',
    gradient: 'from-red-500 to-red-700',
    glow: 'shadow-red-500/60',
    text: 'text-red-400',
    border: 'border-red-500',
    rgb: '239,68,68',
  },
  green: {
    primary: '#22c55e',
    light: '#86efac',
    dark: '#15803d',
    gradient: 'from-green-500 to-green-700',
    glow: 'shadow-green-500/60',
    text: 'text-green-400',
    border: 'border-green-500',
    rgb: '34,197,94',
  },
};

export const AMOUNT_OPTIONS = [10, 25, 50, 100, 250, 500, 1000, 5000];
