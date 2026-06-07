/**
 * NineCard.ts
 * ============================================================
 * Core game engine for "9 Card Table"
 * Types · Firestore helpers · Deck · Hand evaluation · Anti-cheat
 * ============================================================
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
  collection,
  serverTimestamp,
  Timestamp,
  FieldValue,
} from "firebase/firestore";
import { db } from "./config";

// ─────────────────────────────────────────────
// 1. CONSTANTS
// ─────────────────────────────────────────────

export const NINE_CARD_COLLECTIONS = {
  TABLES: "ninecard_tables",
  DECKS: "ninecard_decks",
  WALLETS: "wallets",
  TRANSACTIONS: "transactions",
} as const;

export const ENGLISH_CARDS = ["A", "K", "Q", "J"] as const;
export const NUMBER_CARDS = ["2", "3", "4", "5", "6", "7", "8", "9"] as const;
export const SUITS = ["♠", "♥", "♦", "♣"] as const;

export const ENGLISH_RANK: Record<string, number> = {
  A: 4,
  K: 3,
  Q: 2,
  J: 1,
};

// ─────────────────────────────────────────────
// 2. TYPESCRIPT TYPES
// ─────────────────────────────────────────────

export type Suit = (typeof SUITS)[number];
export type CardValue =
  | (typeof ENGLISH_CARDS)[number]
  | (typeof NUMBER_CARDS)[number];

export interface NineCard {
  value: CardValue;
  suit: Suit;
  id: string; // e.g. "A♠", "9♥"
}

export type PlayerRole = "player1" | "player2";
export type PlayerStatus = "blind" | "seen";
export type GamePhase =
  | "waiting"    // Waiting for 2nd player
  | "boot"       // Both players paying boot
  | "playing"    // Active game
  | "showdown"   // Cards revealed
  | "finished";  // Round done

export type TableStatus = "open" | "locked" | "disabled" | "in_game";

export interface PlayerState {
  uid: string;
  displayName: string;
  role: PlayerRole;
  status: PlayerStatus;
  hasPaid: boolean;
  currentBet: number;
  totalBet: number;
  lastAction: string | null;
  isActive: boolean;
  hasFolded: boolean;
  connected: boolean;
}

export interface TableDoc {
  id: string;
  name: string;
  bootAmount: number;
  status: TableStatus;
  createdBy: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  player1: PlayerState | null;
  player2: PlayerState | null;
  phase: GamePhase;
  pot: number;
  currentCallAmount: number;
  roundNumber: number;
  turnOf: PlayerRole | null;
  winner: string | null;
  winReason: string | null;
  matchHistory: MatchHistoryEntry[];
  showdownResult: ShowdownResult | null;
  actionCount: number;
  lastActionAt: Timestamp | FieldValue | null;
}

export interface MatchHistoryEntry {
  round: number;
  winnerId: string;
  winnerName: string;
  winReason: string;
  potAmount: number;
  timestamp: Timestamp | FieldValue;
}

export interface ShowdownResult {
  player1Hand: HandResult;
  player2Hand: HandResult;
  winnerId: string | null;
  winReason: string;
}

export interface HandResult {
  cards: NineCard[];
  value: number;
  englishRank: number;
  label: string;
}

export interface PlayerCardDoc {
  tableId: string;
  role: PlayerRole;
  uid: string;
  cards: NineCard[];
  createdAt: Timestamp | FieldValue;
}

export interface ShowdownDeckDoc {
  tableId: string;
  player1Cards: NineCard[];
  player2Cards: NineCard[];
  createdAt: Timestamp | FieldValue;
}

// ─────────────────────────────────────────────
// 3. DECK UTILITIES
// ─────────────────────────────────────────────

export function buildDeck(): NineCard[] {
  const deck: NineCard[] = [];
  const allValues: CardValue[] = [...ENGLISH_CARDS, ...NUMBER_CARDS];
  for (const suit of SUITS) {
    for (const value of allValues) {
      deck.push({ value, suit, id: `${value}${suit}` });
    }
  }
  return deck;
}

export function shuffleDeck(deck: NineCard[]): NineCard[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export function dealCards(deck: NineCard[]): {
  player1Cards: NineCard[];
  player2Cards: NineCard[];
  remaining: NineCard[];
} {
  if (deck.length < 4) throw new Error("Deck too small to deal");
  return {
    player1Cards: [deck[0], deck[1]],
    player2Cards: [deck[2], deck[3]],
    remaining: deck.slice(4),
  };
}

// ─────────────────────────────────────────────
// 4. HAND EVALUATION ENGINE
// ─────────────────────────────────────────────

function isEnglish(card: NineCard): boolean {
  return (ENGLISH_CARDS as readonly string[]).includes(card.value);
}

function isNumber(card: NineCard): boolean {
  return (NUMBER_CARDS as readonly string[]).includes(card.value);
}

/**
 * Rules:
 * - Number + Number → sum mod 10
 * - Number + English → only number card counts
 * - English + English → value = 0 (draw by value, compare english rank)
 */
