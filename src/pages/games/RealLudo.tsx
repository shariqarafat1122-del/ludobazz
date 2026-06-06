import React, {
  useEffect, useState, useCallback, useMemo, useRef,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  LudoGame, LudoToken, LudoPlayerState, PlayerSlot,
  subscribeLudoGame, rollDice, moveTokenOnBoard,
  skipTurn, updatePlayerOnline, forfeitGame,
  getMovableTokens, getAbsolutePosition,
  TOKEN_BASE_POSITION, TOKEN_HOME_POSITION, SAFE_POSITIONS,
} from '../../firebase/RealLudo';

// ─── Board Layout ─────────────────────────────────────────────────────────────
// Standard 15×15 Ludo track (52 cells clockwise, Red starts at index 0)
const TRACK_CELLS: [number, number][] = [
  [6,0],[6,1],[6,2],[6,3],[6,4],
  [5,5],[4,5],[3,5],[2,5],[1,5],[0,5],
  [0,6],
  [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],
  [5,9],
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],
  [9,9],
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  [14,6],
  [13,6],[12,6],[11,6],[10,6],[9,6],
  [9,5],[9,4],[9,3],[9,2],[9,1],[9,0],
  [8,0],
  [8,1],[8,2],[8,3],[8,4],[8,5],
  [8,6],
];

// Home column paths (toward center)
const RED_HOME_PATH: [number, number][] = [
  [7,1],[7,2],[7,3],[7,4],[7,5],[7,6],
];
const GREEN_HOME_PATH: [number, number][] = [
  [7,13],[7,12],[7,11],[7,10],[7,9],[7,8],
];

// Base yard slots (row,col) for each color's 4 tokens
const BASE_SLOTS: Record<LudoColor, [number, number][]> = {
  red:   [[1,1],[1,3],[3,1],[3,3]],
  green: [[1,11],[1,13],[3,11],[3,13]],
};

type LudoColor = 'red' | 'green';

// ─── Responsive Cell Size ─────────────────────────────────────────────────────
function useCellSize() {
  const [cs, setCs] = useState(30);
  useEffect(() => {
    function calc() {
      const vw = Math.min(window.innerWidth, 500);
      const available = vw - 24; // 12px padding each side
      setCs(Math.floor(available / 15));
    }
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);
  return cs;
}

// ─── Token SVG ───────────────────────────────────────────────────────────────
const TOKEN_THEME = {
  red: {
    grad1: '#fca5a5', grad2: '#ef4444', grad3: '#7f1d1d',
    glow: 'rgba(239,68,68,0.8)', ring: '#ef4444',
  },
  green: {
    grad1: '#86efac', grad2: '#22c55e', grad3: '#14532d',
    glow: 'rgba(34,197,94,0.8)', ring: '#22c55e',
  },
};

interface TokenSVGProps {
  color: LudoColor;
  size: number;
  isMovable: boolean;
  count?: number;
  onClick?: () => void;
}

const TokenSVG: React.FC<TokenSVGProps> = ({
  color, size, isMovable, count = 1, onClick,
}) => {
  const t = TOKEN_THEME[color];
  const gid = `tg-${color}-${size}`;
  const fid = `tf-${color}-${size}`;

  return (
    <motion.div
      onClick={onClick}
      animate={
        isMovable
          ? {
              scale: [1, 1.18, 1],
              filter: [
                `drop-shadow(0 0 2px ${t.glow})`,
                `drop-shadow(0 0 8px ${t.glow})`,
                `drop-shadow(0 0 2px ${t.glow})`,
              ],
            }
          : {}
      }
      transition={
        isMovable
          ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' }
          : {}
      }
      whileTap={isMovable ? { scale: 0.82 } : {}}
      style={{
        cursor: isMovable ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: size, height: size,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 32 32">
        <defs>
          <radialGradient id={gid} cx="38%" cy="30%" r="70%">
            <stop offset="0%" stopColor={t.grad1} />
            <stop offset="50%" stopColor={t.grad2} />
            <stop offset="100%" stopColor={t.grad3} />
          </radialGradient>
          <filter id={fid}>
            <feDropShadow
              dx="0" dy="2" stdDeviation="2"
              floodColor={t.grad3} floodOpacity="0.6"
            />
          </filter>
        </defs>

        {/* Pulsing ring when movable */}
        {isMovable && (
          <circle
            cx="16" cy="16" r="15"
            fill="none"
            stroke={t.ring}
            strokeWidth="1.5"
            strokeDasharray="4 3"
            opacity="0.8"
          />
        )}

        {/* Main body */}
        <circle
          cx="16" cy="16" r="11"
          fill={`url(#${gid})`}
          filter={`url(#${fid})`}
        />

        {/* 3D top highlight */}
        <ellipse cx="12" cy="11" rx="4.5" ry="3.5"
          fill="rgba(255,255,255,0.4)" />

        {/* Center indent */}
        <circle cx="16" cy="16" r="4"
          fill={t.grad3} opacity="0.35" />

        {/* Inner shine dot */}
        <circle cx="13" cy="12" r="2"
          fill="rgba(255,255,255,0.25)" />

        {/* Stack count badge */}
        {count > 1 && (
          <>
            <circle cx="24" cy="8" r="6.5"
              fill="#0f172a"
              stroke={t.ring}
              strokeWidth="1.2"
            />
            <text
              x="24" y="12"
              textAnchor="middle"
              fontSize="7"
              fontWeight="bold"
              fill={t.grad1}
            >
              {count}
            </text>
          </>
        )}
      </svg>
    </motion.div>
  );
};

// ─── Dice SVG ─────────────────────────────────────────────────────────────────
const DICE_DOTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
};

const DiceSVG: React.FC<{
  value: number; size?: number; golden?: boolean; disabled?: boolean;
}> = ({ value, size = 56, golden = false, disabled = false }) => {
  const dots = DICE_DOTS[value] || DICE_DOTS[1];
  const bg1 = disabled ? '#1e293b' : golden ? '#fef3c7' : '#f1f5f9';
  const bg2 = disabled ? '#0f172a' : golden ? '#d97706' : '#cbd5e1';
  const dotColor = disabled ? '#334155' : golden ? '#7c2d12' : '#1e293b';

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id="dbg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={bg1} />
          <stop offset="100%" stopColor={bg2} />
        </linearGradient>
        <filter id="dsh">
          <feDropShadow
            dx="0" dy="3" stdDeviation="4"
            floodColor="#000" floodOpacity="0.5"
          />
        </filter>
      </defs>
      {/* Body */}
      <rect
        x="4" y="4" width="92" height="92" rx="18"
        fill="url(#dbg)" filter="url(#dsh)"
      />
      {/* Top shine */}
      <rect
        x="8" y="8" width="84" height="38" rx="12"
        fill="rgba(255,255,255,0.45)"
      />
      {/* Border */}
      <rect
        x="4" y="4" width="92" height="92" rx="18"
        fill="none"
        stroke={golden ? 'rgba(180,83,9,0.4)' : 'rgba(148,163,184,0.3)'}
        strokeWidth="1.5"
      />
      {/* Bottom shadow */}
      <rect
        x="4" y="70" width="92" height="26" rx="18"
        fill="rgba(0,0,0,0.08)"
      />
      {/* Dots */}
      {dots.map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="8" fill={dotColor} />
          <circle
            cx={cx - 2.5} cy={cy - 2.5} r="3"
            fill="rgba(255,255,255,0.3)"
          />
        </g>
      ))}
    </svg>
  );
};

