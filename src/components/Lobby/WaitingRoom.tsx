import React, { useState, useEffect, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameTable } from '../../types/lobby';
import { formatAmount } from '../../utils/roomUtils';

interface WaitingRoomProps {
  table: GameTable;
  playerId: string;
  onCancel: () => void;
}

const WaitingRoom = memo(function WaitingRoom({
  table,
  playerId,
  onCancel,
}: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);
  const [dots, setDots] = useState('.');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '.' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const copyCode = useCallback(async () => {
    if (!table.roomCode) return;
    await navigator.clipboard.writeText(table.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [table.roomCode]);

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Blurred backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)' }}
      />

      <motion.div
        className="relative z-10 w-full max-w-sm mx-4"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 25 }}
      >
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0f0f23, #1a1a3e)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div
            className="px-6 pt-6 pb-4 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.1), transparent)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Spinning loader */}
            <div className="flex justify-center mb-4">
              <div className="relative w-16 h-16">
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ border: '3px solid rgba(239,68,68,0.2)' }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: '3px solid transparent',
                    borderTopColor: '#ef4444',
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-2xl">
                  🎮
                </div>
              </div>
            </div>

            <h2 className="text-white font-black text-xl">Waiting for Opponent{dots}</h2>
            <p className="text-gray-400 text-sm mt-1">{table.tableName}</p>
          </div>

          <div className="p-6 space-y-4">
            {/* Table details */}
            <div
              className="grid grid-cols-3 gap-2 p-3 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              {[
                { label: 'Entry', value: formatAmount(table.entryAmount), icon: '💰' },
                { label: 'Prize Pool', value: formatAmount(table.entryAmount * 2), icon: '🏆' },
                { label: 'You Win', value: formatAmount(Math.floor(table.entryAmount * 2 * 0.9)), icon: '🎯' },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <div className="text-base mb-1">{item.icon}</div>
                  <p className="text-white font-bold text-xs">{item.value}</p>
                  <p className="text-gray-500 text-xs">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Players */}
            <div className="space-y-2">
              {/* Player 1 (you) */}
              <div
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                >
                  {table.player1Name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-semibold">{table.player1Name} (You)</p>
                  <p className="text-red-400 text-xs">Red Player</p>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400 text-xs">Ready</span>
                </div>
              </div>

              {/* Player 2 slot */}
              <div
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px dashed rgba(255,255,255,0.12)',
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.15)' }}
                >
                  ?
                </div>
                <div className="flex-1">
                  <p className="text-gray-500 text-sm">Waiting for player{dots}</p>
                  <p className="text-gray-600 text-xs">Green Player</p>
                </div>
                <motion.div
                  className="w-2 h-2 rounded-full bg-yellow-500"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>
            </div>

            {/* Private room code */}
            {table.type === 'private' && table.roomCode && (
              <div
                className="p-4 rounded-2xl text-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.05))',
                  border: '1px solid rgba(59,130,246,0.3)',
                }}
              >
                <p className="text-blue-400 text-xs font-medium mb-2">🔑 PRIVATE ROOM CODE</p>
                <p className="text-white font-black text-3xl tracking-[0.3em] mb-3">
                  {table.roomCode}
                </p>
                <motion.button
                  onClick={copyCode}
                  className="px-4 py-2 rounded-xl text-xs font-semibold"
                  style={{
                    background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(59,130,246,0.2)',
                    border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : 'rgba(59,130,246,0.4)'}`,
                    color: copied ? '#22c55e' : '#93c5fd',
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  {copied ? '✅ Copied!' : '📋 Copy Code'}
                </motion.button>
                <p className="text-gray-500 text-xs mt-2">Share this code with your friend</p>
              </div>
            )}

            {/* Cancel */}
            <motion.button
              onClick={onCancel}
              className="w-full py-3 rounded-xl text-gray-400 text-sm font-medium"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              whileHover={{ scale: 1.02, color: '#ef4444' }}
              whileTap={{ scale: 0.98 }}
            >
              ✕ Cancel & Leave Table
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

export default WaitingRoom;
