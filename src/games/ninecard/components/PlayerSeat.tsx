// src/games/ninecard/components/PlayerSeat.tsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NineCardPlayer, NineCard, NineCardGameStatus } from '../types';
import { PlayingCard } from './PlayingCard';
import { calculateHandValue } from '../engine';

interface PlayerSeatProps {
  player: NineCardPlayer | null;
  cards: NineCard[];            // My decoded cards (only for self)
  isOpponent: boolean;
  isActive: boolean;
  showdownCards?: NineCard[];   // Revealed after show
  gameStatus: NineCardGameStatus;
  isMe?: boolean;
  position: 'top' | 'bottom';
}

const STATUS_CONFIG = {
  blind:   { label: 'BLIND',   bg: 'from-blue-600 to-blue-500',   text: 'text-white' },
  seen:    { label: 'SEEN',    bg: 'from-emerald-600 to-green-500', text: 'text-white' },
  packed:  { label: 'FOLDED',  bg: 'from-red-700 to-red-600',     text: 'text-white' },
  winner:  { label: 'WINNER',  bg: 'from-yellow-500 to-amber-400', text: 'text-gray-900' },
  waiting: { label: 'WAITING', bg: 'from-gray-600 to-gray-500',   text: 'text-white' },
};

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  cards,
  isOpponent,
  isActive,
  showdownCards,
  gameStatus,
  isMe = false,
  position,
}) => {
  // ── Empty seat ────────────────────────────────────────────────────────────
  if (!player) {
    return (
      <div className={`flex flex-col items-center gap-3 ${position === 'top' ? 'flex-col-reverse' : ''}`}>
        <div className="flex items-center gap-2 opacity-40">
          <div className="w-11 h-11 rounded-full border-2 border-dashed border-gray-500 flex items-center justify-center">
            <span className="text-gray-500 text-lg">?</span>
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">Waiting...</p>
            <p className="text-gray-600 text-xs">Empty Seat</p>
          </div>
        </div>
        <div className="flex gap-2">
          <PlayingCard size="md" />
          <PlayingCard size="md" />
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[player.status];
  const displayCards = showdownCards ?? (isOpponent ? [] : cards);
  const showFaceUp = !isOpponent || !!showdownCards;
  const isFinished = gameStatus === 'finished';

  // Calculate hand value if cards visible
  const handResult =
    displayCards.length === 2 && (showFaceUp || isFinished)
      ? calculateHandValue(displayCards)
      : null;

  // ── Active turn ring ──────────────────────────────────────────────────────
  const avatarRingClass = isActive
    ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-green-900'
    : player.status === 'winner'
    ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-green-900'
    : 'ring-2 ring-gray-600';

  return (
    <motion.div
      layout
      className={`flex flex-col items-center gap-2.5 ${
        position === 'top' ? 'flex-col-reverse' : ''
      }`}
    >
      {/* ── Player info bar ─────────────────────────────────────────── */}
      <motion.div
        className="flex items-center gap-2.5"
        animate={
          player.status === 'winner'
            ? { scale: [1, 1.06, 1], transition: { duration: 1, repeat: Infinity } }
            : {}
        }
      >
        {/* Avatar */}
        <div className="relative">
          {player.photoURL ? (
            <img
              src={player.photoURL}
              alt={player.name}
              className={`w-11 h-11 rounded-full object-cover ${avatarRingClass}`}
            />
          ) : (
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center
                          text-white text-lg font-bold bg-gradient-to-br
                          from-gray-700 to-gray-600 ${avatarRingClass}`}
            >
              {player.name[0]?.toUpperCase() ?? '?'}
            </div>
          )}

          {/* Active dot pulse */}
          {isActive && (
            <motion.div
              className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-yellow-400 rounded-full border-2 border-green-900"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </div>

        {/* Name + bet */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p
              className={`text-sm font-bold truncate max-w-[100px] ${
                isMe ? 'text-emerald-300' : 'text-white'
              }`}
            >
              {player.name}
              {isMe && <span className="text-xs text-emerald-500 ml-1">(You)</span>}
            </p>
          </div>
          <p className="text-gray-400 text-xs">
            Bet: <span className="text-yellow-300">₹{player.totalBet}</span>
          </p>
        </div>

        {/* Status badge */}
        <motion.span
          className={`px-2 py-0.5 rounded-full text-xs font-black bg-gradient-to-r
                      ${statusCfg.bg} ${statusCfg.text} shadow-sm whitespace-nowrap`}
          animate={
            player.status === 'winner'
              ? {
                  boxShadow: [
                    '0 0 0px rgba(251,191,36,0)',
                    '0 0 12px rgba(251,191,36,0.8)',
                    '0 0 4px rgba(251,191,36,0.3)',
                  ],
                  transition: { duration: 1.2, repeat: Infinity },
                }
              : {}
          }
        >
          {statusCfg.label}
        </motion.span>
      </motion.div>

      {/* ── Cards ────────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        {player.status === 'packed' ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-36 h-24 rounded-xl border border-red-800 bg-red-950/40
                       flex items-center justify-center"
          >
            <span className="text-red-500 font-bold text-sm tracking-widest">FOLDED</span>
          </motion.div>
        ) : isOpponent && !showdownCards ? (
          // Opponent — show card backs
          <>
            <PlayingCard faceDown size="md" dealDelay={0.15} />
            <PlayingCard faceDown size="md" dealDelay={0.30} />
          </>
        ) : displayCards.length === 2 ? (
          // Show actual cards
          <>
            <PlayingCard
              card={displayCards[0]}
              size="md"
              dealDelay={0.15}
              isWinner={player.status === 'winner'}
            />
            <PlayingCard
              card={displayCards[1]}
              size="md"
              dealDelay={0.30}
              isWinner={player.status === 'winner'}
            />
          </>
        ) : (
          // Placeholder while dealing
          <>
            <PlayingCard size="md" />
            <PlayingCard size="md" />
          </>
        )}
      </div>

      {/* ── Hand value display ───────────────────────────────────────── */}
      <AnimatePresence>
        {handResult && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="text-center bg-black/40 rounded-lg px-3 py-1"
          >
            <p className="text-yellow-300 text-sm font-bold">
              Value:{' '}
              {handResult.value === -1
                ? 'English Draw'
                : handResult.value}
            </p>
            <p className="text-gray-400 text-xs">{handResult.description}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