// ─── Board Cell Styling ───────────────────────────────────────────────────────
type CellRole =
  | 'red-zone' | 'green-zone' | 'yellow-zone' | 'blue-zone'
  | 'red-home' | 'green-home'
  | 'center' | 'safe' | 'track';

function getCellRole(r: number, c: number): CellRole {
  if (r <= 5 && c <= 5) return 'red-zone';
  if (r <= 5 && c >= 9) return 'green-zone';
  if (r >= 9 && c >= 9) return 'yellow-zone';
  if (r >= 9 && c <= 5) return 'blue-zone';
  if (r >= 6 && r <= 8 && c >= 6 && c <= 8) return 'center';
  if (r === 7 && c >= 1 && c <= 5) return 'red-home';
  if (r === 7 && c >= 9 && c <= 13) return 'green-home';

  const tIdx = TRACK_CELLS.findIndex(([tr, tc]) => tr === r && tc === c);
  if (tIdx !== -1 && SAFE_POSITIONS.has(tIdx)) return 'safe';

  return 'track';
}

const CELL_BG: Record<CellRole, string> = {
  'red-zone':    '#ef444422',
  'green-zone':  '#22c55e22',
  'yellow-zone': '#eab30822',
  'blue-zone':   '#3b82f622',
  'red-home':    '#ef444440',
  'green-home':  '#22c55e40',
  'center':      '#0a0a1e',
  'safe':        '#fbbf2415',
  'track':       '#0d0d20',
};

const CELL_BORDER: Record<CellRole, string> = {
  'red-zone':    '#ef444418',
  'green-zone':  '#22c55e18',
  'yellow-zone': '#eab30818',
  'blue-zone':   '#3b82f618',
  'red-home':    '#ef444435',
  'green-home':  '#22c55e35',
  'center':      '#ffffff08',
  'safe':        '#fbbf2420',
  'track':       '#ffffff08',
};

// ─── Full Board ───────────────────────────────────────────────────────────────
interface BoardProps {
  game: LudoGame;
  myColor: LudoColor | null;
  movableIds: number[];
  cs: number; // cell size in px
  onTokenClick: (color: LudoColor, tokenId: number) => void;
}