export function evaluateHand(cards: NineCard[]): HandResult {
  if (cards.length !== 2) throw new Error("Hand must be exactly 2 cards");

  const [c1, c2] = cards;
  const e1 = isEnglish(c1);
  const e2 = isEnglish(c2);
  const n1 = isNumber(c1);
  const n2 = isNumber(c2);

  let value = 0;
  let englishRank = 0;
  let label = "";

  if (n1 && n2) {
    const sum = parseInt(c1.value) + parseInt(c2.value);
    value = sum % 10;
    label = `${c1.value}+${c2.value}=${sum} → ${value}`;
  } else if (n1 && e2) {
    value = parseInt(c1.value);
    englishRank = ENGLISH_RANK[c2.value] ?? 0;
    label = `${c1.value} (${c2.value} ignored) → ${value}`;
  } else if (e1 && n2) {
    value = parseInt(c2.value);
    englishRank = ENGLISH_RANK[c1.value] ?? 0;
    label = `${c2.value} (${c1.value} ignored) → ${value}`;
  } else {
    // English + English
    value = 0;
    const r1 = ENGLISH_RANK[c1.value] ?? 0;
    const r2 = ENGLISH_RANK[c2.value] ?? 0;
    englishRank = Math.max(r1, r2);
    label = `${c1.value}+${c2.value} (English+English) → Draw by value`;
  }

  return { cards, value, englishRank, label };
}

/** Returns: 1 = hand1 wins, 2 = hand2 wins, 0 = draw */
export function compareHands(hand1: HandResult, hand2: HandResult): 0 | 1 | 2 {
  if (hand1.value > hand2.value) return 1;
  if (hand2.value > hand1.value) return 2;
  if (hand1.englishRank > hand2.englishRank) return 1;
  if (hand2.englishRank > hand1.englishRank) return 2;
  return 0;
}

export function resolveShowdown(
  player1Cards: NineCard[],
  player2Cards: NineCard[],
  player1Id: string,
  player2Id: string
): ShowdownResult {
  const hand1 = evaluateHand(player1Cards);
  const hand2 = evaluateHand(player2Cards);
  const result = compareHands(hand1, hand2);

  let winnerId: string | null = null;
  let winReason = "";

  if (result === 1) {
    winnerId = player1Id;
    winReason = `Higher hand: ${hand1.label}`;
  } else if (result === 2) {
    winnerId = player2Id;
    winReason = `Higher hand: ${hand2.label}`;
  } else {
    winnerId = null;
    winReason = "Draw — pot split or re-deal";
  }

  return { player1Hand: hand1, player2Hand: hand2, winnerId, winReason };
}

// ─────────────────────────────────────────────
// 5. FIRESTORE — TABLE MANAGEMENT
// ─────────────────────────────────────────────

export async function createTable(
  adminUid: string,
  name: string,
  bootAmount: number
): Promise<string> {
  const tableRef = doc(collection(db, NINE_CARD_COLLECTIONS.TABLES));
  const tableId = tableRef.id;

  const tableDoc: TableDoc = {
    id: tableId,
    name: name.trim(),
    bootAmount,
    status: "open",
    createdBy: adminUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    player1: null,
    player2: null,
    phase: "waiting",
    pot: 0,
    currentCallAmount: bootAmount,
    roundNumber: 0,
    turnOf: null,
    winner: null,
    winReason: null,
    matchHistory: [],
    showdownResult: null,
    actionCount: 0,
    lastActionAt: null,
  };

  await setDoc(tableRef, tableDoc);
  return tableId;
}

