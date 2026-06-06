// ─── RealLudo.tsx — Premium Mobile-First 2-Player Ludo Game ──────────────────
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  LudoGame, LudoToken, LudoPlayerState, PlayerSlot,
  subscribeLudoGame, rollDice, moveTokenOnBoard, skipTurn,
  updatePlayerOnline, getMovableTokens, getAbsolutePosition,
  TOKEN_BASE_POSITION, TOKEN_HOME_POSITION, SAFE_POSITIONS,
} from '../../firebase/RealLudo';

// ─── Board Layout Constants ───────────────────────────────────────────────────
// Standard 15x15 Ludo board track (52 cells, clockwise from Red start)
const TRACK_CELLS: [number, number][] = [
  // Row 6, cols 0→5 (Red's starting row, going right)
  [6,0],[6,1],[6,2],[6,3],[6,4],
  // Col 5, rows 5→0 (going up)
  [5,5],[4,5],[3,5],[2,5],[1,5],[0,5],
  // Row 0, col 6 (top-middle left)
  [0,6],
  // Col 8, rows 0→5 (Green start, going down)
  [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],
  // Row 5, col 9
  [5,9],
  // Row 6, cols 9→14 (going right)
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  // (index 24 = right edge)
  // Col 14 rows not needed — track wraps via index 0 offset
  // Continuing clockwise — Row 8, cols 14→9 (going left on bottom-right)
  [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],
  // Row 9, col 9
  [9,9],
  // Col 8, rows 9→14 (going down)
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  // Row 14, col 6
  [14,6],
  // Col 6, rows 13→9 (going up)
  [13,6],[12,6],[11,6],[10,6],[9,6],
  // Row 9, cols 5→0 (going left)
  [9,5],[9,4],[9,3],[9,2],[9,1],[9,0],
  // Col 0 / Row 8 — left edge
  [8,0],
  // Row 8, cols 1→5 (going right)
  [8,1],[8,2],[8,3],[8,4],[8,5],
  // Col 6, row 8 (into center approach)
  [8,6],
];
// TRACK_CELLS[0] = Red start, TRACK_CELLS[26] = Green start

// Home columns (5 cells each, going toward center)
const RED_HOME_PATH: [number, number][] = [
  [7,1],[7,2],[7,3],[7,4],[7,5],[7,6],
];
const GREEN_HOME_PATH: [number, number][] = [
  [7,13],[7,12],[7,11],[7,10],[7,9],[7,8],
];

// Base token slot positions inside home zones
const BASE_SLOTS: Record<string, [number, number][]> = {
  red: [[1,1],[1,3],[3,1],[3,3]],
  green: [[1,11],[1,13],[3,11],[3,13]],
};

// Cell size in pixels
const CS = 36; // per cell
const BOARD_PX = CS * 15;

// ─── Board Cell Type ──────────────────────────────────────────────────────────
type CellRole =
  | 'red-zone' | 'green-zone' | 'yellow-zone' | 'blue-zone'
  | 'red-path' | 'green-path' | 'yellow-path' | 'blue-path'
  | 'center' | 'track' | 'safe-track';

const cellRole = (r: number, c: number): CellRole => {
  if (r <= 5 && c <= 5) return 'red-zone';
  if (r <= 5 && c >= 9) return 'green-zone';
  if (r >= 9 && c >= 9) return 'yellow-zone';
  if (r >= 9 && c <= 5) return 'blue-zone';
  if (r >= 6 && r <= 8 && c >= 6 && c <= 8) return 'center';
  if (r === 7 && c >= 1 && c <= 5) return 'red-path';
  if (r === 7 && c >= 9 && c <= 13) return 'green-path';
  if (c === 7 && r >= 1 && r <= 5) return 'green-path';   // vertical green
  if (c === 7 && r >= 9 && r <= 13) return 'yellow-path'; // vertical yellow
  // Check if safe
  const tIdx = TRACK_CELLS.findIndex(([tr, tc]) => tr === r && tc === c);
  if (tIdx !== -1 && SAFE_POSITIONS.has(tIdx)) return 'safe-track';
  return 'track';
};

