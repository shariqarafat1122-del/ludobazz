import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  getDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { GameTable, TableType } from '../types/lobby';
import { generateTableId, generateRoomCode, calculatePrize } from '../utils/roomUtils';

interface UseLobbyOptions {
  playerId: string;
  playerName: string;
  walletBalance: number;
  onDeductBalance: (amount: number) => Promise<boolean>;
}

export function useLobby({ playerId, playerName, walletBalance, onDeductBalance }: UseLobbyOptions) {
  const [publicTables, setPublicTables] = useState<GameTable[]>([]);
  const [myTable, setMyTable] = useState<GameTable | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinedTableId, setJoinedTableId] = useState<string | null>(null);

  const unsubPublic = useRef<(() => void) | null>(null);
  const unsubMyTable = useRef<(() => void) | null>(null);

  // Subscribe to public tables
  useEffect(() => {
    const q = query(
      collection(db, 'tables'),
      where('type', '==', 'public'),
      where('status', '==', 'waiting'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    unsubPublic.current = onSnapshot(q, (snap) => {
      const tables: GameTable[] = [];
      snap.forEach(d => tables.push(d.data() as GameTable));
      setPublicTables(tables);
    }, err => {
      console.error('Public tables error:', err);
    });

    return () => unsubPublic.current?.();
  }, []);

  // Subscribe to my active table
  useEffect(() => {
    if (!joinedTableId) return;

    const ref = doc(db, 'tables', joinedTableId);
    unsubMyTable.current = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setMyTable(snap.data() as GameTable);
      } else {
        setMyTable(null);
        setJoinedTableId(null);
      }
    });

    return () => unsubMyTable.current?.();
  }, [joinedTableId]);

  // Create a new table
  const createTable = useCallback(async (
    type: TableType,
    entryAmount: number,
    tableName: string
  ): Promise<GameTable | null> => {
    if (walletBalance < entryAmount) {
      setError(`Insufficient balance. Need ₹${entryAmount}`);
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Deduct entry amount
      const deducted = await onDeductBalance(entryAmount);
      if (!deducted) {
        setError('Payment failed. Check wallet balance.');
        setIsLoading(false);
        return null;
      }

      const tableId = generateTableId();
      const roomCode = type === 'private' ? generateRoomCode() : '';
      const { totalPool, platformCut, winnerPrize } = calculatePrize(entryAmount);

      const table: GameTable = {
        tableId,
        tableName: tableName || `${playerName}'s Table`,
        type,
        entryAmount,
        prizePool: entryAmount, // Will be doubled when P2 joins
        platformCut: 0,
        winnerPrize: 0,
        creatorId: playerId,
        creatorName: playerName,
        player1Id: playerId,
        player2Id: null,
        player1Name: playerName,
        player2Name: null,
        player1Ready: true,
        player2Ready: false,
        status: 'waiting',
        roomCode,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        gameStartedAt: null,
      };

      await setDoc(doc(db, 'tables', tableId), table);
      setJoinedTableId(tableId);
      setIsLoading(false);
      return table;
    } catch (err) {
      console.error('Create table error:', err);
      setError('Failed to create table');
      setIsLoading(false);
      return null;
    }
  }, [walletBalance, playerId, playerName, onDeductBalance]);

  // Join existing table
  const joinTable = useCallback(async (tableId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const tableRef = doc(db, 'tables', tableId);
      const snap = await getDoc(tableRef);

      if (!snap.exists()) {
        setError('Table not found!');
        setIsLoading(false);
        return false;
      }

      const table = snap.data() as GameTable;

      if (table.status !== 'waiting') {
        setError('Game already started!');
        setIsLoading(false);
        return false;
      }

      if (table.player2Id) {
        setError('Table is full!');
        setIsLoading(false);
        return false;
      }

      if (table.player1Id === playerId) {
        setError("You can't join your own table!");
        setIsLoading(false);
        return false;
      }

      if (walletBalance < table.entryAmount) {
        setError(`Insufficient balance. Need ₹${table.entryAmount}`);
        setIsLoading(false);
        return false;
      }

      // Deduct entry
      const deducted = await onDeductBalance(table.entryAmount);
      if (!deducted) {
        setError('Payment failed. Check wallet balance.');
        setIsLoading(false);
        return false;
      }

      const { totalPool, platformCut, winnerPrize } = calculatePrize(table.entryAmount);

      await updateDoc(tableRef, {
        player2Id: playerId,
        player2Name: playerName,
        player2Ready: true,
        status: 'playing',
        prizePool: totalPool,
        platformCut,
        winnerPrize,
        gameStartedAt: Date.now(),
        updatedAt: Date.now(),
      });

      setJoinedTableId(tableId);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Join table error:', err);
      setError('Failed to join table');
      setIsLoading(false);
      return false;
    }
  }, [walletBalance, playerId, playerName, onDeductBalance]);

  // Join by room code (private table)
  const joinByCode = useCallback(async (code: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, 'tables'),
        where('roomCode', '==', code.toUpperCase()),
        where('status', '==', 'waiting'),
        limit(1)
      );

      const snap = await import('firebase/firestore').then(
        ({ getDocs }) => getDocs(q)
      );

      if (snap.empty) {
        setError('Invalid room code or table not found!');
        setIsLoading(false);
        return false;
      }

      const tableId = snap.docs[0].id;
      return await joinTable(tableId);
    } catch (err) {
      console.error('Join by code error:', err);
      setError('Failed to join. Try again.');
      setIsLoading(false);
      return false;
    }
  }, [joinTable]);

  // Leave/cancel table
  const leaveTable = useCallback(async (tableId: string) => {
    try {
      const tableRef = doc(db, 'tables', tableId);
      const snap = await getDoc(tableRef);
      if (!snap.exists()) return;

      const table = snap.data() as GameTable;

      // If creator leaves and no player 2, delete table
      if (table.player1Id === playerId && !table.player2Id) {
        await deleteDoc(tableRef);
      } else {
        // Update table
        await updateDoc(tableRef, {
          [`${table.player1Id === playerId ? 'player1Id' : 'player2Id'}`]: null,
          updatedAt: Date.now(),
        });
      }

      setMyTable(null);
      setJoinedTableId(null);
    } catch (err) {
      console.error('Leave table error:', err);
    }
  }, [playerId]);

  const clearError = useCallback(() => setError(null), []);

  return {
    publicTables,
    myTable,
    isLoading,
    error,
    joinedTableId,
    createTable,
    joinTable,
    joinByCode,
    leaveTable,
    clearError,
  };
}
