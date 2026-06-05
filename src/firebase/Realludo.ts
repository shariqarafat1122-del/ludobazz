import { collection, doc, setDoc, updateDoc, getDoc, getDocs, query, where, limit, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from './config';
import { GameTable, LudoGameState, PlayerColor } from '../types';
import { generateRoomCode, calculatePrize, createInitialTokens, MAX_LIVES, TURN_DURATION } from '../utils/RealHelpers';

export async function createTable(creatorId: string, creatorName: string, amount: number, type: 'public' | 'private', name: string) {
  const tableId = `tbl_${Date.now()}`;
  const { totalPool, platformCut, winnerPrize } = calculatePrize(amount);
  
  const table: GameTable = {
    tableId, tableName: name || `${creatorName}'s Table`, type, entryAmount: amount,
    prizePool: amount, platformCut: 0, winnerPrize: 0, creatorId, creatorName,
    player1Id: creatorId, player2Id: null, player1Name: creatorName, player2Name: null,
    status: 'waiting', roomCode: type === 'private' ? generateRoomCode() : '', createdAt: Date.now()
  };
  await setDoc(doc(db, 'tables', tableId), table);
  return table;
}

export async function joinTable(tableId: string, playerId: string, playerName: string) {
  const ref = doc(db, 'tables', tableId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Table not found');
  
  const table = snap.data() as GameTable;
  if (table.status !== 'waiting' || table.player2Id) throw new Error('Table full or started');
  
  const { totalPool, platformCut, winnerPrize } = calculatePrize(table.entryAmount);
  await updateDoc(ref, {
    player2Id: playerId, player2Name: playerName, status: 'playing',
    prizePool: totalPool, platformCut, winnerPrize
  });
  return { ...table, player2Id: playerId, status: 'playing' as const };
}

export async function joinByCode(code: string, playerId: string, playerName: string) {
  const q = query(collection(db, 'tables'), where('roomCode', '==', code.toUpperCase()), where('status', '==', 'waiting'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('Invalid Code');
  return joinTable(snap.docs[0].id, playerId, playerName);
}

export async function initGame(table: GameTable) {
  const gameId = `game_${table.tableId}`;
  const state: LudoGameState = {
    gameId, tableId: table.tableId,
    players: [
      { id: table.player1Id!, name: table.player1Name!, color: 'red', tokens: createInitialTokens('red'), lives: MAX_LIVES, finishedTokens: 0, isOnline: true },
      { id: table.player2Id!, name: table.player2Name!, color: 'green', tokens: createInitialTokens('green'), lives: MAX_LIVES, finishedTokens: 0, isOnline: true }
    ],
    currentTurn: 'red', diceValue: 1, hasRolled: false, status: 'playing', winnerId: null,
    turnStartTime: Date.now(), lastMoveTime: Date.now()
  };
  await setDoc(doc(db, 'games', gameId), state);
  return gameId;
}

export const subscribeToGame = (gameId: string, cb: (state: LudoGameState | null) => void) => {
  return onSnapshot(doc(db, 'games', gameId), snap => cb(snap.exists() ? snap.data() as LudoGameState : null));
};

export const subscribeToTable = (tableId: string, cb: (table: GameTable | null) => void) => {
  return onSnapshot(doc(db, 'tables', tableId), snap => cb(snap.exists() ? snap.data() as GameTable : null));
};

export const updateGameState = async (gameId: string, state: Partial<LudoGameState>) => {
  await updateDoc(doc(db, 'games', gameId), state);
};
