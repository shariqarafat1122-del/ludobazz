// src/games/ninecard/components/PotDisplay.tsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NineCardGameStatus } from '../types';

interface PotDisplayProps {
  potAmount: number;
  callAmount: number;
  gameStatus: NineCardGameStatus;
  round: number;
}

// Chip colours based on denomination
const chipColor = (amount: number): string => {
  if (amount >= 1000) return '#6d28d9'; // purple
  if (amount >= 500)  return '#dc2626'; // red
  if (amount >= 100)  return '#2563eb'; // blue
  if (amount >= 50)   return '#16a34a'; // green
  return '#ca8a04';                     // yellow
};

const ChipStack: React.FC<{ amount: number }> = ({ amount }) => {
  const count = Math.min(Math.ceil(amount / 50), 8);
  const color = chipColor(amount);

  return (
    <div className="flex items-end gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: i * 0.06, type: 'spring', stiffness: 300 }}
          className="relative"
          style={{ marginBottom: i * 1 }}
        >
          <div
            className="w-8 h-8 rounded-full border-4 shadow-lg
                       flex items-center justify-center"
            style={{
              backgroundColor: color,
              borderColor: `${color}88`,
              boxShadow: `0 2px 8px ${color}66`,
            }}
          >
            <span className="text-white text-[8px] font-bold">₹</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export const PotDisplay: React.FC<PotDisplayProps> = ({
  potAmount,
  callAmount,
  gameStatus,
  round,
}) => {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Chip stacks */}
      {potAmount > 0 && (
        <div className="flex gap-2 items-end mb-1">
          <ChipStack amount={potAmount} />
        </div>
      )}

      {/* Pot amount */}
      <motion.div
        key={potAmount}
        initial={{ scale: 1.3, color: '#fbbf24' }}
        animate={{ scale: 1 }}
        className="text-center"
      >
        <p className="text-gray-400 text-[10px] uppercase tracking-[0.2em] font-semibold">
          Total Pot
        </p>
        <motion.p
          key={potAmount}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="text-3xl font-black text-yellow-400 leading-none"
          style={{ textShadow: '0 0 20px rgba(251,191,36,0.5)' }}
        >
          ₹{potAmount.toLocaleString('en-IN')}
        </motion.p>
      </motion.div>

      {/* Call amount + round */}
      {gameStatus === 'active' && (
        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="text-gray-500 text-[9px] uppercase tracking-wider">Call</p>
            <p className="text-green-400 text-sm font-bold">
              ₹{callAmount.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="w-px h-6 bg-gray-700" />
          <div className="text-center">
            <p className="text-gray-500 text-[9px] uppercase tracking-wider">Round</p>
            <p className="text-blue-400 text-sm font-bold">#{round}</p>
          </div>
        </div>
      )}
    </div>
  );
};
