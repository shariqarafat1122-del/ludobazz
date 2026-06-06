import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../../context/AuthContext';
import {
  LudoGame, createLudoGame, joinLudoGame, subscribeOpenLudoGames,
} from '../../firebase/RealLudo';
import { calculateUsableBalance } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { ArrowLeft, Trophy, Zap, Users } from 'lucide-react';

const ENTRY_FEES = [10, 25, 50, 100, 500];

// ─── Table Card ───────────────────────────────────────────────────────────────
const TableCard: React.FC<{
  game: LudoGame;
  onJoin: () => void;
  isJoining: boolean;
  canAfford: boolean;
}> = memo(({ game, onJoin, isJoining, canAfford }) => {
  const prize = Math.floor((game.entryFee || 0) * 2 * 0.9);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center justify-between p-4 rounded-2xl"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      }}
    >
      {/* Player avatar + info */}
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white text-base flex-shrink-0"
          style={{
            background:
              'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(239,68,68,0.1))',
            border: '2px solid rgba(239,68,68,0.4)',
          }}
        >
          {game.player1?.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">
            {game.player1?.name || 'Player'}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
              style={{
                background: 'rgba(239,68,68,0.15)',
                color: '#fca5a5',
              }}
            >
              🔴 Red
            </span>
            <span className="text-slate-600 text-[10px]">vs</span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
              style={{
                background: 'rgba(34,197,94,0.15)',
                color: '#86efac',
              }}
            >
              🟢 You
            </span>
          </div>
        </div>
      </div>

      {/* Prize + join */}
      <div className="flex flex-col items-end gap-2">
        <div className="text-right">
          <p className="text-amber-400 font-black text-lg leading-none">
            ₹{prize}
          </p>
          <p className="text-slate-600 text-[9px] mt-0.5">prize pool</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onJoin}
          disabled={isJoining || !canAfford}
          className="px-4 py-2 rounded-xl font-bold text-xs text-white"
          style={{
            background:
              isJoining || !canAfford
                ? 'rgba(255,255,255,0.08)'
                : 'linear-gradient(135deg, #22c55e, #15803d)',
            boxShadow:
              isJoining || !canAfford
                ? 'none'
                : '0 4px 16px rgba(34,197,94,0.4)',
            color:
              isJoining || !canAfford
                ? 'rgba(255,255,255,0.25)'
                : 'white',
          }}
        >
          {isJoining
            ? '...'
            : !canAfford
            ? 'Low ₹'
            : `Join ₹${game.entryFee}`}
        </motion.button>
      </div>
    </motion.div>
  );
});

TableCard.displayName = 'TableCard';

