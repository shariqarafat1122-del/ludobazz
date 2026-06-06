import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { LudoPlayerState } from '../../../../firebase/RealLudo';
import { COLOR_THEME, LudoColor } from '../constants/boardLayout';

interface PlayerPanelProps {
  player: LudoPlayerState | null;
  isMe: boolean;
  isActive: boolean;
  diceValue: number | null;
  slot: 'left' | 'right';
}

const PlayerPanel: React.FC<PlayerPanelProps> = memo(({
  player, isMe, isActive, diceValue, slot,
}) => {
  const color = (player?.color || 'red') as LudoColor;
  const t = COLOR_THEME[color];
  const tokensLeft = 4 - (player?.tokensHome || 0);

  return (
    <motion.div
      animate={
        isActive
          ? {
              boxShadow: [
                `0 0 0 1px ${t.glow.replace('0.6', '0.3')}`,
                `0 0 20px ${t.glow}, 0 0 0 1px ${t.glow.replace('0.6', '0.5')}`,
                `0 0 0 1px ${t.glow.replace('0.6', '0.3')}`,
              ],
            }
          : { boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }
      }
      transition={{ duration: 1.5, repeat: isActive ? Infinity : 0 }}
      className="flex-1 flex items-center gap-2 px-2.5 py-2 rounded-2xl overflow-hidden relative"
      style={{
        background: isActive
          ? `rgba(${color === 'red' ? '239,68,68' : '34,197,94'},0.1)`
          : 'rgba(255,255,255,0.04)',
        flexDirection: slot === 'right' ? 'row-reverse' : 'row',
      }}
    >
      {/* Active shimmer */}
      {isActive && (
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${t.glow.replace('0.6', '0.15')}, transparent)`,
          }}
        />
      )}

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm"
          style={{
            background: player
              ? `linear-gradient(135deg, ${t.light}33, ${t.primary}33)`
              : 'rgba(255,255,255,0.05)',
            border: `2px solid ${player ? t.primary : 'rgba(255,255,255,0.08)'}`,
            color: player ? t.light : 'rgba(255,255,255,0.2)',
          }}
        >
          {player?.name?.[0]?.toUpperCase() || '?'}
        </div>
        {/* Online dot */}
        {player && (
          <div
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
            style={{
              background: player.isOnline ? '#22c55e' : '#64748b',
              borderColor: '#070714',
            }}
          />
        )}
      </div>

      {/* Info */}
      <div
        className="flex-1 min-w-0"
        style={{ textAlign: slot === 'right' ? 'right' : 'left' }}
      >
        <div
          className="flex items-center gap-1"
          style={{
            justifyContent: slot === 'right' ? 'flex-end' : 'flex-start',
          }}
        >
          {isActive && (
            <motion.span
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: t.primary, flexShrink: 0 }}
            />
          )}
          <span className="text-white font-bold text-xs truncate">
            {player ? (isMe ? 'You' : player.name) : 'Waiting...'}
          </span>
        </div>

        {/* Token count dots */}
        <div
          className="flex gap-0.5 mt-1"
          style={{
            justifyContent: slot === 'right' ? 'flex-end' : 'flex-start',
          }}
        >
          {[0,1,2,3].map(i => (
            <div
              key={i}
              className="rounded-full transition-all"
              style={{
                width: 5, height: 5,
                background: i < tokensLeft ? t.primary : 'rgba(255,255,255,0.1)',
                boxShadow: i < tokensLeft ? `0 0 4px ${t.glow}` : 'none',
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
});

PlayerPanel.displayName = 'PlayerPanel';
export default PlayerPanel;
