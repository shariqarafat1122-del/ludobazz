// src/games/ninecard/components/PokerTableLayout.tsx

import React from 'react';
import { motion } from 'framer-motion';

interface PokerTableLayoutProps {
  topSlot: React.ReactNode;
  centerSlot: React.ReactNode;
  bottomSlot: React.ReactNode;
  tableName: string;
  gameStatus: string;
  round: number;
  bootAmount: number;
}

export const PokerTableLayout: React.FC<PokerTableLayoutProps> = ({
  topSlot,
  centerSlot,
  bottomSlot,
  tableName,
  gameStatus,
  round,
  bootAmount,
}) => {
  const statusColor =
    gameStatus === 'active'
      ? '#22c55e'
      : gameStatus === 'finished'
      ? '#ef4444'
      : '#eab308';

  return (
    <div className="relative flex flex-col items-center justify-center w-full min-h-screen
                    bg-gray-950 overflow-hidden select-none">
      {/* ── Ambient background ─────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 50% 50%,
              rgba(0,60,20,0.25) 0%,
              rgba(0,0,0,0) 70%)
          `,
        }}
      />

      {/* Floating suit watermarks */}
      {['♥', '♦', '♣', '♠'].map((suit, i) => (
        <motion.div
          key={suit}
          className="absolute text-9xl font-bold pointer-events-none"
          style={{
            color: i < 2 ? 'rgba(239,68,68,0.03)' : 'rgba(255,255,255,0.02)',
            top: i < 2 ? '10%' : '60%',
            left: i % 2 === 0 ? '5%' : '80%',
          }}
          animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 8 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {suit}
        </motion.div>
      ))}

      {/* ── Table info header ─────────────────────────────────────── */}
      <div className="relative z-10 text-center mb-3 px-4">
        <motion.h1
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-yellow-400 text-xl font-black tracking-wider"
          style={{ textShadow: '0 0 16px rgba(251,191,36,0.4)' }}
        >
          {tableName}
        </motion.h1>
        <div className="flex items-center justify-center gap-4 mt-1 flex-wrap">
          <span className="text-gray-500 text-xs">
            Boot: <span className="text-gray-300 font-semibold">₹{bootAmount}</span>
          </span>
          {round > 0 && (
            <span className="text-gray-500 text-xs">
              Round: <span className="text-blue-400 font-semibold">#{round}</span>
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: statusColor }}
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: statusColor }}
            >
              {gameStatus}
            </span>
          </div>
        </div>
      </div>

      {/* ── The Casino Table ──────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-lg px-3">
        {/*
          Outer rail (wood)  →  felt surface  →  inner decorations
        */}
        <div
          className="relative rounded-[50%] mx-auto"
          style={{
            paddingBottom: '62%',
            /* Wooden rail */
            background: 'linear-gradient(135deg, #3d1f0d 0%, #6b3315 40%, #3d1f0d 100%)',
            boxShadow: `
              0 0 0 3px #2a1508,
              0 0 0 6px #5c2e0f,
              0 0 0 9px #2a1508,
              0 0 40px rgba(0,0,0,0.9),
              0 0 80px rgba(0,0,0,0.5),
              inset 0 2px 4px rgba(255,255,255,0.1)
            `,
          }}
        >
          {/* Felt surface */}
          <div
            className="absolute rounded-[50%] overflow-hidden"
            style={{
              inset: '5%',
              background:
                'radial-gradient(ellipse at 50% 40%, #1a6b2e 0%, #0f4d1e 55%, #0a3814 100%)',
              boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Felt texture rings */}
            <div
              className="absolute rounded-[50%] border pointer-events-none"
              style={{
                inset: '8%',
                borderColor: 'rgba(255,255,255,0.04)',
              }}
            />
            <div
              className="absolute rounded-[50%] border pointer-events-none"
              style={{
                inset: '18%',
                borderColor: 'rgba(255,255,255,0.025)',
              }}
            />

            {/* Table logo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span
                className="text-6xl font-black opacity-[0.03] select-none"
                style={{ color: '#fff' }}
              >
                9CT
              </span>
            </div>

            {/* ── Content grid ────────────────────────────────── */}
            <div className="absolute inset-0 flex flex-col justify-between py-6 px-4">
              {/* Top player */}
              <div className="flex justify-center">{topSlot}</div>

              {/* Center pot */}
              <div className="flex justify-center">{centerSlot}</div>

              {/* Bottom player */}
              <div className="flex justify-center">{bottomSlot}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