export async function adminUpdateTable(
  tableId: string,
  updates: Partial<Pick<TableDoc, "status" | "name" | "bootAmount">>
): Promise<void> {
  const ref = doc(db, NINE_CARD_COLLECTIONS.TABLES, tableId);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteTable(tableId: string): Promise<void> {
  const ref = doc(db, NINE_CARD_COLLECTIONS.TABLES, tableId);
  await updateDoc(ref, {
    status: "disabled",
    phase: "finished",
    updatedAt: serverTimestamp(),
  });
}

export async function adminStartGame(tableId: string): Promise<void> {
  const ref = doc(db, NINE_CARD_COLLECTIONS.TABLES, tableId);
  await updateDoc(ref, {
    phase: "boot",
    status: "in_game",
    updatedAt: serverTimestamp(),
  });
}

export async function adminEndGame(tableId: string): Promise<void> {
  const ref = doc(db, NINE_CARD_COLLECTIONS.TABLES, tableId);
  await updateDoc(ref, {
    phase: "waiting",
    status: "open",
    player1: null,
    player2: null,
    pot: 0,
    currentCallAmount: 0,
    winner: null,
    winReason: null,
    showdownResult: null,
    turnOf: null,
    updatedAt: serverTimestamp(),
  });
}

// ─────────────────────────────────────────────
// 6. FIRESTORE — PLAYER ACTIONS
// ─────────────────────────────────────────────

export async function joinTable(
  tableId: string,
  uid: string,
  displayName: string
): Promise<{ role: PlayerRole; success: boolean; error?: string }> {
  const tableRef = doc(db, NINE_CARD_COLLECTIONS.TABLES, tableId);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(tableRef);
    if (!snap.exists())
      return { role: "player1" as PlayerRole, success: false, error: "Table not found" };

    const table = snap.data() as TableDoc;

    if (table.status === "disabled")
      return { role: "player1" as PlayerRole, success: false, error: "Table is disabled" };
    if (table.status === "locked")
      return { role: "player1" as PlayerRole, success: false, error: "Table is locked" };
    if (table.phase !== "waiting")
      return { role: "player1" as PlayerRole, success: false, error: "Game already in progress" };

    // Already joined?
    if (table.player1?.uid === uid || table.player2?.uid === uid) {
      const role: PlayerRole = table.player1?.uid === uid ? "player1" : "player2";
      return { role, success: true };
    }

    const playerState: PlayerState = {
      uid,
      displayName,
      role: "player1",
      status: "blind",
      hasPaid: false,
      currentBet: 0,
      totalBet: 0,
      lastAction: null,
      isActive: false,
      hasFolded: false,
      connected: true,
    };

    let role: PlayerRole;

    if (!table.player1) {
      role = "player1";
      playerState.role = "player1";
      tx.update(tableRef, { player1: playerState, updatedAt: serverTimestamp() });
    } else if (!table.player2) {
      role = "player2";
      playerState.role = "player2";
      tx.update(tableRef, {
        player2: playerState,
        phase: "boot",
        updatedAt: serverTimestamp(),
      });
    } else {
      return { role: "player1" as PlayerRole, success: false, error: "Table is full" };
    }

    return { role, success: true };
  });
}

export async function payBoot(
  tableId: string,
  uid: string,
  role: PlayerRole
): Promise<void> {
  const tableRef = doc(db, NINE_CARD_COLLECTIONS.TABLES, tableId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(tableRef);
    if (!snap.exists()) throw new Error("Table not found");
    const table = snap.data() as TableDoc;

    const player = table[role];
    if (!player || player.uid !== uid) throw new Error("Player not found");
    if (player.hasPaid) throw new Error("Already paid boot");

    const updatedPlayer: PlayerState = {
      ...player,
      hasPaid: true,
      totalBet: table.bootAmount,
    };

    const otherRole: PlayerRole = role === "player1" ? "player2" : "player1";
    const bothPaid = table[otherRole]?.hasPaid ?? false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {
      [role]: updatedPlayer,
      pot: table.pot + table.bootAmount,
      updatedAt: serverTimestamp(),
    };

    if (bothPaid) {
      updates.phase = "playing";
      updates.status = "in_game";
      updates.roundNumber = table.roundNumber + 1;
      updates.turnOf = "player1";
      // Deal cards when both paid
      await dealRound(tableId);
    }

    tx.update(tableRef, updates);
  });
}

