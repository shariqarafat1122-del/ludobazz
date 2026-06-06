// RealLudoLobby.tsx — Premium Ludo Game Lobby
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  createLudoGame,
  joinLudoGame,
  subscribeOpenLudoGames,
  LudoGame,
} from './RealLudo';

// ─── Utils ────────────────────────────────────────────────────────────────────

const generateGameId = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const ENTRY_FEES = [0, 10, 25, 50, 100, 250, 500];

// ─── Sub-components ───────────────────────────────────────────────────────────

const DiamondIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 9l10 13L22 9z" />
  </svg>
);

const BoardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const CrownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
  </svg>
);

const LudoBoardMini = () => (
  <div className="relative w-24 h-24 flex-shrink-0">
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
      {/* Board background */}
      <rect width="100" height="100" rx="4" fill="#1a1a2e" />
      {/* Grid lines */}
      <line x1="33" y1="0" x2="33" y2="100" stroke="#2a2a4e" strokeWidth="0.5" />
      <line x1="67" y1="0" x2="67" y2="100" stroke="#2a2a4e" strokeWidth="0.5" />
      <line x1="0" y1="33" x2="100" y2="33" stroke="#2a2a4e" strokeWidth="0.5" />
      <line x1="0" y1="67" x2="100" y2="67" stroke="#2a2a4e" strokeWidth="0.5" />
      {/* Red home */}
      <rect x="0" y="0" width="33" height="33" rx="2" fill="#ef444440" />
      <rect x="4" y="4" width="25" height="25" rx="2" fill="#ef444420" stroke="#ef4444" strokeWidth="0.5" />
      {/* Green home */}
      <rect x="67" y="0" width="33" height="33" rx="2" fill="#22c55e40" />
      <rect x="71" y="4" width="25" height="25" rx="2" fill="#22c55e20" stroke="#22c55e" strokeWidth="0.5" />
      {/* Yellow home */}
      <rect x="67" y="67" width="33" height="33" rx="2" fill="#eab30840" />
      <rect x="71" y="71" width="25" height="25" rx="2" fill="#eab30820" stroke="#eab308" strokeWidth="0.5" />
      {/* Blue home */}
      <rect x="0" y="67" width="33" height="33" rx="2" fill="#3b82f640" />
      <rect x="4" y="71" width="25" height="25" rx="2" fill="#3b82f620" stroke="#3b82f6" strokeWidth="0.5" />
      {/* Center star */}
      <polygon points="50,35 53,45 63,45 55,52 58,62 50,56 42,62 45,52 37,45 47,45" fill="#fbbf24" opacity="0.8" />
      {/* Path strips */}
      <rect x="33" y="38" width="34" height="9" fill="#ffffff08" />
      <rect x="38" y="33" width="9" height="34" fill="#ffffff08" />
    </svg>
  </div>
);

// ─── Game Card Component ──────────────────────────────────────────────────────

interface GameCardProps {
  game: LudoGame;
  onJoin: (gameId: string) => void;
  joiningId: string | null;
  currentUid: string;
}

