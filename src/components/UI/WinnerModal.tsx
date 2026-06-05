import React, { useEffect, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PlayerColor } from '../../types/ludo';
import { COLOR_STYLES } from '../../constants/board';
import { formatAmount } from '../../utils/roomUtils';

interface WinnerModalProps {
  winner: PlayerColor | null;
  myColor: PlayerColor;
  onPlayAgain: () => void;
  winnerPrize?: number;
  platformCut?: number;
}

const WinnerModal = memo(function WinnerModal({
  winner,
  myColor,
  onPlayAgain,
  winnerPrize = 0,
  platformCut = 0,
}: WinnerModalProps) {
  const [particles, setParticles] = useState<{ id: number; x: number; color: string; size: number }[]>([]);

  useEffect(() => {
    if (!winner) return;
    setParticles(
      Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: ['#ef4444', '#22c55e', '#eab308', '#3b82f6', '#ffffff'][Math.floor(Math.random() * 5)],
        size: Math.random() * 8 + 3,
      }))
    );
  }, [winner]);

  if (!winner) return null;

  const isWinner = winner === myColor;
  const colors = COLOR_STYLES[winner];
  const winnerName = winner === 'red' ? 'Player 1' : 'Player 2';

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(15px)' }}
        />

        {/* Confetti */}
        {particles.map(p => (
          <motion.div
            key={p.id}
            className="absolute rounded-sm pointer-events-none"
            style={{ left: `${p.x}%`, width: p.size, height: p.size, background: p.color, top: '-20px' }}
            animate={{ y: '110vh', rotate: [0, 720], opacity: [1, 0.8, 0] }}
            transition={{ duration: 2.5 + Math.random() * 2, ease: 'easeIn', delay: Math.random() }}
          />
        ))}

        {/* Modal */}
        <motion.div
          className="relative z-10 mx-4 w-full max-w-xs"
          initial={{ scale: 0.3, opacity: 0, y: 80 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.2 }}
        >
          <div
            className="rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #0f0f23, #1a1a3e)',
              border: `2px solid ${colors.primary}50`,
              boxShadow: `0 0 60px ${colors.primary}25, 0 20px 60px rgba(0,0,0,0.6)`,
            }}
          >
            {/* Header */}
            <div
              className="px-6 pt-6 pb-4 text-center"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}20, transparent)`,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <motion.div
                className="text-6xl mb-3"
                animate={{ scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
              >
                {isWinner ? '🏆' : '😔'}
              </motion.div>

              <motion.h1
                className="text-3xl font-black mb-1"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.light})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {isWinner ? 'YOU WIN! 🎉' : 'GAME OVER'}
              </motion.h1>

              <p className="text-gray-400 text-sm">
                {isWinner ? 'Congratulations!' : `${winnerName} wins this round`}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Prize breakdown */}
              {winnerPrize > 0 && (
                <div
                  className="p-4 rounded-2xl space-y-2"
                  style={{
                    background: isWinner
                      ? 'rgba(34,197,94,0.1)'
                      : 'rgba(239,68,68,0.08)',
                    border: isWinner
                      ? '1px solid rgba(34,197,94,0.3)'
                      : '1px solid rgba(239,68,68,0.2)',
                  }}
                >
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Winner Prize</span>
                    <span className="text-white font-bold">{formatAmount(winnerPrize)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Platform (10%)</span>
                    <span className="text-gray-500">-{formatAmount(platformCut)}</span>
                  </div>
                  <div className="w-full h-px bg-white/10" />
                  <div className="flex justify-between">
                    <span className="text-sm font-medium" style={{ color: isWinner ? '#22c55e' : '#6b7280' }}>
                      {isWinner ? '💰 You received' : '💸 Opponent received'}
                    </span>
                    <span
                      className="font-black text-base"
                      style={{ color: isWinner ? '#22c55e' : '#6b7280' }}
                    >
                      {formatAmount(winnerPrize)}
                    </span>
                  </div>
                </div>
              )}

              {/* Stars */}
              <div className="flex justify-center gap-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <motion.span
                    key={i}
                    className="text-xl"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + i * 0.1, type: 'spring' }}
                  >
                    {isWinner ? '⭐' : i < 2 ? '⭐' : '☆'}
                  </motion.span>
                ))}
              </div>

              {/* Button */}
              <motion.button
                onClick={onPlayAgain}
                className="w-full py-4 rounded-2xl font-black text-base text-white relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.dark})`,
                  boxShadow: `0 4px 20px ${colors.primary}40`,
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <motion.div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
                <span className="relative z-10">🎮 Back to Lobby</span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

export default WinnerModal;
