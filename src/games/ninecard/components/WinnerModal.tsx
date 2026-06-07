// src/games/ninecard/components/WinnerModal.tsx

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NineCardTable } from '../types';
import { PlayingCard } from './PlayingCard';

interface WinnerModalProps {
  table: NineCardTable;
  myUid: string;
  onNewGame?: () => void;
  onLobby: () => void;
}

// Confetti using CSS — no external dependency
const useConfetti = (active: boolean) => {
  useEffect(() => {
    if (!active) return;
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#FFA500', '#A8E6CF'];
    const container = document.createElement('div');
    container.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      pointer-events:none;z-index:9999;overflow:hidden;
    `;
    document.body.appendChild(container);

    const pieces: HTMLDivElement[] = [];
    for (let i = 0; i < 80; i++) {
      const piece = document.createElement('div');
      const color = colors[Math.floor(Math.random() * colors.length)];
      const left = Math.random() * 100;
      const delay = Math.random() * 1.5;
      const duration = 2.5 + Math.random() * 2;
      const size = 6 + Math.random() * 8;

      piece.style.cssText = `
        position:absolute;
        left:${left}%;top:-10%;
        width:${size}px;height:${size}px;
        background:${color};
        border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
        animation:fall ${duration}s ${delay}s linear forwards;
        transform:rotate(${Math.random() * 360}deg);
      `;
      container.appendChild(piece);
      pieces.push(piece);
    }

    // Inject keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fall {
        0%   { transform: translateY(0) rotate(0deg);   opacity: 1; }
        100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    const cleanup = setTimeout(() => {
      container.remove();
      style.remove();
    }, 5000);

    return () => {
      clearTimeout(cleanup);
      container.remove();
      style.remove();
    };
  }, [active]);
};

export const WinnerModal: React.FC<WinnerModalProps> = ({
  table,
  myUid,
  onLobby,
}) => {
  const isVisible = table.gameStatus === 'finished';
  const isDraw = table.winner === 'draw';
  const isWinner = table.winner === myUid && !isDraw;
  const isLoser = table.winner !== myUid && !isDraw;

  useConfetti(isVisible && isWinner);

  if (!isVisible) return null;

  const winnerPlayer = table.winner && !isDraw
    ? table.players[table.winner]
    : null;

  const splitAmount = isDraw ? Math.floor(table.potAmount / 2) : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/85 backdrop-blur-md z-50
                   flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.4, y: 80, rotateX: -20 }}
          animate={{ scale: 1, y: 0, rotateX: 0 }}
          transition={{ type: 'spring', damping: 16, stiffness: 200 }}
          className="relative bg-gradient-to-b from-gray-800 to-gray-900
                     border-2 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl
                     overflow-hidden"
          style={{
            borderColor: isWinner
              ? '#ffd700'
              : isDraw
              ? '#60a5fa'
              : '#ef4444',
            boxShadow: isWinner
              ? '0 0 60px rgba(255,215,0,0.3)'
              : isDraw
              ? '0 0 40px rgba(96,165,250,0.2)'
              : '0 0 40px rgba(239,68,68,0.2)',
          }}
        >
          {/* Background glow orb */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32
                       rounded-full opacity-10 blur-3xl -z-0"
            style={{
              background: isWinner
                ? '#ffd700'
                : isDraw
                ? '#60a5fa'
                : '#ef4444',
            }}
          />

          {/* ── Result emoji ─────────────────────────────────────────── */}
          <motion.div
            animate={
              isWinner
                ? { rotate: [0, -12, 12, -6, 0], scale: [1, 1.2, 1] }
                : { scale: [1, 0.9, 1] }
            }
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-6xl mb-3 relative z-10"
          >
            {isDraw ? '🤝' : isWinner ? '🏆' : '😔'}
          </motion.div>

          {/* ── Result heading ───────────────────────────────────────── */}
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-4xl font-black mb-1 relative z-10"
            style={{
              color: isWinner ? '#ffd700' : isDraw ? '#93c5fd' : '#f87171',
              textShadow: isWinner
                ? '0 0 20px rgba(255,215,0,0.6)'
                : undefined,
            }}
          >
            {isDraw ? 'DRAW!' : isWinner ? 'YOU WIN!' : 'YOU LOSE'}
          </motion.h2>

          {winnerPlayer && !isDraw && (
            <p className="text-gray-300 text-sm mb-3 relative z-10">
              {isWinner
                ? 'Congratulations! 🎉'
                : `${winnerPlayer.name} wins this round`}
            </p>
          )}

          {/* ── Pot / payout ─────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45 }}
            className="bg-black/30 rounded-xl p-3 mb-4 relative z-10 border border-white/5"
          >
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
              {isDraw ? 'Each player receives' : isWinner ? 'You receive' : 'Pot won by opponent'}
            </p>
            <p
              className="text-3xl font-black"
              style={{ color: '#ffd700', textShadow: '0 0 16px rgba(255,215,0,0.5)' }}
            >
              ₹{(isDraw ? splitAmount : table.potAmount).toLocaleString('en-IN')}
            </p>
          </motion.div>

          {/* ── Win reason ───────────────────────────────────────────── */}
          {table.winnerReason && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="text-gray-400 text-xs mb-4 italic relative z-10 leading-relaxed"
            >
              "{table.winnerReason}"
            </motion.p>
          )}

          {/* ── Showdown cards ───────────────────────────────────────── */}
          {Object.keys(table.showdownCards ?? {}).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mb-5 relative z-10"
            >
              <p className="text-gray-400 text-xs mb-2 uppercase tracking-wider">
                Showdown
              </p>
              <div className="flex justify-center gap-6">
                {table.playerOrder.map((uid) => {
                  const cards = table.showdownCards?.[uid];
                  const p = table.players[uid];
                  if (!cards || !p) return null;
                  return (
                    <div key={uid} className="text-center">
                      <p className="text-gray-300 text-xs mb-1.5 font-medium">
                        {p.name}
                        {uid === table.winner && (
                          <span className="ml-1 text-yellow-400">🏆</span>
                        )}
                      </p>
                      <div className="flex gap-1.5 justify-center">
                        {cards.map((card, i) => (
                          <PlayingCard
                            key={i}
                            card={card}
                            size="sm"
                            dealDelay={0.65 + i * 0.1}
                            isWinner={uid === table.winner}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── Action buttons ───────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="relative z-10"
          >
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={onLobby}
              className="w-full py-3.5 rounded-xl font-bold text-base
                         bg-gradient-to-r from-yellow-600 to-amber-500
                         text-gray-900 shadow-lg"
              style={{ boxShadow: '0 4px 20px rgba(234,179,8,0.4)' }}
            >
              ← Back to Lobby
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
