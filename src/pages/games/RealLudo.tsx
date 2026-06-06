// RealLudo.tsx — Premium Real-Time 2-Player Ludo Game
import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './contexts/AuthContext';
import {
  LudoGame,
  LudoToken,
  LudoPlayerState,
  PlayerSlot,
  subscribeLudoGame,
  rollDice,
  moveTokenOnBoard,
  skipTurn,
  updatePlayerOnline,
  getMovableTokens,
  getAbsolutePosition,
  TOKEN_BASE_POSITION,
  TOKEN_HOME_POSITION,
} from './RealLudo';

// ─── Board Layout ─────────────────────────────────────────────────────────────
// Standard Ludo board is 15x15 grid. We map each of the 52 track cells
// to [row, col] coordinates. Red starts at (6,1), Green at (1,8)

const BOARD_SIZE = 15;

// The 52 main track positions (row, col) going clockwise starting from red's start
// Red start = index 0, Green start = index 26
const TRACK: [number, number][] = [
  // Red start → going right (row 6)
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  // Going up (col 5)
  [5, 5], [4, 5], [3, 5], [2, 5], [1, 5], [0, 5],
  // Going right (row 0)
  [0, 6],
  // Green start → going down (col 8)
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  // Going right (row 5) 
  [5, 9],
  // Going down (col 9-13)
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  // Going down (col 14)
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  // Going left (row 9)
  [9, 9],
  // Going down (col 8 bottom)
  [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  // Going left (row 14)
  [14, 6],
  // Going up (col 6 right-bottom)
  [9, 6], [9, 5], [9, 4], [9, 3], [9, 2], [9, 1],
  // Going left (row 9)
  [8, 1],
  // Going right (col 1 bottom)
  [8, 2], [8, 3], [8, 4], [8, 5], [8, 6],
];

// Home columns: each color has its own 5-cell path into center
// trackPos 52-56 → home column, 57 = finished
const HOME_COLUMNS: Record<string, [number, number][]> = {
  red: [[6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6]],    // positions 52-57 (visual)
  green: [[1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 8]],
};

// Actually use proper home columns (the colored lane going to center)
const HOME_PATHS: Record<string, [number, number][]> = {
  red: [[6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6]],
  green: [[8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [8, 8]],
};

// Safe cells on track
const SAFE_CELLS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// ─── Grid Cell Colors ─────────────────────────────────────────────────────────

type CellType =
  | 'red-home'
  | 'green-home'
  | 'yellow-home'
  | 'blue-home'
  | 'red-path'
  | 'green-path'
  | 'yellow-path'
  | 'blue-path'
  | 'safe'
  | 'center'
  | 'center-star'
  | 'normal'
  | 'arrow';

const getCellType = (row: number, col: number): CellType => {
  // Home zones (6x6 corners)
  if (row <= 5 && col <= 5) return 'red-home';
  if (row <= 5 && col >= 9) return 'green-home';
  if (row >= 9 && col >= 9) return 'yellow-home';
  if (row >= 9 && col <= 5) return 'blue-home';

  // Center triangle areas
  if (row >= 6 && row <= 8 && col >= 6 && col <= 8) return 'center-star';

  // Color paths (home columns)
  if (col === 7 && row >= 1 && row <= 5) return 'green-path'; // was wrong
  if (col === 7 && row >= 9 && row <= 13) return 'yellow-path';
  if (row === 7 && col >= 1 && col <= 5) return 'red-path';
  if (row === 7 && col >= 9 && col <= 13) return 'blue-path';

  return 'normal';
};

// ─── Dice Component ───────────────────────────────────────────────────────────

interface DiceProps {
  value: number | null;
  rolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  disabled: boolean;
}

const DiceFace: React.FC<{ value: number; size?: number }> = ({ value, size = 52 }) => {
  const dotPositions: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 22], [75, 22], [25, 50], [75, 50], [25, 78], [75, 78]],
  };

  const dots = value ? dotPositions[value] || [] : [];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ overflow: 'visible' }}
    >
      {/* Dice body */}
      <defs>
        <linearGradient id="diceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <filter id="diceShadow">
          <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.4" />
        </filter>
        <filter id="innerShadow">
          <feOffset dx="1" dy="1" />
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {/* Main body */}
      <rect
        x="2" y="2"
        width="96" height="96"
        rx="16"
        fill="url(#diceGrad)"
        filter="url(#diceShadow)"
      />
      {/* Top highlight */}
      <rect x="6" y="4" width="88" height="40" rx="12" fill="rgba(255,255,255,0.6)" />
      {/* Border */}
      <rect x="2" y="2" width="96" height="96" rx="16" fill="none" stroke="rgba(148,163,184,0.6)" strokeWidth="1.5" />

      {/* Dots */}
      {dots.map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="8" fill="#1e293b" />
          <circle cx={cx - 2} cy={cy - 2} r="2" fill="rgba(255,255,255,0.3)" />
        </g>
      ))}
    </svg>
  );
};

