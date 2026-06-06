import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../../context/AuthContext';
import {
  LudoGame,
  createLudoGame,
  joinLudoGame,
  subscribeOpenLudoGames,
} from '../../firebase/RealLudo';
import toast from 'react-hot-toast';
import { calculateUsableBalance } from '../../utils/helpers';

const ENTRY_FEES = [10, 25, 50, 100, 500];

export default function RealLudoLobby() {
  const { user, wallet } = useAuth(); // ✅ wallet from AuthContext
  const navigate = useNavigate();

  const [openGames, setOpenGames] = useState<LudoGame[]>([]);
  const [selectedFee, setSelectedFee] = useState(10);
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // ✅ Use wallet from AuthContext
  const usableBalance = wallet ? calculateUsableBalance(wallet) : 0;

  // Subscribe to open games
  useEffect(() => {
    return subscribeOpenLudoGames((games) => {
      // Filter out own games
      setOpenGames(games.filter((g) => g.createdBy !== user?.uid));
    });
  }, [user?.uid]);

  // ── Create Game ──────────────────────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    if (!user) return;

    if (usableBalance < selectedFee) {
      toast.error(`Insufficient balance! Need ₹${selectedFee}`);
      return;
    }

    setCreating(true);
    try {
      const gameId = uuidv4();
      await createLudoGame(
        gameId,
        {
          uid: user.uid,
          name: user.name || 'Player',
          photoURL: user.photoURL || '',
        },
        selectedFee
      );
      toast.success('Table created!');
      navigate(`/games/RealLudo/${gameId}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create game');
    } finally {
      setCreating(false);
    }
  }, [user, usableBalance, selectedFee, navigate]);

  // ── Join Game ────────────────────────────────────────────────────────────
  const handleJoin = useCallback(
    async (game: LudoGame) => {
      if (!user) return;

      if (usableBalance < game.entryFee) {
        toast.error(`Insufficient balance! Need ₹${game.entryFee}`);
        return;
      }

      setJoiningId(game.id);
      try {
        await joinLudoGame(game.id, {
          uid: user.uid,
          name: user.name || 'Player',
          photoURL: user.photoURL || '',
        });
        navigate(`/games/RealLudo/${game.id}`);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to join game');
      } finally {
        setJoiningId(null);
      }
    },
    [user, usableBalance, navigate]
  );

  const prize = (selectedFee * 2 * 0.9).toFixed(0);

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(160deg, #070714 0%, #0a0a1e 60%, #060d18 100%)',
      }}
    >
      {/* BG Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-[0.07] blur-3xl"
          style={{ background: 'radial-gradient(#ef4444, transparent)' }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-[0.07] blur-3xl"
          style={{ background: 'radial-gradient(#22c55e, transparent)' }}
        />
      </div>

      <div className="relative max-w-lg mx-auto px-4 pt-6 pb-10">
        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="text-center">
            <h1 className="text-2xl font-black text-white">🎲 Ludo</h1>
            <p className="text-slate-500 text-xs">Real Money • 2 Players</p>
          </div>

          {/* Balance */}
          <div
            className="px-3 py-1.5 rounded-xl"
            style={{
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.2)',
            }}
          >
            <p className="text-[10px] text-slate-500 leading-none mb-0.5">
              Balance
            </p>
            <p className="text-green-400 font-black text-sm leading-none">
              ₹{usableBalance.toFixed(0)}
            </p>
          </div>
        </div>

        {/* ── Create Table Card ──────────────────────────────────── */}
        <div
          className="rounded-2xl p-5 mb-5"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <h2 className="text-white font-bold text-base mb-4 flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
              style={{ background: 'rgba(239,68,68,0.15)' }}
            >
              🔴
            </span>
            Create Table
            <span className="text-xs text-slate-500 font-normal ml-auto">
              You play as Red
            </span>
          </h2>

          {/* Fee Buttons */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            {ENTRY_FEES.map((fee) => (
              <motion.button
                key={fee}
                whileTap={{ scale: 0.93 }}
                onClick={() => setSelectedFee(fee)}
                className="py-2.5 rounded-xl font-bold text-sm transition-all"
                style={{
                  background:
                    selectedFee === fee
                      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                      : 'rgba(255,255,255,0.06)',
                  color:
                    selectedFee === fee
                      ? 'white'
                      : 'rgba(255,255,255,0.5)',
                  border:
                    selectedFee === fee
                      ? '1px solid rgba(239,68,68,0.5)'
                      : '1px solid rgba(255,255,255,0.06)',
                  boxShadow:
                    selectedFee === fee
                      ? '0 4px 15px rgba(239,68,68,0.3)'
                      : 'none',
                }}
              >
                ₹{fee}
              </motion.button>
            ))}
          </div>

          {/* Prize Info */}
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl mb-4"
            style={{
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.15)',
            }}
          >
            <div>
              <p className="text-slate-500 text-xs">Entry Fee</p>
              <p className="text-white font-bold">₹{selectedFee}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 text-xs">You Win</p>
              <p className="text-amber-400 font-black text-lg">₹{prize}</p>
            </div>
          </div>

          {/* Insufficient balance warning */}
          {usableBalance < selectedFee && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              <span className="text-red-400 text-xs">
                ⚠️ Insufficient balance. Add ₹
                {(selectedFee - usableBalance).toFixed(0)} more.
              </span>
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleCreate}
            disabled={creating || usableBalance < selectedFee}
            className="w-full py-4 rounded-2xl font-black text-base text-white transition-all"
            style={{
              background:
                creating || usableBalance < selectedFee
                  ? 'rgba(255,255,255,0.08)'
                  : 'linear-gradient(135deg, #ef4444, #dc2626)',
              boxShadow:
                creating || usableBalance < selectedFee
                  ? 'none'
                  : '0 6px 24px rgba(239,68,68,0.4)',
              color:
                creating || usableBalance < selectedFee
                  ? 'rgba(255,255,255,0.3)'
                  : 'white',
            }}
          >
            {creating ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray="31.4"
                    strokeDashoffset="10"
                  />
                </svg>
                Creating...
              </span>
            ) : (
              `Create Table • ₹${selectedFee}`
            )}
          </motion.button>
        </div>

        {/* ── Open Tables ────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-base flex items-center gap-2">
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                style={{ background: 'rgba(34,197,94,0.15)' }}
              >
                🟢
              </span>
              Join Table
            </h2>
            <span
              className="px-2 py-1 rounded-lg text-xs font-bold"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              {openGames.length} open
            </span>
          </div>

          <AnimatePresence>
            {openGames.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed rgba(255,255,255,0.07)',
                }}
              >
                <div className="text-5xl mb-3">🎲</div>
                <p className="text-slate-500 text-sm">No open tables</p>
                <p className="text-slate-600 text-xs mt-1">
                  Create one and wait for opponent!
                </p>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-3">
                {openGames.map((game) => {
                  const gamePrize = Math.floor(game.pot * 2 * 0.9);
                  const canJoin = usableBalance >= game.entryFee;
                  const isJoining = joiningId === game.id;

                  return (
                    <motion.div
                      key={game.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center justify-between p-4 rounded-2xl"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {/* Player info */}
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-base"
                          style={{
                            background:
                              'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(239,68,68,0.1))',
                            border: '1px solid rgba(239,68,68,0.3)',
                          }}
                        >
                          {game.player1?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">
                            {game.player1?.name || 'Player'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className="px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                              style={{
                                background: 'rgba(239,68,68,0.15)',
                                color: '#f87171',
                              }}
                            >
                              🔴 Red
                            </span>
                            <span className="text-slate-600 text-[10px]">
                              vs
                            </span>
                            <span
                              className="px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                              style={{
                                background: 'rgba(34,197,94,0.15)',
                                color: '#4ade80',
                              }}
                            >
                              🟢 You
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right side */}
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <p className="text-amber-400 font-black text-base leading-none">
                            ₹{gamePrize}
                          </p>
                          <p className="text-slate-600 text-[10px]">prize</p>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.93 }}
                          onClick={() => handleJoin(game)}
                          disabled={isJoining || !canJoin}
                          className="px-4 py-2 rounded-xl font-bold text-xs text-white"
                          style={{
                            background:
                              isJoining || !canJoin
                                ? 'rgba(255,255,255,0.08)'
                                : 'linear-gradient(135deg, #22c55e, #16a34a)',
                            boxShadow:
                              isJoining || !canJoin
                                ? 'none'
                                : '0 4px 14px rgba(34,197,94,0.4)',
                            color:
                              isJoining || !canJoin
                                ? 'rgba(255,255,255,0.3)'
                                : 'white',
                          }}
                        >
                          {isJoining
                            ? 'Joining...'
                            : !canJoin
                            ? 'Low Balance'
                            : `Join ₹${game.entryFee}`}
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Add money shortcut */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/add-money')}
            className="text-slate-500 text-xs underline underline-offset-2"
          >
            Add Money to Wallet
          </button>
        </div>
      </div>
    </div>
  );
}
