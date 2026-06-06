// components/LudoBoardSVG.tsx - CLEAN 2-PLAYER BOARD
// FIXED: Red yard = bottom-left, Green yard = top-right

import React, { memo } from 'react';
import { GRID, CELL, TRACK, HOME_PATH, YARD_SLOTS, SAFE_CELLS } from '../constants/BoardLayout';

const C = CELL; // 6.6667

const p = (v: number) => `${v}%`;

// Color config
const CLR = {
  red: {
    bg:    '#b91c1c',
    mid:   '#ef4444',
    light: '#fca5a5',
    pale:  '#fee2e2',
    dark:  '#7f1d1d',
    path:  '#fecaca',
  },
  green: {
    bg:    '#15803d',
    mid:   '#22c55e',
    light: '#86efac',
    pale:  '#dcfce7',
    dark:  '#14532d',
    path:  '#bbf7d0',
  },
};

const LudoBoardSVG: React.FC = memo(() => {
  const getTrackIdx = (r: number, c: number) =>
    TRACK.findIndex(([tr, tc]) => tr === r && tc === c);

  const cells: JSX.Element[] = [];

  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const x = c * C;
      const y = r * C;

      // ── Skip yard zones ──
      // Green yard: top-right (rows 0-5, cols 9-14)
      const isGreenYard = r >= 0 && r <= 5 && c >= 9 && c <= 14;
      // Red yard: bottom-left (rows 9-14, cols 0-5)  ← FIXED
      const isRedYard   = r >= 9 && r <= 14 && c >= 0 && c <= 5;
      // Dark unused zones
      const isTLZone    = r >= 0 && r <= 5 && c >= 0 && c <= 5;   // top-left dark
      const isBRZone    = r >= 9 && r <= 14 && c >= 9 && c <= 14; // bottom-right dark
      const isCenter    = r >= 6 && r <= 8 && c >= 6 && c <= 8;

      if (isRedYard || isGreenYard || isTLZone || isBRZone || isCenter) continue;

      // ── Red home path ──
      const isRedPath = HOME_PATH.red.some(([hr, hc]) => hr === r && hc === c);
      // ── Green home path ──
      const isGreenPath = HOME_PATH.green.some(([hr, hc]) => hr === r && hc === c);

      const tIdx   = getTrackIdx(r, c);
      const isSafe = tIdx !== -1 && SAFE_CELLS.has(tIdx);

      let fill = '#f0ebe0';
      if (isRedPath)   fill = CLR.red.path;
      if (isGreenPath) fill = CLR.green.path;
      if (isSafe)      fill = '#fef08a';

      cells.push(
        <g key={`cell-${r}-${c}`}>
          <rect
            x={p(x)} y={p(y)}
            width={p(C)} height={p(C)}
            fill={fill}
            stroke="rgba(0,0,0,0.12)"
            strokeWidth="0.08"
          />
          <rect x={p(x + 0.06)} y={p(y + 0.06)} width={p(C - 0.12)} height={p(0.45)}
            fill="rgba(255,255,255,0.45)" />
          <rect x={p(x + 0.06)} y={p(y + 0.06)} width={p(0.45)} height={p(C - 0.12)}
            fill="rgba(255,255,255,0.2)" />
          <rect x={p(x + 0.06)} y={p(y + C - 0.5)} width={p(C - 0.12)} height={p(0.45)}
            fill="rgba(0,0,0,0.1)" />

          {isSafe && (
            <text
              x={p(x + C / 2)} y={p(y + C / 2 + 1.0)}
              textAnchor="middle"
              fontSize={p(C * 0.52)}
              fill={isRedPath ? CLR.red.dark : isGreenPath ? CLR.green.dark : '#854d0e'}
              opacity="0.7"
            >★</text>
          )}

          {isRedPath && !isSafe && (
            <text
              x={p(x + C / 2)} y={p(y + C / 2 + 0.9)}
              textAnchor="middle"
              fontSize={p(C * 0.45)}
              fill={CLR.red.dark}
              opacity="0.4"
            >›</text>
          )}
          {isGreenPath && !isSafe && (
            <text
              x={p(x + C / 2)} y={p(y + C / 2 + 0.9)}
              textAnchor="middle"
              fontSize={p(C * 0.45)}
              fill={CLR.green.dark}
              opacity="0.4"
              transform={`rotate(180, ${x + C / 2}, ${y + C / 2})`}
            >›</text>
          )}
        </g>
      );
    }
  }

  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}
      shapeRendering="geometricPrecision"
    >
      <defs>
        {/* Red yard gradient - bottom-left */}
        <radialGradient id="redYard" cx="35%" cy="75%" r="75%">
          <stop offset="0%"   stopColor={CLR.red.light} />
          <stop offset="45%"  stopColor={CLR.red.mid} />
          <stop offset="100%" stopColor={CLR.red.dark} />
        </radialGradient>
        {/* Green yard gradient - top-right */}
        <radialGradient id="greenYard" cx="65%" cy="25%" r="75%">
          <stop offset="0%"   stopColor={CLR.green.light} />
          <stop offset="45%"  stopColor={CLR.green.mid} />
          <stop offset="100%" stopColor={CLR.green.dark} />
        </radialGradient>
        <radialGradient id="innerBox" cx="35%" cy="28%" r="70%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.3)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
        </radialGradient>
        <radialGradient id="centerBg" cx="50%" cy="40%" r="70%">
          <stop offset="0%"   stopColor="#1e1e3a" />
          <stop offset="100%" stopColor="#0a0a1a" />
        </radialGradient>
        <radialGradient id="yardSlotRed" cx="35%" cy="30%" r="65%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.35)" />
          <stop offset="55%"  stopColor="rgba(255,255,255,0.05)" />
          <stop offset="100%" stopColor="rgba(127,29,29,0.2)" />
        </radialGradient>
        <radialGradient id="yardSlotGreen" cx="35%" cy="30%" r="65%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.35)" />
          <stop offset="55%"  stopColor="rgba(255,255,255,0.05)" />
          <stop offset="100%" stopColor="rgba(20,83,45,0.2)" />
        </radialGradient>
        <linearGradient id="woodBorder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#92600a" />
          <stop offset="35%"  stopColor="#c9922a" />
          <stop offset="65%"  stopColor="#a0711a" />
          <stop offset="100%" stopColor="#6b4f0f" />
        </linearGradient>
        <linearGradient id="boardSurface" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#1c1c1c" />
          <stop offset="100%" stopColor="#111111" />
        </linearGradient>
        <filter id="yardGlow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="rgba(0,0,0,0.5)" />
        </filter>
        <filter id="slotInset" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="rgba(0,0,0,0.4)" />
        </filter>
      </defs>

      {/* WOOD BORDER */}
      <rect x="0" y="0" width="100" height="100" rx="2.5" fill="url(#woodBorder)" />
      <rect x="0.4" y="0.4" width="99.2" height="1.2" fill="rgba(255,255,255,0.22)" rx="0.6" />
      <rect x="0.4" y="0.4" width="1.2" height="99.2" fill="rgba(255,255,255,0.12)" rx="0.6" />
      <rect x="0.4" y="98.4" width="99.2" height="1.2" fill="rgba(0,0,0,0.3)" rx="0.6" />

      {/* BOARD SURFACE */}
      <rect x="1.5" y="1.5" width="97" height="97" rx="1.5" fill="url(#boardSurface)" />

      {/* TRACK CELLS */}
      {cells}

      {/* ══════════════════════════════════════
          TOP-LEFT DARK ZONE (unused corner)
      ══════════════════════════════════════ */}
      <rect x={p(0)} y={p(0)} width={p(C * 6)} height={p(C * 6)} fill="#0d0d0d" />
      <rect x={p(0.2)} y={p(0.2)} width={p(C * 6 - 0.4)} height={p(C * 6 - 0.4)}
        fill="rgba(255,255,255,0.02)"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="0.12"
      />

      {/* ══════════════════════════════════════
          GREEN YARD (top-right, rows 0-5, cols 9-14)
      ══════════════════════════════════════ */}
      <rect x={p(C * 9)} y={p(0)} width={p(C * 6)} height={p(C * 6)}
        fill="url(#greenYard)" filter="url(#yardGlow)" />
      <rect x={p(C * 9 + 0.2)} y={p(0.2)} width={p(C * 6 - 0.4)} height={p(1.4)}
        fill="rgba(255,255,255,0.16)" rx="0.5" />
      <rect
        x={p(C * 9.5)} y={p(C * 0.5)}
        width={p(C * 5)} height={p(C * 5)}
        rx="2%" fill="url(#innerBox)"
        stroke="rgba(255,255,255,0.5)" strokeWidth="0.2"
      />
      <rect
        x={p(C * 9.65)} y={p(C * 0.65)}
        width={p(C * 4.7)} height={p(0.9)}
        fill="rgba(255,255,255,0.26)" rx="0.5%"
      />

      {/* Green Yard Token Slots */}
      {YARD_SLOTS.green.map(([sr, sc], i) => {
        const sx = sc * C + C / 2;
        const sy = sr * C + C / 2;
        return (
          <g key={`gs-${i}`}>
            <circle cx={p(sx)} cy={p(sy + 0.4)} r={p(C * 0.38)}
              fill="rgba(0,0,0,0.35)" filter="url(#slotInset)" />
            <circle cx={p(sx)} cy={p(sy)} r={p(C * 0.38)}
              fill="rgba(0,0,0,0.25)"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="0.15"
            />
            <circle cx={p(sx)} cy={p(sy)} r={p(C * 0.3)}
              fill="url(#yardSlotGreen)" />
            <path
              d={`M ${sx - C * 0.22},${sy - C * 0.16} A ${C * 0.3},${C * 0.3} 0 0,1 ${sx + C * 0.22},${sy - C * 0.16}`}
              fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.18"
            />
          </g>
        );
      })}

      {/* ══════════════════════════════════════
          RED YARD (bottom-left, rows 9-14, cols 0-5)  ← FIXED
      ══════════════════════════════════════ */}
      <rect x={p(0)} y={p(C * 9)} width={p(C * 6)} height={p(C * 6)}
        fill="url(#redYard)" filter="url(#yardGlow)" />
      <rect x={p(0.2)} y={p(C * 9 + 0.2)} width={p(C * 6 - 0.4)} height={p(1.4)}
        fill="rgba(255,255,255,0.18)" rx="0.5" />
      <rect
        x={p(C * 0.5)} y={p(C * 9.5)}
        width={p(C * 5)} height={p(C * 5)}
        rx="2%" fill="url(#innerBox)"
        stroke="rgba(255,255,255,0.5)" strokeWidth="0.2"
      />
      <rect
        x={p(C * 0.65)} y={p(C * 9.65)}
        width={p(C * 4.7)} height={p(0.9)}
        fill="rgba(255,255,255,0.28)" rx="0.5%"
      />

      {/* Red Yard Token Slots */}
      {YARD_SLOTS.red.map(([sr, sc], i) => {
        const sx = sc * C + C / 2;
        const sy = sr * C + C / 2;
        return (
          <g key={`rs-${i}`}>
            <circle cx={p(sx)} cy={p(sy + 0.4)} r={p(C * 0.38)}
              fill="rgba(0,0,0,0.35)" filter="url(#slotInset)" />
            <circle cx={p(sx)} cy={p(sy)} r={p(C * 0.38)}
              fill="rgba(0,0,0,0.25)"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="0.15"
            />
            <circle cx={p(sx)} cy={p(sy)} r={p(C * 0.3)}
              fill="url(#yardSlotRed)" />
            <path
              d={`M ${sx - C * 0.22},${sy - C * 0.16} A ${C * 0.3},${C * 0.3} 0 0,1 ${sx + C * 0.22},${sy - C * 0.16}`}
              fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.18"
            />
          </g>
        );
      })}

      {/* ══════════════════════════════════════
          BOTTOM-RIGHT DARK ZONE (unused corner)
      ══════════════════════════════════════ */}
      <rect x={p(C * 9)} y={p(C * 9)} width={p(C * 6)} height={p(C * 6)} fill="#0d0d0d" />
      <rect x={p(C * 9 + 0.2)} y={p(C * 9 + 0.2)}
        width={p(C * 6 - 0.4)} height={p(C * 6 - 0.4)}
        fill="rgba(255,255,255,0.02)"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="0.12"
      />

      {/* ══════════════════════════════════════
          CENTER AREA (3×3)
      ══════════════════════════════════════ */}
      <rect x={p(C * 6)} y={p(C * 6)} width={p(C * 3)} height={p(C * 3)}
        fill="url(#centerBg)" />

      {/* Red triangle — points toward bottom-left (red yard) */}
      <polygon
        points={`
          ${p(C * 6)},${p(C * 9)}
          ${p(C * 7.5)},${p(C * 7.5)}
          ${p(C * 6)},${p(C * 6)}
        `}
        fill={CLR.red.mid}
        opacity="0.88"
      />
      {/* Green triangle — points toward top-right (green yard) */}
      <polygon
        points={`
          ${p(C * 9)},${p(C * 6)}
          ${p(C * 7.5)},${p(C * 7.5)}
          ${p(C * 9)},${p(C * 9)}
        `}
        fill={CLR.green.mid}
        opacity="0.88"
      />

      {/* Center dividers */}
      <line
        x1={p(C * 6)} y1={p(C * 7.5)} x2={p(C * 9)} y2={p(C * 7.5)}
        stroke="rgba(255,255,255,0.1)" strokeWidth="0.1"
      />
      <line
        x1={p(C * 7.5)} y1={p(C * 6)} x2={p(C * 7.5)} y2={p(C * 9)}
        stroke="rgba(255,255,255,0.1)" strokeWidth="0.1"
      />

      {/* Center star */}
      <circle cx={p(C * 7.5)} cy={p(C * 7.5)} r={p(C * 0.7)} fill="rgba(0,0,0,0.45)" />
      <circle cx={p(C * 7.5)} cy={p(C * 7.5)} r={p(C * 0.65)}
        fill="none" stroke="rgba(255,215,0,0.4)" strokeWidth="0.18" />
      <text
        x={p(C * 7.5)} y={p(C * 7.5 + 1.3)}
        textAnchor="middle"
        fontSize={p(C * 1.05)}
        fill="rgba(255,215,0,0.95)"
      >★</text>

      {/* SUBTLE GRID LINES */}
      {Array.from({ length: GRID + 1 }, (_, i) => (
        <g key={`gl-${i}`}>
          <line x1={p(i * C)} y1="0%" x2={p(i * C)} y2="100%"
            stroke="rgba(0,0,0,0.18)" strokeWidth="0.06" />
          <line x1="0%" y1={p(i * C)} x2="100%" y2={p(i * C)}
            stroke="rgba(0,0,0,0.18)" strokeWidth="0.06" />
        </g>
      ))}

      {/* INNER BOARD BORDER */}
      <rect x="1.5%" y="1.5%" width="97%" height="97%"
        rx="1.5%" fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="0.2"
      />

      {/* Corner accent dots */}
      {[[2,2],[98,2],[2,98],[98,98]].map(([x,y],i) => (
        <circle key={`cd-${i}`} cx={p(x)} cy={p(y)} r={p(0.5)} fill="rgba(255,255,255,0.2)" />
      ))}
    </svg>
  );
});

LudoBoardSVG.displayName = 'LudoBoardSVG';
export default LudoBoardSVG;
