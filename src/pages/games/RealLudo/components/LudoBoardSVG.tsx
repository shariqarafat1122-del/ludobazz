import React, { memo } from 'react';
import { GRID, CELL, TRACK, HOME_PATH, YARD_SLOTS, SAFE_CELLS } from '../constants/boardLayout';

const C = CELL; // 100/15 ≈ 6.667%

// ─── Color palettes ───────────────────────────────────────────────────────────
const COLORS = {
  red:    { bg: '#c0392b', mid: '#e74c3c', light: '#f1948a', pale: '#fadbd8', dark: '#922b21' },
  green:  { bg: '#1e8449', mid: '#27ae60', light: '#58d68d', pale: '#d5f5e3', dark: '#196f3d' },
  yellow: { bg: '#b7950b', mid: '#d4ac0d', light: '#f9e79f', pale: '#fef9e7', dark: '#9a7d0a' },
  blue:   { bg: '#1a5276', mid: '#2e86c1', light: '#7fb3d3', pale: '#d6eaf8', dark: '#154360' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const p = (v: number) => `${v}%`;
const cx = (col: number) => (col + 0.5) * C;
const cy = (row: number) => (row + 0.5) * C;

const LudoBoardSVG: React.FC = memo(() => {

  // Which track index does this cell correspond to?
  const getTrackIdx = (r: number, c: number) =>
    TRACK.findIndex(([tr, tc]) => tr === r && tc === c);

  // Single track cell rect + optional star
  const TrackCell = ({ r, c, fill = '#f0ece4', stroke = 'rgba(0,0,0,0.1)' }: {
    r: number; c: number; fill?: string; stroke?: string;
  }) => {
    const x = c * C;
    const y = r * C;
    const tIdx = getTrackIdx(r, c);
    const isSafe = tIdx !== -1 && SAFE_CELLS.has(tIdx);
    return (
      <g key={`tc-${r}-${c}`}>
        {/* Cell base */}
        <rect x={p(x)} y={p(y)} width={p(C)} height={p(C)}
          fill={fill} stroke={stroke} strokeWidth="0.12" />
        {/* 3D top-light bevel */}
        <rect x={p(x + 0.08)} y={p(y + 0.08)} width={p(C - 0.16)} height={p(0.6)}
          fill="rgba(255,255,255,0.35)" />
        <rect x={p(x + 0.08)} y={p(y + 0.08)} width={p(0.6)} height={p(C - 0.16)}
          fill="rgba(255,255,255,0.2)" />
        {/* 3D bottom shadow bevel */}
        <rect x={p(x + 0.08)} y={p(y + C - 0.7)} width={p(C - 0.16)} height={p(0.6)}
          fill="rgba(0,0,0,0.12)" />
        {isSafe && (
          <text x={p(x + C / 2)} y={p(y + C / 2 + 1.1)}
            textAnchor="middle" fontSize={p(C * 0.52)}
            fill="#c0392b" opacity="0.75">★</text>
        )}
      </g>
    );
  };

  // Home stretch colored cells
  const HomeCells = ({ cells, fill, stroke }: {
    cells: number[][], fill: string, stroke: string
  }) => (
    <>
      {cells.map(([r, c], i) => {
        const x = c * C, y = r * C;
        const ratio = i / (cells.length - 1);
        return (
          <g key={`hc-${r}-${c}`}>
            <rect x={p(x)} y={p(y)} width={p(C)} height={p(C)}
              fill={fill} stroke={stroke} strokeWidth="0.12" opacity={0.45 + ratio * 0.55} />
            <rect x={p(x + 0.08)} y={p(y + 0.08)} width={p(C - 0.16)} height={p(0.55)}
              fill="rgba(255,255,255,0.3)" />
          </g>
        );
      })}
    </>
  );

  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}
      shapeRendering="geometricPrecision">

      <defs>
        {/* Board background */}
        <linearGradient id="boardBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2c2c2c" />
          <stop offset="100%" stopColor="#1a1a1a" />
        </linearGradient>

        {/* Yard gradients — rich 3D */}
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
        <radialGradient id="yardYellow" cx="70%" cy="75%" r="75%">
          <stop offset="0%" stopColor={COLORS.yellow.light} />
          <stop offset="40%" stopColor={COLORS.yellow.mid} />
          <stop offset="100%" stopColor={COLORS.yellow.dark} />
        </radialGradient>
        <radialGradient id="yardBlue" cx="30%" cy="75%" r="75%">
          <stop offset="0%" stopColor={COLORS.blue.light} />
          <stop offset="40%" stopColor={COLORS.blue.mid} />
          <stop offset="100%" stopColor={COLORS.blue.dark} />
        </radialGradient>

        {/* Inner yard box */}
        <radialGradient id="innerBox" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
        </radialGradient>

        {/* Center dark */}
        <radialGradient id="centerBg" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#2d2d44" />
          <stop offset="100%" stopColor="#0d0d1a" />
        </radialGradient>

        {/* Token circle on yard */}
        <radialGradient id="tokenCircleRed" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor={COLORS.red.dark} stopOpacity="0.3" />
        </radialGradient>
        <radialGradient id="tokenCircleGreen" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor={COLORS.green.dark} stopOpacity="0.3" />
        </radialGradient>

        {/* Track cell gradient */}
        <linearGradient id="trackCell" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5f0e8" />
          <stop offset="100%" stopColor="#ddd8ce" />
        </linearGradient>

        {/* Safe cell */}
        <linearGradient id="safeCell" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fffbea" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>

        {/* Home path fills */}
        <linearGradient id="redPath" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={COLORS.red.pale} />
          <stop offset="100%" stopColor={COLORS.red.mid} stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="greenPath" x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stopColor={COLORS.green.pale} />
          <stop offset="100%" stopColor={COLORS.green.mid} stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="bluePath" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={COLORS.blue.pale} />
          <stop offset="100%" stopColor={COLORS.blue.mid} stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="yellowPath" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor={COLORS.yellow.pale} />
          <stop offset="100%" stopColor={COLORS.yellow.mid} stopOpacity="0.6" />
        </linearGradient>

        {/* Wood border gradient */}
        <linearGradient id="woodBorder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B6914" />
          <stop offset="30%" stopColor="#C9922A" />
          <stop offset="60%" stopColor="#A0711A" />
          <stop offset="100%" stopColor="#6B4F0F" />
        </linearGradient>

        {/* Emboss filter for 3D cells */}
        <filter id="emboss" x="-5%" y="-5%" width="110%" height="110%">
          <feConvolveMatrix order="3" kernelMatrix="-1 -1 0 -1 0 1 0 1 1"
            divisor="1" bias="0.5" result="embossed" />
          <feBlend in="SourceGraphic" in2="embossed" mode="overlay" result="blend" />
          <feComposite in="blend" in2="SourceGraphic" operator="in" />
        </filter>

        {/* Soft shadow for yard */}
        <filter id="yardShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0.5" dy="1.5" stdDeviation="1.2"
            floodColor="rgba(0,0,0,0.5)" />
        </filter>

        {/* Inner shadow for sunken feel */}
        <filter id="innerShadow">
          <feOffset dx="0.3" dy="0.5" />
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feComposite in="blur" in2="SourceGraphic" operator="out" result="shadow" />
          <feFlood floodColor="rgba(0,0,0,0.3)" result="color" />
          <feComposite in="color" in2="shadow" operator="in" result="coloredShadow" />
          <feMerge>
            <feMergeNode in="coloredShadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── WOOD BORDER ── */}
      <rect x="0" y="0" width="100" height="100" rx="2" fill="url(#woodBorder)" />
      {/* Border shine */}
      <rect x="0.3" y="0.3" width="99.4" height="1"
        fill="rgba(255,255,255,0.25)" rx="0.5" />
      <rect x="0.3" y="0.3" width="1" height="99.4"
        fill="rgba(255,255,255,0.15)" />

      {/* ── BOARD SURFACE ── */}
      <rect x="1.2" y="1.2" width="97.6" height="97.6" rx="1.2"
        fill="url(#boardBg)" />

      {/* ── TRACK CELLS (non-yard, non-center, non-home-path) ── */}
      {Array.from({ length: GRID }, (_, r) =>
        Array.from({ length: GRID }, (_, c) => {
          const isYard =
            (r <= 5 && c <= 5) || (r <= 5 && c >= 9) ||
            (r >= 9 && c >= 9) || (r >= 9 && c <= 5);
          const isCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8;
          const isRedPath   = r === 7 && c >= 1 && c <= 5;
          const isGreenPath = r === 7 && c >= 9 && c <= 13;
          const isBluePath  = c === 7 && r >= 1 && r <= 5;
          const isYellowPath = c === 7 && r >= 9 && r <= 13;
          if (isYard || isCenter || isRedPath || isGreenPath || isBluePath || isYellowPath)
            return null;

          const tIdx = getTrackIdx(r, c);
          const isSafe = tIdx !== -1 && SAFE_CELLS.has(tIdx);
          const x = c * C, y = r * C;
          const fill = isSafe ? 'url(#safeCell)' : 'url(#trackCell)';

          return (
            <g key={`cell-${r}-${c}`}>
              <rect x={p(x)} y={p(y)} width={p(C)} height={p(C)}
                fill={fill} stroke="rgba(0,0,0,0.14)" strokeWidth="0.1" />
              {/* Top bevel highlight */}
              <rect x={p(x+0.07)} y={p(y+0.07)} width={p(C-0.14)} height={p(0.55)}
                fill="rgba(255,255,255,0.4)" />
              <rect x={p(x+0.07)} y={p(y+0.07)} width={p(0.55)} height={p(C-0.14)}
                fill="rgba(255,255,255,0.22)" />
              {/* Bottom shadow */}
              <rect x={p(x+0.07)} y={p(y+C-0.65)} width={p(C-0.14)} height={p(0.55)}
                fill="rgba(0,0,0,0.13)" />
              {isSafe && (
                <text x={p(x + C/2)} y={p(y + C/2 + 1.1)}
                  textAnchor="middle" fontSize={p(C * 0.5)}
                  fill={COLORS.red.bg} opacity="0.8">★</text>
              )}
              {/* Direction arrows near home entry */}
              {r === 7 && c === 0 && (
                <text x={p(x+C/2)} y={p(y+C/2+1.1)} textAnchor="middle"
                  fontSize={p(C*0.6)} fill={COLORS.red.mid} opacity="0.7">▶</text>
              )}
              {r === 7 && c === 14 && (
                <text x={p(x+C/2)} y={p(y+C/2+1.1)} textAnchor="middle"
                  fontSize={p(C*0.6)} fill={COLORS.green.mid} opacity="0.7">◀</text>
              )}
              {r === 0 && c === 7 && (
                <text x={p(x+C/2)} y={p(y+C/2+1.1)} textAnchor="middle"
                  fontSize={p(C*0.6)} fill={COLORS.blue.mid} opacity="0.7">▼</text>
              )}
              {r === 14 && c === 7 && (
                <text x={p(x+C/2)} y={p(y+C/2+1.1)} textAnchor="middle"
                  fontSize={p(C*0.6)} fill={COLORS.yellow.mid} opacity="0.7">▲</text>
              )}
            </g>
          );
        })
      )}

      {/* ── HOME PATH CELLS ── */}
      {/* Red: row 7, cols 1-5 */}
      {[1,2,3,4,5].map((c, i) => {
        const x = c * C, y = 7 * C;
        const ratio = i / 4;
        return (
          <g key={`rp-${c}`}>
            <rect x={p(x)} y={p(y)} width={p(C)} height={p(C)}
              fill={COLORS.red.pale} stroke={`rgba(192,57,43,0.25)`} strokeWidth="0.1"
              opacity={0.5 + ratio * 0.5} />
            <rect x={p(x+0.06)} y={p(y+0.06)} width={p(C-0.12)} height={p(0.5)}
              fill="rgba(255,255,255,0.35)" />
            <rect x={p(x)} y={p(y)} width={p(C)} height={p(C)}
              fill={COLORS.red.mid} opacity={ratio * 0.35} />
          </g>
        );
      })}
      {/* Green: row 7, cols 9-13 */}
      {[13,12,11,10,9].map((c, i) => {
        const x = c * C, y = 7 * C;
        const ratio = i / 4;
        return (
          <g key={`gp-${c}`}>
            <rect x={p(x)} y={p(y)} width={p(C)} height={p(C)}
              fill={COLORS.green.pale} stroke={`rgba(30,132,73,0.25)`} strokeWidth="0.1"
              opacity={0.5 + ratio * 0.5} />
            <rect x={p(x+0.06)} y={p(y+0.06)} width={p(C-0.12)} height={p(0.5)}
              fill="rgba(255,255,255,0.35)" />
            <rect x={p(x)} y={p(y)} width={p(C)} height={p(C)}
              fill={COLORS.green.mid} opacity={ratio * 0.35} />
          </g>
        );
      })}
      {/* Blue: col 7, rows 1-5 */}
      {[1,2,3,4,5].map((r, i) => {
        const x = 7 * C, y = r * C;
        const ratio = i / 4;
        return (
          <g key={`bp-${r}`}>
            <rect x={p(x)} y={p(y)} width={p(C)} height={p(C)}
              fill={COLORS.blue.pale} stroke={`rgba(26,82,118,0.25)`} strokeWidth="0.1"
              opacity={0.5 + ratio * 0.5} />
            <rect x={p(x+0.06)} y={p(y+0.06)} width={p(C-0.12)} height={p(0.5)}
              fill="rgba(255,255,255,0.35)" />
            <rect x={p(x)} y={p(y)} width={p(C)} height={p(C)}
              fill={COLORS.blue.mid} opacity={ratio * 0.35} />
          </g>
        );
      })}
      {/* Yellow: col 7, rows 9-13 */}
      {[13,12,11,10,9].map((r, i) => {
        const x = 7 * C, y = r * C;
        const ratio = i / 4;
        return (
          <g key={`yp-${r}`}>
            <rect x={p(x)} y={p(y)} width={p(C)} height={p(C)}
              fill={COLORS.yellow.pale} stroke={`rgba(183,149,11,0.25)`} strokeWidth="0.1"
              opacity={0.5 + ratio * 0.5} />
            <rect x={p(x+0.06)} y={p(y+0.06)} width={p(C-0.12)} height={p(0.5)}
              fill="rgba(255,255,255,0.35)" />
            <rect x={p(x)} y={p(y)} width={p(C)} height={p(C)}
              fill={COLORS.yellow.mid} opacity={ratio * 0.35} />
          </g>
        );
      })}

      {/* ── YARD ZONES ── */}
      {/* Red yard (top-left: rows 0-5, cols 0-5) */}
      <rect x={p(0)} y={p(0)} width={p(C*6)} height={p(C*6)}
        fill="url(#yardRed)" filter="url(#yardShadow)" />
      {/* Yard top-light bevel */}
      <rect x={p(0.15)} y={p(0.15)} width={p(C*6-0.3)} height={p(1.2)}
        fill="rgba(255,255,255,0.2)" />
      {/* Inner white box */}
      <rect x={p(C*0.55)} y={p(C*0.55)} width={p(C*4.9)} height={p(C*4.9)}
        rx="1.8%" fill="url(#innerBox)" stroke="rgba(255,255,255,0.55)" strokeWidth="0.22" />
      {/* Inner box bevel */}
      <rect x={p(C*0.55+0.15)} y={p(C*0.55+0.15)} width={p(C*4.9-0.3)} height={p(0.8)}
        fill="rgba(255,255,255,0.3)" rx="0.5%" />

      {/* Green yard (top-right: rows 0-5, cols 9-14) */}
      <rect x={p(C*9)} y={p(0)} width={p(C*6)} height={p(C*6)}
        fill="url(#yardGreen)" filter="url(#yardShadow)" />
      <rect x={p(C*9+0.15)} y={p(0.15)} width={p(C*6-0.3)} height={p(1.2)}
        fill="rgba(255,255,255,0.18)" />
      <rect x={p(C*9.55)} y={p(C*0.55)} width={p(C*4.9)} height={p(C*4.9)}
        rx="1.8%" fill="url(#innerBox)" stroke="rgba(255,255,255,0.55)" strokeWidth="0.22" />
      <rect x={p(C*9.55+0.15)} y={p(C*0.55+0.15)} width={p(C*4.9-0.3)} height={p(0.8)}
        fill="rgba(255,255,255,0.28)" rx="0.5%" />

      {/* Yellow yard (bottom-right: rows 9-14, cols 9-14) */}
      <rect x={p(C*9)} y={p(C*9)} width={p(C*6)} height={p(C*6)}
        fill="url(#yardYellow)" filter="url(#yardShadow)" />
      <rect x={p(C*9+0.15)} y={p(C*9+0.15)} width={p(C*6-0.3)} height={p(1.2)}
        fill="rgba(255,255,255,0.18)" />
      <rect x={p(C*9.55)} y={p(C*9.55)} width={p(C*4.9)} height={p(C*4.9)}
        rx="1.8%" fill="url(#innerBox)" stroke="rgba(255,255,255,0.55)" strokeWidth="0.22" />
      <rect x={p(C*9.55+0.15)} y={p(C*9.55+0.15)} width={p(C*4.9-0.3)} height={p(0.8)}
        fill="rgba(255,255,255,0.22)" rx="0.5%" />

      {/* Blue yard (bottom-left: rows 9-14, cols 0-5) */}
      <rect x={p(0)} y={p(C*9)} width={p(C*6)} height={p(C*6)}
        fill="url(#yardBlue)" filter="url(#yardShadow)" />
      <rect x={p(0.15)} y={p(C*9+0.15)} width={p(C*6-0.3)} height={p(1.2)}
        fill="rgba(255,255,255,0.18)" />
      <rect x={p(C*0.55)} y={p(C*9.55)} width={p(C*4.9)} height={p(C*4.9)}
        rx="1.8%" fill="url(#innerBox)" stroke="rgba(255,255,255,0.55)" strokeWidth="0.22" />
      <rect x={p(C*0.55+0.15)} y={p(C*9.55+0.15)} width={p(C*4.9-0.3)} height={p(0.8)}
        fill="rgba(255,255,255,0.22)" rx="0.5%" />

      {/* ── YARD TOKEN SLOT CIRCLES ── */}
      {/* These are purely decorative — show where tokens sit when in yard */}
      {/* Positions match YARD_SLOTS exactly: red [[2,2],[2,4],[4,2],[4,4]] etc */}
      {([
  { color: 'red',   grad: 'tokenCircleRed',   slots: [[2,2],[2,4],[4,2],[4,4]] },
  { color: 'green', grad: 'tokenCircleGreen', slots: [[2,10],[2,12],[4,10],[4,12]] },
] as const).map(({ color, grad, slots }) =>
  slots.map(([r, c], i) => {
    const ccx = cx(c), ccy = cy(r);
    return (
      <g key={`ys-${color}-${i}`}>
        <circle cx={p(ccx)} cy={p(ccy + 0.4)} r={p(C * 0.36)}
          fill="rgba(0,0,0,0.3)" />
        <circle cx={p(ccx)} cy={p(ccy)} r={p(C * 0.36)}
          fill={`url(#${grad})`}
          stroke="rgba(255,255,255,0.5)" strokeWidth="0.22" />
        <ellipse cx={p(ccx - C*0.08)} cy={p(ccy - C*0.1)}
          rx={p(C * 0.14)} ry={p(C * 0.09)}
          fill="rgba(255,255,255,0.45)" />
      </g>
    );
  })
)}

      {/* ── CENTER AREA (3×3) ── */}
      <rect x={p(6*C)} y={p(6*C)} width={p(3*C)} height={p(3*C)}
        fill="url(#centerBg)" />

      {/* 4 colored triangles */}
      {/* Red — from left */}
      <polygon
        points={`${6*C},${7.5*C} ${7.5*C},${6*C} ${7.5*C},${9*C}`}
        fill={COLORS.red.mid} opacity="0.85" />
      {/* Green — from right */}
      <polygon
        points={`${9*C},${7.5*C} ${7.5*C},${6*C} ${7.5*C},${9*C}`}
        fill={COLORS.green.mid} opacity="0.85" />
      {/* Blue — from top */}
      <polygon
        points={`${7.5*C},${6*C} ${6*C},${7.5*C} ${9*C},${7.5*C}`}
        fill={COLORS.blue.mid} opacity="0.85" />
      {/* Yellow — from bottom */}
      <polygon
        points={`${7.5*C},${9*C} ${6*C},${7.5*C} ${9*C},${7.5*C}`}
        fill={COLORS.yellow.mid} opacity="0.85" />

      {/* Center lines */}
      <line x1={p(6*C)} y1={p(7.5*C)} x2={p(9*C)} y2={p(7.5*C)}
        stroke="rgba(255,255,255,0.1)" strokeWidth="0.12" />
      <line x1={p(7.5*C)} y1={p(6*C)} x2={p(7.5*C)} y2={p(9*C)}
        stroke="rgba(255,255,255,0.1)" strokeWidth="0.12" />

      {/* Center star */}
      <circle cx={p(7.5*C)} cy={p(7.5*C)} r={p(C*0.7)}
        fill="rgba(0,0,0,0.35)" />
      <circle cx={p(7.5*C)} cy={p(7.5*C)} r={p(C*0.5)}
        fill="rgba(255,215,0,0.15)" />
      <text x={p(7.5*C)} y={p(7.5*C + 1.3)}
        textAnchor="middle" fontSize={p(C * 1.1)}
        fill="rgba(255,215,0,0.9)">★</text>

      {/* ── GRID LINES (subtle) ── */}
      {Array.from({ length: GRID + 1 }, (_, i) => (
        <g key={`gl-${i}`}>
          <line x1={p(i * C)} y1="0%" x2={p(i * C)} y2="100%"
            stroke="rgba(0,0,0,0.18)" strokeWidth="0.08" />
          <line x1="0%" y1={p(i * C)} x2="100%" y2={p(i * C)}
            stroke="rgba(0,0,0,0.18)" strokeWidth="0.08" />
        </g>
      ))}

      {/* ── BOARD INNER BORDER ── */}
      <rect x="1.2%" y="1.2%" width="97.6%" height="97.6%"
        rx="1.2%" fill="none"
        stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" />

      {/* ── CORNER DECORATIONS ── */}
      {[
        { x: 1.5, y: 1.5 },
        { x: 98.5, y: 1.5 },
        { x: 1.5, y: 98.5 },
        { x: 98.5, y: 98.5 },
      ].map((pos, i) => (
        <circle key={`corner-${i}`} cx={p(pos.x)} cy={p(pos.y)}
          r={p(0.6)} fill="rgba(255,255,255,0.25)" />
      ))}
    </svg>
  );
});

LudoBoardSVG.displayName = 'LudoBoardSVG';
export default LudoBoardSVG;