const ZONE_COLORS: Record<CellRole, { bg: string; border: string }> = {
  'red-zone':    { bg: 'rgba(239,68,68,0.18)',   border: 'rgba(239,68,68,0.12)' },
  'green-zone':  { bg: 'rgba(34,197,94,0.18)',   border: 'rgba(34,197,94,0.12)' },
  'yellow-zone': { bg: 'rgba(234,179,8,0.18)',   border: 'rgba(234,179,8,0.12)' },
  'blue-zone':   { bg: 'rgba(59,130,246,0.18)',  border: 'rgba(59,130,246,0.12)' },
  'red-path':    { bg: 'rgba(239,68,68,0.28)',   border: 'rgba(239,68,68,0.15)' },
  'green-path':  { bg: 'rgba(34,197,94,0.28)',   border: 'rgba(34,197,94,0.15)' },
  'yellow-path': { bg: 'rgba(234,179,8,0.28)',   border: 'rgba(234,179,8,0.15)' },
  'blue-path':   { bg: 'rgba(59,130,246,0.28)',  border: 'rgba(59,130,246,0.15)' },
  'center':      { bg: 'rgba(15,15,30,0.95)',    border: 'rgba(255,255,255,0.04)' },
  'track':       { bg: 'rgba(12,12,26,0.7)',     border: 'rgba(255,255,255,0.04)' },
  'safe-track':  { bg: 'rgba(250,204,21,0.1)',   border: 'rgba(250,204,21,0.12)' },
};

// ─── Token Component ──────────────────────────────────────────────────────────
const TOKEN_C = {
  red: { a: '#ef4444', b: '#fca5a5', c: '#7f1d1d', glow: 'rgba(239,68,68,0.7)' },
  green: { a: '#22c55e', b: '#86efac', c: '#14532d', glow: 'rgba(34,197,94,0.7)' },
};

interface TokenProps {
  color: 'red' | 'green';
  isMovable: boolean;
  isHome: boolean;
  onClick: () => void;
  size?: number;
  count?: number; // stacked
}

const TokenPiece: React.FC<TokenProps> = ({ color, isMovable, isHome, onClick, size = 26, count = 1 }) => {
  const c = TOKEN_C[color];
  return (
    <motion.button
      onClick={isMovable ? onClick : undefined}
      animate={isMovable
        ? { scale: [1, 1.1, 1], filter: [`drop-shadow(0 0 3px ${c.glow})`, `drop-shadow(0 0 8px ${c.glow})`, `drop-shadow(0 0 3px ${c.glow})`] }
        : {}}
      transition={isMovable ? { duration: 1, repeat: Infinity, ease: 'easeInOut' } : {}}
      whileTap={isMovable ? { scale: 0.85 } : {}}
      className="relative inline-flex items-center justify-center"
      style={{
        width: size, height: size,
        cursor: isMovable ? 'pointer' : 'default',
        background: 'none', border: 'none', padding: 0,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 30 30">
        <defs>
          <radialGradient id={`rg-${color}`} cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor={c.b} />
            <stop offset="55%" stopColor={c.a} />
            <stop offset="100%" stopColor={c.c} />
          </radialGradient>
          <filter id={`rs-${color}`}>
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor={c.c} floodOpacity="0.7" />
          </filter>
        </defs>
        {/* Outer ring */}
        {isMovable && <circle cx="15" cy="15" r="14" fill="none" stroke={c.a} strokeWidth="1" strokeDasharray="3 2" opacity="0.7" />}
        {/* Token body */}
        <circle cx="15" cy="15" r="11" fill={`url(#rg-${color})`} filter={`url(#rs-${color})`} />
        {/* Shine */}
        <ellipse cx="11" cy="10" rx="4" ry="3" fill="rgba(255,255,255,0.35)" />
        {/* Inner dot */}
        <circle cx="15" cy="15" r="3.5" fill={c.c} opacity="0.4" />
        {/* Count badge */}
        {count > 1 && (
          <>
            <circle cx="23" cy="7" r="6" fill="#1e293b" stroke={c.a} strokeWidth="1" />
            <text x="23" y="11" textAnchor="middle" fontSize="7" fontWeight="bold" fill={c.b}>{count}</text>
          </>
        )}
      </svg>
    </motion.button>
  );
};

// ─── Base Slot (empty/occupied) ───────────────────────────────────────────────
const BaseSlot: React.FC<{
  color: 'red' | 'green';
  token: LudoToken | null;
  isMovable: boolean;
  onClick: () => void;
}> = ({ color, token, isMovable, onClick }) => {
  const c = TOKEN_C[color];
  if (!token) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-5 h-5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.05)', border: `1.5px solid ${c.a}22` }} />
      </div>
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center">
      <TokenPiece color={color} isMovable={isMovable} isHome={false} onClick={onClick} size={24} />
    </div>
  );
};