const LudoBoard: React.FC<BoardProps> = ({
  game, myColor, movableIds, cs, onTokenClick,
}) => {
  const p1 = game.player1; // red
  const p2 = game.player2; // green
  const boardPx = cs * 15;

  // Build position → tokens map
  const posMap = useMemo(() => {
    const map = new Map<string, { token: LudoToken; color: LudoColor }[]>();

    const place = (token: LudoToken, color: LudoColor) => {
      if (token.position === TOKEN_BASE_POSITION || token.isHome) return;
      let grid: [number, number] | null = null;

      if (token.position >= 52) {
        const idx = token.position - 52;
        const path = color === 'red' ? RED_HOME_PATH : GREEN_HOME_PATH;
        grid = path[Math.min(idx, path.length - 1)] ?? null;
      } else {
        const absIdx =
          color === 'red'
            ? token.position % 52
            : (token.position + 26) % 52;
        grid = TRACK_CELLS[absIdx] ?? null;
      }

      if (!grid) return;
      const key = `${grid[0]}-${grid[1]}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ token, color });
    };

    p1?.tokens.forEach((t) => place(t, 'red'));
    p2?.tokens.forEach((t) => place(t, 'green'));
    return map;
  }, [p1, p2]);

  return (
    <div
      style={{
        width: boardPx,
        height: boardPx,
        position: 'relative',
        borderRadius: 14,
        overflow: 'hidden',
        background: '#080816',
        boxShadow: `
          0 0 0 2px rgba(255,255,255,0.07),
          0 12px 48px rgba(0,0,0,0.8),
          0 0 60px rgba(124,58,237,0.05) inset
        `,
        flexShrink: 0,
      }}
    >
      {/* Render all 225 cells */}
      {Array.from({ length: 15 }, (_, r) =>
        Array.from({ length: 15 }, (_, c) => {
          const role = getCellRole(r, c);
          const key = `${r}-${c}`;
          const tokensHere = posMap.get(key) || [];
          const isZone =
            role === 'red-zone' || role === 'green-zone' ||
            role === 'yellow-zone' || role === 'blue-zone';
          const isBase = isZone
            ? BASE_SLOTS[role === 'red-zone' ? 'red' : 'green']?.some(
                ([sr, sc]) => sr === r && sc === c
              )
            : false;

          return (
            <div
              key={key}
              style={{
                position: 'absolute',
                left: c * cs, top: r * cs,
                width: cs, height: cs,
                background: CELL_BG[role],
                borderRight: `0.5px solid ${CELL_BORDER[role]}`,
                borderBottom: `0.5px solid ${CELL_BORDER[role]}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
                overflow: 'visible',
                zIndex: 1,
              }}
            >
              {/* Safe star */}
              {role === 'safe' && tokensHere.length === 0 && (
                <span
                  style={{
                    fontSize: cs * 0.42,
                    color: 'rgba(251,191,36,0.55)',
                    lineHeight: 1,
                    userSelect: 'none',
                  }}
                >
                  ★
                </span>
              )}

              {/* Center star (anchor at 7,7, spans 3×3) */}
              {role === 'center' && r === 7 && c === 7 && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0, top: 0,
                    width: cs * 3, height: cs * 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    zIndex: 5,
                  }}
                >
                  <svg
                    width={cs * 3}
                    height={cs * 3}
                    viewBox="0 0 108 108"
                  >
                    <polygon
                      points="54,4 62,38 98,38 70,58 82,92 54,72 26,92 38,58 10,38 46,38"
                      fill="rgba(251,191,36,0.12)"
                      stroke="rgba(251,191,36,0.22)"
                      strokeWidth="1"
                    />
                    <circle
                      cx="54" cy="54" r="12"
                      fill="rgba(251,191,36,0.1)"
                    />
                    <text
                      x="54" y="60"
                      textAnchor="middle"
                      fontSize="18"
                      fill="rgba(251,191,36,0.35)"
                    >
                      🏠
                    </text>
                  </svg>
                </div>
              )}

              {/* Base yard tokens */}
              {isBase && (() => {
                const zColor: LudoColor =
                  role === 'red-zone' ? 'red' : 'green';
                const slots = BASE_SLOTS[zColor];
                const sIdx = slots.findIndex(
                  ([sr, sc]) => sr === r && sc === c
                );
                if (sIdx === -1) return null;

                const player = zColor === 'red' ? p1 : p2;
                const baseToken = player?.tokens.find(
                  (t) =>
                    t.position === TOKEN_BASE_POSITION && t.id === sIdx
                );

                if (!baseToken) {
                  // Empty slot
                  return (
                    <div
                      style={{
                        width: cs * 0.55,
                        height: cs * 0.55,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.04)',
                        border: `1.5px solid ${
                          zColor === 'red'
                            ? 'rgba(239,68,68,0.2)'
                            : 'rgba(34,197,94,0.2)'
                        }`,
                      }}
                    />
                  );
                }

                const isM =
                  myColor === zColor &&
                  movableIds.includes(baseToken.id);
                return (
                  <TokenSVG
                    color={zColor}
                    size={Math.min(cs - 4, 28)}
                    isMovable={isM}
                    onClick={
                      isM
                        ? () => onTokenClick(zColor, baseToken.id)
                        : undefined
                    }
                  />
                );
              })()}

              {/* Track tokens */}
              {tokensHere.length > 0 &&
                role !== 'red-zone' &&
                role !== 'green-zone' &&
                role !== 'yellow-zone' &&
                role !== 'blue-zone' && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      padding: 1,
                      zIndex: 10,
                    }}
                  >
                    {tokensHere.length === 1 ? (
                      (() => {
                        const { token, color } = tokensHere[0];
                        const isM =
                          myColor === color &&
                          movableIds.includes(token.id);
                        return (
                          <TokenSVG
                            color={color}
                            size={Math.min(cs - 3, 28)}
                            isMovable={isM}
                            onClick={
                              isM
                                ? () => onTokenClick(color, token.id)
                                : undefined
                            }
                          />
                        );
                      })()
                    ) : tokensHere.length === 2 ? (
                      tokensHere.map(({ token, color }) => {
                        const isM =
                          myColor === color &&
                          movableIds.includes(token.id);
                        return (
                          <TokenSVG
                            key={`${color}-${token.id}`}
                            color={color}
                            size={Math.min(Math.floor(cs / 2) - 1, 15)}
                            isMovable={isM}
                            onClick={
                              isM
                                ? () => onTokenClick(color, token.id)
                                : undefined
                            }
                          />
                        );
                      })
                    ) : (
                      // 3+ tokens stacked — group by color
                      (() => {
                        const grouped: Record<
                          string,
                          { token: LudoToken; color: LudoColor }[]
                        > = {};
                        tokensHere.forEach((t) => {
                          if (!grouped[t.color]) grouped[t.color] = [];
                          grouped[t.color].push(t);
                        });
                        return Object.entries(grouped).map(
                          ([col, arr]) => {
                            const movableOne = arr.find((a) =>
                              movableIds.includes(a.token.id)
                            );
                            const isM =
                              myColor === col && !!movableOne;
                            return (
                              <TokenSVG
                                key={col}
                                color={col as LudoColor}
                                size={Math.min(
                                  Math.floor(cs / 2) - 1,
                                  14
                                )}
                                isMovable={isM}
                                count={arr.length}
                                onClick={
                                  isM && movableOne
                                    ? () =>
                                        onTokenClick(
                                          col as LudoColor,
                                          movableOne.token.id
                                        )
                                    : undefined
                                }
                              />
                            );
                          }
                        );
                      })()
                    )}
                  </div>
                )}
            </div>
          );
        })
      )}

      {/* Yard inner boxes */}
      {/* Red yard */}
      <div
        style={{
          position: 'absolute',
          left: cs * 0.4, top: cs * 0.4,
          width: cs * 4.2, height: cs * 4.2,
          border: '2px solid rgba(239,68,68,0.35)',
          borderRadius: 10,
          background:
            'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))',
          pointerEvents: 'none', zIndex: 2,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '12%',
            borderRadius: 8,
            background: 'rgba(239,68,68,0.08)',
            border: '1.5px solid rgba(239,68,68,0.2)',
          }}
        />
      </div>

      {/* Green yard */}
      <div
        style={{
          position: 'absolute',
          left: cs * 9.4, top: cs * 0.4,
          width: cs * 4.2, height: cs * 4.2,
          border: '2px solid rgba(34,197,94,0.35)',
          borderRadius: 10,
          background:
            'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))',
          pointerEvents: 'none', zIndex: 2,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '12%',
            borderRadius: 8,
            background: 'rgba(34,197,94,0.08)',
            border: '1.5px solid rgba(34,197,94,0.2)',
          }}
        />
      </div>

      {/* Yellow yard (decorative) */}
      <div
        style={{
          position: 'absolute',
          left: cs * 9.4, top: cs * 9.4,
          width: cs * 4.2, height: cs * 4.2,
          border: '2px solid rgba(234,179,8,0.25)',
          borderRadius: 10,
          background: 'rgba(234,179,8,0.05)',
          pointerEvents: 'none', zIndex: 2,
        }}
      />

      {/* Blue yard (decorative) */}
      <div
        style={{
          position: 'absolute',
          left: cs * 0.4, top: cs * 9.4,
          width: cs * 4.2, height: cs * 4.2,
          border: '2px solid rgba(59,130,246,0.25)',
          borderRadius: 10,
          background: 'rgba(59,130,246,0.05)',
          pointerEvents: 'none', zIndex: 2,
        }}
      />

      {/* Arrow indicators on start cells */}
      {/* Red start → right arrow at (6,0) */}
      <div
        style={{
          position: 'absolute',
          left: cs * 0, top: cs * 6,
          width: cs, height: cs,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: cs * 0.5,
          color: 'rgba(239,68,68,0.7)',
          pointerEvents: 'none', zIndex: 3,
        }}
      >
        →
      </div>
      {/* Green start → left arrow at (8,14) */}
      <div
        style={{
          position: 'absolute',
          left: cs * 14, top: cs * 8,
          width: cs, height: cs,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: cs * 0.5,
          color: 'rgba(34,197,94,0.7)',
          pointerEvents: 'none', zIndex: 3,
        }}
      >
        ←
      </div>
    </div>
  );
};

