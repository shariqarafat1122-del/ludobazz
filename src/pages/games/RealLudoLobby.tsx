// ─── RealLudoLobby.tsx — Premium Mobile-First Ludo Lobby ─────────────────────
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  createLudoGame, joinLudoGame, joinPrivateGame,
  subscribeOpenLudoGames, LudoGame, TableType,
} from '../../firebase/RealLudo';

// ─── Constants ────────────────────────────────────────────────────────────────
const generateGameId = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const ENTRY_FEES = [0, 10, 25, 50, 100, 250, 500];

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const DiamondIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 2L2 9l10 13L22 9l-4-7H6zm0 0h12M2 9h20" />
    <path d="M2 9l10 13L22 9H2z" />
    <path d="M6 2l4 7h4l4-7" />
  </svg>
);

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const CrownIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2 20h20v2H2v-2zM4 18l4-8 4 4 4-8 4 8H4z" />
  </svg>
);

const KeyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="7.5" cy="15.5" r="5.5" />
    <path d="M21 2l-9.6 9.6" />
    <path d="M15.5 7.5l3 3L22 7l-3-3" />
  </svg>
);

// ─── Mini Board Preview ───────────────────────────────────────────────────────
const MiniBoardPreview = () => (
  <svg width="52" height="52" viewBox="0 0 52 52" className="flex-shrink-0">
    <defs>
      <linearGradient id="boardBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1e1b4b" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>
    </defs>
    <rect width="52" height="52" rx="8" fill="url(#boardBg)" />
    {/* Home zones */}
    <rect x="1" y="1" width="20" height="20" rx="4" fill="rgba(239,68,68,0.3)" stroke="rgba(239,68,68,0.5)" strokeWidth="0.5" />
    <rect x="31" y="1" width="20" height="20" rx="4" fill="rgba(34,197,94,0.3)" stroke="rgba(34,197,94,0.5)" strokeWidth="0.5" />
    <rect x="31" y="31" width="20" height="20" rx="4" fill="rgba(234,179,8,0.3)" stroke="rgba(234,179,8,0.5)" strokeWidth="0.5" />
    <rect x="1" y="31" width="20" height="20" rx="4" fill="rgba(59,130,246,0.3)" stroke="rgba(59,130,246,0.5)" strokeWidth="0.5" />
    {/* Paths */}
    <rect x="21" y="5" width="10" height="42" rx="2" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
    <rect x="5" y="21" width="42" height="10" rx="2" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
    {/* Color strips */}
    <rect x="22" y="5" width="4" height="16" rx="1" fill="rgba(34,197,94,0.4)" />
    <rect x="26" y="31" width="4" height="16" rx="1" fill="rgba(234,179,8,0.4)" />
    <rect x="5" y="22" width="16" height="4" rx="1" fill="rgba(239,68,68,0.4)" />
    <rect x="31" y="26" width="16" height="4" rx="1" fill="rgba(59,130,246,0.4)" />
    {/* Center */}
    <polygon points="26,20 29,26 26,32 23,26" fill="rgba(251,191,36,0.5)" />
  </svg>
);

// ─── Table Badge ──────────────────────────────────────────────────────────────
const TableBadge = ({ type }: { type: string }) => {
  const config = {
    admin: { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.4)', text: '#fbbf24', icon: <CrownIcon />, label: 'Official' },
    private: { bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.4)', text: '#a78bfa', icon: <LockIcon />, label: 'Private' },
    public: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', text: '#4ade80', icon: <GlobeIcon />, label: 'Public' },
  };
  const c = config[type as keyof typeof config] || config.public;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
      {c.icon} {c.label}
    </span>
  );
};

// ─── Game Table Card ──────────────────────────────────────────────────────────
interface GameCardProps {
  game: LudoGame;
  onJoin: (gameId: string) => void;
  joiningId: string | null;
  currentUid: string;
}