export async function dealRound(tableId: string): Promise<void> {
  const tableRef = doc(db, NINE_CARD_COLLECTIONS.TABLES, tableId);
  const snap = await getDoc(tableRef);
  if (!snap.exists()) throw new Error("Table not found");
  const table = snap.data() as TableDoc;

  if (!table.player1 || !table.player2) throw new Error("Both players required");

  // Prevent re-deal
  const existingRef = doc(
    db,
    NINE_CARD_COLLECTIONS.DECKS,
    tableId,
    "cards",
    "player1"
  );
  const existingSnap = await getDoc(existingRef);
  if (existingSnap.exists()) return;

  const deck = shuffleDeck(buildDeck());
  const { player1Cards, player2Cards } = dealCards(deck);

  const p1DocRef = doc(db, NINE_CARD_COLLECTIONS.DECKS, tableId, "cards", "player1");
  const p2DocRef = doc(db, NINE_CARD_COLLECTIONS.DECKS, tableId, "cards", "player2");
  const showdownRef = doc(db, NINE_CARD_COLLECTIONS.DECKS, tableId, "showdown", "result");

  const p1Doc: PlayerCardDoc = {
    tableId,
    role: "player1",
    uid: table.player1.uid,
    cards: player1Cards,
    createdAt: serverTimestamp(),
  };
  const p2Doc: PlayerCardDoc = {
    tableId,
    role: "player2",
    uid: table.player2.uid,
    cards: player2Cards,
    createdAt: serverTimestamp(),
  };
  const showdownDoc: ShowdownDeckDoc = {
    tableId,
    player1Cards,
    player2Cards,
    createdAt: serverTimestamp(),
  };

  await Promise.all([
    setDoc(p1DocRef, p1Doc),
    setDoc(p2DocRef, p2Doc),
    setDoc(showdownRef, showdownDoc),
  ]);
}