const Dice: React.FC<DiceProps> = ({ value, rolling, canRoll, onRoll, disabled }) => {
  const displayValue = value || 1;

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        animate={
          rolling
            ? {
                rotate: [0, 15, -15, 20, -20, 10, -10, 0],
                scale: [1, 1.1, 0.95, 1.05, 0.98, 1],
                y: [0, -8, 4, -4, 2, 0],
              }
            : {}
        }
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        className="relative"
        style={{ filter: rolling ? 'drop-shadow(0 0 12px rgba(250,204,21,0.6))' : 'none' }}
      >
        {rolling ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.15, repeat: 4, ease: 'linear' }}
          >
            <DiceFace value={Math.ceil(Math.random() * 6)} size={56} />
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            key={value}
          >
            <DiceFace value={displayValue} size={56} />
          </motion.div>
        )}
      </motion.div>

      {canRoll && (
        <motion.button
          whileHover={{ scale: 1.05, y: -1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRoll}
          disabled={disabled || rolling}
          className="px-6 py-2.5 rounded-xl font-bold text-white text-sm relative overflow-hidden"
          style={{
            background:
              disabled || rolling
                ? 'rgba(100,100,100,0.3)'
                : 'linear-gradient(135deg, #f59e0b, #d97706)',
            boxShadow:
              disabled || rolling ? 'none' : '0 4px 16px rgba(245,158,11,0.4)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {rolling ? '🎲 Rolling...' : '🎲 Roll Dice'}
        </motion.button>
      )}
    </div>
  );
};

// ─── Token (Goti) Component ───────────────────────────────────────────────────

interface TokenProps {
  color: 'red' | 'green';
  isActive: boolean;
  isMovable: boolean;
  isHome: boolean;
  onClick: () => void;
  size?: number;
}

const TOKEN_COLORS = {
  red: {
    main: '#ef4444',
    light: '#fca5a5',
    dark: '#991b1b',
    glow: 'rgba(239,68,68,0.6)',
    gradient: 'linear-gradient(135deg, #fca5a5 0%, #ef4444 40%, #b91c1c 100%)',
  },
  green: {
    main: '#22c55e',
    light: '#86efac',
    dark: '#14532d',
    glow: 'rgba(34,197,94,0.6)',
    gradient: 'linear-gradient(135deg, #86efac 0%, #22c55e 40%, #15803d 100%)',
  },
};

const Token: React.FC<TokenProps> = ({
  color,
  isActive,
  isMovable,
  isHome,
  onClick,
  size = 22,
}) => {
  const c = TOKEN_COLORS[color];
  const svgSize = size;

  return (
    <motion.button
      onClick={isMovable ? onClick : undefined}
      whileHover={isMovable ? { scale: 1.2 } : {}}
      whileTap={isMovable ? { scale: 0.9 } : {}}
      animate={
        isMovable
          ? {
              scale: [1, 1.08, 1],
              filter: [
                `drop-shadow(0 0 4px ${c.glow})`,
                `drop-shadow(0 0 10px ${c.glow})`,
                `drop-shadow(0 0 4px ${c.glow})`,
              ],
            }
          : isHome
          ? { scale: 0.85, opacity: 0.7 }
          : {}
      }
      transition={isMovable ? { duration: 1.2, repeat: Infinity } : {}}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: isMovable ? 'pointer' : 'default',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={svgSize} height={svgSize * 1.3} viewBox="0 0 40 52">
        <defs>
          <radialGradient id={`tg-${color}`} cx="35%" cy="25%" r="65%">
            <stop offset="0%" stopColor={c.light} />
            <stop offset="45%" stopColor={c.main} />
            <stop offset="100%" stopColor={c.dark} />
          </radialGradient>
          <filter id={`ts-${color}`}>
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor={c.dark} floodOpacity="0.6" />
          </filter>
        </defs>

        {/* Base / foot */}
        <ellipse cx="20" cy="48" rx="14" ry="4" fill={c.dark} opacity="0.5" />
        {/* Stem */}
        <rect x="16" y="26" width="8" height="16" rx="4" fill={`url(#tg-${color})`} filter={`url(#ts-${color})`} />
        {/* Head sphere */}
        <circle cx="20" cy="20" r="14" fill={`url(#tg-${color})`} filter={`url(#ts-${color})`} />
        {/* Highlight */}
        <ellipse cx="14" cy="13" rx="5" ry="4" fill="rgba(255,255,255,0.45)" />
        {/* Active indicator */}
        {isMovable && (
          <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeDasharray="4 3" />
        )}
      </svg>
    </motion.button>
  );
};

// ─── Player Card Component ────────────────────────────────────────────────────

interface PlayerCardProps {
  player: LudoPlayerState | null;
  isActive: boolean;
  label: string;
  diceValue: number | null;
  diceRolled: boolean;
}

const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isActive,
  label,
  diceValue,
  diceRolled,
}) => {
  const colorMap = {
    red: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', text: '#ef4444', glow: '0 0 20px rgba(239,68,68,0.3)' },
    green: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', text: '#22c55e', glow: '0 0 20px rgba(34,197,94,0.3)' },
  };

  const c = player ? colorMap[player.color] : colorMap.red;

  return (
    <motion.div
      animate={
        isActive
          ? {
              boxShadow: [
                c.glow,
                c.glow.replace('0.3', '0.5'),
                c.glow,
              ],
            }
          : { boxShadow: 'none' }
      }
      transition={{ duration: 1.5, repeat: isActive ? Infinity : 0 }}
      className="flex items-center gap-3 p-3 rounded-2xl border transition-all"
      style={{
        background: isActive ? c.bg : 'rgba(255,255,255,0.03)',
        borderColor: isActive ? c.border : 'rgba(255,255,255,0.07)',
      }}
    >
      {/* Avatar */}
      <div className="relative">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black"
          style={{
            background: player ? c.bg : 'rgba(255,255,255,0.05)',
            border: `2px solid ${player ? c.text : 'rgba(255,255,255,0.1)'}`,
            color: player ? c.text : 'rgba(255,255,255,0.3)',
          }}
        >
          {player ? player.name[0].toUpperCase() : '?'}
        </div>
        {player && (
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
              player.isOnline ? 'bg-emerald-400' : 'bg-slate-600'
            }`}
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {isActive && (
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-2 h-2 rounded-full"
              style={{ background: c.text }}
            />
          )}
          <span className="text-white font-semibold text-sm truncate">
            {player ? player.name : 'Waiting...'}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs font-bold" style={{ color: c.text }}>
            {label}
          </span>
          {player && (
            <span className="text-slate-500 text-xs">
              {player.tokensHome}/4 home
            </span>
          )}
        </div>
      </div>

      {/* Tokens home visual */}
      {player && (
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                background:
                  i < player.tokensHome ? c.text : 'rgba(255,255,255,0.1)',
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

// ─── Ludo Board Component ─────────────────────────────────────────────────────

interface BoardProps {
  game: LudoGame;
  mySlot: PlayerSlot | null;
  myColor: 'red' | 'green' | null;
  movableTokenIds: number[];
  onTokenClick: (color: 'red' | 'green', tokenId: number) => void;
}

// Map track position to grid [row, col]
const trackToGrid = (trackPos: number, color: 'red' | 'green'): [number, number] | null => {
  if (trackPos === TOKEN_BASE_POSITION) return null; // in base
  if (trackPos === TOKEN_HOME_POSITION) return null; // fully home

  if (trackPos >= 52 && trackPos < TOKEN_HOME_POSITION) {
    // Home column (positions 52-56)
    const homeIndex = trackPos - 52;
    const path = HOME_PATHS[color];
    return path[homeIndex] || null;
  }

  // Main track
  return TRACK[trackPos] || null;
};

// Base positions for tokens in home zone
const BASE_POSITIONS: Record<string, [number, number][]> = {
  red: [[1, 1], [1, 3], [3, 1], [3, 3]],
  green: [[1, 11], [1, 13], [3, 11], [3, 13]],
};

const CELL_SIZE = 38; // px per cell

const LudoBoard: React.FC<BoardProps> = ({
  game,
  mySlot,
  myColor,
  movableTokenIds,
  onTokenClick,
}) => {
  const player1 = game.player1;
  const player2 = game.player2;

  // Build cell→tokens map
  const cellTokens = useMemo(() => {
    const map = new Map<string, { token: LudoToken; color: 'red' | 'green' }[]>();

    const addTokens = (tokens: LudoToken[], color: 'red' | 'green') => {
      tokens.forEach((token) => {
        const grid = trackToGrid(token.position, color);
        if (!grid) return;
        const key = `${grid[0]}-${grid[1]}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push({ token, color });
      });
    };

    if (player1) addTokens(player1.tokens, 'red');
    if (player2) addTokens(player2.tokens, 'green');

    return map;
  }, [player1, player2]);

  const totalSize = CELL_SIZE * BOARD_SIZE;

  const getCellStyle = (row: number, col: number): React.CSSProperties => {
    const type = getCellType(row, col);
    const base: React.CSSProperties = {
      width: CELL_SIZE,
      height: CELL_SIZE,
      position: 'absolute',
      left: col * CELL_SIZE,
      top: row * CELL_SIZE,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
    };

    const borders = 'border border-slate-700/30';

    switch (type) {
      case 'red-home':
        return { ...base, background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.15)' };
      case 'green-home':
        return { ...base, background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.15)' };
      case 'yellow-home':
        return { ...base, background: 'rgba(234,179,8,0.18)', border: '1px solid rgba(234,179,8,0.15)' };
      case 'blue-home':
        return { ...base, background: 'rgba(59,130,246,0.18)', border: '1px solid rgba(59,130,246,0.15)' };
      case 'red-path':
        return { ...base, background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.2)' };
      case 'green-path':
        return { ...base, background: 'rgba(34,197,94,0.25)', border: '1px solid rgba(34,197,94,0.2)' };
      case 'yellow-path':
        return { ...base, background: 'rgba(234,179,8,0.25)', border: '1px solid rgba(234,179,8,0.2)' };
      case 'blue-path':
        return { ...base, background: 'rgba(59,130,246,0.25)', border: '1px solid rgba(59,130,246,0.2)' };
      case 'center-star':
        return { ...base, background: 'rgba(15,15,30,0.9)', border: '1px solid rgba(255,255,255,0.05)' };
      default:
        return { ...base, background: 'rgba(15,15,30,0.5)', border: '1px solid rgba(255,255,255,0.04)' };
    }
  };

  const isSafeTrackCell = (row: number, col: number): boolean => {
    const idx = TRACK.findIndex(([r, c]) => r === row && c === col);
    return idx !== -1 && SAFE_CELLS.has(idx);
  };

  const cells = useMemo(() => {
    const result = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const key = `${row}-${col}`;
        const tokensHere = cellTokens.get(key) || [];
        const isSafe = isSafeTrackCell(row, col);
        const type = getCellType(row, col);
        result.push({ row, col, key, tokensHere, isSafe, type });
      }
    }
    return result;
  }, [cellTokens]);

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        width: totalSize,
        height: totalSize,
        background: 'linear-gradient(135deg, #0f0f1e 0%, #0a0a18 100%)',
        boxShadow: `
          0 0 0 2px rgba(255,255,255,0.06),
          0 0 40px rgba(0,0,0,0.6),
          inset 0 0 80px rgba(0,0,0,0.3)
        `,
      }}
    >
      {/* Grid cells */}
      {cells.map(({ row, col, key, tokensHere, isSafe, type }) => (
        <div key={key} style={getCellStyle(row, col)}>
          {/* Safe star marker */}
          {isSafe && tokensHere.length === 0 && (
            <span className="text-amber-400/50 text-xs select-none">★</span>
          )}

          {/* Center star design */}
          {type === 'center-star' && row === 7 && col === 7 && (
            <div className="relative w-full h-full flex items-center justify-center">
              <svg width={CELL_SIZE * 3} height={CELL_SIZE * 3} viewBox="0 0 120 120"
                   style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 10 }}>
                <polygon
                  points="60,5 72,40 108,40 80,62 90,97 60,76 30,97 40,62 12,40 48,40"
                  fill="none"
                  stroke="rgba(251,191,36,0.3)"
                  strokeWidth="1.5"
                />
                <polygon
                  points="60,15 68,38 93,38 73,52 81,76 60,62 39,76 47,52 27,38 52,38"
                  fill="rgba(251,191,36,0.12)"
                  stroke="rgba(251,191,36,0.2)"
                  strokeWidth="1"
                />
              </svg>
            </div>
          )}

          {/* Base circles in home zones */}
          {(type === 'red-home' || type === 'green-home') && (() => {
            const homeColor = type === 'red-home' ? 'red' : 'green';
            const basePosArr = BASE_POSITIONS[homeColor];
            const matchIdx = basePosArr.findIndex(([r, c]) => r === row && c === col);

            if (matchIdx === -1) return null;

            const player = homeColor === 'red' ? player1 : player2;
            if (!player) return (
              <div
                className="w-7 h-7 rounded-full border-2 opacity-30"
                style={{
                  borderColor: homeColor === 'red' ? '#ef4444' : '#22c55e',
                  background: homeColor === 'red' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                }}
              />
            );

            const baseToken = player.tokens.find((t) => t.position === TOKEN_BASE_POSITION && t.id === matchIdx);
            if (!baseToken) {
              return (
                <div
                  className="w-7 h-7 rounded-full border-2 opacity-20"
                  style={{
                    borderColor: homeColor === 'red' ? '#ef4444' : '#22c55e',
                  }}
                />
              );
            }

            const isMovable = myColor === homeColor && movableTokenIds.includes(baseToken.id);

            return (
              <Token
                color={homeColor}
                isActive={isMovable}
                isMovable={isMovable}
                isHome={false}
                onClick={() => onTokenClick(homeColor, baseToken.id)}
                size={22}
              />
            );
          })()}

          {/* Tokens on track */}
          {tokensHere.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-0.5" style={{ maxWidth: CELL_SIZE - 2 }}>
              {tokensHere.map(({ token, color }) => {
                const isMovable = myColor === color && movableTokenIds.includes(token.id);
                return (
                  <Token
                    key={`${color}-${token.id}`}
                    color={color}
                    isActive={isMovable}
                    isMovable={isMovable}
                    isHome={token.isHome}
                    onClick={() => onTokenClick(color, token.id)}
                    size={tokensHere.length > 1 ? 16 : 20}
                  />
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Home zone inner squares */}
      {/* Red inner home */}
      <div
        style={{
          position: 'absolute',
          left: CELL_SIZE * 0.5,
          top: CELL_SIZE * 0.5,
          width: CELL_SIZE * 4,
          height: CELL_SIZE * 4,
          border: '2px solid rgba(239,68,68,0.4)',
          borderRadius: 8,
          background: 'rgba(239,68,68,0.08)',
          pointerEvents: 'none',
        }}
      />
      {/* Green inner home */}
      <div
        style={{
          position: 'absolute',
          left: CELL_SIZE * 9.5,
          top: CELL_SIZE * 0.5,
          width: CELL_SIZE * 4,
          height: CELL_SIZE * 4,
          border: '2px solid rgba(34,197,94,0.4)',
          borderRadius: 8,
          background: 'rgba(34,197,94,0.08)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

// ─── Winner Screen ────────────────────────────────────────────────────────────

const WinnerScreen: React.FC<{ game: LudoGame; myUid: string; onExit: () => void }> = ({
  game,
  myUid,
  onExit,
}) => {
  const isWinner = game.winnerId === myUid;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
    >
      <motion.div
        initial={{ scale: 0.5, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200 }}
        className="text-center p-8 max-w-sm mx-4"
      >
        {/* Emoji */}
        <motion.div
          animate={{ rotate: [0, 10, -10, 10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-8xl mb-4"
        >
          {isWinner ? '🏆' : '💀'}
        </motion.div>

        <h1
          className="text-4xl font-black mb-2"
          style={{
            color: isWinner ? '#fbbf24' : '#ef4444',
            textShadow: isWinner
              ? '0 0 30px rgba(251,191,36,0.6)'
              : '0 0 30px rgba(239,68,68,0.6)',
          }}
        >
          {isWinner ? 'You Win!' : 'You Lose!'}
        </h1>

        <p className="text-slate-400 text-lg mb-2">
          {isWinner ? '🎉 Congratulations!' : '😔 Better luck next time'}
        </p>

        <p className="text-white font-semibold text-xl mb-1">
          {game.winnerName} wins!
        </p>

        {game.entryFee > 0 && (
          <p className="text-amber-400 font-bold text-lg mb-6">
            {isWinner ? `+₹${Math.floor(game.pot * 0.9)} credited!` : `₹${game.entryFee} deducted`}
          </p>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onExit}
          className="px-8 py-4 rounded-2xl font-bold text-white text-lg"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            boxShadow: '0 8px 24px rgba(124,58,237,0.5)',
          }}
        >
          Back to Lobby
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

// ─── Main Game Component ──────────────────────────────────────────────────────

const RealLudo: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [game, setGame] = useState<LudoGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [movingToken, setMovingToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captureMsg, setCaptureMsg] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ color: string; from: number; to: number } | null>(null);

  // Determine my role
  const mySlot: PlayerSlot | null = useMemo(() => {
    if (!game || !user) return null;
    if (game.player1?.uid === user.uid) return 'player1';
    if (game.player2?.uid === user.uid) return 'player2';
    return null;
  }, [game, user]);

  const myColor: 'red' | 'green' | null = useMemo(() => {
    if (!mySlot || !game) return null;
    return game[mySlot]?.color || null;
  }, [mySlot, game]);

  const isMyTurn = game?.activePlayer === mySlot;
  const myPlayerState = mySlot && game ? game[mySlot] : null;

  // Movable token IDs
  const movableTokenIds: number[] = useMemo(() => {
    if (!isMyTurn || !game?.diceRolled || !game.diceValue || !myPlayerState) return [];
    return getMovableTokens(myPlayerState.tokens, game.diceValue);
  }, [isMyTurn, game?.diceRolled, game?.diceValue, myPlayerState]);

  // Subscribe to game
  useEffect(() => {
    if (!gameId) return;
    const unsub = subscribeLudoGame(gameId, (g) => {
      setGame(g);
      setLoading(false);
    });
    return () => unsub();
  }, [gameId]);

  // Update online status
  useEffect(() => {
    if (!gameId || !mySlot) return;
    updatePlayerOnline(gameId, mySlot, true).catch(() => {});

    const handleVisibility = () => {
      updatePlayerOnline(gameId, mySlot, !document.hidden).catch(() => {});
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      updatePlayerOnline(gameId!, mySlot, false).catch(() => {});
    };
  }, [gameId, mySlot]);

  // Auto-skip if no movable tokens after dice roll
  useEffect(() => {
    if (!game || !gameId || !isMyTurn || !game.diceRolled || movingToken) return;
    if (movableTokenIds.length === 0 && game.diceValue !== null) {
      const timer = setTimeout(() => {
        skipTurn(gameId, game.activePlayer!).catch(() => {});
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [game?.diceRolled, movableTokenIds.length, isMyTurn, gameId, movingToken]);

  const handleRollDice = useCallback(async () => {
    if (!gameId || !mySlot || !user || rolling || !isMyTurn || game?.diceRolled) return;
    setRolling(true);
    setError(null);
    try {
      await rollDice(gameId, mySlot, user.uid);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTimeout(() => setRolling(false), 700);
    }
  }, [gameId, mySlot, user, rolling, isMyTurn, game?.diceRolled]);

  const handleTokenClick = useCallback(
    async (color: 'red' | 'green', tokenId: number) => {
      if (!gameId || !mySlot || !user || !isMyTurn || !game?.diceRolled || movingToken) return;
      if (color !== myColor) return;
      if (!movableTokenIds.includes(tokenId)) return;

      setMovingToken(true);
      setError(null);

      try {
        const { captured, won } = await moveTokenOnBoard(gameId, mySlot, user.uid, tokenId);
        if (captured) {
          setCaptureMsg('💥 Token captured!');
          setTimeout(() => setCaptureMsg(null), 2000);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setMovingToken(false);
      }
    },
    [gameId, mySlot, user, isMyTurn, game?.diceRolled, movingToken, myColor, movableTokenIds]
  );

  // Loading
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0a0a1a, #0f172a)' }}
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="text-5xl mb-4"
          >
            🎲
          </motion.div>
          <p className="text-slate-400 text-sm">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0a0a1a, #0f172a)' }}
      >
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <p className="text-white font-semibold">Game not found</p>
          <button onClick={() => navigate('/ludo')} className="mt-4 text-indigo-400 underline">
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  const opponentSlot: PlayerSlot = mySlot === 'player1' ? 'player2' : 'player1';
  const opponent = mySlot ? game[opponentSlot] : null;
  const activePlayerState = game.activePlayer ? game[game.activePlayer] : null;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(135deg, #07071a 0%, #0a0a22 50%, #07101e 100%)',
      }}
    >
      {/* Ambient glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-80 h-80 rounded-full opacity-8 blur-3xl"
          style={{ background: 'radial-gradient(circle, #ef444430, transparent)' }} />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-8 blur-3xl"
          style={{ background: 'radial-gradient(circle, #22c55e30, transparent)' }} />
      </div>

      <div className="relative flex flex-col min-h-screen max-w-2xl mx-auto w-full px-3 py-3">
        {/* Top: Players */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <PlayerCard
            player={myPlayerState as LudoPlayerState | null}
            isActive={isMyTurn}
            label={myColor === 'red' ? '🔴 Red' : '🟢 Green'}
            diceValue={isMyTurn ? game.diceValue : null}
            diceRolled={game.diceRolled}
          />
          <PlayerCard
            player={opponent as LudoPlayerState | null}
            isActive={!isMyTurn && game.activePlayer !== null}
            label={myColor === 'red' ? '🟢 Green' : '🔴 Red'}
            diceValue={!isMyTurn ? game.diceValue : null}
            diceRolled={game.diceRolled}
          />
        </div>

        {/* Turn indicator */}
        <AnimatePresence mode="wait">
          <motion.div
            key={game.activePlayer || 'waiting'}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="text-center mb-3"
          >
            {game.status === 'waiting' ? (
              <div className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-amber-400 text-sm font-medium">
                  Waiting for opponent...
                </span>
                <span className="text-slate-500 text-xs font-mono">#{gameId}</span>
              </div>
            ) : isMyTurn ? (
              <div className="flex items-center justify-center gap-2">
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  🎯
                </motion.span>
                <span className="text-white font-bold text-sm">
                  {game.diceRolled
                    ? movableTokenIds.length > 0
                      ? 'Choose a token to move'
                      : 'No valid moves — skipping...'
                    : 'Your turn — roll the dice!'}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
                <span className="text-slate-400 text-sm">
                  {activePlayerState?.name}'s turn...
                </span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Capture message */}
        <AnimatePresence>
          {captureMsg && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-center mb-2 text-amber-400 font-bold text-sm"
            >
              {captureMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 text-center text-red-400 text-xs"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Board area */}
        <div className="flex-1 flex items-center justify-center py-2">
          <div
            className="overflow-auto rounded-2xl"
            style={{ maxWidth: '100%', maxHeight: '55vh' }}
          >
            <div style={{ transform: 'scale(0.72)', transformOrigin: 'top left' }}>
              <LudoBoard
                game={game}
                mySlot={mySlot}
                myColor={myColor}
                movableTokenIds={movableTokenIds}
                onTokenClick={handleTokenClick}
              />
            </div>
          </div>
        </div>

        {/* Bottom: Dice area */}
        <div
          className="mt-3 p-4 rounded-2xl border border-white/8 flex items-center justify-between"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          {/* Game info */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-slate-500 text-xs">Prize Pool</span>
              <span className="text-amber-400 font-bold text-sm">
                ₹{Math.floor(game.pot * 0.9)}
              </span>
            </div>
            {game.consecutiveSixes > 0 && (
              <div className="text-xs text-orange-400 font-medium">
                🔥 {game.consecutiveSixes} six{game.consecutiveSixes > 1 ? 'es' : ''} in a row!
              </div>
            )}
            {game.diceValue && (
              <div className="text-slate-400 text-xs mt-0.5">
                Rolled: <span className="text-white font-bold">{game.diceValue}</span>
                {game.diceValue === 6 && ' 🎉 Extra turn!'}
              </div>
            )}
          </div>

          {/* Dice */}
          <Dice
            value={game.diceValue}
            rolling={rolling}
            canRoll={isMyTurn && !game.diceRolled && game.status === 'playing'}
            onRoll={handleRollDice}
            disabled={rolling || movingToken || !isMyTurn || game.status !== 'playing'}
          />
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate('/ludo')}
          className="mt-3 text-slate-600 text-xs text-center hover:text-slate-400 transition-colors"
        >
          ← Leave Game
        </button>
      </div>

      {/* Winner overlay */}
      <AnimatePresence>
        {game.status === 'finished' && game.winnerId && (
          <WinnerScreen
            game={game}
            myUid={user?.uid || ''}
            onExit={() => navigate('/ludo')}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default RealLudo;
