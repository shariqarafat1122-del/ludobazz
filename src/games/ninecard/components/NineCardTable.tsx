// src/games/ninecard/components/NineCardTable.tsx

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useNineCardGame } from '../hooks/useNineCardGame';
import { PokerTableLayout } from './PokerTableLayout';
import { PlayerSeat } from './PlayerSeat';
import { PotDisplay } from './PotDisplay';
import { GameControls } from './GameControls';
import { GameHistory } from './GameHistory';
import { WinnerModal } from './WinnerModal';
import { useAuth } from '../../../context/AuthContext';

interface NineCardTableProps {
  tableId: string;
}

export const NineCardTable: React.FC<NineCardTableProps> = ({ tableId }) => {
  const navigate = useNavigate();
  const { wallet } = useAuth();

  const {
    table,
    myCards,
    myPlayer,
    opponentPlayer,
    loading,
    error,
    actionLoading,
    uid,
    isInGame,
    isMyTurn,
    canJoin,
    canCall,
    canPack,
    canShow,
    canSeeCards,
    handleJoin,
    handleSeeCards,
    handleCall,
    handlePack,
    handleShow,
  } = useNineCardGame(tableId);

  const errorTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Auto-clear error
  useEffect(() => {
    if (error) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => {}, 4000);
    }
    return () => clearTimeout(errorTimerRef.current);
  }, [error]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-14 h-14 rounded-full border-4 border-yellow-500 border-t-transparent"
        />
        <p className="text-gray-400 text-sm animate-pulse">Loading table...</p>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!table) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <p className="text-5xl">🃏</p>
        <p className="text-red-400 text-lg font-bold">Table not found</p>
        <button
          onClick={() => navigate('/nine-card')}
          className="px-6 py-2.5 bg-yellow-500 text-gray-900 font-bold rounded-xl"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  const showdownCards = table.showdownCards ?? {};
  const balance = (wallet?.depositBalance ?? 0) + (wallet?.winningBalance ?? 0);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* ── Nav bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900/80
                      border-b border-gray-800 backdrop-blur-sm relative z-20">
        <button
          onClick={() => navigate('/nine-card')}
          className="text-gray-400 hover:text-white flex items-center gap-1.5 text-sm font-medium"
        >
          ← Lobby
        </button>
        <div className="text-center">
          <p className="text-yellow-400 text-xs font-bold tracking-widest uppercase">
            9 Card Table
          </p>
        </div>
        <div className="text-right">
          <p className="text-gray-500 text-[10px]">Balance</p>
          <p className="text-yellow-300 text-sm font-bold">
            ₹{balance.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        <PokerTableLayout
          tableName={table.name}
          gameStatus={table.gameStatus}
          round={table.round}
          bootAmount={table.bootAmount}
          topSlot={
            <PlayerSeat
              player={opponentPlayer}
              cards={[]}
              isOpponent={true}
              isActive={table.activePlayerUid === opponentPlayer?.uid}
              showdownCards={showdownCards[opponentPlayer?.uid ?? '']}
              gameStatus={table.gameStatus}
              position="top"
            />
          }
          centerSlot={
            <PotDisplay
              potAmount={table.potAmount}
              callAmount={table.currentCallAmount}
              gameStatus={table.gameStatus}
              round={table.round}
            />
          }
          bottomSlot={
            <PlayerSeat
              player={myPlayer}
              cards={myCards}
              isOpponent={false}
              isActive={isMyTurn}
              showdownCards={showdownCards[uid]}
              gameStatus={table.gameStatus}
              isMe={true}
              position="bottom"
            />
          }
        />
      </div>

      {/* ── Controls / Join ─────────────────────────────────────────────── */}
      <div className="px-4 pb-4 pt-2 space-y-3 relative z-10 bg-gray-950">
        {/* Join button */}
        {canJoin && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleJoin}
            disabled={actionLoading || balance < table.bootAmount}
            className="w-full py-4 rounded-xl font-black text-lg text-gray-900
                       bg-gradient-to-r from-yellow-500 to-amber-400
                       disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            style={{ boxShadow: '0 4px 24px rgba(234,179,8,0.4)' }}
          >
            {balance < table.bootAmount
              ? `Insufficient Balance (need ₹${table.bootAmount})`
              : `Join Table — Pay ₹${table.bootAmount}`}
          </motion.button>
        )}

        {/* Waiting for opponent */}
        {isInGame && table.gameStatus === 'waiting' && (
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-center py-4"
          >
            <p className="text-yellow-400 font-bold">⏳ Waiting for opponent...</p>
            <p className="text-gray-500 text-xs mt-1">Share this table link to invite</p>
          </motion.div>
        )}

        {/* Game controls */}
        {isInGame && table.gameStatus === 'active' && (
          <GameControls
            isMyTurn={isMyTurn}
            canCall={canCall}
            canPack={canPack}
            canShow={canShow}
            canSeeCards={canSeeCards}
            callAmount={table.currentCallAmount}
            myStatus={myPlayer?.status ?? 'blind'}
            actionLoading={actionLoading}
            onCall={handleCall}
            onPack={handlePack}
            onShow={handleShow}
            onSeeCards={handleSeeCards}
          />
        )}

        {/* Action log */}
        <GameHistory actions={table.actions ?? []} />
      </div>

      {/* ── Error toast ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                       bg-red-900/90 border border-red-600 text-red-100
                       px-5 py-3 rounded-xl shadow-xl text-sm font-medium
                       backdrop-blur-sm max-w-xs text-center"
          >
            ⚠️ {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Winner modal ─────────────────────────────────────────────────── */}
      {table.gameStatus === 'finished' && (
        <WinnerModal
          table={table}
          myUid={uid}
          onLobby={() => navigate('/nine-card')}
        />
      )}
    </div>
  );
};