export async function seeCards(
  tableId: string,
  uid: string,
  role: PlayerRole
): Promise<void> {
  const tableRef = doc(db, NINE_CARD_COLLECTIONS.TABLES, tableId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(tableRef);
    if (!snap.exists()) throw new Error("Table not found");
    const table = snap.data() as TableDoc;

    const player = table[role];
    if (!player || player.uid !== uid) throw new Error("Not your seat");
    if (player.status === "seen") throw new Error("Already seen cards");

    tx.update(tableRef, {
      [`${role}.status`]: "seen",
      [`${role}.lastAction`]: "see",
      actionCount: table.actionCount + 1,
      lastActionAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function playerCall(
  tableId: string,
  uid: string,
  role: PlayerRole
): Promise<void> {
  const tableRef = doc(db, NINE_CARD_COLLECTIONS.TABLES, tableId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(tableRef);
    if (!snap.exists()) throw new Error("Table not found");
    const table = snap.data() as TableDoc;

    validateTurn(table, uid, role);
    if (table.phase !== "playing") throw new Error("Game not in playing phase");

    const player = table[role]!;
    const callAmount = table.currentCallAmount;
    const opponentRole: PlayerRole = role === "player1" ? "player2" : "player1";

    const updatedPlayer: PlayerState = {
      ...player,
      currentBet: player.currentBet + callAmount,
      totalBet: player.totalBet + callAmount,
      lastAction: "call",
      isActive: false,
    };
    const updatedOpponent: PlayerState = {
      ...table[opponentRole]!,
      isActive: true,
    };

    tx.update(tableRef, {
      [role]: updatedPlayer,
      [opponentRole]: updatedOpponent,
      pot: table.pot + callAmount,
      turnOf: opponentRole,
      actionCount: table.actionCount + 1,
      lastActionAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function playerPack(
  tableId: string,
  uid: string,
  role: PlayerRole
): Promise<void> {
  const tableRef = doc(db, NINE_CARD_COLLECTIONS.TABLES, tableId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(tableRef);
    if (!snap.exists()) throw new Error("Table not found");
    const table = snap.data() as TableDoc;

    if (table.phase !== "playing") throw new Error("Game not active");

    const player = table[role];
    if (!player || player.uid !== uid) throw new Error("Not your seat");

    const opponentRole: PlayerRole = role === "player1" ? "player2" : "player1";
    const opponent = table[opponentRole]!;

    const historyEntry: MatchHistoryEntry = {
      round: table.roundNumber,
      winnerId: opponent.uid,
      winnerName: opponent.displayName,
      winReason: `${player.displayName} packed/folded`,
      potAmount: table.pot,
      timestamp: serverTimestamp(),
    };

    tx.update(tableRef, {
      [`${role}.hasFolded`]: true,
      [`${role}.lastAction`]: "pack",
      phase: "finished",
      winner: opponent.uid,
      winReason: `${player.displayName} packed`,
      matchHistory: [...table.matchHistory, historyEntry],
      actionCount: table.actionCount + 1,
      lastActionAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function playerShow(
  tableId: string,
  uid: string,
  role: PlayerRole
): Promise<void> {
  const tableRef = doc(db, NINE_CARD_COLLECTIONS.TABLES, tableId);

  const tableSnap = await getDoc(tableRef);
  if (!tableSnap.exists()) throw new Error("Table not found");
  const table = tableSnap.data() as TableDoc;

  validateTurn(table, uid, role);
  if (table.phase !== "playing") throw new Error("Game not active");

  const player = table[role]!;
  if (player.currentBet < table.currentCallAmount) {
    throw new Error("Must match call amount before showing");
  }

  const showdownRef = doc(
    db,
    NINE_CARD_COLLECTIONS.DECKS,
    tableId,
    "showdown",
    "result"
  );
  const showdownSnap = await getDoc(showdownRef);
  if (!showdownSnap.exists()) throw new Error("Cards not dealt yet");

  const showdownData = showdownSnap.data() as ShowdownDeckDoc;
  const result = resolveShowdown(
    showdownData.player1Cards,
    showdownData.player2Cards,
    table.player1!.uid,
    table.player2!.uid
  );

  const winnerName =
    result.winnerId === table.player1?.uid
      ? table.player1.displayName
      : result.winnerId === table.player2?.uid
      ? table.player2.displayName
      : "Draw";

  const historyEntry: MatchHistoryEntry = {
    round: table.roundNumber,
    winnerId: result.winnerId ?? "draw",
    winnerName,
    winReason: result.winReason,
    potAmount: table.pot,
    timestamp: serverTimestamp(),
  };

  await runTransaction(db, async (tx) => {
    const freshSnap = await tx.get(tableRef);
    if (!freshSnap.exists()) throw new Error("Table not found");
    const freshTable = freshSnap.data() as TableDoc;

    if (freshTable.phase !== "playing") throw new Error("Game state changed");
    if (freshTable.turnOf !== role) throw new Error("Not your turn anymore");

    tx.update(tableRef, {
      phase: "showdown",
      showdownResult: result,
      winner: result.winnerId,
      winReason: result.winReason,
      [`${role}.lastAction`]: "show",
      matchHistory: [...freshTable.matchHistory, historyEntry],
      actionCount: freshTable.actionCount + 1,
      lastActionAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

// ─────────────────────────────────────────────
// 7. CARD FETCHING
// ─────────────────────────────────────────────

export async function fetchMyCards(
  tableId: string,
  role: PlayerRole
): Promise<NineCard[]> {
  const cardRef = doc(db, NINE_CARD_COLLECTIONS.DECKS, tableId, "cards", role);
  const snap = await getDoc(cardRef);
  if (!snap.exists()) return [];
  const data = snap.data() as PlayerCardDoc;
  return data.cards;
}

export async function fetchShowdownCards(tableId: string): Promise<{
  player1Cards: NineCard[];
  player2Cards: NineCard[];
} | null> {
  const showdownRef = doc(
    db,
    NINE_CARD_COLLECTIONS.DECKS,
    tableId,
    "showdown",
    "result"
  );
  const snap = await getDoc(showdownRef);
  if (!snap.exists()) return null;
  const data = snap.data() as ShowdownDeckDoc;
  return { player1Cards: data.player1Cards, player2Cards: data.player2Cards };
}

// ─────────────────────────────────────────────
// 8. ANTI-CHEAT / VALIDATION
// ─────────────────────────────────────────────

function validateTurn(
  table: TableDoc,
  uid: string,
  role: PlayerRole
): void {
  const player = table[role];
  if (!player) throw new Error("Player not in this table");
  if (player.uid !== uid) throw new Error("UID mismatch");
  if (table.turnOf !== role) throw new Error("Not your turn");
  if (player.hasFolded) throw new Error("You have already folded");
}

export async function isAdmin(uid: string): Promise<boolean> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  const data = snap.data();
  return data?.isAdmin === true && data?.isBanned !== true;
}

// ─────────────────────────────────────────────
// 9. UTILITY HELPERS
// ─────────────────────────────────────────────

export function getOpponentRole(role: PlayerRole): PlayerRole {
  return role === "player1" ? "player2" : "player1";
}

export function getPlayerByUid(
  table: TableDoc,
  uid: string
): { player: PlayerState; role: PlayerRole } | null {
  if (table.player1?.uid === uid) return { player: table.player1, role: "player1" };
  if (table.player2?.uid === uid) return { player: table.player2, role: "player2" };
  return null;
}

export function formatAmount(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function getStatusLabel(status: PlayerStatus): string {
  return status === "blind" ? "BLIND" : "SEEN";
}

export function canShow(
  player: PlayerState,
  currentCallAmount: number
): boolean {
  return player.currentBet >= currentCallAmount && !player.hasFolded;
}