const GameCard: React.FC<GameCardProps> = ({ game, onJoin, joiningId, currentUid }) => {
  const isOwn = game.player1?.uid === currentUid;
  const isJoining = joiningId === game.id;
  const prize = game.entryFee > 0 ? Math.floor(game.entryFee * 2 * 0.9) : 0;

  const borderColor = game.isAdminTable
    ? 'rgba(251,191,36,0.25)'
    : game.tableType === 'private'
    ? 'rgba(139,92,246,0.25)'
    : 'rgba(255,255,255,0.07)';

  const glowColor = game.isAdminTable
    ? 'rgba(251,191,36,0.06)'
    : game.tableType === 'private'
    ? 'rgba(139,92,246,0.06)'
    : 'transparent';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      whileTap={{ scale: 0.99 }}
      className="relative overflow-hidden rounded-2xl p-3.5"
      style={{
        background: `linear-gradient(135deg, rgba(20,20,40,0.95), rgba(10,10,25,0.95))`,
        border: `1px solid ${borderColor}`,
        boxShadow: `0 2px 20px ${glowColor}, 0 1px 0 rgba(255,255,255,0.04) inset`,
      }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px]"
        style={{
          background: game.isAdminTable
            ? 'linear-gradient(90deg, transparent, rgba(251,191,36,0.5), transparent)'
            : game.tableType === 'private'
            ? 'linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent)',
        }} />

      <div className="flex items-center gap-3">
        <MiniBoardPreview />

        <div className="flex-1 min-w-0">
          {/* Top row */}
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <TableBadge type={game.tableType} />
            <span className="text-[10px] font-mono text-slate-600">#{game.id.slice(0, 6)}</span>
            {/* Live dot */}
            <span className="flex items-center gap-1 ml-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-medium">OPEN</span>
            </span>
          </div>

          {/* Host name */}
          <p className="text-white font-semibold text-sm leading-tight truncate">
            {game.player1?.name || 'Host'}
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-amber-400 text-xs font-bold">
              <DiamondIcon size={10} />
              {game.entryFee === 0 ? 'Free' : `₹${game.entryFee}`}
            </span>
            {prize > 0 && (
              <span className="text-emerald-400 text-[11px] font-semibold">
                Win ₹{prize}
              </span>
            )}
            <span className="text-slate-600 text-[10px]">1/2 players</span>
          </div>
        </div>

        {/* Action */}
        <div className="flex-shrink-0">
          {isOwn ? (
            <div className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              Yours
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => onJoin(game.id)}
              disabled={isJoining}
              className="relative px-4 py-2 rounded-xl font-bold text-xs text-white overflow-hidden min-w-[64px]"
              style={{
                background: isJoining
                  ? 'rgba(34,197,94,0.3)'
                  : 'linear-gradient(135deg, #22c55e, #16a34a)',
                boxShadow: isJoining ? 'none' : '0 3px 12px rgba(34,197,94,0.35)',
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-1.5">
                {isJoining ? (
                  <>
                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>...</span>
                  </>
                ) : 'Join'}
              </span>
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Create Game Modal ────────────────────────────────────────────────────────
interface CreateModalProps {
  onClose: () => void;
  onCreate: (fee: number, type: TableType) => void;
  creating: boolean;
  walletBalance: number;
}

const CreateGameModal: React.FC<CreateModalProps> = ({ onClose, onCreate, creating, walletBalance }) => {
  const [selectedFee, setSelectedFee] = useState(0);
  const [tableType, setTableType] = useState<TableType>('public');

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1a1830 0%, #0d0d1f 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">Create Table</h2>
            <p className="text-slate-500 text-xs mt-0.5">Set your game preferences</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 space-y-4 pb-6">
          {/* Balance */}
          <div className="flex items-center justify-between p-3 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-slate-400 text-sm">Wallet Balance</span>
            <span className="text-amber-400 font-bold flex items-center gap-1.5">
              <DiamondIcon size={11} /> ₹{walletBalance.toFixed(0)}
            </span>
          </div>

          {/* Table Type */}
          <div>
            <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mb-2">
              Table Type
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(['public', 'private'] as TableType[]).map((type) => {
                const isSelected = tableType === type;
                return (
                  <motion.button
                    key={type}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setTableType(type)}
                    className="flex items-center gap-2.5 p-3 rounded-2xl transition-all text-left"
                    style={{
                      background: isSelected
                        ? type === 'public'
                          ? 'rgba(34,197,94,0.15)'
                          : 'rgba(139,92,246,0.15)'
                        : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isSelected
                        ? type === 'public' ? 'rgba(34,197,94,0.4)' : 'rgba(139,92,246,0.4)'
                        : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <div className="text-lg">{type === 'public' ? '🌍' : '🔒'}</div>
                    <div>
                      <p className="text-white text-xs font-bold capitalize">{type}</p>
                      <p className="text-slate-500 text-[10px]">
                        {type === 'public' ? 'Anyone can join' : 'Code required'}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="ml-auto w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: type === 'public' ? '#22c55e' : '#8b5cf6' }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
            {tableType === 'private' && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-purple-400 text-[11px] mt-2 flex items-center gap-1.5 px-1"
              >
                <KeyIcon /> A unique code will be generated — share it with your friend
              </motion.p>
            )}
          </div>

          {/* Entry Fee */}
          <div>
            <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mb-2">
              Entry Fee
            </p>
            <div className="grid grid-cols-4 gap-2">
              {ENTRY_FEES.map((fee) => {
                const isSelected = selectedFee === fee;
                const canAfford = walletBalance >= fee || fee === 0;
                return (
                  <motion.button
                    key={fee}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => canAfford && setSelectedFee(fee)}
                    disabled={!canAfford}
                    className="py-2.5 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: isSelected
                        ? 'linear-gradient(135deg, #7c3aed, #4f46e5)'
                        : canAfford ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isSelected ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.06)'}`,
                      color: !canAfford ? 'rgba(255,255,255,0.2)' : isSelected ? '#fff' : '#94a3b8',
                      boxShadow: isSelected ? '0 4px 14px rgba(124,58,237,0.4)' : 'none',
                    }}
                  >
                    {fee === 0 ? 'Free' : `₹${fee}`}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Prize Info */}
          <div className="flex items-center justify-between p-3 rounded-2xl"
            style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.15)' }}>
            <span className="text-amber-300/70 text-sm flex items-center gap-1.5">
              <CrownIcon /> Prize Pool
            </span>
            <span className="text-amber-400 font-black text-base">
              {selectedFee === 0 ? 'Glory' : `₹${Math.floor(selectedFee * 2 * 0.9)}`}
            </span>
          </div>

          {/* Create Button */}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => onCreate(selectedFee, tableType)}
            disabled={creating}
            className="w-full py-4 rounded-2xl font-black text-white text-base tracking-wide relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #2563eb 100%)',
              boxShadow: '0 6px 24px rgba(124,58,237,0.45)',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              style={{ animation: 'shimmer 2s infinite' }} />
            <span className="relative flex items-center justify-center gap-2">
              {creating ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating...
                </>
              ) : (
                <>🎲 Create Table</>
              )}
            </span>
          </motion.button>
          <p className="text-center text-slate-700 text-[11px]">10% platform fee on paid games</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Private Code Modal ───────────────────────────────────────────────────────
interface PrivateJoinModalProps {
  onClose: () => void;
  onJoin: (code: string) => void;
  joining: boolean;
}

const PrivateJoinModal: React.FC<PrivateJoinModalProps> = ({ onClose, onJoin, joining }) => {
  const [code, setCode] = useState('');
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [chars, setChars] = useState(Array(6).fill(''));

  const handleChar = (idx: number, val: string) => {
    val = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!val) {
      const next = [...chars];
      next[idx] = '';
      setChars(next);
      return;
    }
    const next = [...chars];
    next[idx] = val[val.length - 1];
    setChars(next);
    if (idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKey = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !chars[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const next = Array(6).fill('');
    pasted.split('').forEach((c, i) => { next[i] = c; });
    setChars(next);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const fullCode = chars.join('');
  const isReady = fullCode.length === 6;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1a1830 0%, #0d0d1f 100%)',
          border: '1px solid rgba(139,92,246,0.2)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="px-6 pt-4 pb-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔐</div>
            <h2 className="text-lg font-black text-white">Private Table</h2>
            <p className="text-slate-500 text-sm mt-1">Enter the 6-character code</p>
          </div>

          {/* Code input boxes */}
          <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
            {chars.map((ch, idx) => (
              <input
                key={idx}
                ref={(el) => { inputs.current[idx] = el; }}
                value={ch}
                onChange={(e) => handleChar(idx, e.target.value)}
                onKeyDown={(e) => handleKey(idx, e)}
                maxLength={1}
                className="w-10 h-12 text-center text-lg font-black rounded-xl outline-none transition-all"
                style={{
                  background: ch ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${ch ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.1)'}`,
                  color: '#a78bfa',
                  caretColor: '#a78bfa',
                }}
              />
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => isReady && onJoin(fullCode)}
            disabled={!isReady || joining}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm"
            style={{
              background: isReady
                ? 'linear-gradient(135deg, #7c3aed, #4f46e5)'
                : 'rgba(255,255,255,0.07)',
              boxShadow: isReady ? '0 6px 20px rgba(124,58,237,0.4)' : 'none',
              color: isReady ? '#fff' : '#475569',
            }}
          >
            {joining ? 'Joining...' : 'Join Table'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Private Code Share Modal ─────────────────────────────────────────────────
const ShareCodeModal: React.FC<{ code: string; gameId: string; onClose: () => void }> = ({
  code, gameId, onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const copyCode = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6"
        style={{
          background: 'linear-gradient(180deg, #1a1830 0%, #0d0d1f 100%)',
          border: '1px solid rgba(139,92,246,0.3)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">🔗</div>
          <h2 className="text-lg font-black text-white">Share Code</h2>
          <p className="text-slate-500 text-sm mt-1">Share this code with your friend</p>
        </div>

        {/* Code display */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {code.split('').map((ch, i) => (
            <div key={i}
              className="w-10 h-12 flex items-center justify-center text-xl font-black rounded-xl"
              style={{ background: 'rgba(139,92,246,0.2)', border: '2px solid rgba(139,92,246,0.4)', color: '#a78bfa' }}>
              {ch}
            </div>
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={copyCode}
          className="w-full py-3 rounded-2xl font-bold text-sm mb-3 flex items-center justify-center gap-2"
          style={{
            background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(139,92,246,0.2)',
            border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : 'rgba(139,92,246,0.4)'}`,
            color: copied ? '#4ade80' : '#a78bfa',
          }}
        >
          {copied ? '✓ Copied!' : '📋 Copy Code'}
        </motion.button>

        <p className="text-center text-slate-600 text-xs mb-4">
          Waiting for friend to join with this code
        </p>

        <button onClick={onClose}
          className="w-full py-2.5 rounded-2xl text-slate-500 text-sm font-medium"
          style={{ background: 'rgba(255,255,255,0.04)' }}>
          Go to Game Room
        </button>
      </motion.div>
    </motion.div>
  );
};

// ─── Main Lobby ───────────────────────────────────────────────────────────────
const RealLudoLobby: React.FC = () => {
  const { user, wallet } = useAuth();
  const navigate = useNavigate();

  const [openGames, setOpenGames] = useState<LudoGame[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPrivateJoin, setShowPrivateJoin] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joiningPrivate, setJoiningPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [privateCodeResult, setPrivateCodeResult] = useState<{ code: string; gameId: string } | null>(null);

  const walletBalance = (wallet?.depositBalance || 0) + (wallet?.winningBalance || 0)
    + (wallet?.referralBalance || 0) + (wallet?.bonusBalance || 0);

  useEffect(() => {
    const unsub = subscribeOpenLudoGames((games) => {
      setOpenGames(games);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCreate = useCallback(async (entryFee: number, tableType: TableType) => {
    if (!user) return;
    if (entryFee > 0 && walletBalance < entryFee) {
      setError('Insufficient wallet balance');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const gameId = generateGameId();
      const { privateCode } = await createLudoGame(
        gameId,
        { uid: user.uid, name: user.name, photoURL: user.photoURL || '' },
        entryFee,
        tableType
      );
      setShowCreateModal(false);
      if (tableType === 'private' && privateCode) {
        setPrivateCodeResult({ code: privateCode, gameId });
      } else {
        navigate(`/games/RealLudo/${gameId}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create game');
    } finally {
      setCreating(false);
    }
  }, [user, walletBalance, navigate]);

  const handleJoin = useCallback(async (gameId: string) => {
    if (!user) return;
    setJoiningId(gameId);
    setError(null);
    try {
      const game = openGames.find((g) => g.id === gameId);
      if (!game) throw new Error('Game not found');
      if (game.entryFee > 0 && walletBalance < game.entryFee)
        throw new Error('Insufficient balance');
      await joinLudoGame(gameId, { uid: user.uid, name: user.name, photoURL: user.photoURL || '' });
      navigate(`/games/RealLudo/${gameId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to join');
    } finally {
      setJoiningId(null);
    }
  }, [user, openGames, walletBalance, navigate]);

  const handleJoinPrivate = useCallback(async (code: string) => {
    if (!user) return;
    setJoiningPrivate(true);
    setError(null);
    try {
      const gameId = await joinPrivateGame(code, {
        uid: user.uid, name: user.name, photoURL: user.photoURL || '',
      });
      setShowPrivateJoin(false);
      navigate(`/games/RealLudo/${gameId}`);
    } catch (err: any) {
      setError(err.message || 'Invalid code or game full');
    } finally {
      setJoiningPrivate(false);
    }
  }, [user, navigate]);

  const adminTables = openGames.filter((g) => g.isAdminTable || g.tableType === 'admin');
  const publicTables = openGames.filter((g) => !g.isAdminTable && g.tableType === 'public');

  return (
    <div className="min-h-screen"
      style={{ background: 'linear-gradient(160deg, #070714 0%, #0c0c20 50%, #080f1e 100%)' }}>

      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-20 w-72 h-72 rounded-full opacity-[0.07] blur-3xl"
          style={{ background: 'radial-gradient(#7c3aed, transparent)' }} />
        <div className="absolute -bottom-40 -right-20 w-72 h-72 rounded-full opacity-[0.07] blur-3xl"
          style={{ background: 'radial-gradient(#ef4444, transparent)' }} />
      </div>

      <div className="relative max-w-lg mx-auto px-4 pb-10">
        {/* ─── Header ───────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          className="pt-5 pb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-2xl">🎲</span>
              <h1 className="text-xl font-black text-white tracking-tight">
                Ludo <span className="text-transparent bg-clip-text"
                  style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa, #60a5fa)' }}>Arena</span>
              </h1>
            </div>
            <p className="text-slate-600 text-xs">Real-time 1v1 board game</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.18)' }}>
            <DiamondIcon size={10} />
            <span className="text-amber-400 font-bold text-sm">₹{walletBalance.toFixed(0)}</span>
          </div>
        </motion.div>

        {/* ─── Quick Actions ─────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="grid grid-cols-2 gap-2.5 mb-5">
          {/* Create */}
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowCreateModal(true)}
            className="relative py-4 rounded-2xl font-bold text-white text-sm overflow-hidden flex flex-col items-center gap-1.5"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 60%, #2563eb 100%)',
              boxShadow: '0 6px 22px rgba(124,58,237,0.38)',
            }}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
            <span className="text-2xl">➕</span>
            <span className="relative font-black text-sm">Create Table</span>
            <span className="relative text-white/60 text-[10px]">Public or Private</span>
          </motion.button>

          {/* Join Private */}
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowPrivateJoin(true)}
            className="relative py-4 rounded-2xl font-bold text-sm overflow-hidden flex flex-col items-center gap-1.5"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(79,70,229,0.2))',
              border: '1px solid rgba(139,92,246,0.35)',
              boxShadow: '0 4px 16px rgba(139,92,246,0.15)',
            }}>
            <span className="text-2xl">🔐</span>
            <span className="text-white font-black text-sm">Private Game</span>
            <span className="text-slate-500 text-[10px]">Enter code to join</span>
          </motion.button>
        </motion.div>

        {/* ─── Stats Row ─────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}
          className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: 'Open Tables', value: openGames.length, color: '#22c55e' },
            { label: 'Official', value: adminTables.length, color: '#fbbf24' },
            { label: 'Min. Entry', value: '₹0', color: '#a78bfa' },
          ].map((s, i) => (
            <div key={i} className="py-3 px-2 rounded-xl text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="font-black text-base" style={{ color: s.color }}>{s.value}</div>
              <div className="text-slate-600 text-[10px] mt-0.5">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* ─── Error ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
              ⚠ {error}
              <button onClick={() => setError(null)} className="ml-auto text-red-400/50 hover:text-red-400">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Official Tables ────────────────────────────────────────── */}
        {adminTables.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }} className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-amber-400 text-xs"><CrownIcon /></span>
              <h2 className="text-white font-bold text-sm">Official Tables</h2>
              <div className="flex-1 h-px" style={{ background: 'rgba(251,191,36,0.15)' }} />
              <span className="text-amber-400/60 text-[10px]">{adminTables.length} open</span>
            </div>
            <AnimatePresence mode="popLayout">
              <div className="space-y-2.5">
                {adminTables.map((game) => (
                  <GameCard key={game.id} game={game} onJoin={handleJoin}
                    joiningId={joiningId} currentUid={user?.uid || ''} />
                ))}
              </div>
            </AnimatePresence>
          </motion.div>
        )}

        {/* ─── Public Tables ──────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-emerald-400 text-xs"><GlobeIcon /></span>
            <h2 className="text-white font-bold text-sm">Open Rooms</h2>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
            <span className="text-slate-600 text-[10px]">
              {loading ? 'Loading...' : `${publicTables.length} available`}
            </span>
          </div>

          {loading ? (
            <div className="space-y-2.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[76px] rounded-2xl animate-pulse"
                  style={{ background: 'rgba(255,255,255,0.03)' }} />
              ))}
            </div>
          ) : publicTables.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-10">
              <div className="text-4xl mb-2">🎲</div>
              <p className="text-slate-500 text-sm font-medium">No open rooms</p>
              <p className="text-slate-700 text-xs mt-1">Create one and start playing!</p>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-2.5">
                {publicTables.map((game) => (
                  <GameCard key={game.id} game={game} onJoin={handleJoin}
                    joiningId={joiningId} currentUid={user?.uid || ''} />
                ))}
              </div>
            </AnimatePresence>
          )}
        </motion.div>

        {/* ─── How To Play ────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="mt-8 p-4 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
          <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3">How to Play</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['🎲', 'Roll 6 to open token'],
              ['♟', 'Move clockwise around board'],
              ['⚔️', 'Land on enemy to capture'],
              ['🏆', 'Get all 4 tokens home'],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-start gap-2 text-[11px] text-slate-600">
                <span className="mt-0.5">{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ─── Modals ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateGameModal onClose={() => setShowCreateModal(false)}
            onCreate={handleCreate} creating={creating} walletBalance={walletBalance} />
        )}
        {showPrivateJoin && (
          <PrivateJoinModal onClose={() => setShowPrivateJoin(false)}
            onJoin={handleJoinPrivate} joining={joiningPrivate} />
        )}
        {privateCodeResult && (
          <ShareCodeModal
            code={privateCodeResult.code}
            gameId={privateCodeResult.gameId}
            onClose={() => {
              navigate(`/games/RealLudo/${privateCodeResult.gameId}`);
              setPrivateCodeResult(null);
            }}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
      `}</style>
    </div>
  );
};

export default RealLudoLobby;
