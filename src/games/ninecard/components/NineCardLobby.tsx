// src/games/ninecard/components/NineCardLobby.tsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useNineCardLobby } from '../hooks/useNineCardLobby';
import { NineCardTable } from '../types';
import { useAuth } from '../../../context/AuthContext';

// ─── Single Table Card ────────────────────────────────────────────────────────

const TableCard: React.FC<{
  table: NineCardTable;
  myUid: string;
  walletBalance: number;
  onNavigate: (id: string) => void;
}> = ({ table, myUid, walletBalance, onNavigate }) => {
  const playerCount = Object.keys(table.players).length;
  const isMyTable = !!table.players[myUid];
  const canJoin =
    !isMyTable &&
    table.gameStatus === 'waiting' &&
    playerCount < 2 &&
    walletBalance >= table.bootAmount;

  const statusColor = {
    waiting:  'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    active:   'text-green-400 bg-green-400/10 border-green-400/30',
    finished: 'text-red-400 bg-red-400/10 border-red-400/30',
  }[table.gameStatus];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className="bg-gray-900 border border-gray-700/60 rounded-xl p-4
                 hover:border-yellow-500/40 transition-colors cursor-default"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-bold text-base truncate">{table.name}</h3>
            {isMyTable && (
              <span className="px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30
                               rounded-full text-emerald-400 text-[10px] font-bold whitespace-nowrap">
                YOUR TABLE
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span className="text-gray-400">
              Boot:{' '}
              <span className="text-yellow-300 font-semibold">
                ₹{table.bootAmount.toLocaleString('en-IN')}
              </span>
            </span>
            <span className="text-gray-400">
              Players:{' '}
              <span className="text-white font-semibold">{playerCount}/2</span>
            </span>
            {table.round > 0 && (
              <span className="text-gray-400">
                Round: <span className="text-blue-400 font-semibold">#{table.round}</span>
              </span>
            )}
          </div>

          {/* Player names */}
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {Object.values(table.players).map((p) => (
              <span
                key={p.uid}
                className="px-2 py-0.5 bg-gray-800 rounded-full text-xs text-gray-300 font-medium"
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>

        {/* Status + action */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black
                        uppercase border ${statusColor}`}
          >
            {table.gameStatus === 'waiting' ? 'OPEN' : table.gameStatus.toUpperCase()}
          </span>

          {(canJoin || isMyTable) && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate(table.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold shadow-md ${
                isMyTable
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : canJoin
                  ? 'bg-gradient-to-r from-green-700 to-green-600 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!canJoin && !isMyTable}
            >
              {isMyTable ? 'Rejoin' : 'Join →'}
            </motion.button>
          )}

          {!canJoin && !isMyTable && table.gameStatus === 'waiting' && (
            <span className="text-red-400 text-[10px]">
              {walletBalance < table.bootAmount ? 'Low balance' : 'Full'}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Create Table Modal ───────────────────────────────────────────────────────

const BOOT_PRESETS = [50, 100, 200, 500, 1000, 2000];

const CreateTableModal: React.FC<{
  onClose: () => void;
  onCreate: (name: string, boot: number) => Promise<string>;
}> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [boot, setBoot] = useState(100);
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const bootValue = custom ? parseInt(custom) || boot : boot;

  const submit = async () => {
    if (!name.trim()) return setErr('Enter a table name');
    if (bootValue < 10) return setErr('Minimum boot is ₹10');
    setLoading(true);
    setErr('');
    try {
      const id = await onCreate(name.trim(), bootValue);
      // Navigation happens in parent
    } catch (e: any) {
      setErr(e?.message ?? 'Failed');
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50
                 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 22 }}
        className="bg-gray-900 border border-gray-700 rounded-2xl p-5
                   w-full max-w-sm shadow-2xl"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-black text-lg">Create Table</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        {/* Table name */}
        <div className="mb-4">
          <label className="text-gray-400 text-xs mb-1.5 block font-medium">
            Table Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Lucky Table"
            maxLength={30}
            className="w-full bg-gray-800 border border-gray-600 rounded-xl
                       px-4 py-3 text-white placeholder-gray-600
                       focus:border-yellow-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Boot presets */}
        <div className="mb-4">
          <label className="text-gray-400 text-xs mb-1.5 block font-medium">
            Boot Amount
          </label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {BOOT_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => { setBoot(p); setCustom(''); }}
                className={`py-2 rounded-xl text-sm font-bold transition-colors ${
                  boot === p && !custom
                    ? 'bg-yellow-500 text-gray-900'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                ₹{p}
              </button>
            ))}
          </div>
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/\D/g, ''))}
            placeholder="Custom amount"
            className="w-full bg-gray-800 border border-gray-600 rounded-xl
                       px-4 py-2.5 text-white placeholder-gray-600
                       focus:border-yellow-500 focus:outline-none text-sm transition-colors"
          />
        </div>

        {err && (
          <p className="text-red-400 text-sm mb-3 text-center">{err}</p>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={submit}
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-yellow-600 to-amber-500
                     text-gray-900 font-black rounded-xl disabled:opacity-50 shadow-lg"
        >
          {loading ? 'Creating...' : 'Create & Join →'}
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

// ─── Main Lobby ───────────────────────────────────────────────────────────────

export const NineCardLobby: React.FC = () => {
  const navigate = useNavigate();
  const { firebaseUser, user, wallet } = useAuth();
  const { tables, loading, creating, error, createTable } = useNineCardLobby();
  const [showCreate, setShowCreate] = useState(false);

  const balance = (wallet?.depositBalance ?? 0) + (wallet?.winningBalance ?? 0);
  const uid = firebaseUser?.uid ?? '';

  const handleCreate = async (name: string, boot: number) => {
    const id = await createTable({ name, bootAmount: boot });
    setShowCreate(false);
    navigate(`/nine-card/${id}`);
  };

  const waitingTables = tables.filter((t) => t.gameStatus === 'waiting');
  const activeTables  = tables.filter((t) => t.gameStatus === 'active');

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 bg-gray-900/90 backdrop-blur-sm
                   border-b border-gray-800 px-4 py-4"
      >
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-black text-yellow-400"
              style={{ textShadow: '0 0 16px rgba(251,191,36,0.4)' }}
            >
              🃏 9 Card Table
            </h1>
            <p className="text-gray-500 text-xs mt-0.5">
              {user?.name ?? firebaseUser?.displayName ?? 'Player'}
            </p>
          </div>

          {/* Wallet */}
          <div className="text-right">
            <p className="text-gray-500 text-[10px] uppercase tracking-wider">Wallet</p>
            <p className="text-yellow-300 text-lg font-black">
              ₹{balance.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* ── Create button ──────────────────────────────────────────── */}
        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreate(true)}
          className="w-full py-4 rounded-xl font-black text-lg text-gray-900
                     bg-gradient-to-r from-yellow-500 to-amber-400 shadow-lg"
          style={{ boxShadow: '0 4px 24px rgba(234,179,8,0.35)' }}
        >
          + Create New Table
        </motion.button>

        {/* ── How to play ────────────────────────────────────────────── */}
        <div
          className="bg-gray-900/50 border border-gray-700/40 rounded-xl p-4
                     grid grid-cols-2 gap-3 text-xs"
        >
          {[
            ['🃏', '2 Cards each'],
            ['👁', 'See or stay Blind'],
            ['💰', 'Call to continue'],
            ['🎯', 'Show to compare'],
          ].map(([icon, text]) => (
            <div key={text} className="flex items-center gap-2">
              <span>{icon}</span>
              <span className="text-gray-400">{text}</span>
            </div>
          ))}
        </div>

        {/* ── Loading ────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex justify-center py-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 rounded-full border-2 border-yellow-500 border-t-transparent"
            />
          </div>
        )}

        {/* ── Active tables ──────────────────────────────────────────── */}
        {activeTables.length > 0 && (
          <div>
            <h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2.5">
              🟢 Live Games
            </h2>
            <div className="space-y-2.5">
              <AnimatePresence>
                {activeTables.map((t) => (
                  <TableCard
                    key={t.id}
                    table={t}
                    myUid={uid}
                    walletBalance={balance}
                    onNavigate={(id) => navigate(`/nine-card/${id}`)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ── Waiting tables ─────────────────────────────────────────── */}
        {waitingTables.length > 0 && (
          <div>
            <h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2.5">
              🟡 Open Tables
            </h2>
            <div className="space-y-2.5">
              <AnimatePresence>
                {waitingTables.map((t) => (
                  <TableCard
                    key={t.id}
                    table={t}
                    myUid={uid}
                    walletBalance={balance}
                    onNavigate={(id) => navigate(`/nine-card/${id}`)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ── Empty state ────────────────────────────────────────────── */}
        {!loading && tables.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="text-6xl mb-4 opacity-30">🃏</div>
            <p className="text-gray-500 font-medium">No tables yet</p>
            <p className="text-gray-600 text-sm mt-1">Create one to start playing!</p>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <p className="text-red-400 text-center text-sm">{error}</p>
        )}
      </div>

      {/* ── Create modal ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreate && (
          <CreateTableModal
            onClose={() => setShowCreate(false)}
            onCreate={handleCreate}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
