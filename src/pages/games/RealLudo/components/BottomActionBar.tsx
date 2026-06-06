import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { LogOut, MessageCircle, Smile } from 'lucide-react';
import DiceRoller from './DiceRoller';
import { LudoColor } from '../constants/boardLayout';

interface BottomActionBarProps {
  diceValue: number | null;
  isRolling: boolean;
  canRoll: boolean;
  myColor: LudoColor;
  consecutiveSixes: number;
  status: string;
  isMyTurn: boolean;
  movableCount: number;
  onRoll: () => void;
  onLeave: () => void;
  onEmoji?: () => void;
  onChat?: () => void;
}

const BottomActionBar: React.FC<BottomActionBarProps> = memo(({
  diceValue, isRolling, canRoll, myColor,
  consecutiveSixes, status, isMyTurn, movableCount,
  onRoll, onLeave, onEmoji, onChat,
}) => {
  return (
    <div
      className="flex-shrink-0 flex items-center gap-3 px-3 py-3"
      style={{
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Left action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onLeave}
          className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90"
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.25)',
          }}
        >
          <LogOut size={16} className="text-red-400" />
        </button>

        <button
          onClick={onEmoji}
          className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Smile size={16} className="text-white/50" />
        </button>
      </div>

      {/* Center: Status + Dice */}
      <div className="flex-1 flex flex-col items-center gap-1.5">
        {/* Status text */}
        <p
          className="text-xs font-bold text-center leading-tight"
          style={{
            color: status === 'waiting'
              ? 'rgba(251,191,36,0.8)'
              : isMyTurn
              ? '#ffffff'
              : 'rgba(255,255,255,0.4)',
            minHeight: 14,
          }}
        >
          {status === 'waiting'
            ? '⏳ Waiting for opponent'
            : status === 'finished'
            ? '🏁 Game over'
            : isMyTurn
            ? canRoll
              ? '🎲 Your turn — Roll!'
              : movableCount > 0
              ? `👆 Move a token (${movableCount})`
              : '⏳ No moves...'
            : "⌛ Opponent's turn"}
        </p>

        {consecutiveSixes > 0 && (
          <p className="text-[10px] text-orange-400 font-bold">
            🔥 {consecutiveSixes}× Six!
          </p>
        )}
      </div>

      {/* Right: Dice + Chat */}
      <div className="flex items-center gap-2">
        <DiceRoller
          value={diceValue}
          isRolling={isRolling}
          canRoll={canRoll}
          color={myColor === 'red' ? 'red' : 'green'}
          onRoll={onRoll}
          size={52}
        />

        <button
          onClick={onChat}
          className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <MessageCircle size={16} className="text-white/50" />
        </button>
      </div>
    </div>
  );
});

BottomActionBar.displayName = 'BottomActionBar';
export default BottomActionBar;