// ─── Dice Component ───────────────────────────────────────────────────────────
const DICE_DOTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[27, 27], [73, 73]],
  3: [[27, 27], [50, 50], [73, 73]],
  4: [[27, 27], [73, 27], [27, 73], [73, 73]],
  5: [[27, 27], [73, 27], [50, 50], [27, 73], [73, 73]],
  6: [[27, 23], [73, 23], [27, 50], [73, 50], [27, 77], [73, 77]],
};

const DiceDisplay: React.FC<{ value: number; size?: number; golden?: boolean }> = ({
  value, size = 48, golden = false,
}) => {
  const dots = DICE_DOTS[value] || DICE_DOTS[1];
  const id = `d${golden ? 'g' : 'w'}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${id}bg`} x1="0%" y1="0%" x2="100%" y2="100%">
          {golden
            ? <><stop offset="0%" stopColor="#fef3c7" /><stop offset="100%" stopColor="#d97706" /></>
            : <><stop offset="0%" stopColor="#f1f5f9" /><stop offset="100%" stopColor="#cbd5e1" /></>}
        </linearGradient>
        <filter id={`${id}sh`}>
          <feDropShadow dx="0" dy="3" stdDeviation="4"
            floodColor={golden ? '#78350f' : '#0f172a'} floodOpacity="0.5" />
        </filter>
      </defs>
      <rect x="4" y="4" width="92" height="92" rx="18"
        fill={`url(#${id}bg)`} filter={`url(#${id}sh)`} />
      <rect x="6" y="6" width="88" height="44" rx="14"
        fill="rgba(255,255,255,0.5)" />
      <rect x="4" y="4" width="92" height="92" rx="18"
        fill="none" stroke={golden ? 'rgba(180,83,9,0.4)' : 'rgba(148,163,184,0.4)'} strokeWidth="1.5" />
      {dots.map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="7.5" fill={golden ? '#7c2d12' : '#1e293b'} />
          <circle cx={cx - 2} cy={cy - 2} r="2.5" fill="rgba(255,255,255,0.35)" />
        </g>
      ))}
    </svg>
  );
};