// ─── Player HUD ───────────────────────────────────────────────────────────────
const PlayerHUD: React.FC<{
  player: LudoPlayerState | null;
  isActive: boolean;
  isMe: boolean;
  diceValue: number | null;
}> = ({ player, isActive, isMe, diceValue }) => {
  const isRed = player?.color === 'red';
  const accent = isRed ? '#ef4444' : '#22c55e';
  const accentBg = isRed ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)';
  const accentBorder = isRed
    ? 'rgba(239,68,68,0.25)'
    : 'rgba(34,197,94,0.25)';
  const accentText = isRed ? '#fca5a5' : '#86efac';

  return (
    <motion.div
      animate={
        isActive
          ? {
              boxShadow: [
                `0 0 0 1px ${accentBorder}`,
                `0 0 0 1px ${accentBorder}, 0 0 20px ${accent}44`,
                `0 0 0 1px ${accentBorder}`,
              ],
            }
          : { boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }
      }
      transition={{ duration: 1.6, repeat: isActive ? Infinity : 0 }}
      className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-2xl overflow-hidden"
      style={{
        background: isActive ? accentBg : 'rgba(255,255,255,0.03)',
        minWidth: 0,
      }}
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-base flex-shrink-0"
        style={{
          background: player ? accentBg : 'rgba(255,255,255,0.05)',
          border: `2px solid ${player ? accent : 'rgba(255,255,255,0.08)'}`,
          color: player ? accentText : 'rgba(255,255,255,0.2)',
        }}
      >
        {player ? player.name[0]?.toUpperCase() || '?' : '?'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          {isActive && (
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.7, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: accent }}
            />
          )}
          <span className="text-white font-bold text-xs truncate">
            {player ? (isMe ? 'You' : player.name) : 'Waiting...'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className="text-[10px] font-bold"
            style={{ color: accentText }}
          >
            {player?.color === 'red' ? '🔴 Red' : '🟢 Green'}
          </span>
          {player && (
            <div className="flex gap-0.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background:
                      i < player.tokensHome
                        ? accent
                        : 'rgba(255,255,255,0.1)',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dice preview */}
      {isActive && diceValue && (
        <div className="flex-shrink-0 opacity-80">
          <DiceSVG
            value={diceValue}
            size={28}
            golden={diceValue === 6}
          />
        </div>
      )}
    </motion.div>
  );
};

