import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { LudoColor, COLOR_THEME } from '../constants/boardLayout';

interface TokenPieceProps {
  color: LudoColor;
  isMovable: boolean;
  isActive?: boolean;
  size?: number;
  count?: number;
  onClick?: () => void;
}

const TokenPiece: React.FC<TokenPieceProps> = memo(({
  color, isMovable, isActive = false, size = 28, count = 1, onClick,
}) => {
  const t = COLOR_THEME[color];

  const gId      = `tg_${color}`;
  const shineId  = `ts_${color}`;
  const rimId    = `tr_${color}`;
  const glowId   = `tgl_${color}`;
  const shadowId = `tsh_${color}`;
  const innerG   = `tig_${color}`;

  return (
    <motion.div
      onClick={isMovable ? onClick : undefined}
      animate={
        isMovable
          ? {
              y: [0, -4, 0],
              filter: [
                `drop-shadow(0 8px 12px ${t.glow}) drop-shadow(0 2px 4px rgba(0,0,0,0.5))`,
                `drop-shadow(0 14px 20px ${t.glow}) drop-shadow(0 4px 8px rgba(0,0,0,0.4))`,
                `drop-shadow(0 8px 12px ${t.glow}) drop-shadow(0 2px 4px rgba(0,0,0,0.5))`,
              ],
            }
          : isActive
          ? { y: [0, -2, 0] }
          : {
              y: 0,
              filter: `drop-shadow(0 6px 10px rgba(0,0,0,0.5)) drop-shadow(0 2px 3px rgba(0,0,0,0.4))`,
            }
      }
      transition={
        isMovable
          ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }
          : isActive
          ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
          : {}
      }
      whileTap={isMovable ? { scale: 0.88, y: 2 } : {}}
      style={{
        cursor: isMovable ? 'pointer' : 'default',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        filter: isMovable
          ? undefined
          : `drop-shadow(0 6px 10px rgba(0,0,0,0.5))`,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 44 48"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Main body — deep 3D radial */}
          <radialGradient id={gId} cx="35%" cy="22%" r="78%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.95)" />
            <stop offset="15%"  stopColor={t.light} />
            <stop offset="45%"  stopColor={t.primary} />
            <stop offset="78%"  stopColor={t.secondary} />
            <stop offset="100%" stopColor={t.dark} />
          </radialGradient>

          {/* Inner bowl gradient */}
          <radialGradient id={innerG} cx="50%" cy="50%" r="60%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor={t.dark} stopOpacity="0.5" />
          </radialGradient>

          {/* Top shine overlay */}
          <radialGradient id={shineId} cx="38%" cy="20%" r="55%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.85)" />
            <stop offset="60%"  stopColor="rgba(255,255,255,0.0)" />
          </radialGradient>

          {/* Rim gradient */}
          <linearGradient id={rimId} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.4)" />
            <stop offset="50%"  stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor={t.dark} stopOpacity="0.6" />
          </linearGradient>

          {/* Glow filter for movable */}
          <filter id={glowId} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feFlood floodColor={t.primary} floodOpacity="0.5" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Shadow blur */}
          <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.8" />
          </filter>
        </defs>

        {/* ── Ground shadow (airy ellipse, blurred) ── */}
        <ellipse
          cx="22" cy="46"
          rx={isMovable ? 7 : 9}
          ry={isMovable ? 1.8 : 2.8}
          fill="rgba(0,0,0,0.28)"
          filter={`url(#${shadowId})`}
          style={{ transition: 'all 0.3s ease' }}
        />

        {/* ── Pedestal / base ring ── */}
        <ellipse
          cx="22" cy="36"
          rx="11" ry="3.5"
          fill={t.dark}
          opacity="0.75"
        />
        <ellipse
          cx="22" cy="35.2"
          rx="10" ry="2.8"
          fill={t.secondary}
          opacity="0.6"
        />
        {/* rim shine on pedestal */}
        <ellipse
          cx="19" cy="34"
          rx="5" ry="1.2"
          fill="rgba(255,255,255,0.2)"
        />

        {/* ── Neck / column connecting body to base ── */}
        <rect
          x="16" y="30"
          width="12" height="7"
          rx="5"
          fill={`url(#${gId})`}
          opacity="0.9"
        />
        {/* neck side shadow */}
        <rect
          x="24" y="30"
          width="4" height="7"
          rx="2"
          fill={t.dark}
          opacity="0.25"
        />

        {/* ── Main sphere body ── */}
        <circle
          cx="22" cy="20"
          r="15"
          fill={`url(#${gId})`}
          filter={isMovable ? `url(#${glowId})` : undefined}
        />

        {/* ── Rim ring (3D edge definition) ── */}
        <circle
          cx="22" cy="20"
          r="15"
          fill="none"
          stroke={`url(#${rimId})`}
          strokeWidth="1.8"
        />

        {/* ── Inner concave bowl ── */}
        <circle
          cx="22" cy="21"
          r="8"
          fill={`url(#${innerG})`}
        />

        {/* ── Primary gloss highlight (large) ── */}
        <ellipse
          cx="16" cy="11"
          rx="7" ry="5"
          fill={`url(#${shineId})`}
        />

        {/* ── Secondary sparkle (small, bright) ── */}
        <ellipse
          cx="27" cy="9"
          rx="2.8" ry="1.8"
          fill="rgba(255,255,255,0.55)"
        />

        {/* ── Tertiary micro-glint ── */}
        <circle
          cx="13" cy="14"
          r="1.2"
          fill="rgba(255,255,255,0.4)"
        />

        {/* ── Bottom reflected light (rear glow) ── */}
        <ellipse
          cx="26" cy="29"
          rx="5" ry="2.5"
          fill="rgba(255,255,255,0.08)"
        />

        {/* ── Movable pulse ring ── */}
        {isMovable && (
          <motion.circle
            cx="22" cy="20"
            r="18"
            fill="none"
            stroke={t.primary}
            strokeWidth="1.2"
            strokeDasharray="4 3"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '22px 20px' }}
            opacity="0.85"
          />
        )}

        {/* ── Stack count badge ── */}
        {count > 1 && (
          <>
            <circle
              cx="34" cy="7"
              r="7.5"
              fill="#0f172a"
              stroke={t.light}
              strokeWidth="1.2"
            />
            <text
              x="34" y="11"
              textAnchor="middle"
              fontSize="8.5"
              fontWeight="bold"
              fill={t.light}
              style={{ fontFamily: 'system-ui, sans-serif' }}
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
