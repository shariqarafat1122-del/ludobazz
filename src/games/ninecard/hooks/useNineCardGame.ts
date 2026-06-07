// src/games/ninecard/hooks/useNineCardGame.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { NineCardTable, NineCard } from '../types';
import { decodeCards } from '../deck';
import {
  subscribeNineCardTable,
  joinNineCardTable,
  startNineCardGame,
  seeNineCardCards,
  callNineCardBet,
  packNineCard,
  showNineCard,
  handleNineCardDisconnect,
} from '../service';
import { deductFunds, addFunds } from '../../../firebase/wallet';

// ─── Wallet bridge helpers ─────────────────────────────────────────────────────

async function deductBridge(uid: string, amount: number, desc: string) {
  await deductFunds(uid, amount, 'GAME_LOSS', desc);
}

async function addBridge(uid: string, amount: number, desc: string) {
  await addFunds(uid, amount, 'winningBalance', desc, 'GAME_WIN');
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNineCardGame(tableId: string) {
  const { firebaseUser, user, wallet } = useAuth();

  const [table, setTable] = useState<NineCardTable | null>(null);
  const [myCards, setMyCards] = useState<NineCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startingRef = useRef(false); // Prevent double-start

  // ── Subscribe ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tableId) return;
    const unsub = subscribeNineCardTable(tableId, (t) => {
      setTable(t);
      setLoading(false);
    });
    return () => unsub();
  }, [tableId]);

  // ── Decode my cards when status → seen or finished ─────────────────────────
  useEffect(() => {
    if (!table || !firebaseUser) return;
    const me = table.players[firebaseUser.uid];
    if (!me) return;

    if (me.status === 'seen' || table.gameStatus === 'finished') {
      const cards = decodeCards(me.encryptedCards);
      setMyCards(cards);
    }
  }, [table, firebaseUser]);

  // ── Auto-start when 2 players join ────────────────────────────────────────
  useEffect(() => {
    if (!table || !firebaseUser) return;
    const isCreator = table.createdBy === firebaseUser.uid;
    const isFull = table.playerOrder.length === 2;
    const isWaiting = table.gameStatus === 'waiting';

    // Only creator triggers start, only once
    if (isCreator && isFull && isWaiting && !startingRef.current) {
      startingRef.current = true;
      startNineCardGame(tableId, deductBridge).catch((e) => {
        console.error('Start game error:', e);
        startingRef.current = false;
      });
    }
  }, [table, firebaseUser, tableId]);

  // ── Disconnect handler ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!firebaseUser || !tableId || !table) return;

    const onUnload = () => {
      if (table.gameStatus === 'active' && table.players[firebaseUser.uid]) {
        handleNineCardDisconnect(tableId, firebaseUser.uid, addBridge);
      }
    };

    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [firebaseUser, tableId, table]);

  // ── Action wrapper ─────────────────────────────────────────────────────────
  const withAction = useCallback(
    async (fn: () => Promise<void>) => {
      if (actionLoading) return;
      setActionLoading(true);
      setError(null);
      try {
        await fn();
      } catch (e: any) {
        setError(e?.message ?? 'Something went wrong');
      } finally {
        setActionLoading(false);
      }
    },
    [actionLoading]
  );

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleJoin = useCallback(
    () =>
      withAction(() =>
        joinNineCardTable(
          tableId,
          firebaseUser!.uid,
          user?.name ?? firebaseUser!.displayName ?? 'Player',
          wallet?.depositBalance ?? 0 + (wallet?.winningBalance ?? 0),
          user?.photoURL ?? firebaseUser!.photoURL ?? undefined
        )
      ),
    [tableId, firebaseUser, user, wallet, withAction]
  );

  const handleSeeCards = useCallback(
    () => withAction(() => seeNineCardCards(tableId, firebaseUser!.uid)),
    [tableId, firebaseUser, withAction]
  );

  const handleCall = useCallback(
    () =>
      withAction(() =>
        callNineCardBet(
          tableId,
          firebaseUser!.uid,
          (wallet?.depositBalance ?? 0) + (wallet?.winningBalance ?? 0),
          deductBridge
        )
      ),
    [tableId, firebaseUser, wallet, withAction]
  );

  const handlePack = useCallback(
    () => withAction(() => packNineCard(tableId, firebaseUser!.uid, addBridge)),
    [tableId, firebaseUser, withAction]
  );

  const handleShow = useCallback(
    () => withAction(() => showNineCard(tableId, firebaseUser!.uid, addBridge)),
    [tableId, firebaseUser, withAction]
  );

  // ── Derived state ──────────────────────────────────────────────────────────
  const uid = firebaseUser?.uid ?? '';
  const myPlayer = table?.players[uid] ?? null;
  const opponentUid = table?.playerOrder.find((id) => id !== uid) ?? null;
  const opponentPlayer = opponentUid ? (table?.players[opponentUid] ?? null) : null;
  const isMyTurn = table?.activePlayerUid === uid;
  const isInGame = !!myPlayer;
  const canJoin =
    !isInGame &&
    table?.gameStatus === 'waiting' &&
    Object.keys(table?.players ?? {}).length < 2;
  const canSeeCards = isMyTurn && myPlayer?.status === 'blind' && table?.gameStatus === 'active';
  const canCall = isMyTurn && table?.gameStatus === 'active' && myPlayer?.status !== 'packed';
  const canPack = table?.gameStatus === 'active' && myPlayer?.status !== 'packed';
  const canShow = isMyTurn && myPlayer?.status === 'seen' && table?.gameStatus === 'active';

  return {
    // State
    table,
    myCards,
    myPlayer,
    opponentPlayer,
    opponentUid,
    loading,
    error,
    actionLoading,
    // Flags
    uid,
    isInGame,
    isMyTurn,
    canJoin,
    canCall,
    canPack,
    canShow,
    canSeeCards,
    // Actions
    handleJoin,
    handleSeeCards,
    handleCall,
    handlePack,
    handleShow,
  };
}
