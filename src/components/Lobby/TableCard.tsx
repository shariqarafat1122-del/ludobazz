import React, { memo } from 'react';
import { motion } from 'framer-motion';
import type { GameTable } from '../../types/lobby';
import { formatAmount, calculatePrize } from '../../utils/roomUtils';

interface TableCardProps {
  table: GameTable;
  playerId: string;
  onJoin: (tableId: string) => void;
  walletBalance: number;
  isLoading: boolean;
}

const TableCard = memo(function TableCard({
  table,
  playerId,
  onJoin,
  walletBalance,
  isLoading,
}: TableCardProps) {
  const isMyTable = table.player1Id === playerId;
  const canAfford = walletBalance >= table.entryAmount;
  const { winnerPrize } = calculatePrize(table.entryAmount);

  const amountColor =
    table.entryAmount <= 50 ? '#22c55e' :
    table.entryAmount <= 200 ? '#eab308' :
    '#ef4444';

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: 'rgba(15, 15, 35, 0.9)',
        border: isMyTable
          ? '1px solid rgba(239,68,68,0.4)'
          : '1px solid rgba(255,255,255,0.08)',
        boxShadow: isMyTable
          ? '0 0 20px rgba(239,68,68,0.15)'
          : '0 4px 20px rgba(0,0,0,0.3)',
      }}
      whileHover={{ scale: 1.01 }}
    >
      {/* Shimmer */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, rgba(${
            table.entryAmount > 200 ? '239,68,68' : '255,255,255'
          },0.03), transparent)`,
        }}
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      />

      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          {/* Table info */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{
                background: `linear-gradient(135deg, ${amountColor}25, ${amountColor}10)`,
                border: `1px solid ${amountColor}40`,
              }}
            >
              🎮
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{table.tableName}</p>
              <p className="text-gray-500 text-xs">{table.creatorName}</p>
            </div>
          </div>

          {/* Entry amount badge */}
          <div
            className="px-3 py-1.5 rounded-xl"
            style={{
              background: `${amountColor}15`,
              border: `1px solid ${amountColor}40`,
            }}
          >
            <p className="text-xs font-bold" style={{ color: amountColor }}>
              {formatAmount(table.entryAmount)}
            </p>
          </div>
        </div>

        {/* Prize info */}
        <div
          className="flex items-center justify-between p-2.5 rounded-xl mb-3"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <div className="text-center">
            <p className="text-gray-500 text-xs">Entry</p>
            <p className="text-white font-bold text-sm">{formatAmount(table.entryAmount)}</p>
          </div>
          <div className="text-gray-600">→</div>
          <div className="text-center">
            <p className="text-gray-500 text-xs">Prize Pool</p>
            <p className="text-white font-bold text-sm">{formatAmount(table.entryAmount * 2)}</p>
          </div>
          <div className="text-gray-600">→</div>
          <div className="text-center">
            <p className="text-green-500 text-xs">Win</p>
            <p className="text-green-400 font-bold text-sm">{formatAmount(winnerPrize)}</p>
          </div>
        </div>

        {/* Players */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-gray-400 text-xs">{table.player1Name}</span>
          </div>
          <span className="text-gray-600 text-xs">vs</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-gray-600" />
            <span className="text-gray-600 text-xs">Waiting...</span>
          </div>
        </div>

        {/* Join button */}
        {!isMyTable && (
          <motion.button
            onClick={() => onJoin(table.tableId)}
            disabled={isLoading || !canAfford}
            className="w-full py-2.5 rounded-xl font-bold text-sm transition-all"
            style={{
              background: !canAfford
                ? 'rgba(100,100,100,0.2)'
                : `linear-gradient(135deg, ${amountColor}, ${amountColor}cc)`,
              color: !canAfford ? '#6b7280' : 'white',
              boxShadow: !canAfford ? 'none' : `0 4px 12px ${amountColor}40`,
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: !canAfford ? 'not-allowed' : 'pointer',
            }}
            whileHover={canAfford ? { scale: 1.02 } : {}}
            whileTap={canAfford ? { scale: 0.98 } : {}}
          >
            {!canAfford
              ? '💸 Insufficient Balance'
              : isLoading
              ? '⏳ Joining...'
              : `⚔️ Join · ${formatAmount(table.entryAmount)}`}
          </motion.button>
        )}

        {isMyTable && (
          <div
            className="w-full py-2.5 rounded-xl text-center text-xs font-semibold"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444',
            }}
          >
            ⏳ Your table · Waiting for opponent...
          </div>
        )}
      </div>
    </motion.div>
  );
});

export default TableCard;
