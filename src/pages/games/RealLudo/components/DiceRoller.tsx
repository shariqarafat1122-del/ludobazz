import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DiceRollerProps {
  value: number | null;
  isRolling: boolean;
  canRoll: boolean;
  color: 'red' | 'green';
  onRoll: () => void;
  size?: number;
}

const DOT_POS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[27, 27], [73, 73]],
  3: [[27, 27], [50, 50], [73, 73]],
  4: [[27, 27], [73, 27], [27, 73], [73, 73]],
  5: [[27, 27], [73, 27], [50, 50], [27, 73], [73, 73]],
  6: [[27, 22], [73, 22], [27, 50], [73, 50], [27, 78], [73, 78]],
};

const DiceRoller: React.FC<DiceRollerProps> = memo(({
  value, isRolling, canRoll, color, onRoll, size = 64,
}) => {
  const [displayVal, setDisplayVal] = useState(value || 1);
  const [isAnimating, setIsAnimating] = useState(false);

  const accentColor = color === 'red' ? '#ef4444' : '#22c55e';
  const accentGlow  = color === 'red'
    ? 'rgba(239,68,68,0.6)'
    : 'rgba(34,197,94,0.6)';

  // Shuffle animation
  useEffect(() => {
    if (!isRolling) {
      if (value !== null) setDisplayVal(value);
      setIsAnimating(false);
      return;
    }
    setIsAnimating(true);
    let count = 0;
    const iv = setInterval(() => {
      setDisplayVal(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count >= 12) clearInterval(iv);
    }, 80);
    return () => clearInterval(iv);
  }, [isRolling, value]);

  const dots = DOT_POS[displayVal] || DOT_POS[1];
  const dotColor = canRoll ? accentColor : '#64748b';

  return (
    <motion.button
      onClick={canRoll && !isRolling ? onRoll : undefined}
      disabled={!canRoll || isRolling}
      animate={
        isRolling
          ? {
              rotate: [0, -20, 20, -15, 15, -8, 0],
              scale:  [1, 1.18, 0.88, 1.1, 0.95, 1.02, 1],
              y: [0, -14, 5, -8, 3, -2, 0],
            }
          : canRoll
          ? { scale: [1, 1.04, 1], y: [0, -2, 0] }
          : {}
      }
      transition={
        isRolling
          ? { duration: 0.65, ease: 'easeInOut' }
          : canRoll
          ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
          : {}
      }
      style={{
        cursor: canRoll ? 'pointer' : 'not-allowed',
        background: 'none',
        border: 'none',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        outline: 'none',
        filter: canRoll
          ? `drop-shadow(0 0 ${isRolling ? 16 : 8}px ${accentGlow})`
          : 'none',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* 3D dice body gradient */}
          <linearGradient id="diceFaceTop" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor={canRoll ? '#ffffff' : '#334155'} />
            <stop offset="100%" stopColor={canRoll ? '#e2e8f0' : '#1e293b'} />
          </linearGradient>
          <linearGradient id="diceFaceRight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={canRoll ? '#cbd5e1' : '#1e293b'} />
            <stop offset="100%" stopColor={canRoll ? '#94a3b8' : '#0f172a'} />
          </linearGradient>
          <linearGradient id="diceFaceBottom" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={canRoll ? '#94a3b8' : '#0f172a'} />
            <stop offset="100%" stopColor={canRoll ? '#64748b' : '#020617'} />
          </linearGradient>
          <filter id="diceShadow">
            <feDropShadow dx="0" dy="5" stdDeviation="4"
              floodColor="rgba(0,0,0,0.5)" />
          </filter>

          {/* Motion blur when rolling */}
          {isRolling && (
            <filter id="motionBlur">
              <feGaussianBlur stdDeviation="2 0.5" />
            </filter>
          )}
        </defs>

        {/* ── Ground shadow ── */}
        <ellipse cx="50" cy="96" rx="30" ry="5"
          fill="rgba(0,0,0,0.3)" />

        {/* ── Top face ── */}
        <rect
          x="8" y="8" width="74" height="74"
          rx="14" ry="14"
          fill="url(#diceFaceTop)"
          filter="url(#diceShadow)"
          style={isRolling ? { filter: 'url(#motionBlur)' } : {}}
        />

        {/* ── Top-face shine (glass highlight) ── */}
        <rect
          x="12" y="12" width="66" height="32"
          rx="10" ry="10"
          fill="rgba(255,255,255,0.5)"
        />

        {/* ── Right face (3D side) ── */}
        <path
          d="M82,16 L92,24 L92,86 L82,82 Z"
          fill="url(#diceFaceRight)"
        />

        {/* ── Bottom face (3D side) ── */}
        <path
          d="M16,82 L82,82 L92,86 L26,86 Z"
          fill="url(#diceFaceBottom)"
        />

        {/* ── Border ── */}
        <rect
          x="8" y="8" width="74" height="74"
          rx="14" ry="14"
          fill="none"
          stroke={canRoll ? 'rgba(148,163,184,0.5)' : 'rgba(51,65,85,0.5)'}
          strokeWidth="1.5"
        />

        {/* ── Dots ── */}
        {dots.map(([cx, cy], i) => (
          <g key={i}>
            {/* Dot body */}
            <circle
              cx={cx * 0.74 + 8}
              cy={cy * 0.74 + 8}
              r="6.5"
              fill={dotColor}
            />
            {/* Dot shine */}
            <circle
              cx={cx * 0.74 + 8 - 2}
              cy={cy * 0.74 + 8 - 2}
              r="2.2"
              fill="rgba(255,255,255,0.3)"
            />
          </g>
        ))}

        {/* ── Active pulse ring ── */}
        {canRoll && !isRolling && (
          <rect
            x="4" y="4" width="82" height="82"
            rx="16" ry="16"
            fill="none"
            stroke={accentColor}
            strokeWidth="1.5"
            strokeDasharray="6 4"
            opacity="0.7"
          />
        )}
      </svg>

      {/* Roll label */}
      {canRoll && (
        <span
          className="font-black text-xs"
          style={{ color: accentColor, letterSpacing: '0.05em' }}
        >
          TAP TO ROLL
        </span>
      )}
    </motion.button>
  );
});

DiceRoller.displayName = 'DiceRoller';
export default DiceRoller;