// ─── Lobby Screen ─────────────────────────────────────────────────────────────
export default function RealLudoLobby() {
  const { user, wallet } = useAuth(); // ✅ uses existing AuthContext
  const navigate = useNavigate();

  const [openGames, setOpenGames]   = useState<LudoGame[]>([]);
  const [selectedFee, setSelectedFee] = useState(10);
  const [creating, setCreating]     = useState(false);
  const [joiningId, setJoiningId]   = useState<string | null>(null);

  // ✅ wallet from AuthContext — calculateUsableBalance from existing helpers
  const balance = wallet ? calculateUsableBalance(wallet) : 0;

  useEffect(() => {
    return subscribeOpenLudoGames(games => {
      setOpenGames(games.filter(g => g.createdBy !== user?.uid));
    });
  }, [user?.uid]);

  const handleCreate = useCallback(async () => {
    if (!user) return;
    if (balance < selectedFee) {
      toast.error(`Need ₹${selectedFee} to play!`);
      return;
    }
    setCreating(true);
    try {
      const gameId = uuidv4();
      await createLudoGame(
        gameId,
        { uid: user.uid, name: user.name || 'Player', photoURL: user.photoURL || '' },
        selectedFee
      );
      toast.success('Table created!');
      navigate(`/games/RealLudo/${gameId}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally {
      setCreating(false);
    }
  }, [user, balance, selectedFee, navigate]);

  const handleJoin = useCallback(async (game: LudoGame) => {
    if (!user) return;
    if (balance < game.entryFee) {
      toast.error(`Need ₹${game.entryFee} to play!`);
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
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally {
      setJoiningId(null);
    }
  }, [user, balance, navigate]);

  const prize = (selectedFee * 2 * 0.9).toFixed(0);

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'linear-gradient(160deg, #060612 0%, #0a0a1e 50%, #06101a 100%)',
      }}
    >
      {/* BG glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.05] blur-3xl"
          style={{ background: 'radial-gradient(#ef4444,transparent)' }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05] blur-3xl"
          style={{ background: 'radial-gradient(#22c55e,transparent)' }}
        />
      </div>

      <div className="relative max-w-lg mx-auto px-4 pt-5 pb-10">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <ArrowLeft size={18} className="text-white/60" />
          </button>

          <div className="text-center">
            <h1 className="text-2xl font-black text-white">🎲 Ludo</h1>
            <p className="text-slate-500 text-xs">Real Money • 2 Players</p>
          </div>

          {/* Balance badge */}
          <div
            className="px-3 py-2 rounded-xl"
            style={{
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.2)',
            }}
          >
            <p className="text-[9px] text-slate-500 leading-none">Balance</p>
            <p className="text-green-400 font-black text-sm leading-tight mt-0.5">
              ₹{balance.toFixed(0)}
            </p>
          </div>
        </div>

        {/* ── Create Table Card ── */}
        <div
          className="rounded-3xl p-5 mb-5"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.15)' }}
            >
              <Zap size={16} className="text-red-400" />
            </div>
            <h2 className="text-white font-bold text-base">Create Table</h2>
            <span className="text-slate-600 text-xs ml-auto">
              You play as 🔴 Red
            </span>
          </div>

          {/* Entry fee buttons */}
          <div className="grid grid-cols-5 gap-1.5 mb-4">
            {ENTRY_FEES.map(fee => (
              <motion.button
                key={fee}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedFee(fee)}
                className="py-2.5 rounded-xl font-black text-xs transition-all"
                style={{
                  background:
                    selectedFee === fee
                      ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                      : 'rgba(255,255,255,0.06)',
                  color:
                    selectedFee === fee
                      ? 'white'
                      : 'rgba(255,255,255,0.4)',
                  border:
                    selectedFee === fee
                      ? '1px solid rgba(239,68,68,0.5)'
                      : '1px solid rgba(255,255,255,0.06)',
                  boxShadow:
                    selectedFee === fee
                      ? '0 4px 16px rgba(239,68,68,0.35)'
                      : 'none',
                }}
              >
                ₹{fee}
              </motion.button>
            ))}
          </div>

          {/* Prize info row */}
          <div
            className="flex items-center justify-between px-4 py-3 rounded-2xl mb-4"
            style={{
              background: 'rgba(251,191,36,0.07)',
              border: '1px solid rgba(251,191,36,0.15)',
            }}
          >
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-amber-400" />
              <span className="text-white/60 text-xs">Win Prize</span>
            </div>
            <span className="text-amber-400 font-black text-xl">
              ₹{prize}
            </span>
          </div>

          {/* Low balance warning */}
          {balance < selectedFee && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.18)',
              }}
            >
              <span className="text-red-400 text-xs">
                ⚠️ Add ₹{(selectedFee - balance).toFixed(0)} more to play
              </span>
              <button
                onClick={() => navigate('/add-money')}
                className="ml-auto text-red-400 text-xs font-bold underline"
              >
                Add
              </button>
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleCreate}
            disabled={creating || balance < selectedFee}
            className="w-full py-4 rounded-2xl font-black text-base text-white"
            style={{
              background:
                creating || balance < selectedFee
                  ? 'rgba(255,255,255,0.06)'
                  : 'linear-gradient(135deg, #ef4444, #b91c1c)',
              boxShadow:
                creating || balance < selectedFee
                  ? 'none'
                  : '0 8px 28px rgba(239,68,68,0.45)',
              color:
                creating || balance < selectedFee
                  ? 'rgba(255,255,255,0.2)'
                  : 'white',
            }}
          >
            {creating ? (
              <span className="flex items-center justify-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  className="inline-block text-lg"
                >
                  ⟳
                </motion.span>
                Creating...
              </span>
            ) : (
              `Create Table • ₹${selectedFee}`
            )}
          </motion.button>
        </div>

        {/* ── Open Tables ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(34,197,94,0.15)' }}
            >
              <Users size={16} className="text-green-400" />
            </div>
            <h2 className="text-white font-bold text-base">
              Join Table
            </h2>
            <div
              className="ml-auto px-2.5 py-1 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.06)',
              }}
            >
              <span className="text-white/30 text-xs font-bold">
                {openGames.length} open
              </span>
            </div>
          </div>

          <AnimatePresence>
            {openGames.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 rounded-3xl"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed rgba(255,255,255,0.06)',
                }}
              >
                <div className="text-5xl mb-3">🎲</div>
                <p className="text-slate-500 text-sm font-medium">
                  No open tables
                </p>
                <p className="text-slate-700 text-xs mt-1">
                  Create one and invite a friend!
                </p>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <AnimatePresence>
                  {openGames.map(game => (
                    <TableCard
                      key={game.id}
                      game={game}
                      onJoin={() => handleJoin(game)}
                      isJoining={joiningId === game.id}
                      canAfford={balance >= game.entryFee}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Add money link */}
        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/add-money')}
            className="text-slate-600 text-xs underline underline-offset-2 hover:text-slate-400 transition-colors"
          >
            💳 Add Money to Wallet
          </button>
        </div>
      </div>
    </div>
  );
}
