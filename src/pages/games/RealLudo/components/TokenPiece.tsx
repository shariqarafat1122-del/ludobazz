// components/TokenPiece.tsx - CHESS HORSE STYLE 3D TOKEN

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
  color,
  isMovable,
  isActive = false,
  size = 42,  // ← pehle 28 tha, ab 42 (50% bada)
  count = 1,
  onClick,
}) => {
  const t   = COLOR_THEME[color];
  const uid = `${color}_${Math.random().toString(36).slice(2, 7)}`;

  // Unique gradient IDs per instance
  const ids = {
    bodyGrad:   `body_${color}`,
    shineGrad:  `shine_${color}`,
    rimGrad:    `rim_${color}`,
    shadowFilt: `shad_${color}`,
    glowFilt:   `glow_${color}`,
    metalGrad:  `metal_${color}`,
    baseGrad:   `base_${color}`,
    neckGrad:   `neck_${color}`,
  };

  return (
    <motion.div
      onClick={isMovable ? onClick : undefined}
      animate={
        isMovable
          ? {
              y: [0, -5, 0],
              filter: [
                `drop-shadow(0 6px 10px ${t.glow})`,
                `drop-shadow(0 12px 20px ${t.glow})`,
                `drop-shadow(0 6px 10px ${t.glow})`,
              ],
            }
          : isActive
          ? { y: [0, -2, 0] }
          : { y: 0 }
      }
      transition={
        isMovable
          ? { duration: 1.0, repeat: Infinity, ease: 'easeInOut' }
          : isActive
          ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
          : {}
      }
      whileTap={isMovable ? { scale: 0.85, y: 2 } : {}}
      style={{
        cursor:  isMovable ? 'pointer' : 'default',
        width:   size,
        height:  size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 50"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* ── Main body metallic gradient ── */}
          <radialGradient id={ids.bodyGrad} cx="32%" cy="18%" r="80%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.98)" />
            <stop offset="12%"  stopColor={t.light} />
            <stop offset="40%"  stopColor={t.primary} />
            <stop offset="75%"  stopColor={t.secondary} />
            <stop offset="100%" stopColor={t.dark} />
          </radialGradient>

          {/* ── Metallic sheen ── */}
          <linearGradient id={ids.metalGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.6)" />
            <stop offset="30%"  stopColor="rgba(255,255,255,0.1)" />
            <stop offset="60%"  stopColor="rgba(0,0,0,0.1)" />
            <stop offset="100%" stopColor={t.dark} stopOpacity="0.5" />
          </linearGradient>

          {/* ── Base/pedestal gradient ── */}
          <linearGradient id={ids.baseGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor={t.secondary} />
            <stop offset="100%" stopColor={t.dark} />
          </linearGradient>

          {/* ── Neck gradient ── */}
          <radialGradient id={ids.neckGrad} cx="30%" cy="30%" r="70%">
            <stop offset="0%"   stopColor={t.light} />
            <stop offset="100%" stopColor={t.dark} />
          </radialGradient>

          {/* ── Top shine ── */}
          <radialGradient id={ids.shineGrad} cx="40%" cy="25%" r="55%">
            <stop offset="0%"  stopColor="rgba(255,255,255,0.9)" />
            <stop offset="70%" stopColor="rgba(255,255,255,0.0)" />
          </radialGradient>

          {/* ── Glow filter (movable) ── */}
          <filter id={ids.glowFilt} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feFlood floodColor={t.primary} floodOpacity="0.55" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* ── Shadow ── */}
          <filter id={ids.shadowFilt} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>

        {/* ════════════════════════════════════
            GROUND SHADOW
        ════════════════════════════════════ */}
        <ellipse
          cx="20" cy="49"
          rx={isMovable ? 7 : 9}
          ry={isMovable ? 1.5 : 2}
          fill="rgba(0,0,0,0.3)"
          filter={`url(#${ids.shadowFilt})`}
        />

        {/* ════════════════════════════════════
            BASE PLATFORM (wide, flat)
        ════════════════════════════════════ */}
        {/* Bottom shadow of base */}
        <ellipse cx="20" cy="44.5" rx="11.5" ry="2.5"
          fill={t.dark} opacity="0.7" />
        {/* Base top face */}
        <ellipse cx="20" cy="43" rx="11" ry="2.2"
          fill={`url(#${ids.baseGrad})`} />
        {/* Base highlight edge */}
        <ellipse cx="17" cy="41.8" rx="5.5" ry="0.9"
          fill="rgba(255,255,255,0.25)" />

        {/* ════════════════════════════════════
            NECK / STEM
        ════════════════════════════════════ */}
        {/* Neck body */}
        <path
          d="M14,43 C13,43 12,40 12.5,36 C13,33 14.5,31 16,30
             C17,29.2 18,28.5 20,28.5
             C22,28.5 23,29.2 24,30
             C25.5,31 27,33 27.5,36
             C28,40 27,43 26,43 Z"
          fill={`url(#${ids.neckGrad})`}
        />
        {/* Neck sheen */}
        <path
          d="M14.5,42 C14,41 13.5,38 14,35
             C14.5,33 15.5,31.5 17,30.5
             C17.8,29.8 18.5,29 20,29"
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* ════════════════════════════════════
            HORSE HEAD (chess-knight style)
        ════════════════════════════════════ */}

        {/* ── MAIN HEAD SHAPE ── */}
        <path
          d={`
            M 20,28
            C 18,27 15,26 13,24
            C 11,22 10,19 10.5,16
            C 11,13 12,11 13,10
            C 14,9 15,8.5 15.5,8
            C 16,7 16.5,6 17,5.5
            C 18,4.5 19,4 20,4
            C 22,4 23.5,5 24.5,6.5
            C 25.5,8 26,10 27,12
            C 28,14 29.5,16 29.5,19
            C 29.5,22 28,25 26,27
            C 24,28.5 22,29 20,28
            Z
          `}
          fill={`url(#${ids.bodyGrad})`}
          filter={isMovable ? `url(#${ids.glowFilt})` : undefined}
        />

        {/* ── SNOUT / MUZZLE ── */}
        <path
          d={`
            M 10.5,16
            C 9,16.5 8,18 8,20
            C 8,22 9,23.5 10.5,24
            C 12,24.5 13,24 13,24
            C 11,22 10,19 10.5,16
            Z
          `}
          fill={t.secondary}
          opacity="0.9"
        />
        {/* Muzzle detail line */}
        <path
          d="M 8.5,19 C 9,18.5 10,18 10.5,18.5"
          fill="none"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="0.5"
        />
        {/* Nostril */}
        <circle cx="9.2" cy="21" r="0.7"
          fill={t.dark} opacity="0.6" />

        {/* ── EAR ── */}
        <path
          d={`
            M 18,6
            C 17.5,4 18,2.5 19,2
            C 20,1.5 21.5,2 22,3.5
            C 22.5,5 22,6 21,6.5
            Z
          `}
          fill={t.primary}
        />
        {/* Inner ear */}
        <path
          d={`
            M 18.8,6
            C 18.5,4.5 19,3.5 19.8,3
            C 20.5,2.6 21.2,3 21.5,4
            C 21.8,5 21.3,5.8 20.5,6.2
            Z
          `}
          fill={t.light}
          opacity="0.6"
        />

        {/* ── MANE (flowing from top of head) ── */}
        <path
          d={`
            M 21,5
            C 23,5 25,6 26,8
            C 27,10 27.5,12 27,14
            C 28.5,12 29,10 29,8
            C 29,6 27.5,4.5 25.5,4
            Z
          `}
          fill={t.secondary}
          opacity="0.75"
        />
        {/* Mane strands */}
        <path d="M 23,5.5 C 25,6 26.5,8 26,11"
          fill="none" stroke={t.dark} strokeWidth="0.4" opacity="0.5" />
        <path d="M 24.5,5 C 26.5,6 28,8.5 27.5,12"
          fill="none" stroke={t.dark} strokeWidth="0.4" opacity="0.4" />

        {/* ── EYE ── */}
        <ellipse cx="15" cy="15" rx="2" ry="1.8"
          fill={t.dark} />
        <ellipse cx="15" cy="15" rx="1.3" ry="1.2"
          fill="rgba(0,0,0,0.85)" />
        {/* Eye shine */}
        <circle cx="14.3" cy="14.3" r="0.55"
          fill="rgba(255,255,255,0.9)" />
        <circle cx="15.5" cy="15.5" r="0.3"
          fill="rgba(255,255,255,0.5)" />

        {/* ── FACE DETAIL LINE ── */}
        <path
          d="M 12.5,18 C 12,17 12,15 12.5,13"
          fill="none"
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="0.6"
          strokeLinecap="round"
        />

        {/* ── METALLIC SHEEN on head ── */}
        <path
          d={`
            M 20,4
            C 22,4 23.5,5 24.5,6.5
            C 25.5,8 26,10 27,12
            C 26,10 24,8 22,7
            C 21,6.5 20,6 20,4
            Z
          `}
          fill="rgba(255,255,255,0.18)"
        />

        {/* ── TOP SHINE HIGHLIGHT ── */}
        <ellipse cx="22" cy="8" rx="4.5" ry="3"
          fill={`url(#${ids.shineGrad})`}
          transform="rotate(-20,22,8)"
        />

        {/* ── RIM / OUTLINE ── */}
        <path
          d={`
            M 20,28
            C 18,27 15,26 13,24
            C 11,22 10,19 10.5,16
            C 11,13 12,11 13,10
            C 14,9 15,8.5 15.5,8
            C 16,7 16.5,6 17,5.5
            C 18,4.5 19,4 20,4
            C 22,4 23.5,5 24.5,6.5
            C 25.5,8 26,10 27,12
            C 28,14 29.5,16 29.5,19
            C 29.5,22 28,25 26,27
            C 24,28.5 22,29 20,28
            Z
          `}
          fill="none"
          stroke={`url(#${ids.metalGrad})`}
          strokeWidth="0.6"
        />

        {/* ════════════════════════════════════
            MOVABLE PULSE RING
        ════════════════════════════════════ */}
        {isMovable && (
          <motion.ellipse
            cx="20" cy="43"
            rx="14" ry="3.5"
            fill="none"
            stroke={t.primary}
            strokeWidth="1"
            strokeDasharray="5 3"
            animate={{ opacity: [0.4, 1, 0.4], rx: [12, 15, 12] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* ════════════════════════════════════
            COUNT BADGE
        ════════════════════════════════════ */}
        {count > 1 && (
          <>
            <circle cx="33" cy="6" r="7"
              fill="#0f172a"
              stroke={t.light}
              strokeWidth="1" />
            <text
              x="33" y="9.5"
              textAnchor="middle"
              fontSize="8"
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