// ─── Win Modal ────────────────────────────────────────────────────────────────
const WinModal: React.FC<{
  won: boolean;
  winnerName: string;
  prize: number;
  entryFee: number;
  onLobby: () => void;
}> = ({ won, winnerName, prize, entryFee, onLobby }) => {
  // CSS confetti (no package needed)
  useEffect(() => {
    if (!won) return;
    const container = document.createElement('div');
    container.style.cssText = `
      position:fixed;inset:0;pointer-events:none;
      z-index:9999;overflow:hidden;
    `;
    const colors = ['#ef4444','#22c55e','#ffd700','#a855f7','#3b82f6'];
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('div');
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 10 + 5;
      p.style.cssText = `
        position:absolute;top:-20px;
        left:${Math.random() * 100}%;
        width:${size}px;height:${size}px;
        background:${color};
        border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
        animation:cffall ${Math.random() * 2 + 2}s
          ${Math.random() * 2}s linear forwards;
        transform:rotate(${Math.random() * 360}deg);
      `;
      container.appendChild(p);
    }
    const style = document.createElement('style');
    style.textContent = `
      @keyframes cffall {
        0%{transform:translateY(-20px) rotate(0deg);opacity:1}
        100%{transform:translateY(100vh) rotate(720deg);opacity:0}
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(container);
    const t = setTimeout(() => {
      if (document.body.contains(container))
        document.body.removeChild(container);
      if (document.head.contains(style))
        document.head.removeChild(style);
    }, 5000);
    return () => {
      clearTimeout(t);
      if (document.body.contains(container))
        document.body.removeChild(container);
    };
  }, [won]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)' }}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 13, stiffness: 200 }}
        className="w-full max-w-xs rounded-3xl overflow-hidden"
        style={{
          background: won
            ? 'linear-gradient(135deg, #14532d, #166534, #15803d)'
            : 'linear-gradient(135deg, #1e1b4b, #312e81)',
          border: `2px solid ${won ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.3)'}`,
          boxShadow: won
            ? '0 20px 60px rgba(34,197,94,0.3)'
            : '0 20px 60px rgba(239,68,68,0.2)',
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            height: 3,
            background: won
              ? 'linear-gradient(90deg, #22c55e, #86efac, #22c55e)'
              : 'linear-gradient(90deg, #ef4444, #fca5a5, #ef4444)',
          }}
        />

        <div className="p-7 text-center">
          {/* Icon */}
          <motion.div
            animate={
              won
                ? { rotate: [0, 10, -10, 8, 0], scale: [1, 1.1, 1] }
                : { scale: [1, 0.95, 1] }
            }
            transition={{ duration: 2, repeat: Infinity }}
            className="text-6xl mb-4"
          >
            {won ? '🏆' : '😔'}
          </motion.div>

          <h1
            className="text-3xl font-black mb-1"
            style={{
              color: won ? '#86efac' : '#fca5a5',
              textShadow: `0 0 30px ${won ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'}`,
            }}
          >
            {won ? 'YOU WIN!' : 'YOU LOSE'}
          </h1>

          <p className="text-white/60 text-sm mb-5">
            {won ? '🎉 Brilliant game!' : `${winnerName} wins this round`}
          </p>

          {/* Prize / Loss card */}
          <div
            className="rounded-2xl p-4 mb-6"
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: `1px solid ${
                won
                  ? 'rgba(251,191,36,0.3)'
                  : 'rgba(239,68,68,0.2)'
              }`,
            }}
          >
            {won ? (
              <>
                <p className="text-white/50 text-xs mb-1">
                  Prize Credited
                </p>
                <p className="text-3xl font-black text-amber-400">
                  +₹{prize}
                </p>
                <p className="text-green-400 text-xs mt-1">
                  ✓ Added to winning balance
                </p>
              </>
            ) : (
              <>
                <p className="text-white/50 text-xs mb-1">
                  Entry Fee Lost
                </p>
                <p className="text-2xl font-black text-red-400">
                  -₹{entryFee}
                </p>
                <p className="text-white/30 text-xs mt-1">
                  Better luck next time!
                </p>
              </>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onLobby}
              className="w-full py-4 rounded-2xl font-black text-white text-base"
              style={{
                background: won
                  ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                  : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                boxShadow: won
                  ? '0 6px 24px rgba(34,197,94,0.4)'
                  : '0 6px 24px rgba(124,58,237,0.4)',
              }}
            >
              🎲 Play Again
            </motion.button>

            <button
              onClick={onLobby}
              className="w-full py-3 rounded-2xl font-semibold text-white/60 text-sm"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              🏠 Go to Lobby
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Leave Confirm Modal ──────────────────────────────────────────────────────
const LeaveModal: React.FC<{
  pot: number;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ pot, onConfirm, onCancel }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
  >
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="w-full max-w-xs rounded-3xl p-6 text-center"
      style={{
        background: 'linear-gradient(135deg, #1a0a2e, #2d1b4e)',
        border: '1px solid rgba(239,68,68,0.35)',
        boxShadow: '0 20px 60px rgba(239,68,68,0.2)',
      }}
    >
      <div className="text-5xl mb-4">⚠️</div>
      <h2 className="text-xl font-black text-white mb-2">
        Leave Game?
      </h2>
      <p className="text-white/60 text-sm mb-5 leading-relaxed">
        Leaving will forfeit the game. Your opponent will win the prize
        pool.
      </p>

      {pot > 0 && (
        <div
          className="rounded-xl py-3 px-4 mb-5"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}
        >
          <p className="text-red-400 font-bold">
            You forfeit ₹{Math.floor(pot * 0.9)}
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onCancel}
          className="flex-1 py-3 rounded-2xl font-bold text-white/70"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          Stay
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onConfirm}
          className="flex-1 py-3 rounded-2xl font-black text-white"
          style={{
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            boxShadow: '0 4px 16px rgba(239,68,68,0.4)',
          }}
        >
          Leave
        </motion.button>
      </div>
    </motion.div>
  </motion.div>
);

