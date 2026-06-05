import React, { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLobby } from '../../hooks/useLobby';
import TableCard from './TableCard';
import CreateTableModal from './CreateTableModal';
import JoinPrivateModal from './JoinPrivateModal';
import WaitingRoom from './WaitingRoom';
import type { GameTable } from '../../types/lobby';
import { formatAmount } from '../../utils/roomUtils';

interface LobbyPageProps {
  playerId: string;
  playerName: string;
  walletBalance: number;
  onDeductBalance: (amount: number) => Promise<boolean>;
  onAddBalance: (amount: number) => Promise<void>;
  onStartGame: (table: GameTable, playerColor: 'red' | 'green') => void;
}

export default function LobbyPage({
  playerId,
  playerName,
  walletBalance,
  onDeductBalance,
  onAddBalance,
  onStartGame,
}: LobbyPageProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinPrivate, setShowJoinPrivate] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'low' | 'high'>('all');

  const {
    publicTables,
    myTable,
    isLoading,
    error,
    joinedTableId,
    createTable,
    joinTable,
    joinByCode,
    leaveTable,
    clearError,
  } = useLobby({ playerId, playerName, walletBalance, onDeductBalance });

  // When table becomes full (status changes to playing), start game
  React.useEffect(() => {
    if (myTable?.status === 'playing' && myTable.player1Id && myTable.player2Id) {
      const myColor = myTable.player1Id === playerId ? 'red' : 'green';
      onStartGame(myTable, myColor);
    }
  }, [myTable?.status, myTable?.player2Id]);

  const filteredTables = publicTables.filter(t => {
    if (activeTab === 'low') return t.entryAmount <= 100;
    if (activeTab === 'high') return t.entryAmount > 100;
    return true;
  });

  const handleCreateTable = async (type: 'public' | 'private', amount: number, name: string) => {
    const table = await createTable(type, amount, name);
    if (table) setShowCreateModal(false);
  };

  const handleJoinTable = async (tableId: string) => {
    await joinTable(tableId);
  };

  const handleJoinByCode = async (code: string) => {
    const success = await joinByCode(code);
    if (success) setShowJoinPrivate(false);
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #0d1b2a 50%, #0a0a1a 100%)' }}
    >
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[
          { color: '#ef444430', x: '5%', y: '10%', size: 400 },
          { color: '#22c55e20', x: '75%', y: '5%', size: 350 },
          { color: '#eab30820', x: '60%', y: '70%', size: 300 },
          { color: '#3b82f615', x: '10%', y: '65%', size: 380 },
        ].map((b, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: b.size, height: b.size,
              background: `radial-gradient(circle, ${b.color}, transparent)`,
              left: b.x, top: b.y,
              filter: 'blur(80px)',
            }}
            animate={{ scale: [1, 1.2, 1], x: [0, 20, 0], y: [0, -20, 0] }}
            transition={{ duration: 10 + i * 2, repeat: Infinity, ease: 'easeInOut', delay: i * 2 }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 pb-24">
        {/* Header */}
        <div className="pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <motion.span
                className="text-3xl"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >🎯</motion.span>
              <div>
                <h1
                  className="text-xl font-black"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444, #eab308, #22c55e)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  LUDO PRO
                </h1>
                <p className="text-gray-500 text-xs">Real Money Gaming</p>
              </div>
            </div>

            {/* Wallet */}
            <motion.div
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(234,179,8,0.15), rgba(234,179,8,0.05))',
                border: '1px solid rgba(234,179,8,0.3)',
              }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="text-lg">💰</span>
              <div>
                <p className="text-xs text-yellow-500/70">Balance</p>
                <p className="text-yellow-400 font-bold text-sm">{formatAmount(walletBalance)}</p>
              </div>
            </motion.div>
          </div>

          {/* Player info */}
          <div
            className="flex items-center gap-3 p-3 rounded-2xl mb-4"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
              style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
            >
              {playerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{playerName}</p>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <p className="text-gray-500 text-xs">Online</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-lg"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <span className="text-green-400 text-xs font-medium">🏆 Ready</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <motion.button
            onClick={() => setShowCreateModal(true)}
            className="relative overflow-hidden py-4 rounded-2xl font-bold text-white"
            style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              boxShadow: '0 4px 20px rgba(239,68,68,0.35)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
            <span className="relative z-10 text-sm">
              ➕ Create Table
            </span>
          </motion.button>

          <motion.button
            onClick={() => setShowJoinPrivate(true)}
            className="py-4 rounded-2xl font-bold text-white text-sm"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              boxShadow: '0 4px 20px rgba(59,130,246,0.35)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            🔑 Join Private
          </motion.button>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-between p-3 rounded-xl mb-4"
              style={{
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.3)',
              }}
            >
              <span className="text-red-400 text-sm">⚠️ {error}</span>
              <button onClick={clearError} className="text-red-400 text-lg">×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tables section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-base">🎮 Live Tables</h2>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-gray-500 text-xs">{publicTables.length} open</span>
            </div>
          </div>

          {/* Filter tabs */}
          <div
            className="flex gap-1 p-1 rounded-xl mb-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {(['all', 'low', 'high'] as const).map(tab => (
              <motion.button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: activeTab === tab ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: activeTab === tab ? 'white' : '#6b7280',
                }}
                whileTap={{ scale: 0.97 }}
              >
                {tab === 'all' ? '🎯 All' : tab === 'low' ? '💚 ≤₹100' : '🔥 >₹100'}
              </motion.button>
            ))}
          </div>

          {/* Table list */}
          <div className="flex flex-col gap-3">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredTables.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-10"
              >
                <div className="text-4xl mb-3">🎲</div>
                <p className="text-gray-400 text-sm">No tables available</p>
                <p className="text-gray-600 text-xs mt-1">Create one to start playing!</p>
              </motion.div>
            ) : (
              filteredTables.map((table, i) => (
                <motion.div
                  key={table.tableId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <TableCard
                    table={table}
                    playerId={playerId}
                    onJoin={handleJoinTable}
                    walletBalance={walletBalance}
                    isLoading={isLoading}
                  />
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Platform info */}
        <div
          className="p-4 rounded-2xl mt-4"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-400">ℹ️</span>
            <span className="text-gray-400 text-xs font-medium">Platform Rules</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              10% platform charge
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              90% winner prize
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              3 lives per player
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              10s per turn
            </div>
          </div>
        </div>
      </div>

      {/* Waiting room overlay */}
      <AnimatePresence>
        {myTable && myTable.status === 'waiting' && (
          <WaitingRoom
            table={myTable}
            playerId={playerId}
            onCancel={() => leaveTable(myTable.tableId)}
          />
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateTableModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateTable}
            isLoading={isLoading}
            walletBalance={walletBalance}
            error={error}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showJoinPrivate && (
          <JoinPrivateModal
            onClose={() => setShowJoinPrivate(false)}
            onJoin={handleJoinByCode}
            isLoading={isLoading}
            error={error}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