// ─── Player HUD ───────────────────────────────────────────────────────────────
const PlayerHUD: React.FC<{
  player: LudoPlayerState | null;
  isActive: boolean;
  isMe: boolean;
  diceValue: number | null;
  label: string;
}> = ({ player, isActive, isMe, diceValue, label }) => {
  const colorCfg = {
    red: { glow: 'rgba(239,68,68,0.3)', text: '#f87171', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
    green: { glow: 'rgba(34,197,94,0.3)', text: '#4ade80', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' },
  };
  const cc = player ? colorCfg[player.color] : colorCfg.red;

  return (
    <motion.div
      animate={isActive
        ? { boxShadow: [`0 0 0 1px ${cc.border}`, `0 0 16px ${cc.glow}, 0 0 0 1px ${cc.border}`, `0 0 0 1px ${cc.border}`] }
        : { boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}
      transition={{ duration: 1.4, repeat: isActive ? Infinity : 0 }}
      className="relative flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-2xl overflow-hidden"
      style={{
        background: isActive ? cc.bg : 'rgba(255,255,255,0.03)',
        minWidth: 0,
      }}
    >
      {/* Active shimmer */}
      {isActive && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, ${cc.glow}, transparent)`, animation: 'slideIn 2s infinite', opacity: 0.3 }} />
      )}

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-black"
          style={{
            background: player ? cc.bg : 'rgba(255,255,255,0.05)',
            border: `2px solid ${player ? cc.text : 'rgba(255,255,255,0.1)'}`,
            color: player ? cc.text : 'rgba(255,255,255,0.3)',
          }}>
          {player ? player.name[0]?.toUpperCase() : '?'}
        </div>
        {player && (
          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${player.isOnline ? 'bg-emerald-400' : 'bg-slate-600'}`}
            style={{ borderColor: '#070714' }} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {isActive && (
            <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.7, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cc.text }} />
          )}
          <span className="text-white font-bold text-xs truncate leading-tight">
            {player ? (isMe ? 'You' : player.name) : 'Waiting...'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-bold" style={{ color: cc.text }}>{label}</span>
          {player && (
            <div className="flex gap-0.5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full"
                  style={{ background: i < player.tokensHome ? cc.text : 'rgba(255,255,255,0.1)' }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dice peek */}
      {isActive && diceValue && (
        <div className="flex-shrink-0 opacity-80">
          <DiceDisplay value={diceValue} size={28} golden={diceValue === 6} />
        </div>
      )}
    </motion.div>
  );
};

// ─── Full Board Component ─────────────────────────────────────────────────────
interface BoardProps {
  game: LudoGame;
  myColor: 'red' | 'green' | null;
  movableTokenIds: number[];
  onTokenClick: (color: 'red' | 'green', tokenId: number) => void;
}

const LudoBoard: React.FC<BoardProps> = ({ game, myColor, movableTokenIds, onTokenClick }) => {
  const p1 = game.player1;
  const p2 = game.player2;

  // Build a position map: "row-col" → list of tokens
  const posMap = useMemo(() => {
    const map = new Map<string, { token: LudoToken; color: 'red' | 'green' }[]>();

    const placeToken = (token: LudoToken, color: 'red' | 'green') => {
      if (token.position === TOKEN_BASE_POSITION || token.isHome) return;

      let grid: [number, number] | null = null;

      if (token.position >= 52) {
        // Home column
        const homeIdx = token.position - 52;
        const path = color === 'red' ? RED_HOME_PATH : GREEN_HOME_PATH;
        grid = path[homeIdx] || null;
      } else {
        // Main track — get absolute position then find grid
        const absIdx = (
          color === 'red' ? token.position : (token.position + 26) % 52
        );
        grid = TRACK_CELLS[absIdx] || null;
      }

      if (!grid) return;
      const key = `${grid[0]}-${grid[1]}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ token, color });
    };

    p1?.tokens.forEach((t) => placeToken(t, 'red'));
    p2?.tokens.forEach((t) => placeToken(t, 'green'));
    return map;
  }, [p1, p2]);

  // Render all 15×15 cells
  const cells = useMemo(() => {
    const result = [];
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        result.push({ r, c, key: `${r}-${c}` });
      }
    }
    return result;
  }, []);

  return (
    <div
      className="relative"
      style={{
        width: BOARD_PX,
        height: BOARD_PX,
        borderRadius: 16,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0a0a18 0%, #070710 100%)',
        boxShadow: `
          0 0 0 1.5px rgba(255,255,255,0.07),
          0 8px 40px rgba(0,0,0,0.7),
          0 0 80px rgba(124,58,237,0.06) inset
        `,
      }}
    >
      {/* Cells */}
      {cells.map(({ r, c, key }) => {
        const role = cellRole(r, c);
        const cc = ZONE_COLORS[role];
        const tokensHere = posMap.get(key) || [];
        const isSafe = role === 'safe-track';

        return (
          <div
            key={key}
            style={{
              position: 'absolute',
              left: c * CS, top: r * CS,
              width: CS, height: CS,
              background: cc.bg,
              borderRight: `0.5px solid ${cc.border}`,
              borderBottom: `0.5px solid ${cc.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxSizing: 'border-box',
              overflow: 'visible',
            }}
          >
            {/* Safe star */}
            {isSafe && tokensHere.length === 0 && (
              <span style={{ fontSize: CS * 0.4, color: 'rgba(250,204,21,0.5)', userSelect: 'none', lineHeight: 1 }}>★</span>
            )}

            {/* Center star (at 7,7) */}
            {role === 'center' && r === 7 && c === 7 && (
              <div style={{ position: 'absolute', left: 0, top: 0, width: CS * 3, height: CS * 3,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5, pointerEvents: 'none' }}>
                <svg width={CS * 3} height={CS * 3} viewBox="0 0 108 108">
                  {/* Star triangles */}
                  <polygon points="54,6 62,40 96,40 70,60 80,94 54,74 28,94 38,60 12,40 46,40"
                    fill="rgba(251,191,36,0.15)" stroke="rgba(251,191,36,0.25)" strokeWidth="1" />
                  <polygon points="54,18 59,36 78,36 64,47 69,65 54,54 39,65 44,47 30,36 49,36"
                    fill="rgba(251,191,36,0.22)" stroke="rgba(251,191,36,0.35)" strokeWidth="0.5" />
                  {/* Center glow */}
                  <circle cx="54" cy="54" r="10" fill="rgba(251,191,36,0.12)" />
                </svg>
              </div>
            )}

            {/* Base slots inside home zones */}
            {(role === 'red-zone' || role === 'green-zone') && (() => {
              const zColor: 'red' | 'green' = role === 'red-zone' ? 'red' : 'green';
              const slotArr = BASE_SLOTS[zColor];
              const sIdx = slotArr.findIndex(([sr, sc]) => sr === r && sc === c);
              if (sIdx === -1) return null;
              const player = zColor === 'red' ? p1 : p2;
              const baseToken = player?.tokens.find(
                (t) => t.position === TOKEN_BASE_POSITION && t.id === sIdx
              ) || null;
              const isMovable = myColor === zColor && !!baseToken && movableTokenIds.includes(sIdx);
              return (
                <div style={{ width: CS - 4, height: CS - 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BaseSlot
                    color={zColor}
                    token={baseToken}
                    isMovable={isMovable}
                    onClick={() => isMovable && onTokenClick(zColor, sIdx)}
                  />
                </div>
              );
            })()}

            {/* Track tokens */}
            {tokensHere.length > 0 && role !== 'red-zone' && role !== 'green-zone' && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexWrap: 'wrap',
                alignItems: 'center', justifyContent: 'center',
                gap: 1, padding: 1,
                zIndex: 10,
              }}>
                {tokensHere.length <= 2 ? (
                  tokensHere.map(({ token, color }) => {
                    const isMovable = myColor === color && movableTokenIds.includes(token.id);
                    return (
                      <TokenPiece key={`${color}-${token.id}`}
                        color={color} isMovable={isMovable} isHome={token.isHome}
                        onClick={() => isMovable && onTokenClick(color, token.id)}
                        size={tokensHere.length === 1 ? Math.min(CS - 4, 28) : Math.min(CS / 2 - 1, 16)}
                      />
                    );
                  })
                ) : (
                  // Stacked — show dominant color with count badge
                  (() => {
                    const byColor: Record<string, { token: LudoToken; color: 'red' | 'green' }[]> = {};
                    tokensHere.forEach((t) => {
                      if (!byColor[t.color]) byColor[t.color] = [];
                      byColor[t.color].push(t);
                    });
                    return Object.entries(byColor).map(([col, arr]) => {
                      const isMovable = myColor === col && arr.some((a) => movableTokenIds.includes(a.token.id));
                      const movableOne = arr.find((a) => movableTokenIds.includes(a.token.id));
                      return (
                        <TokenPiece key={col}
                          color={col as 'red' | 'green'}
                          isMovable={isMovable} isHome={false}
                          onClick={() => isMovable && movableOne && onTokenClick(col as 'red' | 'green', movableOne.token.id)}
                          size={Math.min(CS - 6, 22)}
                          count={arr.length}
                        />
                      );
                    });
                  })()
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Home zone inner box — Red */}
      <div style={{
        position: 'absolute', left: CS * 0.5, top: CS * 0.5,
        width: CS * 4, height: CS * 4,
        border: '2px solid rgba(239,68,68,0.35)', borderRadius: 10,
        background: 'rgba(239,68,68,0.06)', pointerEvents: 'none', zIndex: 2,
      }} />
      {/* Green */}
      <div style={{
        position: 'absolute', left: CS * 9.5, top: CS * 0.5,
        width: CS * 4, height: CS * 4,
        border: '2px solid rgba(34,197,94,0.35)', borderRadius: 10,
        background: 'rgba(34,197,94,0.06)', pointerEvents: 'none', zIndex: 2,
      }} />
      {/* Yellow */}
      <div style={{
        position: 'absolute', left: CS * 9.5, top: CS * 9.5,
        width: CS * 4, height: CS * 4,
        border: '2px solid rgba(234,179,8,0.35)', borderRadius: 10,
        background: 'rgba(234,179,8,0.06)', pointerEvents: 'none', zIndex: 2,
      }} />
      {/* Blue */}
      <div style={{
        position: 'absolute', left: CS * 0.5, top: CS * 9.5,
        width: CS * 4, height: CS * 4,
        border: '2px solid rgba(59,130,246,0.35)', borderRadius: 10,
        background: 'rgba(59,130,246,0.06)', pointerEvents: 'none', zIndex: 2,
      }} />
    </div>
  );
};

// ─── Winner Overlay ───────────────────────────────────────────────────────────
const WinnerOverlay: React.FC<{
  game: LudoGame; myUid: string; onExit: () => void;
}> = ({ game, myUid, onExit }) => {
  const won = game.winnerId === myUid;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(14px)' }}>
      <motion.div initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 14, stiffness: 180 }}
        className="text-center px-8 py-10 max-w-xs mx-auto">
        <motion.div animate={{ rotate: [0, 8, -8, 8, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-7xl mb-4">{won ? '🏆' : '💀'}</motion.div>
        <h1 className="text-4xl font-black mb-2"
          style={{ color: won ? '#fbbf24' : '#ef4444', textShadow: `0 0 30px ${won ? 'rgba(251,191,36,0.5)' : 'rgba(239,68,68,0.5)'}` }}>
          {won ? 'You Win!' : 'You Lose!'}
        </h1>
        <p className="text-slate-400 text-base mb-2">{won ? '🎉 Amazing play!' : '😔 Better luck next time'}</p>
        <p className="text-white font-bold text-lg mb-1">{game.winnerName} wins!</p>
        {game.entryFee > 0 && (
          <p className="font-black text-lg mb-6" style={{ color: won ? '#4ade80' : '#f87171' }}>
            {won ? `+₹${Math.floor(game.pot * 0.9)} credited` : `₹${game.entryFee} deducted`}
          </p>
        )}
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={onExit}
          className="px-8 py-3.5 rounded-2xl font-black text-white text-base"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 8px 24px rgba(124,58,237,0.5)' }}>
          Back to Lobby
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

// ─── Main Game Screen ─────────────────────────────────────────────────────────
const RealLudo: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [game, setGame] = useState<LudoGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [movingToken, setMovingToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const mySlot: PlayerSlot | null = useMemo(() => {
    if (!game || !user) return null;
    if (game.player1?.uid === user.uid) return 'player1';
    if (game.player2?.uid === user.uid) return 'player2';
    return null;
  }, [game, user]);

  const myColor: 'red' | 'green' | null = useMemo(() =>
    mySlot ? game?.[mySlot]?.color || null : null, [mySlot, game]);

  const isMyTurn = game?.activePlayer === mySlot;
  const myPlayerState = mySlot && game ? game[mySlot] : null;

  const movableTokenIds: number[] = useMemo(() => {
    if (!isMyTurn || !game?.diceRolled || !game.diceValue || !myPlayerState) return [];
    return getMovableTokens(myPlayerState.tokens, game.diceValue);
  }, [isMyTurn, game?.diceRolled, game?.diceValue, myPlayerState]);

  // Subscribe
  useEffect(() => {
    if (!gameId) return;
    return subscribeLudoGame(gameId, (g) => {
      setGame(g);
      setLoading(false);
    });
  }, [gameId]);

  // Online status
  useEffect(() => {
    if (!gameId || !mySlot) return;
    updatePlayerOnline(gameId, mySlot, true).catch(() => {});
    const onVis = () => updatePlayerOnline(gameId, mySlot, !document.hidden).catch(() => {});
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      updatePlayerOnline(gameId!, mySlot, false).catch(() => {});
    };
  }, [gameId, mySlot]);

  // Auto skip
  useEffect(() => {
    if (!game || !gameId || !isMyTurn || !game.diceRolled || movingToken) return;
    if (movableTokenIds.length === 0 && game.diceValue !== null) {
      const t = setTimeout(() => skipTurn(gameId, game.activePlayer!).catch(() => {}), 1800);
      return () => clearTimeout(t);
    }
  }, [game?.diceRolled, movableTokenIds.length, isMyTurn, gameId, movingToken]);

  const handleRoll = useCallback(async () => {
    if (!gameId || !mySlot || !user || rolling || !isMyTurn || game?.diceRolled) return;
    setRolling(true);
    setError(null);
    try {
      await rollDice(gameId, mySlot, user.uid);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTimeout(() => setRolling(false), 650);
    }
  }, [gameId, mySlot, user, rolling, isMyTurn, game?.diceRolled]);

  const handleTokenClick = useCallback(async (color: 'red' | 'green', tokenId: number) => {
    if (!gameId || !mySlot || !user || !isMyTurn || !game?.diceRolled || movingToken) return;
    if (color !== myColor || !movableTokenIds.includes(tokenId)) return;
    setMovingToken(true);
    setError(null);
    try {
      const { captured, won } = await moveTokenOnBoard(gameId, mySlot, user.uid, tokenId);
      if (captured) showToast('💥 Enemy token captured!');
      if (won) showToast('🏆 You won!');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMovingToken(false);
    }
  }, [gameId, mySlot, user, isMyTurn, game?.diceRolled, movingToken, myColor, movableTokenIds]);

  // ── Loading ──
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #070714, #0f172a)' }}>
      <div className="text-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className="text-5xl mb-3">🎲</motion.div>
        <p className="text-slate-500 text-sm">Loading game...</p>
      </div>
    </div>
  );

  if (!game) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #070714, #0f172a)' }}>
      <div className="text-center">
        <div className="text-5xl mb-3">❌</div>
        <p className="text-white font-bold mb-3">Game not found</p>
        <button onClick={() => navigate('/games/RealLudoLobby')}
          className="text-indigo-400 text-sm underline">Back to Lobby</button>
      </div>
    </div>
  );

  const opponentSlot: PlayerSlot = mySlot === 'player1' ? 'player2' : 'player1';
  const opponent = game[opponentSlot];
  const activePS = game.activePlayer ? game[game.activePlayer] : null;
  const prize = Math.floor(game.pot * 0.9);
  const canRoll = isMyTurn && !game.diceRolled && game.status === 'playing';

  return (
    <div className="min-h-screen flex flex-col select-none"
      style={{ background: 'linear-gradient(160deg, #070714 0%, #0a0a1e 50%, #060d18 100%)' }}>

      {/* Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-[0.06] blur-3xl"
          style={{ background: 'radial-gradient(#ef4444, transparent)' }} />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-[0.06] blur-3xl"
          style={{ background: 'radial-gradient(#22c55e, transparent)' }} />
      </div>

      <div className="relative flex flex-col max-w-lg mx-auto w-full min-h-screen px-3 pt-3 pb-4"
        style={{ gap: 10 }}>

        {/* ── Top Bar ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/games/RealLudoLobby')}
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="flex-1 flex items-center justify-center gap-2">
            <span className="text-slate-600 text-[10px] font-mono">#{gameId?.slice(0, 6)}</span>
            {game.entryFee > 0 && (
              <span className="text-amber-400 text-xs font-bold flex items-center gap-1">
                🏆 ₹{prize}
              </span>
            )}
          </div>
          <div className="w-8 h-8" /> {/* spacer */}
        </div>

        {/* ── Player HUDs ──────────────────────────────────────────── */}
        <div className="flex gap-2">
          <PlayerHUD
            player={myPlayerState as LudoPlayerState | null}
            isActive={isMyTurn}
            isMe={true}
            diceValue={isMyTurn ? game.diceValue : null}
            label={myColor === 'red' ? '🔴 Red' : '🟢 Green'}
          />
          <PlayerHUD
            player={opponent as LudoPlayerState | null}
            isActive={!isMyTurn && game.status === 'playing'}
            isMe={false}
            diceValue={!isMyTurn ? game.diceValue : null}
            label={myColor === 'red' ? '🟢 Green' : '🔴 Red'}
          />
        </div>

        {/* ── Status Message ────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div key={`${game.activePlayer}-${game.diceRolled}`}
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.2 }}
            className="text-center py-1">
            {game.status === 'waiting' ? (
              <span className="text-amber-400 text-xs font-medium flex items-center justify-center gap-1.5">
                <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                Waiting for opponent to join...
              </span>
            ) : isMyTurn ? (
              <span className="text-white text-xs font-bold">
                {game.diceRolled
                  ? movableTokenIds.length > 0
                    ? '👆 Tap a glowing token to move'
                    : '⏳ No moves available — skipping...'
                  : '🎲 Tap the dice to roll!'}
                {game.diceValue === 6 && game.diceRolled && ' 🎉 Roll again!'}
              </span>
            ) : (
              <span className="text-slate-500 text-xs">
                ⏳ {activePS?.name}'s turn...
              </span>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Toast ────────────────────────────────────────────────── */}
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, scale: 0.85, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="text-center text-sm font-bold text-amber-400">
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Error ────────────────────────────────────────────────── */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center text-red-400 text-xs">{error}</motion.div>
          )}
        </AnimatePresence>

        {/* ── Board ────────────────────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <div style={{ width: '100%', maxWidth: 400 }}>
            {/* Responsive scale wrapper */}
            <div className="w-full" style={{ aspectRatio: '1 / 1', position: 'relative' }}>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {/* Scale board to fit container */}
                <div style={{
                  transform: `scale(${1})`,
                  transformOrigin: 'center center',
                }}>
                  <style>{`
                    @media (max-width: 420px) {
                      .ludo-board-wrap { transform: scale(0.73) !important; }
                    }
                    @media (max-width: 380px) {
                      .ludo-board-wrap { transform: scale(0.66) !important; }
                    }
                    @media (max-width: 340px) {
                      .ludo-board-wrap { transform: scale(0.59) !important; }
                    }
                  `}</style>
                  <div className="ludo-board-wrap" style={{ transformOrigin: 'top left' }}>
                    <LudoBoard
                      game={game}
                      myColor={myColor}
                      movableTokenIds={movableTokenIds}
                      onTokenClick={handleTokenClick}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Controls ───────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-1">
          {/* Game info */}
          <div className="flex-1">
            {game.consecutiveSixes > 0 && (
              <p className="text-orange-400 text-xs font-bold mb-1">
                🔥 {game.consecutiveSixes} six{game.consecutiveSixes > 1 ? 'es' : ''}!
              </p>
            )}
            {game.diceValue && !rolling && (
              <p className="text-slate-400 text-xs">
                Rolled: <span className="text-white font-bold">{game.diceValue}</span>
                {game.diceValue === 6 ? ' 🎉' : ''}
              </p>
            )}
            {game.entryFee > 0 && (
              <p className="text-amber-400/60 text-[10px] mt-0.5">Prize: ₹{prize}</p>
            )}
          </div>

          {/* Dice */}
          <div className="flex flex-col items-center gap-2">
            <motion.div
              animate={rolling
                ? { rotate: [0, 20, -20, 15, -15, 8, 0], scale: [1, 1.15, 0.95, 1.05, 1], y: [0, -10, 4, -4, 0] }
                : canRoll ? { scale: [1, 1.03, 1] } : {}}
              transition={rolling
                ? { duration: 0.6 }
                : canRoll ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : {}}
              onClick={canRoll && !rolling ? handleRoll : undefined}
              style={{
                cursor: canRoll ? 'pointer' : 'default',
                filter: canRoll
                  ? `drop-shadow(0 0 10px ${rolling ? 'rgba(250,204,21,0.7)' : 'rgba(250,204,21,0.4)'})`
                  : 'none',
              }}
            >
              {rolling ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.1, repeat: 6, ease: 'linear' }}>
                  <DiceDisplay value={Math.ceil(Math.random() * 6)} size={52}
                    golden={true} />
                </motion.div>
              ) : (
                <DiceDisplay value={game.diceValue || 1} size={52}
                  golden={game.diceValue === 6} />
              )}
            </motion.div>

            {canRoll && (
              <motion.button
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.93 }}
                onClick={handleRoll}
                disabled={rolling}
                className="px-5 py-2 rounded-xl font-bold text-white text-xs"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  boxShadow: '0 4px 14px rgba(245,158,11,0.4)',
                }}>
                🎲 Roll
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Winner */}
      <AnimatePresence>
        {game.status === 'finished' && game.winnerId && (
          <WinnerOverlay game={game} myUid={user?.uid || ''}
            onExit={() => navigate('/games/RealLudoLobby')} />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
        @keyframes slideIn { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
      `}</style>
    </div>
  );
};

export default RealLudo;
