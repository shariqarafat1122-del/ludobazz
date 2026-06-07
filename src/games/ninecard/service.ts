// src/games/ninecard/service.ts

import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  runTransaction,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  limit,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import {
  NineCardTable,
  NineCardPlayer,
  NineCardAction,
  NineCardActionType,
  NineCardGameStatus,
} from './types';
import { generateShuffledDeck, encodeCards, decodeCards, generateDeckHash } from './deck';
import { determineWinner } from './engine';

// ─── Collection Reference ─────────────────────────────────────────────────────

const COLLECTION = 'nineCardTables';

export const tableRef = (id: string) => doc(db, COLLECTION, id);
export const tablesCollection = () => collection(db, COLLECTION);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newAction(
  uid: string,
  name: string,
  action: NineCardActionType,
  amount: number,
  round: number
): NineCardAction {
  return {
    id: `${uid}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    uid,
    name,
    action,
    amount,
    timestamp: Date.now(),
    round,
  };
}

function getOpponentUid(table: NineCardTable, uid: string): string {
  const opp = table.playerOrder.find((id) => id !== uid);
  if (!opp) throw new Error('Opponent not found');
  return opp;
}

// ─── Create Table ─────────────────────────────────────────────────────────────

export async function createNineCardTable(
  uid: string,
  name: string,
  displayName: string,
  bootAmount: number,
  photoURL?: string
): Promise<string> {
  const ref = doc(tablesCollection());

  const player: NineCardPlayer = {
    uid,
    name: displayName,
    photoURL,
    status: 'waiting',
    hasPaid: false,
    encryptedCards: '',
    currentBet: 0,
    totalBet: 0,
    seatPosition: 'bottom',
    joinedAt: Date.now(),
    isConnected: true,
  };

  const table: NineCardTable = {
    id: ref.id,
    name,
    bootAmount,
    potAmount: 0,
    currentCallAmount: bootAmount,
    gameStatus: 'waiting',
    round: 0,
    activePlayerUid: null,
    players: { [uid]: player },
    playerOrder: [uid],
    winner: null,
    winnerReason: '',
    showdownCards: {},
    actions: [newAction(uid, displayName, 'join', 0, 0)],
    deckHash: '',
    createdBy: uid,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await runTransaction(db, async (tx) => {
    tx.set(ref, table);
  });

  return ref.id;
}

// ─── Join Table ───────────────────────────────────────────────────────────────

export async function joinNineCardTable(
  tableId: string,
  uid: string,
  displayName: string,
  walletBalance: number,
  photoURL?: string
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(tableRef(tableId));
    if (!snap.exists()) throw new Error('Table not found');

    const table = snap.data() as NineCardTable;

    if (table.gameStatus !== 'waiting')
      throw new Error('Game already in progress');
    if (Object.keys(table.players).length >= 2)
      throw new Error('Table is full');
    if (table.players[uid])
      throw new Error('Already joined this table');
    if (walletBalance < table.bootAmount)
      throw new Error(`Insufficient balance. Need ₹${table.bootAmount}`);

    const player: NineCardPlayer = {
      uid,
      name: displayName,
      photoURL,
      status: 'waiting',
      hasPaid: false,
      encryptedCards: '',
      currentBet: 0,
      totalBet: 0,
      seatPosition: 'top',
      joinedAt: Date.now(),
      isConnected: true,
    };

    const joinAction = newAction(uid, displayName, 'join', 0, 0);

    tx.update(tableRef(tableId), {
      [`players.${uid}`]: player,
      playerOrder: [...table.playerOrder, uid],
      actions: [...(table.actions ?? []), joinAction].slice(-50),
      updatedAt: Date.now(),
    });
  });
}

// ─── Start Game ───────────────────────────────────────────────────────────────

/**
 * Called automatically when 2nd player joins.
 * Deducts boot from both wallets, deals 2 cards each.
 */
export async function startNineCardGame(
  tableId: string,
  deductFromWallet: (uid: string, amount: number, description: string) => Promise<void>
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(tableRef(tableId));
    if (!snap.exists()) throw new Error('Table not found');

    const table = snap.data() as NineCardTable;
    if (table.gameStatus !== 'waiting') throw new Error('Game already started');

    const pids = table.playerOrder;
    if (pids.length !== 2) throw new Error('Need exactly 2 players');

    // Deal cards
    const deck = generateShuffledDeck();
    const deckHash = generateDeckHash(deck);

    const p1Cards = [deck[0], deck[1]];
    const p2Cards = [deck[2], deck[3]];

    const updatedPlayers: Record<string, NineCardPlayer> = {
      ...table.players,
      [pids[0]]: {
        ...table.players[pids[0]],
        status: 'blind',
        hasPaid: true,
        encryptedCards: encodeCards(p1Cards),
        currentBet: table.bootAmount,
        totalBet: table.bootAmount,
      },
      [pids[1]]: {
        ...table.players[pids[1]],
        status: 'blind',
        hasPaid: true,
        encryptedCards: encodeCards(p2Cards),
        currentBet: table.bootAmount,
        totalBet: table.bootAmount,
      },
    };

    tx.update(tableRef(tableId), {
      players: updatedPlayers,
      gameStatus: 'active' as NineCardGameStatus,
      round: 1,
      potAmount: table.bootAmount * 2,
      currentCallAmount: table.bootAmount,
      // Player 2 (joiner) acts first
      activePlayerUid: pids[1],
      deckHash,
      updatedAt: Date.now(),
    });
  });

  // Wallet deductions happen outside transaction to avoid Firestore contention
  const snap = await getDoc(tableRef(tableId));
  const table = snap.data() as NineCardTable;
  const [p1, p2] = table.playerOrder;
  await deductFromWallet(p1, table.bootAmount, `9CT Boot - ${table.name}`);
  await deductFromWallet(p2, table.bootAmount, `9CT Boot - ${table.name}`);
}

// ─── See Cards ────────────────────────────────────────────────────────────────

export async function seeNineCardCards(
  tableId: string,
  uid: string
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(tableRef(tableId));
    if (!snap.exists()) throw new Error('Table not found');

    const table = snap.data() as NineCardTable;
    if (table.gameStatus !== 'active') throw new Error('Game not active');

    const player = table.players[uid];
    if (!player) throw new Error('Player not in game');
    if (player.status !== 'blind') throw new Error('Already seen cards');

    const action = newAction(uid, player.name, 'see', 0, table.round);

    tx.update(tableRef(tableId), {
      [`players.${uid}.status`]: 'seen',
      [`players.${uid}.lastAction`]: 'see',
      [`players.${uid}.lastActionAt`]: Date.now(),
      actions: [...(table.actions ?? []), action].slice(-50),
      updatedAt: Date.now(),
    });
  });
}

// ─── Call Bet ─────────────────────────────────────────────────────────────────

export async function callNineCardBet(
  tableId: string,
  uid: string,
  walletBalance: number,
  deductFromWallet: (uid: string, amount: number, description: string) => Promise<void>
): Promise<void> {
  let callAmount = 0;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(tableRef(tableId));
    if (!snap.exists()) throw new Error('Table not found');

    const table = snap.data() as NineCardTable;
    if (table.gameStatus !== 'active') throw new Error('Game not active');
    if (table.activePlayerUid !== uid) throw new Error('Not your turn');

    const player = table.players[uid];
    if (!player) throw new Error('Player not in game');
    if (player.status === 'packed') throw new Error('Already packed');

    callAmount = table.currentCallAmount;
    if (walletBalance < callAmount)
      throw new Error(`Insufficient balance. Need ₹${callAmount}`);

    const opponentUid = getOpponentUid(table, uid);
    const action = newAction(uid, player.name, 'call', callAmount, table.round);

    tx.update(tableRef(tableId), {
      [`players.${uid}.currentBet`]: callAmount,
      [`players.${uid}.totalBet`]: player.totalBet + callAmount,
      [`players.${uid}.lastAction`]: 'call',
      [`players.${uid}.lastActionAt`]: Date.now(),
      potAmount: table.potAmount + callAmount,
      activePlayerUid: opponentUid,
      actions: [...(table.actions ?? []), action].slice(-50),
      updatedAt: Date.now(),
    });
  });

  // Wallet deduction outside transaction
  const snap = await getDoc(tableRef(tableId));
  const table = snap.data() as NineCardTable;
  await deductFromWallet(
    uid,
    callAmount,
    `9CT Call ₹${callAmount} - ${table.name}`
  );
}

// ─── Pack / Fold ──────────────────────────────────────────────────────────────

export async function packNineCard(
  tableId: string,
  uid: string,
  addToWallet: (uid: string, amount: number, description: string) => Promise<void>
): Promise<void> {
  let potAmount = 0;
  let opponentUid = '';

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(tableRef(tableId));
    if (!snap.exists()) throw new Error('Table not found');

    const table = snap.data() as NineCardTable;
    if (table.gameStatus !== 'active') throw new Error('Game not active');

    const player = table.players[uid];
    if (!player) throw new Error('Player not in game');

    opponentUid = getOpponentUid(table, uid);
    potAmount = table.potAmount;

    const action = newAction(uid, player.name, 'pack', 0, table.round);

    tx.update(tableRef(tableId), {
      [`players.${uid}.status`]: 'packed',
      [`players.${uid}.lastAction`]: 'pack',
      [`players.${uid}.lastActionAt`]: Date.now(),
      [`players.${opponentUid}.status`]: 'winner',
      winner: opponentUid,
      winnerReason: `${player.name} packed/folded`,
      gameStatus: 'finished' as NineCardGameStatus,
      activePlayerUid: null,
      actions: [...(table.actions ?? []), action].slice(-50),
      updatedAt: Date.now(),
    });
  });

  // Award pot to opponent
  const snap = await getDoc(tableRef(tableId));
  const table = snap.data() as NineCardTable;
  await addToWallet(
    opponentUid,
    potAmount,
    `9CT Win (opponent packed) - ${table.name}`
  );
}

// ─── Show (Showdown) ──────────────────────────────────────────────────────────

export async function showNineCard(
  tableId: string,
  uid: string,
  addToWallet: (uid: string, amount: number, description: string) => Promise<void>
): Promise<void> {
  let potAmount = 0;
  let winnerUid: string | null = null;
  let loserUid = '';

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(tableRef(tableId));
    if (!snap.exists()) throw new Error('Table not found');

    const table = snap.data() as NineCardTable;
    if (table.gameStatus !== 'active') throw new Error('Game not active');
    if (table.activePlayerUid !== uid) throw new Error('Not your turn');

    const player = table.players[uid];
    if (!player) throw new Error('Player not in game');

    // Show only allowed if player has seen cards
    if (player.status === 'blind')
      throw new Error('You must see your cards before showing');

    const opponentUid = getOpponentUid(table, uid);
    const opponent = table.players[opponentUid];

    // Decode both hands
    const myCards = decodeCards(player.encryptedCards);
    const oppCards = decodeCards(opponent.encryptedCards);

    if (myCards.length !== 2 || oppCards.length !== 2)
      throw new Error('Card dealing error — contact support');

    const result = determineWinner(
      { uid, cards: myCards },
      { uid: opponentUid, cards: oppCards }
    );

    potAmount = table.potAmount;
    winnerUid = result.winnerUid;
    loserUid = winnerUid === uid ? opponentUid : uid;

    const action = newAction(uid, player.name, 'show', 0, table.round);

    const winnerStatus = winnerUid
      ? { [`players.${winnerUid}.status`]: 'winner' }
      : {};

    tx.update(tableRef(tableId), {
      gameStatus: 'finished' as NineCardGameStatus,
      winner: winnerUid ?? 'draw',
      winnerReason: result.reason,
      showdownCards: {
        [uid]: myCards,
        [opponentUid]: oppCards,
      },
      ...winnerStatus,
      activePlayerUid: null,
      actions: [...(table.actions ?? []), action].slice(-50),
      updatedAt: Date.now(),
    });
  });

  // Wallet payouts
  const snap = await getDoc(tableRef(tableId));
  const table = snap.data() as NineCardTable;

  if (winnerUid) {
    await addToWallet(winnerUid, potAmount, `9CT Win (showdown) - ${table.name}`);
  } else {
    // Draw — split pot
    const half = Math.floor(potAmount / 2);
    const [p1, p2] = table.playerOrder;
    await addToWallet(p1, half, `9CT Draw refund - ${table.name}`);
    await addToWallet(p2, half, `9CT Draw refund - ${table.name}`);
  }
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export function subscribeNineCardTable(
  tableId: string,
  callback: (table: NineCardTable | null) => void
): () => void {
  return onSnapshot(tableRef(tableId), (snap) => {
    callback(snap.exists() ? (snap.data() as NineCardTable) : null);
  });
}

export function subscribeNineCardLobby(
  callback: (tables: NineCardTable[]) => void
): () => void {
  const q = query(
    tablesCollection(),
    where('gameStatus', 'in', ['waiting', 'active']),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as NineCardTable));
  });
}

// ─── Disconnect Recovery ──────────────────────────────────────────────────────

export async function handleNineCardDisconnect(
  tableId: string,
  uid: string,
  addToWallet: (uid: string, amount: number, description: string) => Promise<void>
): Promise<void> {
  const snap = await getDoc(tableRef(tableId));
  if (!snap.exists()) return;

  const table = snap.data() as NineCardTable;
  if (table.gameStatus !== 'active') return;
  if (!table.players[uid]) return;

  // Auto-pack disconnected player
  await packNineCard(tableId, uid, addToWallet);
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/** Get my decoded cards (client-side only, after status = 'seen') */
export function getMyNineCards(table: NineCardTable, uid: string) {
  const player = table.players[uid];
  if (!player?.encryptedCards) return [];
  return decodeCards(player.encryptedCards);
}
