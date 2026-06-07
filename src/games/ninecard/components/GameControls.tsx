// src/games/ninecard/components/GameControls.tsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NineCardPlayerStatus } from '../types';

interface GameControlsProps {
  isMyTurn: boolean;
  canCall: boolean;
  canPack: boolean;
  canShow: boolean;
  canSeeCards: boolean;
  callAmount: number;
  myStatus: NineCardPlayerStatus;
  actionLoading: boolean;
  onCall: () => void;
  onPack: () => void;
  onShow: () => void;
  onSeeCards: () => void;
}

// ─── Animated Button ──────────────────────────────────────────────────────────

interface ActionBtnProps {
  label: string;
  sublabel?: string;
  onClick: () => void;
  disabled?: boolean;
  variant: 'call' | 'fold' | 'see' | 'show';
  loading?: boolean;
  className?: string;
}

const VARIANTS = {
  call: {
    base: 'from-emerald-700 via-green-600 to-emerald-700',
    glow: 'rgba(16,185,129,0.4)',
    border: 'border-emerald-500/40',
    text: 'text-white',
  },
  fold: {
    base: 'from-red-800 via-red-700 to-red-800',
    glow: 'rgba(239,68,68,0.4)',
    border: 'border-red-600/40',
    text: 'text-white',
  },
  see: {
    base: 'from-blue-800 via-blue-700 to-blue-800',
    glow: 'rgba(59,130,246,0.4)',
    border: 'border-blue-500/40',
    text: 'text-white',
  },
  show: {
    base: 'from-yellow-600 via-amber-500 to-yellow-600',
    glow: 'rgba(234,179,8,0.5)',
    border: 'border-yellow-400/40',
    text: 'text-gray-900',
  },
};

const ActionBtn: React.FC<ActionBtnProps> = ({
  label, sublabel, onClick, disabled, variant, loading, className = '',
}) => {
  const v = VARIANTS[variant];
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.04, y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.96 } : {}}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        relative overflow-hidden rounded-xl px-5 py-3.5
        bg-gradient-to-b ${v.base}
        border ${v.border}
        ${v.text} font-bold
        disabled:opacity-40 disabled:cursor-not-allowed
        shadow-lg transition-shadow
        ${className}
      `}
      style={
        !disabled
          ? { boxShadow: `0 4px 20px ${v.glow}` }
          : undefined
      }
    >
      {/* Shimmer on hover */}
      <motion.div
        className="absolute inset-0 bg-white/10"
        initial={{ x: '-110%', skewX: -15 }}
        whileHover={{ x: '110%' }}
        transition={{ duration: 0.5 }}
      />

      <span className="relative flex flex-col items-center leading-tight">
        <span className="text-base tracking-wide">{label}</span>
        {sublabel && <span className="text-xs opacity-75 mt-0.5">{sublabel}</span>}
      </span>
    </motion.button>
  );
};

// ─── Main Controls ────────────────────────────────────────────────────────────

export const GameControls: React.FC<GameControlsProps> = ({
  isMyTurn,
  canCall,
  canPack,
  canShow,
  canSeeCards,
  callAmount,
  myStatus,
  actionLoading,
  onCall,
  onPack,
  onShow,
  onSeeCards,
}) => {
  return (
    <div className="space-y-3">
      {/* Turn indicator */}
      <div className="flex items-center justify-center gap-2 h-7">
        <AnimatePresence mode="wait">
          {isMyTurn ? (
            <motion.div
              key="your-turn"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2"
            >
              <motion.div
                className="w-2.5 h-2.5 rounded-full bg-yellow-400"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <span
                className="text-yellow-400 font-black text-base tracking-wide"
                style={{ textShadow: '0 0 12px rgba(251,191,36,0.6)' }}
              >
                YOUR TURN
              </span>
              <motion.div
                className="w-2.5 h-2.5 rounded-full bg-yellow-400"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <motion.div
                className="flex gap-1"
                animate={{}}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-gray-500"
                    animate={{ y: [0, -5, 0] }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                  />
                ))}
              </motion.div>
              <span className="text-gray-500 text-sm">Opponent's turn</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Primary buttons row ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <ActionBtn
          label="CALL"
          sublabel={`₹${callAmount.toLocaleString('en-IN')}`}
          onClick={onCall}
          disabled={!canCall || actionLoading}
          variant="call"
        />
        <ActionBtn
          label="PACK"
          sublabel="Fold"
          onClick={onPack}
          disabled={!canPack || actionLoading}
          variant="fold"
        />
      </div>

      {/* ── Secondary buttons row ─────────────────────────────────────── */}
      <AnimatePresence>
        {(canSeeCards || canShow) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid gap-3"
            style={{
              gridTemplateColumns:
                canSeeCards && canShow ? '1fr 1fr' : '1fr',
            }}
          >
            {canSeeCards && (
              <ActionBtn
                label="👁 SEE CARDS"
                sublabel="Reveal your hand"
                onClick={onSeeCards}
                disabled={actionLoading}
                variant="see"
              />
            )}
            {canShow && (
              <ActionBtn
                label="🃏 SHOW"
                sublabel="Reveal & Compare"
                onClick={onShow}
                disabled={!canShow || actionLoading}
                variant="show"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading spinner */}
      <AnimatePresence>
        {actionLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center pt-1"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
              className="w-5 h-5 rounded-full border-2 border-yellow-400 border-t-transparent"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