const GameCard: React.FC<GameCardProps> = ({ game, onJoin, joiningId, currentUid }) => {
  const isOwnGame = game.player1?.uid === currentUid;
  const isJoining = joiningId === game.id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.96 }}
      whileHover={{ y: -2 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm p-4 cursor-default"
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}
    >
      {/* Glow accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-400/50 to-transparent" />

      <div className="flex items-center gap-4">
        <LudoBoardMini />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-red-400 tracking-widest uppercase font-mono">
              #{game.id}
            </span>
            <span className="flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Waiting
            </span>
          </div>

          <p className="text-white font-semibold text-sm truncate">
            {game.player1?.name || 'Player'}
          </p>

          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-amber-400 text-sm font-bold">
              <DiamondIcon />
              {game.entryFee === 0 ? 'Free' : `₹${game.entryFee}`}
            </span>
            <span className="flex items-center gap-1 text-slate-400 text-xs">
              <UsersIcon />
              1/2
            </span>
            <span className="text-slate-500 text-xs">
              Prize: ₹{Math.floor(game.entryFee * 2 * 0.9)}
            </span>
          </div>
        </div>

        <div className="flex-shrink-0">
          {isOwnGame ? (
            <div className="px-4 py-2 rounded-xl bg-slate-700/50 border border-slate-600/50 text-slate-400 text-xs font-semibold">
              Your Game
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onJoin(game.id)}
              disabled={isJoining}
              className="relative px-5 py-2.5 rounded-xl font-bold text-sm text-white overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                boxShadow: '0 4px 12px rgba(34,197,94,0.4)',
              }}
            >
              {isJoining ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Joining
                </span>
              ) : (
                'Join'
              )}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Create Game Modal ────────────────────────────────────────────────────────

interface CreateGameModalProps {
  onClose: () => void;
  onCreate: (entryFee: number) => void;
  creating: boolean;
  walletBalance: number;
}

const CreateGameModal: React.FC<CreateGameModalProps> = ({
  onClose,
  onCreate,
  creating,
  walletBalance,
}) => {
  const [selectedFee, setSelectedFee] = useState(0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 100, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 pb-4">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-600/20 to-transparent" />
          <div className="relative flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Create Game</h2>
              <p className="text-slate-400 text-sm mt-0.5">Choose entry fee to start</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/20 transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Balance */}
        <div className="mx-6 mb-4 p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
          <span className="text-slate-400 text-sm">Your Balance</span>
          <span className="text-amber-400 font-bold flex items-center gap-1">
            <DiamondIcon />₹{walletBalance.toFixed(0)}
          </span>
        </div>

        {/* Fee Selection */}
        <div className="px-6 pb-2">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">
            Entry Fee
          </p>
          <div className="grid grid-cols-4 gap-2">
            {ENTRY_FEES.map((fee) => {
              const isSelected = selectedFee === fee;
              const canAfford = walletBalance >= fee;

              return (
                <motion.button
                  key={fee}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => canAfford && setSelectedFee(fee)}
                  disabled={!canAfford}
                  className={`relative py-2.5 rounded-xl text-sm font-bold transition-all ${
                    !canAfford
                      ? 'opacity-30 cursor-not-allowed'
                      : isSelected
                      ? 'text-white'
                      : 'text-slate-400 bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                  style={
                    isSelected
                      ? {
                          background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                          boxShadow: '0 4px 16px rgba(124,58,237,0.5)',
                          border: '1px solid rgba(167,139,250,0.4)',
                        }
                      : {}
                  }
                >
                  {fee === 0 ? 'Free' : `₹${fee}`}
                  {isSelected && (
                    <motion.div
                      layoutId="fee-indicator"
                      className="absolute inset-0 rounded-xl"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Prize info */}
        <div className="mx-6 mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
          <span className="text-amber-300/70 text-sm flex items-center gap-1">
            <CrownIcon /> Prize Pool
          </span>
          <span className="text-amber-400 font-black text-lg">
            {selectedFee === 0 ? 'Glory Only' : `₹${Math.floor(selectedFee * 2 * 0.9)}`}
          </span>
        </div>

        {/* Create Button */}
        <div className="p-6 pt-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onCreate(selectedFee)}
            disabled={creating}
            className="w-full py-4 rounded-2xl font-black text-white text-lg tracking-wide relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #2563eb 100%)',
              boxShadow: '0 8px 24px rgba(124,58,237,0.5)',
            }}
          >
            {/* Shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            {creating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating Game...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <PlusIcon />
                Create Game
              </span>
            )}
          </motion.button>
          <p className="text-center text-slate-600 text-xs mt-3">
            10% platform fee applies to entry fees
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Main Lobby Component ─────────────────────────────────────────────────────

const RealLudoLobby: React.FC = () => {
  const { user, wallet } = useAuth();
  const navigate = useNavigate();

  const [openGames, setOpenGames] = useState<LudoGame[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingGames, setLoadingGames] = useState(true);

  const walletBalance =
    (wallet?.depositBalance || 0) +
    (wallet?.winningBalance || 0) +
    (wallet?.referralBalance || 0) +
    (wallet?.bonusBalance || 0);

  // Subscribe to open games
  useEffect(() => {
    const unsub = subscribeOpenLudoGames((games) => {
      setOpenGames(games);
      setLoadingGames(false);
    });
    return () => unsub();
  }, []);

  const handleCreate = useCallback(
    async (entryFee: number) => {
      if (!user) return;
      if (entryFee > 0 && walletBalance < entryFee) {
        setError('Insufficient balance');
        return;
      }

      setCreating(true);
      setError(null);

      try {
        const gameId = generateGameId();
        await createLudoGame(
          gameId,
          {
            uid: user.uid,
            name: user.name,
            photoURL: user.photoURL || '',
          },
          entryFee
        );
        setShowCreateModal(false);
        navigate(`/ludo/${gameId}`);
      } catch (err: any) {
        setError(err.message || 'Failed to create game');
      } finally {
        setCreating(false);
      }
    },
    [user, walletBalance, navigate]
  );

  const handleJoin = useCallback(
    async (gameId: string) => {
      if (!user) return;
      setJoiningId(gameId);
      setError(null);

      try {
        const game = openGames.find((g) => g.id === gameId);
        if (!game) throw new Error('Game not found');
        if (game.entryFee > 0 && walletBalance < game.entryFee) {
          throw new Error('Insufficient balance');
        }

        await joinLudoGame(gameId, {
          uid: user.uid,
          name: user.name,
          photoURL: user.photoURL || '',
        });
        navigate(`/ludo/${gameId}`);
      } catch (err: any) {
        setError(err.message || 'Failed to join game');
      } finally {
        setJoiningId(null);
      }
    },
    [user, openGames, walletBalance, navigate]
  );

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #0a0a1a 0%, #0d0d2b 50%, #0a1628 100%)',
      }}
    >
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #ef4444, transparent)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-5 blur-3xl"
          style={{ background: 'radial-gradient(circle, #22c55e, transparent)' }}
        />
      </div>

      <div className="relative max-w-lg mx-auto px-4 pb-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-6 pb-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🎲</span>
                <h1
                  className="text-2xl font-black text-white tracking-tight"
                  style={{ fontFamily: "'Clash Display', 'Syne', sans-serif" }}
                >
                  Ludo
                  <span
                    className="ml-2 text-transparent bg-clip-text"
                    style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa, #60a5fa)' }}
                  >
                    Arena
                  </span>
                </h1>
              </div>
              <p className="text-slate-500 text-sm">Real-time multiplayer board game</p>
            </div>

            {/* Balance chip */}
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-2xl border"
              style={{
                background: 'rgba(251,191,36,0.08)',
                borderColor: 'rgba(251,191,36,0.2)',
              }}
            >
              <DiamondIcon />
              <span className="text-amber-400 font-bold text-sm">₹{walletBalance.toFixed(0)}</span>
            </div>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          {[
            { label: 'Open Rooms', value: openGames.length, color: '#22c55e' },
            { label: 'Players', value: openGames.length, color: '#60a5fa' },
            { label: 'Min. Bet', value: '₹0', color: '#f59e0b' },
          ].map((stat, i) => (
            <div
              key={i}
              className="rounded-2xl p-3 text-center border border-white/5"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <div className="font-black text-lg" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-slate-500 text-xs mt-0.5">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Create Game Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreateModal(true)}
          className="w-full py-4 rounded-2xl font-bold text-white text-base mb-6 relative overflow-hidden flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 60%, #2563eb 100%)',
            boxShadow: '0 8px 24px rgba(124,58,237,0.4)',
          }}
        >
          <div className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition-opacity" />
          <PlusIcon />
          <BoardIcon />
          Create New Game
        </motion.button>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
            >
              ⚠ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Games list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-sm flex items-center gap-2">
              <UsersIcon />
              Open Rooms
            </h2>
            <span className="text-slate-500 text-xs">
              {loadingGames ? 'Loading...' : `${openGames.length} available`}
            </span>
          </div>

          {loadingGames ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-2xl animate-pulse"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                />
              ))}
            </div>
          ) : openGames.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="text-5xl mb-3">🎲</div>
              <p className="text-slate-400 font-medium">No open games</p>
              <p className="text-slate-600 text-sm mt-1">Create one and invite a friend!</p>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {openGames.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onJoin={handleJoin}
                    joiningId={joiningId}
                    currentUid={user?.uid || ''}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* How to play */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 p-4 rounded-2xl border border-white/5"
          style={{ background: 'rgba(255,255,255,0.02)' }}
        >
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">
            How to Play
          </h3>
          <div className="space-y-2">
            {[
              ['🎲', 'Roll 6 to open a token from base'],
              ['♟', 'Move tokens clockwise around the board'],
              ['⚔️', 'Land on opponent to send them back'],
              ['🏆', 'First to bring all 4 tokens home wins'],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-start gap-2 text-xs text-slate-500">
                <span>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Create Game Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateGameModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreate}
            creating={creating}
            walletBalance={walletBalance}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default RealLudoLobby;
