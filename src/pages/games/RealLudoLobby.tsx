import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAppStore } from '../../store/useStore';
const { user, walletBalance } = useAppStore();
import { deductEntryFee } from '../../firebase/wallet';
import { createTable, joinTable, joinByCode } from '../../firebase/RealLudo';
import { GameTable } from '../../types';
import { AMOUNT_OPTIONS, calculatePrize } from '../../utils/RealHelpers';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';

export default function LudoLobby() {
  const { user, walletBalance } = useStore(); // Adjust based on your store
  const navigate = useNavigate();
  const [tables, setTables] = useState<GameTable[]>([]);
  const [myTable, setMyTable] = useState<GameTable | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState(50);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'tables'), where('status', '==', 'waiting'), orderBy('createdAt', 'desc'), limit(20));
    const unsub = onSnapshot(q, snap => setTables(snap.docs.map(d => d.data() as GameTable)));
    return () => unsub();
  }, []);

  const handleCreate = async (type: 'public' | 'private') => {
    if (!user || walletBalance < amount) return alert('Insufficient Balance');
    setLoading(true);
    const success = await deductEntryFee(user.uid, amount);
    if (success) {
      const table = await createTable(user.uid, user.name, amount, type, '');
      setMyTable(table);
    }
    setLoading(false);
    setShowCreate(false);
  };

  const handleJoin = async (tableId: string, reqAmount: number) => {
    if (!user || walletBalance < reqAmount) return alert('Insufficient Balance');
    setLoading(true);
    const success = await deductEntryFee(user.uid, reqAmount);
    if (success) {
      const updatedTable = await joinTable(tableId, user.uid, user.name);
      navigate(`/games/ludo/${updatedTable.tableId}`);
    }
    setLoading(false);
  };

  const handleJoinCode = async () => {
    if (!user || code.length !== 6) return;
    setLoading(true);
    try {
      const updatedTable = await joinByCode(code, user.uid, user.name);
      navigate(`/games/ludo/${updatedTable.tableId}`);
    } catch (e: any) { alert(e.message); }
    setLoading(false);
  };

  // Auto-start when opponent joins
  useEffect(() => {
    if (myTable && myTable.player2Id) navigate(`/games/ludo/${myTable.tableId}`);
  }, [myTable]);

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white p-4 max-w-md mx-auto">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black bg-gradient-to-r from-red-500 to-yellow-500 bg-clip-text text-transparent">LUDO PRO</h1>
        <div className="bg-yellow-500/20 border border-yellow-500/50 px-4 py-2 rounded-xl text-yellow-400 font-bold">₹{walletBalance}</div>
      </header>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Button onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-red-600 to-red-800 py-4 font-bold">+ Create Table</Button>
        <Button onClick={() => setShowJoin(true)} className="bg-gradient-to-r from-blue-600 to-blue-800 py-4 font-bold">🔑 Join Private</Button>
      </div>

      <h2 className="text-lg font-bold mb-3 text-gray-300">Live Public Tables</h2>
      <div className="space-y-3">
        {tables.filter(t => t.type === 'public' && t.player1Id !== user?.uid).map(t => {
          const prize = calculatePrize(t.entryAmount);
          return (
            <GlassCard key={t.tableId} className="p-4 flex justify-between items-center">
              <div>
                <p className="font-bold">{t.creatorName}'s Table</p>
                <p className="text-xs text-gray-400">Entry: ₹{t.entryAmount} | Win: ₹{prize.winnerPrize}</p>
              </div>
              <Button onClick={() => handleJoin(t.tableId, t.entryAmount)} disabled={loading} className="bg-green-600 px-4 py-2 text-sm">Join</Button>
            </GlassCard>
          );
        })}
        {tables.length === 0 && <p className="text-center text-gray-500">No tables available. Create one!</p>}
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <GlassCard className="w-full p-6 space-y-4">
              <h3 className="text-xl font-bold text-center">Create Table</h3>
              <div className="grid grid-cols-4 gap-2">
                {AMOUNT_OPTIONS.map(a => (
                  <button key={a} onClick={() => setAmount(a)} className={`p-2 rounded-lg text-sm font-bold ${amount === a ? 'bg-red-600' : 'bg-white/10'}`}>₹{a}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => handleCreate('public')} className="bg-green-600 py-3">Public</Button>
                <Button onClick={() => handleCreate('private')} className="bg-blue-600 py-3">Private</Button>
              </div>
              <Button onClick={() => setShowCreate(false)} variant="ghost" className="w-full">Cancel</Button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showJoin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <GlassCard className="w-full p-6 space-y-4">
              <h3 className="text-xl font-bold text-center">Enter 6-Digit Code</h3>
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={6} className="w-full bg-white/10 text-center text-2xl tracking-widest py-3 rounded-xl outline-none" />
              <Button onClick={handleJoinCode} disabled={code.length !== 6 || loading} className="w-full bg-blue-600 py-3">Join Game</Button>
              <Button onClick={() => setShowJoin(false)} variant="ghost" className="w-full">Cancel</Button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {myTable && !myTable.player2Id && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
            <GlassCard className="w-full p-6 text-center space-y-4">
              <div className="animate-spin text-4xl">🎲</div>
              <h3 className="text-xl font-bold">Waiting for Opponent...</h3>
              {myTable.type === 'private' && (
                <div className="bg-blue-500/20 p-4 rounded-xl border border-blue-500/50">
                  <p className="text-xs text-blue-300 mb-2">Share this code</p>
                  <p className="text-3xl font-black tracking-widest text-white">{myTable.roomCode}</p>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
