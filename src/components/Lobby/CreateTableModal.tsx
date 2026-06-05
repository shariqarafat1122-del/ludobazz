import React, { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { AMOUNT_OPTIONS } from '../../constants/board';
import { formatAmount, calculatePrize } from '../../utils/roomUtils';

interface CreateTableModalProps {
  onClose: () => void;
  onCreate: (type: 'public' | 'private', amount: number, name: string) => void;
  isLoading: boolean;
  walletBalance: number;
  error: string | null;
}

const CreateTableModal = memo(function CreateTableModal({
  onClose,
  onCreate,
  isLoading,
  walletBalance,
  error,
}: CreateTableModalProps) {
  const [tableType, setTableType] = useState<'public' | 'private'>('public');
  const [selectedAmount, setSelectedAmount] = useState(50);
  const [tableName, setTableName] = useState('');

  const { winnerPrize, platformCut, totalPool } = calculatePrize(selectedAmount);
  const canAfford = walletBalance >= selectedAmount;

  const handleCreate = () => {
    if (!canAfford || isLoading) return;
    onCreate(tableType, selectedAmount, tableName);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        className="relative z-10 w-full max-w-sm mx-4 mb-4"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0f0f23, #1a1a3e)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div
            className="px-5 pt-5 pb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.15), transparent)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-white font-black text-lg">➕ Create Table</h2>
                <p className="text-gray-400 text-xs mt-0.5">Set up your game room</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-white"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >✕</button>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Table type */}
            <div>
              <p className="text-gray-400 text-xs font-medium mb-2">TABLE TYPE</p>
              <div className="grid grid-cols-2 gap-2">
                {(['public', 'private'] as const).map(type => (
                  <motion.button
                    key={type}
                    onClick={() => setTableType(type)}
                    className="py-3 rounded-xl font-semibold text-sm transition-all"
                    style={{
                      background: tableType === type
                        ? 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(239,68,68,0.1))'
                        : 'rgba(255,255,255,0.04)',
                      border: tableType === type
                        ? '1px solid rgba(239,68,68,0.5)'
                        : '1px solid rgba(255,255,255,0.08)',
                      color: tableType === type ? 'white' : '#6b7280',
                    }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {type === 'public' ? '🌐 Public' : '🔒 Private'}
                  </motion.button>
                ))}
              </div>
              {tableType === 'private' && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-xs text-yellow-500/70 mt-2 px-1"
                >
                  ⚠️ A unique room code will be generated for your table
                </motion.p>
              )}
            </div>

            {/* Table name */}
            <div>
              <p className="text-gray-400 text-xs font-medium mb-2">TABLE NAME (OPTIONAL)</p>
              <input
                type="text"
                placeholder="My Ludo Table..."
                value={tableName}
                onChange={e => setTableName(e.target.value)}
                maxLength={30}
                className="w-full px-4 py-3 rounded-xl text-white text-sm placeholder-gray-600 outline-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
            </div>

            {/* Entry amount */}
            <div>
              <p className="text-gray-400 text-xs font-medium mb-2">ENTRY AMOUNT</p>
              <div className="grid grid-cols-4 gap-2">
                {AMOUNT_OPTIONS.map(amount => {
                  const canSelectAmount = walletBalance >= amount;
                  return (
                    <motion.button
                      key={amount}
                      onClick={() => canSelectAmount && setSelectedAmount(amount)}
                      className="py-2.5 rounded-xl text-xs font-bold transition-all"
                      style={{
                        background: selectedAmount === amount
                          ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                          : !canSelectAmount
                          ? 'rgba(50,50,50,0.3)'
                          : 'rgba(255,255,255,0.06)',
                        border: selectedAmount === amount
                          ? '1px solid rgba(239,68,68,0.5)'
                          : '1px solid rgba(255,255,255,0.08)',
                        color: selectedAmount === amount
                          ? 'white'
                          : !canSelectAmount
                          ? '#444'
                          : '#9ca3af',
                        cursor: !canSelectAmount ? 'not-allowed' : 'pointer',
                        boxShadow: selectedAmount === amount ? '0 4px 12px rgba(239,68,68,0.3)' : 'none',
                      }}
                      whileTap={canSelectAmount ? { scale: 0.95 } : {}}
                    >
                      ₹{amount >= 1000 ? `${amount / 1000}K` : amount}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Prize breakdown */}
            <div
              className="p-3 rounded-xl space-y-2"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <p className="text-gray-400 text-xs font-medium">PRIZE BREAKDOWN</p>
              <div className="space-y-1.5">
                {[
                  { label: 'Total Prize Pool', value: formatAmount(totalPool), color: '#ffffff' },
                  { label: 'Platform (10%)', value: `-${formatAmount(platformCut)}`, color: '#6b7280' },
                  { label: 'Winner Gets', value: formatAmount(winnerPrize), color: '#22c55e' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center">
                    <span className="text-gray-500 text-xs">{item.label}</span>
                    <span className="text-xs font-bold" style={{ color: item.color }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-400 text-xs text-center">{error}</p>
            )}

            {/* Create button */}
            <motion.button
              onClick={handleCreate}
              disabled={!canAfford || isLoading}
              className="w-full py-4 rounded-2xl font-black text-sm relative overflow-hidden"
              style={{
                background: !canAfford
                  ? 'rgba(100,100,100,0.2)'
                  : 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: !canAfford ? '#6b7280' : 'white',
                boxShadow: !canAfford ? 'none' : '0 4px 20px rgba(239,68,68,0.4)',
                cursor: !canAfford ? 'not-allowed' : 'pointer',
              }}
              whileHover={canAfford ? { scale: 1.02 } : {}}
              whileTap={canAfford ? { scale: 0.98 } : {}}
            >
              {canAfford && !isLoading && (
                <motion.div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              )}
              <span className="relative z-10">
                {isLoading
                  ? '⏳ Creating...'
                  : !canAfford
                  ? `💸 Need ${formatAmount(selectedAmount)}`
                  : `🚀 Create · ${formatAmount(selectedAmount)}`}
              </span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

export default CreateTableModal;