// ─── Main Game Screen ─────────────────────────────────────────────────────────
const RealLudo: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [game, setGame] = useState<LudoGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [movingToken, setMovingToken] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showLeave, setShowLeave] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [winShown, setWinShown] = useState(false);

  const cs = useCellSize(); // responsive cell size

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // ── Derived State ─────────────────────────────────────────────────────────
  const mySlot: PlayerSlot | null = useMemo(() => {
    if (!game || !user) return null;
    if (game.player1?.uid === user.uid) return 'player1';
    if (game.player2?.uid === user.uid) return 'player2';
    return null;
  }, [game, user]);

  const myColor: LudoColor | null = useMemo(
    () => (mySlot ? game?.[mySlot]?.color ?? null : null),
    [mySlot, game]
  );

  const isMyTurn = game?.activePlayer === mySlot;
  const myPlayerState = mySlot && game ? game[mySlot] : null;
  const opponentSlot: PlayerSlot =
    mySlot === 'player1' ? 'player2' : 'player1';
  const opponentState = game ? game[opponentSlot] : null;

  const movableIds: number[] = useMemo(() => {
    if (
      !isMyTurn || !game?.diceRolled ||
      !game.diceValue || !myPlayerState
    )
      return [];
    return getMovableTokens(myPlayerState.tokens, game.diceValue);
  }, [isMyTurn, game?.diceRolled, game?.diceValue, myPlayerState]);

  // ── Subscribe ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameId) return;
    return subscribeLudoGame(gameId, (g) => {
      setGame(g);
      setLoading(false);
    });
  }, [gameId]);

  // ── Show win modal ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (game?.status === 'finished' && !winShown) {
      setWinShown(true);
      setTimeout(() => setShowWin(true), 600);
    }
  }, [game?.status, winShown]);

  // ── Online status ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameId || !mySlot) return;
    updatePlayerOnline(gameId, mySlot, true);
    const handleVis = () =>
      updatePlayerOnline(gameId, mySlot, !document.hidden);
    document.addEventListener('visibilitychange', handleVis);
    return () => {
      document.removeEventListener('visibilitychange', handleVis);
      updatePlayerOnline(gameId!, mySlot, false);
    };
  }, [gameId, mySlot]);

  // ── Auto skip when no moves ────────────────────────────────────────────────
  useEffect(() => {
    if (
      !game || !gameId || !isMyTurn ||
      !game.diceRolled || movingToken ||
      movableIds.length > 0 ||
      game.diceValue === null
    )
      return;
    const t = setTimeout(() => {
      skipTurn(gameId, game.activePlayer!).catch(() => {});
    }, 1800);
    return () => clearTimeout(t);
  }, [
    game?.diceRolled, movableIds.length,
    isMyTurn, gameId, movingToken,
  ]);

  // ── Roll Dice ──────────────────────────────────────────────────────────────
  const handleRoll = useCallback(async () => {
    if (
      !gameId || !mySlot || !user ||
      rolling || !isMyTurn || game?.diceRolled ||
      game?.status !== 'playing'
    )
      return;

    setRolling(true);
    setErrMsg(null);
    try {
      await rollDice(gameId, mySlot, user.uid);
    } catch (e: any) {
      setErrMsg(e.message);
    } finally {
      setTimeout(() => setRolling(false), 600);
    }
  }, [gameId, mySlot, user, rolling, isMyTurn, game?.diceRolled, game?.status]);

  // ── Move Token ─────────────────────────────────────────────────────────────
  const handleTokenClick = useCallback(
    async (color: LudoColor, tokenId: number) => {
      if (
        !gameId || !mySlot || !user ||
        !isMyTurn || !game?.diceRolled ||
        movingToken || color !== myColor ||
        !movableIds.includes(tokenId)
      )
        return;

      setMovingToken(true);
      setErrMsg(null);
      try {
        const { captured, won } = await moveTokenOnBoard(
          gameId, mySlot, user.uid, tokenId
        );
        if (captured) showToast('💥 Token captured! +Extra turn');
        if (won) showToast('🏆 All tokens home!');
      } catch (e: any) {
        setErrMsg(e.message);
      } finally {
        setMovingToken(false);
      }
    },
    [
      gameId, mySlot, user, isMyTurn,
      game?.diceRolled, movingToken, myColor, movableIds,
    ]
  );

  // ── Leave / Forfeit ────────────────────────────────────────────────────────
  const handleLeaveConfirm = useCallback(async () => {
    if (!gameId || !user) return;
    setShowLeave(false);
    await forfeitGame(gameId, user.uid).catch(console.error);
    navigate('/games/RealLudoLobby');
  }, [gameId, user, navigate]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background:
            'linear-gradient(135deg, #070714, #0f172a)',
        }}
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            className="text-5xl mb-3"
          >
            🎲
          </motion.div>
          <p className="text-slate-500 text-sm">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #070714, #0f172a)' }}
      >
        <div className="text-center">
          <div className="text-5xl mb-3">❌</div>
          <p className="text-white font-bold mb-4">Game not found</p>
          <button
            onClick={() => navigate('/games/RealLudoLobby')}
            className="px-6 py-3 rounded-xl bg-violet-600 text-white font-bold"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  const canRoll =
    isMyTurn &&
    !game.diceRolled &&
    game.status === 'playing' &&
    !rolling;

  const prize = Math.floor(game.pot * 0.9);
  const won = game.winnerId === user?.uid;

  return (
    <div
      className="min-h-screen flex flex-col select-none"
      style={{
        background:
          'linear-gradient(160deg, #070714 0%, #0a0a1e 50%, #060d18 100%)',
      }}
    >
      {/* BG glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-[0.06] blur-3xl"
          style={{ background: 'radial-gradient(#ef4444,transparent)' }}
        />
        <div
          className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full opacity-[0.06] blur-3xl"
          style={{ background: 'radial-gradient(#22c55e,transparent)' }}
        />
      </div>

      <div
        className="relative flex flex-col w-full max-w-lg mx-auto min-h-screen"
        style={{ padding: '10px 12px 16px' }}
      >
        {/* ── Top Bar ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setShowLeave(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f87171"
              strokeWidth="2.5"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="flex-1 text-center">
            <p className="text-white font-black text-sm tracking-wider">
              🎲 LUDO
            </p>
            <p className="text-slate-600 text-[10px] font-mono">
              #{gameId?.slice(0, 8)}
            </p>
          </div>

          {/* Prize badge */}
          {game.entryFee > 0 && (
            <div
              className="px-3 py-1.5 rounded-xl"
              style={{
                background: 'rgba(251,191,36,0.1)',
                border: '1px solid rgba(251,191,36,0.2)',
              }}
            >
              <p className="text-[10px] text-slate-500 leading-none mb-0.5">
                Prize
              </p>
              <p className="text-amber-400 font-black text-sm leading-none">
                ₹{prize}
              </p>
            </div>
          )}
        </div>

        {/* ── Player HUDs ──────────────────────────────────────────── */}
        <div className="flex gap-2 mb-2">
          <PlayerHUD
            player={myPlayerState as LudoPlayerState | null}
            isActive={isMyTurn}
            isMe
            diceValue={isMyTurn ? game.diceValue : null}
          />
          <div
            className="flex items-center justify-center px-1"
            style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: 900 }}
          >
            VS
          </div>
          <PlayerHUD
            player={opponentState as LudoPlayerState | null}
            isActive={!isMyTurn && game.status === 'playing'}
            isMe={false}
            diceValue={!isMyTurn ? game.diceValue : null}
          />
        </div>

        {/* ── Status ───────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.p
            key={`${game.activePlayer}-${game.diceRolled}-${game.status}`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="text-center text-xs mb-2"
            style={{ color: 'rgba(255,255,255,0.5)', minHeight: 18 }}
          >
            {game.status === 'waiting'
              ? '⏳ Waiting for opponent...'
              : game.status === 'finished'
              ? `🏆 Game over — ${game.winnerName} wins!`
              : isMyTurn
              ? game.diceRolled
                ? movableIds.length > 0
                  ? '👆 Tap a glowing token'
                  : '⏳ No moves — skipping...'
                : '🎲 Your turn! Tap dice to roll'
              : `⌛ ${opponentState?.name || 'Opponent'}'s turn...`}
          </motion.p>
        </AnimatePresence>

        {/* Toast */}
        <AnimatePresence>
          {toastMsg && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-sm font-bold text-amber-400 mb-2"
            >
              {toastMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {errMsg && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-xs text-red-400 mb-1"
            >
              {errMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Board ────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-center"
          style={{ flex: 1, overflow: 'hidden' }}
        >
          <LudoBoard
            game={game}
            myColor={myColor}
            movableIds={movableIds}
            cs={cs}
            onTokenClick={handleTokenClick}
          />
        </div>

        {/* ── Bottom Controls ───────────────────────────────────────── */}
        <div
          className="flex items-center justify-between mt-3 px-1"
        >
          {/* Left info */}
          <div>
            {game.consecutiveSixes > 0 && (
              <p className="text-orange-400 text-xs font-bold mb-1">
                🔥 {game.consecutiveSixes}× Six!
              </p>
            )}
            <p className="text-slate-500 text-xs">
              {game.status === 'playing'
                ? isMyTurn
                  ? 'Your turn'
                  : "Opponent's turn"
                : 'Game over'}
            </p>
          </div>

          {/* Dice area */}
          <div className="flex flex-col items-center gap-2">
            <motion.div
              animate={
                rolling
                  ? {
                      rotate: [0, 25, -25, 15, -15, 5, 0],
                      scale: [1, 1.2, 0.9, 1.05, 1],
                      y: [0, -12, 4, -4, 0],
                    }
                  : canRoll
                  ? { scale: [1, 1.04, 1] }
                  : {}
              }
              transition={
                rolling
                  ? { duration: 0.55 }
                  : canRoll
                  ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                  : {}
              }
              onClick={canRoll && !rolling ? handleRoll : undefined}
              style={{
                cursor: canRoll ? 'pointer' : 'default',
                filter: canRoll
                  ? `drop-shadow(0 0 12px ${
                      rolling
                        ? 'rgba(251,191,36,0.9)'
                        : 'rgba(251,191,36,0.5)'
                    })`
                  : 'none',
              }}
            >
              <DiceSVG
                value={game.diceValue || 1}
                size={cs >= 32 ? 58 : 48}
                golden={game.diceValue === 6}
                disabled={!canRoll && !game.diceValue}
              />
            </motion.div>

            {canRoll && (
              <motion.button
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.91 }}
                onClick={handleRoll}
                disabled={rolling}
                className="px-5 py-2 rounded-xl font-bold text-white text-xs"
                style={{
                  background:
                    'linear-gradient(135deg, #f59e0b, #d97706)',
                  boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
                }}
              >
                🎲 Roll Dice
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* ── Win Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showWin && game.status === 'finished' && (
          <WinModal
            won={won}
            winnerName={game.winnerName || 'Opponent'}
            prize={prize}
            entryFee={game.entryFee}
            onLobby={() => navigate('/games/RealLudoLobby')}
          />
        )}
      </AnimatePresence>

      {/* ── Leave Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showLeave && (
          <LeaveModal
            pot={game.pot}
            onConfirm={handleLeaveConfirm}
            onCancel={() => setShowLeave(false)}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default RealLudo;
