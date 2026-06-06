// src/pages/games/RealLudoLobby.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  where,
  orderBy,
  getDoc
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// ─── Types ───────────────────────────────────────
interface LudoTable {
  gameId: string;
  creatorUid: string;
  creatorName: string;
  entryFee: number;
  prizePool: number;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
}

const ENTRY_FEES = [10, 25, 50, 100, 500];

export default function RealLudoLobby() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [tables, setTables] = useState<LudoTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFee, setSelectedFee] = useState(10);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // ── Fetch waiting tables ──────────────────────
  useEffect(() => {
    const q = query(
      collection(db, 'ludo_games'),
      where('status', '==', 'waiting'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => d.data() as LudoTable);
      // Filter out own tables
      setTables(data.filter(t => t.creatorUid !== user?.uid));
    });

    return () => unsub();
  }, [user]);

  // ── Create Game ───────────────────────────────
  const createGame = async () => {
    if (!user || !userProfile) return;

    // ✅ Balance check
    if ((userProfile.walletBalance || 0) < selectedFee) {
      toast.error('Insufficient balance!');
      return;
    }

    setLoading(true);
    try {
      // ✅ Deduct entry fee
      await updateDoc(doc(db, 'users', user.uid), {
        walletBalance: (userProfile.walletBalance || 0) - selectedFee,
      });

      // ✅ Creator = GREEN, goes first
      const gameData = {
        gameId: '',
        players: {
          [user.uid]: {
            uid: user.uid,
            displayName: user.displayName || userProfile.name || 'Player 1',
            color: 'green',        // ← CREATOR = GREEN
            isCreator: true,
            pieces: [0, 1, 2, 3].map(id => ({
              id,
              color: 'green',
              position: -1,
              isHome: true,
              isFinished: false,
            })),
          },
        },
        creatorUid: user.uid,
        creatorName: user.displayName || 'Player 1',
        currentTurn: user.uid,    // ← CREATOR GOES FIRST
        diceValue: null,
        diceRolled: false,
        status: 'waiting',
        winner: null,
        prizePool: selectedFee * 2 * 0.9, // ← 10% platform fee
        entryFee: selectedFee,
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      const ref = await addDoc(collection(db, 'ludo_games'), gameData);
      
      // Save gameId in document
      await updateDoc(ref, { gameId: ref.id });
      
      toast.success('Table created! Waiting for opponent...');
      navigate(`/games/RealLudo/${ref.id}`);

    } catch (err) {
      console.error(err);
      // ✅ Refund if error
      await updateDoc(doc(db, 'users', user.uid), {
        walletBalance: (userProfile.walletBalance || 0),
      });
      toast.error('Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  // ── Join Game ─────────────────────────────────
  const joinGame = async (table: LudoTable) => {
    if (!user || !userProfile) return;

    // ✅ Balance check
    if ((userProfile.walletBalance || 0) < table.entryFee) {
      toast.error('Insufficient balance!');
      return;
    }

    setJoiningId(table.gameId);
    try {
      const gameRef = doc(db, 'ludo_games', table.gameId);
      
      // ✅ Check game still waiting
      const snap = await getDoc(gameRef);
      if (!snap.exists() || snap.data()?.status !== 'waiting') {
        toast.error('Table no longer available');
        setJoiningId(null);
        return;
      }

      // ✅ Deduct entry fee
      await updateDoc(doc(db, 'users', user.uid), {
        walletBalance: (userProfile.walletBalance || 0) - table.entryFee,
      });

      // ✅ Joiner = BLUE
      await updateDoc(gameRef, {
        [`players.${user.uid}`]: {
          uid: user.uid,
          displayName: user.displayName || userProfile.name || 'Player 2',
          color: 'blue',           // ← JOINER = BLUE
          isCreator: false,
          pieces: [0, 1, 2, 3].map(id => ({
            id,
            color: 'blue',
            position: -1,
            isHome: true,
            isFinished: false,
          })),
        },
        status: 'playing',         // ← GAME STARTS
        lastActivity: Date.now(),
      });

      navigate(`/games/RealLudo/${table.gameId}`);

    } catch (err) {
      console.error(err);
      toast.error('Failed to join game');
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div
      className="min-h-screen p-4"
      style={{
        background: 'linear-gradient(135deg, #0d0620, #1a0f2e)',
      }}
    >
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-black text-white mb-1">🎲 Ludo</h1>
        <p className="text-white/50 text-sm">Create or join a table</p>
        <div
          className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <span className="text-white/60 text-sm">Balance:</span>
          <span className="text-green-400 font-bold">
            ₹{userProfile?.walletBalance?.toFixed(2) || '0.00'}
          </span>
        </div>
      </div>

      {/* Create Game Section */}
      <div
        className="rounded-2xl p-5 mb-6"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <h2 className="text-white font-bold text-lg mb-4">Create Table</h2>

        {/* Fee Selection */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {ENTRY_FEES.map(fee => (
            <button
              key={fee}
              onClick={() => setSelectedFee(fee)}
              className="py-2 rounded-xl font-bold text-sm transition-all active:scale-95"
              style={{
                background: selectedFee === fee
                  ? 'linear-gradient(135deg, #16a34a, #15803d)'
                  : 'rgba(255,255,255,0.08)',
                color: selectedFee === fee ? 'white' : 'rgba(255,255,255,0.6)',
                border: selectedFee === fee
                  ? '1px solid #22c55e'
                  : '1px solid rgba(255,255,255,0.1)',
                boxShadow: selectedFee === fee
                  ? '0 4px 15px rgba(34,197,94,0.3)'
                  : 'none',
              }}
            >
              ₹{fee}
            </button>
          ))}
        </div>

        {/* Prize pool info */}
        <div
          className="flex justify-between items-center p-3 rounded-xl mb-4"
          style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)' }}
        >
          <span className="text-white/60 text-sm">Prize Pool</span>
          <span className="text-yellow-400 font-black text-lg">
            ₹{(selectedFee * 2 * 0.9).toFixed(2)}
          </span>
        </div>

        <button
          onClick={createGame}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all active:scale-95"
          style={{
            background: loading
              ? 'rgba(255,255,255,0.1)'
              : 'linear-gradient(135deg, #16a34a, #15803d)',
            boxShadow: loading ? 'none' : '0 4px 20px rgba(34,197,94,0.4)',
          }}
        >
          {loading ? 'Creating...' : `Create Table (₹${selectedFee})`}
        </button>
      </div>

      {/* Available Tables */}
      <div>
        <h2 className="text-white font-bold text-lg mb-3">
          Available Tables ({tables.length})
        </h2>

        {tables.length === 0 ? (
          <div
            className="text-center py-10 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.1)',
            }}
          >
            <p className="text-4xl mb-2">🎲</p>
            <p className="text-white/40 text-sm">No tables available</p>
            <p className="text-white/25 text-xs">Create one above!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tables.map(table => (
              <div
                key={table.gameId}
                className="flex items-center justify-between p-4 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div>
                  <p className="text-white font-semibold text-sm">
                    {table.creatorName}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{
                        background: 'rgba(34,197,94,0.15)',
                        color: '#22c55e',
                      }}
                    >
                      🟢 Green
                    </span>
                    <span className="text-white/40 text-xs">vs You 🔵</span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-yellow-400 font-black text-lg">
                    ₹{table.prizePool.toFixed(0)}
                  </p>
                  <p className="text-white/40 text-xs mb-2">Prize</p>
                  <button
                    onClick={() => joinGame(table)}
                    disabled={joiningId === table.gameId}
                    className="px-4 py-2 rounded-xl font-bold text-sm text-white transition-all active:scale-95"
                    style={{
                      background: joiningId === table.gameId
                        ? 'rgba(255,255,255,0.1)'
                        : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      boxShadow: joiningId === table.gameId
                        ? 'none'
                        : '0 4px 15px rgba(37,99,235,0.4)',
                    }}
                  >
                    {joiningId === table.gameId
                      ? 'Joining...'
                      : `Join ₹${table.entryFee}`}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
