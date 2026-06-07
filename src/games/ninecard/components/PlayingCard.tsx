// src/games/ninecard/components/PlayingCard.tsx

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NineCard, NineCardSuit } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlayingCardProps {
  card?: NineCard;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  dealDelay?: number;
  isWinner?: boolean;
  className?: string;
  onClick?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUIT_SYMBOL: Record<NineCardSuit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const SUIT_COLOR: Record<NineCardSuit, string> = {
  hearts: '#e53e3e',
  diamonds: '#e53e3e',
  clubs: '#1a1a2e',
  spades: '#1a1a2e',
};

const SIZE: Record<string, { w: number; h: number; rank: number; suit: number; center: number }> = {
  xs: { w: 40,  h: 56,  rank: 12, suit: 10, center: 18 },
  sm: { w: 52,  h: 72,  rank: 14, suit: 12, center: 22 },
  md: { w: 68,  h: 96,  rank: 18, suit: 14, center: 28 },
  lg: { w: 88,  h: 124, rank: 22, suit: 18, center: 36 },
};

// ─── Card Back ────────────────────────────────────────────────────────────────

const CardBack: React.FC<{ size: string }> = ({ size }) => {
  const s = SIZE[size];
  return (
    <svg
      width={s.w}
      height={s.h}
      viewBox={`0 0 ${s.w} ${s.h}`}
      style={{ display: 'block', borderRadius: 8, overflow: 'hidden' }}
    >
      <defs>
        <linearGradient id="backGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#1e3a5f" />
          <stop offset="50%"  stopColor="#2d5a9e" />
          <stop offset="100%" stopColor="#1e3a5f" />
        </linearGradient>
        <pattern
          id="diaPat"
          x="0" y="0"
          width="10" height="10"
          patternUnits="userSpaceOnUse"
        >
          <polygon
            points="5,0 10,5 5,10 0,5"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>

      {/* Background */}
      <rect width={s.w} height={s.h} rx="8" fill="url(#backGrad)" />
      <rect width={s.w} height={s.h} rx="8" fill="url(#diaPat)" />

      {/* Border */}
      <rect
        x="3" y="3"
        width={s.w - 6} height={s.h - 6}
        rx="6"
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1"
      />
      <rect
        x="5" y="5"
        width={s.w - 10} height={s.h - 10}
        rx="5"
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="0.5"
      />

      {/* Center emblem */}
      <text
        x={s.w / 2} y={s.h / 2 + 5}
        textAnchor="middle"
        fontSize={s.rank * 0.8}
        fontWeight="bold"
        fill="rgba(255,255,255,0.2)"
        fontFamily="serif"
      >
        9CT
      </text>
    </svg>
  );
};

// ─── Card Front ───────────────────────────────────────────────────────────────

const CardFront: React.FC<{
  card: NineCard;
  size: string;
  isWinner: boolean;
}> = ({ card, size, isWinner }) => {
  const s = SIZE[size];
  const color = SUIT_COLOR[card.suit];
  const symbol = SUIT_SYMBOL[card.suit];
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

  return (
    <svg
      width={s.w}
      height={s.h}
      viewBox={`0 0 ${s.w} ${s.h}`}
      style={{ display: 'block', borderRadius: 8 }}
    >
      <defs>
        <linearGradient id={`cardGrad-${card.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="100%" stopColor={isRed ? '#fff8f8' : '#f8f9ff'} />
        </linearGradient>
        {isWinner && (
          <filter id="winGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {/* Card body */}
      <rect
        width={s.w} height={s.h}
        rx="8"
        fill={`url(#cardGrad-${card.id})`}
        stroke={isWinner ? '#ffd700' : '#e2e8f0'}
        strokeWidth={isWinner ? 2.5 : 1}
        filter={isWinner ? 'url(#winGlow)' : undefined}
      />

      {/* Subtle shine */}
      <rect
        x="0" y="0"
        width={s.w / 2} height={s.h}
        rx="8"
        fill="rgba(255,255,255,0.3)"
      />

      {/* Top-left rank + suit */}
      <text
        x="5" y={s.rank + 2}
        fontSize={s.rank}
        fontWeight="900"
        fill={color}
        fontFamily="Georgia, serif"
        letterSpacing="-1"
      >
        {card.rank}
      </text>
      <text
        x="5" y={s.rank + 2 + s.suit + 1}
        fontSize={s.suit}
        fill={color}
        fontFamily="Arial"
      >
        {symbol}
      </text>

      {/* Center large suit */}
      <text
        x={s.w / 2} y={s.h / 2 + s.center * 0.4}
        textAnchor="middle"
        fontSize={s.center}
        fill={color}
        opacity="0.12"
        fontFamily="Arial"
      >
        {symbol}
      </text>

      {/* Bottom-right rank + suit (rotated 180°) */}
      <g transform={`rotate(180, ${s.w / 2}, ${s.h / 2})`}>
        <text
          x="5" y={s.rank + 2}
          fontSize={s.rank}
          fontWeight="900"
          fill={color}
          fontFamily="Georgia, serif"
          letterSpacing="-1"
        >
          {card.rank}
        </text>
        <text
          x="5" y={s.rank + 2 + s.suit + 1}
          fontSize={s.suit}
          fill={color}
          fontFamily="Arial"
        >
          {symbol}
        </text>
      </g>
    </svg>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  faceDown = false,
  size = 'lg',
  dealDelay = 0,
  isWinner = false,
  className = '',
  onClick,
}) => {
  const s = SIZE[size];

  const cardVariants = {
    initial: { y: -120, opacity: 0, rotateY: 90, scale: 0.8 },
    animate: {
      y: 0, opacity: 1, rotateY: faceDown ? 0 : 0, scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 280,
        damping: 22,
        delay: dealDelay,
      },
    },
  };

  const flipVariants = {
    faceDown: { rotateY: 0 },
    faceUp:   { rotateY: 180, transition: { duration: 0.5, ease: 'easeInOut' } },
  };

  const winnerPulse = {
    animate: {
      boxShadow: [
        '0 0 0px rgba(255,215,0,0)',
        '0 0 24px rgba(255,215,0,0.9)',
        '0 0 8px rgba(255,215,0,0.4)',
        '0 0 24px rgba(255,215,0,0.9)',
      ],
      transition: { duration: 1.4, repeat: Infinity },
    },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      className={`relative cursor-${onClick ? 'pointer' : 'default'} ${className}`}
      style={{
        width: s.w,
        height: s.h,
        perspective: 1000,
        transformStyle: 'preserve-3d',
      }}
      onClick={onClick}
    >
      {/* Winner glow wrapper */}
      {isWinner ? (
        <motion.div
          animate={winnerPulse.animate}
          style={{
            borderRadius: 8,
            width: s.w,
            height: s.h,
          }}
        >
          <CardFront card={card!} size={size} isWinner={true} />
        </motion.div>
      ) : faceDown ? (
        <CardBack size={size} />
      ) : card ? (
        <CardFront card={card} size={size} isWinner={false} />
      ) : (
        // Empty placeholder
        <svg
          width={s.w} height={s.h}
          viewBox={`0 0 ${s.w} ${s.h}`}
          style={{ display: 'block' }}
        >
          <rect
            width={s.w} height={s.h} rx="8"
            fill="transparent"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1.5"
            strokeDasharray="6,4"
          />
        </svg>
      )}
    </motion.div>
  );
};
