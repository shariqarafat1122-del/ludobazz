import React, { memo } from 'react';
import { GRID, CELL, TRACK, SAFE_CELLS } from '../constants/boardLayout';

const C = CELL;

const COLORS = {
  red:   { bg: '#c0392b', mid: '#e74c3c', light: '#f1948a', pale: '#fadbd8', dark: '#922b21' },
  green: { bg: '#1e8449', mid: '#27ae60', light: '#58d68d', pale: '#d5f5e3', dark: '#196f3d' },
};

const p = (v: number) => `${v}%`;
const ccx = (col: number) => (col + 0.5) * C;
const ccy = (row: number) => (row + 0.5) * C;

// Yard slot positions — only red and green
const YARD_SLOTS_2P = {
  red:   [[2,2],[2,4],[4,2],[4,4]] as [number,number][],
  green: [[2,10],[2,12],[4,10],[4,12]] as [number,number][],
};

const LudoBoardSVG: React.FC = memo(() => {
  const getTrackIdx = (r: number, c: number) =>
    TRACK.findIndex(([tr, tc]) => tr === r && tc === c);

  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}
      shapeRendering="geometricPrecision">

      <defs>
        <radialGradient id="yardRed" cx="30%" cy="25%" r="75%">
          <stop offset="0%" stopColor={COLORS.red.light} />
          <stop offset="40%" stopColor={COLORS.red.mid} />
          <stop offset="100%" stopColor={COLORS.red.dark} />
        </radialGradient>
        <radialGradient id="yardGreen" cx="70%" cy="25%" r="75%">
          <stop offset="0%" stopColor={COLORS.green.light} />
          <stop offset="40%" stopColor={COLORS.green.mid} />
          <stop offset="100%" stopColor={COLORS.green.dark} />
        </radialGradient>
        <radialGradient id="innerBox" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
        </radialGradient>
        <radialGradient id="centerBg" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#2d2d44" />
          <stop offset="100%" stopColor="#0d0d1a" />
        </radialGradient>
        <radialGradient id="slotRed" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor={COLORS.red.dark} stopOpacity="0.3" />
        </radialGradient>
        <radialGradient id="slotGreen" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor={COLORS.green.dark} stopOpacity="0.3" />
        </radialGradient>
        <linearGradient id="trackCell" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5f0e8" />
          <stop offset="100%" stopColor="#ddd8ce" />
        </linearGradient>
        <linearGradient id="safeCell" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fffbea" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>
        <linearGradient id="woodBorder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B6914" />
          <stop offset="30%" stopColor="#C9922A" />
          <stop offset="60%" stopColor="#A0711A" />
          <stop offset="100%" stopColor="#6B4F0F" />
        </linearGradient>
        <filter id="yardShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0.5" dy="1.5" stdDeviation="1.2" floodColor="rgba(0,0,0,0.5)" />
        </filter>
        <filter id="shadowBlur">
          <feGaussianBlur stdDeviation="1.8" />
        </filter>
      </defs>

      {/* ── WOOD BORDER ── */}
      <rect x="0" y="0" width="100" height="100" rx="2" fill="url(#woodBorder)" />
      <rect x="0.3" y="0.3" width="99.4" height="1" fill="rgba(255,255,255,0.25)" rx="0.5" />
      <rect x="0.3" y="0.3" width="1" height="99.4" fill="rgba(255,255,255,0.15)" />

      {/* ── BOARD SURFACE ── */}
      <rect x="1.2" y="1.2" width="97.6" height="97.6" rx="1.2" fill="#1a1a1a" />

      {/* ── TRACK CELLS ── */}
      {Array.from({ length: GRID }, (_, r) =>
        Array.from({ length: GRID }, (_, c) => {
          const isYard =
            (r <= 5 && c <= 5) || (r <= 5 && c >= 9) ||
            (r >= 9 && c >= 9) || (r >= 9 && c <= 5);
          const isCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8;
          const isRedPath   = r === 7 && c >= 1 && c <= 5;
          const isGreenPath = r === 7 && c >= 9 && c <= 13;
          if (isYard || isCenter || isRedPath || isGreenPath) return null;

          const tIdx = getTrackIdx(r, c);
          const isSafe = tIdx !== -1 && SAFE_CELLS.has(tIdx);
          const x = c * C, y = r * C;
          const fill = isSafe ? 'url(#safeCell)' : 'url(#trackCell)';

          return (
            <g key={`cell-${r}-${c}`}>
              <rect x={p(x)} y={p(y)} width={p(C)} height={p(C)}
                fill={fill} stroke="rgba(0,0,0,0.15)" strokeWidth="0.1" />
              {/* 3D bevel top */}
              <rect x={p(x+0.07)} y={p(y+0.07)} width={p(C-0.14)} height={p(0.55)}
                fill="rgba(255,255,255,0.4)" />
              <rect x={p(x+0.07)} y={p(y+0.07)} width={p(0.55)} height={p(C-0.14)}
                fill="rgba(255,255,255,0.2)" />
              {/* 3D bevel bottom shadow */}
              <rect x={p(x+0.07)} y={p(y+C-0.65)} width={p(C-0.14)} height={p(0.55)}
                fill="rgba(0,0,0,0.13)" />
              {isSafe && (
                <text x={p(x + C/2)} y={p(y + C/2 + 1.1)}
                  textAnchor="middle" fontSize={p(C * 0.5)}
                  fill={COLORS.red.bg} opacity="0.8">★</text>
              )}
            </g>
          );
        })
      )}

      {/* ── NEUTRAL CELLS for col 7 (rows 1-5 and 9-13) — plain track, no color ── */}
      {[1,2,3,4,5,9,10,11,12,13].map(r => {
        const x = 7 * C, y = r * C;
        const tIdx = getTrackIdx(r, 7);
        const isSafe = tIdx !== -1 && SAFE_CELLS.has(tIdx);
        return (
          <g key={`col7-${r}`}>
            <rect x={p(x)} y={p(y)} width={p(C)} height={p(C)}
              fill={isSafe ? 'url(#safeCell)' : 'url(#trackCell)'}
              stroke="rgba(0,0,0,0.15)" strokeWidth="0.1" />
            <rect x={p(x+0.07)} y={p(y+0.07)} width={p(C-0.14)} height={p(0.55)}
              fill="rgba(255,255,255,0.4)" />
            <rect x={p(x+0.07)} y={p(y+0.07)} width={p(0.55)} height={p(C-0.14)}
              fill="rgba(255,255,255,0.2)" />
            <rect x={p(x+0.07)} y={p(y+C-0.65)} width={p(C-0.14)} height={p(0.55)}
              fill="rgba(0,0,0,0.13)" />
            {isSafe && (
              <text x={p(x + C/2)} y={p(y + C/2 + 1.1)}
                textAnchor="middle" fontSize={p(C * 0.5)}
                fill={COLORS.red.bg} opacity="0.8">★</text>
            )}
          </g>
        );
      })}

      {/* ── RED HOME PATH (row 7, cols 1-5) ── */}
      {[1,2,3,4,5].map((c, i) => {
        const x = c * C, y = 7 * C;
        const ratio = i / 4;
        return (
          <g key={`rp-${c}`}>
            <rect x={p(x)} y={p(y)} width={p(C)} height={p(C)}
              fill={COLORS.red.pale} stroke="rgba(192,57,43,0.2)" strokeWidth="0.1"
              opacity={0.5 + ratio * 0.5} />
            <rect x={p(x)} y={p(y)} width={p(C)} height={p(C)}
              fill={COLORS.red.mid} opacity={ratio * 0.4} />
            <rect x={p(x+0.07)} y={p(y+0.07)} width={p(C-0.14)} height={p(0.5)}
              fill="rgba(255,255,255,0.3)" />
          </g>
        );
      })}

      {/* ── GREEN HOME PATH (row 7, cols 9-13) ── */}
      {[13,12,11,10,9].map((c, i) => {
        const x = c * C, y = 7 * C;
        const ratio = i / 4;
        return (
          <g key={`gp-${c}`}>
            <rect x={p(x)} y={p(y)} width={p(C)} height={p(C)}
              fill={COLORS.green.pale} stroke="rgba(30,132,73,0.2)" strokeWidth="0.1"
              opacity={0.5 + ratio * 0.5} />
            <rect x={p(x)} y={p(y)} width={p(C)} height={p(C)}
              fill={COLORS.green.mid} opacity={ratio * 0.4} />
            <rect x={p(x+0.07)} y={p(y+0.07)} width={p(C-0.14)} height={p(0.5)}
              fill="rgba(255,255,255,0.3)" />
          </g>
        );
      })}

      {/* ── RED YARD (top-left, rows 0-5 cols 0-5) ── */}
      <rect x={p(0)} y={p(0)} width={p(C*6)} height={p(C*6)}
        fill="url(#yardRed)" filter="url(#yardShadow)" />
      <rect x={p(0.15)} y={p(0.15)} width={p(C*6-0.3)} height={p(1.2)}
        fill="rgba(255,255,255,0.2)" />
      <rect x={p(C*0.55)} y={p(C*0.55)} width={p(C*4.9)} height={p(C*4.9)}
        rx="1.8%" fill="url(#innerBox)"
        stroke="rgba(255,255,255,0.55)" strokeWidth="0.22" />
      <rect x={p(C*0.7)} y={p(C*0.7)} width={p(C*4.6)} height={p(0.8)}
        fill="rgba(255,255,255,0.3)" rx="0.5%" />

      {/* ── GREEN YARD (top-right, rows 0-5 cols 9-14) ── */}
      <rect x={p(C*9)} y={p(0)} width={p(C*6)} height={p(C*6)}
        fill="url(#yardGreen)" filter="url(#yardShadow)" />
      <rect x={p(C*9+0.15)} y={p(0.15)} width={p(C*6-0.3)} height={p(1.2)}
        fill="rgba(255,255,255,0.18)" />
      <rect x={p(C*9.55)} y={p(C*0.55)} width={p(C*4.9)} height={p(C*4.9)}
        rx="1.8%" fill="url(#innerBox)"
        stroke="rgba(255,255,255,0.55)" strokeWidth="0.22" />
      <rect x={p(C*9.7)} y={p(C*0.7)} width={p(C*4.6)} height={p(0.8)}
        fill="rgba(255,255,255,0.28)" rx="0.5%" />

      {/* ── BOTTOM-LEFT PLAIN AREA (rows 9-14, cols 0-5) ── */}
      <rect x={p(0)} y={p(C*9)} width={p(C*6)} height={p(C*6)} fill="#111" />
      <rect x={p(0.15)} y={p(C*9+0.15)} width={p(C*6-0.3)} height={p(C*6-0.3)}
        fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.15" />

      {/* ── BOTTOM-RIGHT PLAIN AREA (rows 9-14, cols 9-14) ── */}
      <rect x={p(C*9)} y={p(C*9)} width={p(C*6)} height={p(C*6)} fill="#111" />
      <rect x={p(C*9+0.15)} y={p(C*9+0.15)} width={p(C*6-0.3)} height={p(C*6-0.3)}
        fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.15" />

      {/* ── CENTER AREA ── */}
      <rect x={p(6*C)} y={p(6*C)} width={p(3*C)} height={p(3*C)}
        fill="url(#centerBg)" />
      {/* Only Red and Green triangles */}
      <polygon points={`${6*C},${7.5*C} ${7.5*C},${6*C} ${7.5*C},${9*C}`}
        fill={COLORS.red.mid} opacity="0.85" />
      <polygon points={`${9*C},${7.5*C} ${7.5*C},${6*C} ${7.5*C},${9*C}`}
        fill={COLORS.green.mid} opacity="0.85" />
      {/* Divider line */}
      <line x1={p(6*C)} y1={p(7.5*C)} x2={p(9*C)} y2={p(7.5*C)}
        stroke="rgba(255,255,255,0.15)" strokeWidth="0.12" />
      {/* Center star */}
      <circle cx={p(7.5*C)} cy={p(7.5*C)} r={p(C*0.65)}
        fill="rgba(0,0,0,0.4)" />
      <text x={p(7.5*C)} y={p(7.5*C + 1.25)}
        textAnchor="middle" fontSize={p(C * 1.0)}
        fill="rgba(255,215,0,0.9)">★</text>

      {/* ── SUBTLE GRID ── */}
      {Array.from({ length: GRID + 1 }, (_, i) => (
        <g key={`gl-${i}`}>
          <line x1={p(i*C)} y1="0%" x2={p(i*C)} y2="100%"
            stroke="rgba(0,0,0,0.2)" strokeWidth="0.07" />
          <line x1="0%" y1={p(i*C)} x2="100%" y2={p(i*C)}
            stroke="rgba(0,0,0,0.2)" strokeWidth="0.07" />
        </g>
      ))}

      {/* ── INNER BORDER ── */}
      <rect x="1.2%" y="1.2%" width="97.6%" height="97.6%"
        rx="1.2%" fill="none"
        stroke="rgba(255,255,255,0.1)" strokeWidth="0.25" />

      {/* ── CORNER DOTS ── */}
      {[[1.5,1.5],[98.5,1.5],[1.5,98.5],[98.5,98.5]].map(([x,y],i) => (
        <circle key={`cd-${i}`} cx={p(x)} cy={p(y)} r={p(0.55)}
          fill="rgba(255,255,255,0.22)" />
      ))}
    </svg>
  );
});

LudoBoardSVG.displayName = 'LudoBoardSVG';
export default LudoBoardSVG;
