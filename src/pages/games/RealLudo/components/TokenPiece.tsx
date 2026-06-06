import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { LudoColor, COLOR_THEME } from '../constants/boardLayout';

interface TokenPieceProps {
  color: LudoColor;
  isMovable: boolean;
  isActive?: boolean;
  size?: number;       // px
  count?: number;      // stacked count
  onClick?: () => void;
}

const TokenPiece: React.FC<TokenPieceProps> = memo(({
  color, isMovable, isActive = false, size = 28, count = 1, onClick,
}) => {
  const t = COLOR_THEME[color];

  // Unique gradient IDs per color+size combo
  const gId  = `tkGrad_${color}`;
  const shId = `tkShad_${color}`;
  const glId = `tkGlow_${color}`;

  return (
    <motion.div
      onClick={isMovable ? onClick : undefined}
      animate={
        isMovable
          ? {
              scale: [1, 1.15, 1],
              filter: [
                `drop-shadow(0 0 3px ${t.glow})`,
                `drop-shadow(0 0 10px ${t.glow})`,
                `drop-shadow(0 0 3px ${t.glow})`,
              ],
            }
          : isActive
          ? { scale: [1, 1.06, 1] }
          : {}
      }
      transition={
        isMovable || isActive
          ? { duration: 0.85, repeat: Infinity, ease: 'easeInOut' }
          : {}
      }
      whileTap={isMovable ? { scale: 0.8 } : {}}
      style={{
        cursor: isMovable ? 'pointer' : 'default',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Main body gradient — glossy plastic */}
          <radialGradient id={gId} cx="38%" cy="28%" r="72%">
            <stop offset="0%"   stopColor={t.light} />
            <stop offset="35%"  stopColor={t.primary} />
            <stop offset="75%"  stopColor={t.secondary} />
            <stop offset="100%" stopColor={t.dark} />
          </radialGradient>

          {/* Drop shadow */}
          <filter id={shId} x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow
              dx="0" dy="3" stdDeviation="3"
              floodColor={t.dark} floodOpacity="0.7"
            />
          </filter>

          {/* Glow (only when movable) */}
          <filter id={glId} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Shadow ellipse (ground shadow) ── */}
        <ellipse
          cx="20" cy="37"
          rx="9" ry="3"
          fill="rgba(0,0,0,0.35)"
        />

        {/* ── Token base (slightly wider) ── */}
        <ellipse
          cx="20" cy="30"
          rx="10.5" ry="4"
          fill={t.dark}
          opacity="0.6"
        />

        {/* ── Main token body ── */}
        <circle
          cx="20" cy="20"
          r="13"
          fill={`url(#${gId})`}
          filter={`url(#${shId})`}
        />

        {/* ── Rim (3D edge) ── */}
        <circle
          cx="20" cy="21"
          r="13"
          fill="none"
          stroke={t.dark}
          strokeWidth="1.5"
          opacity="0.4"
        />

        {/* ── Top shine (glossy highlight) ── */}
        <ellipse
          cx="15" cy="12"
          rx="6" ry="4"
          fill="rgba(255,255,255,0.55)"
          style={{ filter: 'blur(1px)' }}
        />

        {/* ── Secondary shine ── */}
        <ellipse
          cx="26" cy="10"
          rx="2.5" ry="1.5"
          fill="rgba(255,255,255,0.3)"
        />

        {/* ── Center engraving ── */}
        <circle
          cx="20" cy="20"
          r="5.5"
          fill={t.dark}
          opacity="0.35"
        />
        <circle
          cx="20" cy="20"
          r="3"
          fill="rgba(255,255,255,0.15)"
        />

        {/* ── Movable pulse ring ── */}
        {isMovable && (
          <circle
            cx="20" cy="20"
            r="16"
            fill="none"
            stroke={t.primary}
            strokeWidth="1.5"
            strokeDasharray="5 3"
            opacity="0.9"
          />
        )}

        {/* ── Stack count badge ── */}
        {count > 1 && (
          <>
            <circle
              cx="32" cy="8"
              r="7"
              fill="#0f172a"
              stroke={t.primary}
              strokeWidth="1.2"
            />
            <text
              x="32" y="12"
              textAnchor="middle"
              fontSize="8"
              fontWeight="bold"
              fill={t.light}
            >
              {count}
            </text>
          </>
        )}
      </svg>
    </motion.div>
  );
});

TokenPiece.displayName = 'TokenPiece';
export default TokenPiece;
