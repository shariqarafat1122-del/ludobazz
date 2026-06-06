import React, { memo } from 'react';
import { GRID, CELL, TRACK, HOME_PATH, YARD_SLOTS, SAFE_CELLS, COLOR_THEME } from '../constants/boardLayout';

// ─── SVG Board ────────────────────────────────────────────────────────────────
const LudoBoardSVG: React.FC = memo(() => {
  const C = CELL; // percentage per cell

  // Helper: rect in percentage coords
  const pct = (val: number) => `${val}%`;

  // Cell background color
  const getCellFill = (r: number, c: number): string => {
    // Home yards
    if (r <= 5 && c <= 5)   return 'url(#fillRed)';
    if (r <= 5 && c >= 9)   return 'url(#fillGreen)';
    if (r >= 9 && c >= 9)   return 'url(#fillYellow)';
    if (r >= 9 && c <= 5)   return 'url(#fillBlue)';
    // Center
    if (r >= 6 && r <= 8 && c >= 6 && c <= 8) return 'url(#fillCenter)';
    // Home paths
    if (r === 7 && c >= 1 && c <= 5) return 'url(#fillRedPath)';
    if (r === 7 && c >= 9 && c <= 13) return 'url(#fillGreenPath)';
    if (c === 7 && r >= 1 && r <= 5) return 'url(#fillBluePath)';
    if (c === 7 && r >= 9 && r <= 13) return 'url(#fillYellowPath)';
    // Safe cells
    const tIdx = TRACK.findIndex(([tr, tc]) => tr === r && tc === c);
    if (tIdx !== -1 && SAFE_CELLS.has(tIdx)) return 'url(#fillSafe)';
    // Normal track
    return 'url(#fillTrack)';
  };

  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}
      shapeRendering="crispEdges"
    >
      <defs>
        {/* ── Gradients ── */}
        {/* Yard fills */}
        <radialGradient id="fillRed" cx="30%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="100%" stopColor="#dc2626" />
        </radialGradient>
        <radialGradient id="fillGreen" cx="70%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="100%" stopColor="#15803d" />
        </radialGradient>
        <radialGradient id="fillYellow" cx="70%" cy="70%" r="80%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#a16207" />
        </radialGradient>
        <radialGradient id="fillBlue" cx="30%" cy="70%" r="80%">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </radialGradient>

        {/* Home paths */}
        <linearGradient id="fillRedPath" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fecaca" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="fillGreenPath" x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#bbf7d0" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="fillBluePath" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#bfdbfe" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="fillYellowPath" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#eab308" stopOpacity="0.4" />
        </linearGradient>

        {/* Track */}
        <linearGradient id="fillTrack" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>

        {/* Safe */}
        <linearGradient id="fillSafe" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fefce8" />
          <stop offset="100%" stopColor="#fef08a" />
        </linearGradient>

        {/* Center */}
        <radialGradient id="fillCenter" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>

        {/* Yard inner box */}
        <radialGradient id="yardInnerRed" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
        </radialGradient>
        <radialGradient id="yardInnerGreen" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
        </radialGradient>
        <radialGradient id="yardInnerYellow" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
        </radialGradient>
        <radialGradient id="yardInnerBlue" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
        </radialGradient>

        {/* Center star glow */}
        <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(251,191,36,0.5)" />
          <stop offset="100%" stopColor="rgba(251,191,36,0)" />
        </radialGradient>

        {/* Safe star gradient */}
        <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>

        {/* Board outer shadow */}
        <filter id="boardShadow" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="rgba(0,0,0,0.5)" />
        </filter>

        {/* Glow filter */}
        <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Cell inner shadow */}
        <filter id="cellInset">
          <feDropShadow dx="0" dy="1" stdDeviation="0.5"
            floodColor="rgba(0,0,0,0.15)" />
        </filter>
      </defs>

      {/* ── Board outer border ── */}
      <rect
        x="0.3" y="0.3" width="99.4" height="99.4"
        rx="2" ry="2"
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="0.6"
      />

      {/* ── ALL 225 CELLS ── */}
      {Array.from({ length: GRID }, (_, r) =>
        Array.from({ length: GRID }, (_, c) => {
          const x = c * C;
          const y = r * C;
          const fill = getCellFill(r, c);
          const isYardArea =
            (r <= 5 && c <= 5) ||
            (r <= 5 && c >= 9) ||
            (r >= 9 && c >= 9) ||
            (r >= 9 && c <= 5);
          const isCenter =
            r >= 6 && r <= 8 && c >= 6 && c <= 8;

          // Skip individual cells inside yard (drawn as big rects)
          if (isYardArea || isCenter) return null;

          const tIdx = TRACK.findIndex(([tr, tc]) => tr === r && tc === c);
          const isSafe = tIdx !== -1 && SAFE_CELLS.has(tIdx);

          return (
            <g key={`${r}-${c}`}>
              <rect
                x={`${x}%`} y={`${y}%`}
                width={`${C}%`} height={`${C}%`}
                fill={fill}
                stroke="rgba(0,0,0,0.12)"
                strokeWidth="0.15"
              />
              {/* Safe star */}
              {isSafe && (
                <text
                  x={`${x + C / 2}%`}
                  y={`${y + C / 2 + 1.2}%`}
                  textAnchor="middle"
                  fontSize={`${C * 0.55}%`}
                  fill="url(#starGrad)"
                  opacity="0.85"
                >
                  ★
                </text>
              )}
              {/* Home path arrows */}
              {r === 7 && c === 6 && (
                <text
                  x={`${x + C / 2}%`} y={`${y + C / 2 + 1.2}%`}
                  textAnchor="middle" fontSize={`${C * 0.7}%`}
                  fill="#ef4444" opacity="0.8"
                >→</text>
              )}
              {r === 7 && c === 8 && (
                <text
                  x={`${x + C / 2}%`} y={`${y + C / 2 + 1.2}%`}
                  textAnchor="middle" fontSize={`${C * 0.7}%`}
                  fill="#22c55e" opacity="0.8"
                >←</text>
              )}
              {r === 6 && c === 7 && (
                <text
                  x={`${x + C / 2}%`} y={`${y + C / 2 + 1.2}%`}
                  textAnchor="middle" fontSize={`${C * 0.7}%`}
                  fill="#3b82f6" opacity="0.8"
                >↓</text>
              )}
              {r === 8 && c === 7 && (
                <text
                  x={`${x + C / 2}%`} y={`${y + C / 2 + 1.2}%`}
                  textAnchor="middle" fontSize={`${C * 0.7}%`}
                  fill="#eab308" opacity="0.8"
                >↑</text>
              )}
            </g>
          );
        })
      )}

      {/* ── YARD ZONES (big colored rectangles) ── */}
      {/* Red yard (top-left) */}
      <rect x="0%" y="0%" width={`${C*6}%`} height={`${C*6}%`}
        fill="url(#fillRed)" stroke="rgba(0,0,0,0.2)" strokeWidth="0.3" />
      {/* Inner white box */}
      <rect
        x={`${C*0.6}%`} y={`${C*0.6}%`}
        width={`${C*4.8}%`} height={`${C*4.8}%`}
        rx="1.5%" ry="1.5%"
        fill="url(#yardInnerRed)"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="0.25"
      />
      {/* Red label */}
      <text x={`${C*3}%`} y={`${C*3 + 0.8}%`}
        textAnchor="middle" fontSize={`${C*0.55}%`}
        fill="rgba(255,255,255,0.4)" fontWeight="bold">
        RED
      </text>

      {/* Green yard (top-right) */}
      <rect x={`${C*9}%`} y="0%" width={`${C*6}%`} height={`${C*6}%`}
        fill="url(#fillGreen)" stroke="rgba(0,0,0,0.2)" strokeWidth="0.3" />
      <rect
        x={`${C*9.6}%`} y={`${C*0.6}%`}
        width={`${C*4.8}%`} height={`${C*4.8}%`}
        rx="1.5%" ry="1.5%"
        fill="url(#yardInnerGreen)"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="0.25"
      />
      <text x={`${C*12}%`} y={`${C*3 + 0.8}%`}
        textAnchor="middle" fontSize={`${C*0.55}%`}
        fill="rgba(255,255,255,0.4)" fontWeight="bold">
        GREEN
      </text>

      {/* Yellow yard (bottom-right) */}
      <rect x={`${C*9}%`} y={`${C*9}%`} width={`${C*6}%`} height={`${C*6}%`}
        fill="url(#fillYellow)" stroke="rgba(0,0,0,0.2)" strokeWidth="0.3" />
      <rect
        x={`${C*9.6}%`} y={`${C*9.6}%`}
        width={`${C*4.8}%`} height={`${C*4.8}%`}
        rx="1.5%" ry="1.5%"
        fill="url(#yardInnerYellow)"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="0.25"
      />
      <text x={`${C*12}%`} y={`${C*12 + 0.8}%`}
        textAnchor="middle" fontSize={`${C*0.55}%`}
        fill="rgba(255,255,255,0.4)" fontWeight="bold">
        YELLOW
      </text>

      {/* Blue yard (bottom-left) */}
      <rect x="0%" y={`${C*9}%`} width={`${C*6}%`} height={`${C*6}%`}
        fill="url(#fillBlue)" stroke="rgba(0,0,0,0.2)" strokeWidth="0.3" />
      <rect
        x={`${C*0.6}%`} y={`${C*9.6}%`}
        width={`${C*4.8}%`} height={`${C*4.8}%`}
        rx="1.5%" ry="1.5%"
        fill="url(#yardInnerBlue)"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="0.25"
      />
      <text x={`${C*3}%`} y={`${C*12 + 0.8}%`}
        textAnchor="middle" fontSize={`${C*0.55}%`}
        fill="rgba(255,255,255,0.4)" fontWeight="bold">
        BLUE
      </text>

      {/* ── HOME PATHS ── */}
      {/* Red home path cells (row 7, cols 1-5) */}
      {[1,2,3,4,5].map(c => (
        <rect key={`rh${c}`}
          x={`${c*C}%`} y={`${7*C}%`}
          width={`${C}%`} height={`${C}%`}
          fill="url(#fillRedPath)"
          stroke="rgba(239,68,68,0.3)" strokeWidth="0.15"
        />
      ))}
      {/* Green home path cells (row 7, cols 9-13) */}
      {[9,10,11,12,13].map(c => (
        <rect key={`gh${c}`}
          x={`${c*C}%`} y={`${7*C}%`}
          width={`${C}%`} height={`${C}%`}
          fill="url(#fillGreenPath)"
          stroke="rgba(34,197,94,0.3)" strokeWidth="0.15"
        />
      ))}
      {/* Blue home path (col 7, rows 1-5) */}
      {[1,2,3,4,5].map(r => (
        <rect key={`bh${r}`}
          x={`${7*C}%`} y={`${r*C}%`}
          width={`${C}%`} height={`${C}%`}
          fill="url(#fillBluePath)"
          stroke="rgba(59,130,246,0.3)" strokeWidth="0.15"
        />
      ))}
      {/* Yellow home path (col 7, rows 9-13) */}
      {[9,10,11,12,13].map(r => (
        <rect key={`yh${r}`}
          x={`${7*C}%`} y={`${r*C}%`}
          width={`${C}%`} height={`${C}%`}
          fill="url(#fillYellowPath)"
          stroke="rgba(234,179,8,0.3)" strokeWidth="0.15"
        />
      ))}

      {/* ── CENTER WINNING AREA (3×3) ── */}
      <rect
        x={`${6*C}%`} y={`${6*C}%`}
        width={`${3*C}%`} height={`${3*C}%`}
        fill="url(#fillCenter)"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="0.2"
      />
      {/* Center glow */}
      <circle
        cx={`${7.5*C}%`} cy={`${7.5*C}%`}
        r={`${C*1.8}%`}
        fill="url(#centerGlow)"
      />
      {/* 4 colored triangles toward center */}
      {/* Red (from left) */}
      <polygon
        points={`${6*C},${7.5*C} ${7.5*C},${6*C} ${7.5*C},${9*C}`}
        fill="rgba(239,68,68,0.75)"
      />
      {/* Green (from right) */}
      <polygon
        points={`${9*C},${7.5*C} ${7.5*C},${6*C} ${7.5*C},${9*C}`}
        fill="rgba(34,197,94,0.75)"
      />
      {/* Blue (from top) */}
      <polygon
        points={`${7.5*C},${6*C} ${6*C},${7.5*C} ${9*C},${7.5*C}`}
        fill="rgba(59,130,246,0.75)"
      />
      {/* Yellow (from bottom) */}
      <polygon
        points={`${7.5*C},${9*C} ${6*C},${7.5*C} ${9*C},${7.5*C}`}
        fill="rgba(234,179,8,0.75)"
      />
      {/* Center star */}
      <text
        x={`${7.5*C}%`} y={`${7.5*C + 1.5}%`}
        textAnchor="middle"
        fontSize={`${C*1.4}%`}
        filter="url(#glowFilter)"
        fill="rgba(251,191,36,0.9)"
      >
        ★
      </text>

      {/* ── YARD SLOT CIRCLES (token home positions) ── */}
      {(['red','green','yellow','blue'] as const).map(color =>
        YARD_SLOTS[color].map(([r,c], i) => (
          <circle
            key={`ys-${color}-${i}`}
            cx={`${(c + 0.5)*C}%`}
            cy={`${(r + 0.5)*C}%`}
            r={`${C*0.38}%`}
            fill="rgba(255,255,255,0.18)"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="0.25"
          />
        ))
      )}

      {/* ── OUTER BORDER ── */}
      <rect
        x="0.15%" y="0.15%" width="99.7%" height="99.7%"
        rx="1.5%" ry="1.5%"
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.4"
      />
    </svg>
  );
});

LudoBoardSVG.displayName = 'LudoBoardSVG';
export default LudoBoardSVG;
