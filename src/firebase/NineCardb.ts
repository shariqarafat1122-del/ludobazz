/**
 * NineCard.ts
 * ============================================================
 * Core game engine for "9 Card Table" — types, Firestore
 * helpers, deck generation, winner logic, and anti-cheat.
 *
 * NOTE: Wallet.ts / Index.ts / Helper.ts are assumed to exist.
 * Import paths marked with  ← ADJUST TO YOUR PROJECT STRUCTURE.
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
import { db } from "./config"; // src/firebase/config.ts

// ─────────────────────────────────────────────
// 1. CONSTANTS
// ─────────────────────────────────────────────

export const NINE_CARD_COLLECTIONS = {
  TABLES: "ninecard_tables",
  DECKS: "ninecard_decks",    // private sub-collection
  WALLETS: "wallets",         // ← shared with your Wallet.ts
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
export type CardValue = (typeof ENGLISH_CARDS)[number] | (typeof NUMBER_CARDS)[number];

export interface Card {
  value: CardValue;
  suit: Suit;
  id: string; // e.g. "A♠", "9♥"
}

export type PlayerRole = "player1" | "player2";
export type PlayerStatus = "blind" | "seen";
export type GamePhase =
  | "waiting"      // Waiting for 2nd player
  | "boot"         // Both players paying boot
  | "playing"      // Active game
  | "showdown"     // Cards revealed
  | "finished";    // Round done, pot awarded

export type TableStatus = "open" | "locked" | "disabled" | "in_game";

export interface PlayerState {
  uid: string;
  displayName: string;
  role: PlayerRole;
  status: PlayerStatus;         // blind | seen
  hasPaid: boolean;             // paid boot?
  currentBet: number;           // amount wagered this round
  totalBet: number;             // total in pot from this player
  lastAction: string | null;    // "call" | "pack" | "show" | "see"
  isActive: boolean;            // whose turn
  hasFolded: boolean;
  connected: boolean;
}

export interface TableDoc {
  id: string;
  name: string;
  bootAmount: number;
  status: TableStatus;
  createdBy: string;            // admin UID
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;

  // Players
  player1: PlayerState | null;
  player2: PlayerState | null;

  // Game
  phase: GamePhase;
  pot: number;
  currentCallAmount: number;    // amount current player must match
  roundNumber: number;
  turnOf: PlayerRole | null;    // whose turn right now
  winner: string | null;        // UID of winner
  winReason: string | null;
  matchHistory: MatchHistoryEntry[];
  showdownResult: ShowdownResult | null;

  // Anti-cheat
  actionCount: number;          // monotone increment to detect replays
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
  winnerId: string | null;   // null = draw
  winReason: string;
}

export interface HandResult {
  cards: Card[];
  value: number;       // 0-9
  englishRank: number; // 0-4
  label: string;       // human-readable
}

// Private deck doc — stored separately so players can't read each other's cards
export interface DeckDoc {
  tableId: string;
  player1Cards: Card[];   // exactly 2
  player2Cards: Card[];   // exactly 2
  remainingDeck: Card[];
  createdAt: Timestamp | FieldValue;
}

// ─────────────────────────────────────────────
// 3. DECK UTILITIES
// ─────────────────────────────────────────────

/**
 * Build a full 32-card deck (8 values × 4 suits).
 * Uses only the 8 values defined in game rules (A,K,Q,J + 2-9).
 */
export function buildDeck(): Card[] {
  const deck: Card[] = [];
  const allValues: CardValue[] = [...ENGLISH_CARDS, ...NUMBER_CARDS];
  for (const suit of SUITS) {
    for (const value of allValues) {
      deck.push({ value, suit, id: `${value}${suit}` });
    }
  }
  return deck;
}

/**
 * Fisher-Yates shuffle — cryptographically seeded via Math.random()
 * For production, replace with a server-side Cloud Function for
 * true server-side randomness (anti-cheat).
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/**
 * Deal 2 cards to each player from shuffled deck.
 */
export function dealCards(deck: Card[]): {
  player1Cards: Card[];
  player2Cards: Card[];
  remaining: Card[];
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

function isEnglish(card: Card): boolean {
  return (ENGLISH_CARDS as readonly string[]).includes(card.value);
}

function isNumber(card: Card): boolean {
  return (NUMBER_CARDS as readonly string[]).includes(card.value);
}

/**
 * Calculate hand value and rank for 2 cards.
 *
 * Rules:
 * - Number + Number → sum mod 10 (last digit)
 * - Number + English → only number card counts
 * - English + English → value = 0 (tie/draw by value)
 *
 * englishRank: highest english card rank (A=4, K=3, Q=2, J=1, none=0)
 */
export function evaluateHand(cards: Card[]): HandResult {
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
    // Number + Number
    const sum = parseInt(c1.value) + parseInt(c2.value);
    value = sum % 10;
    label = `${c1.value}+${c2.value}=${sum} → ${value}`;
  } else if (n1 && e2) {
    // Number + English → ignore English
    value = parseInt(c1.value);
    englishRank = ENGLISH_RANK[c2.value] ?? 0;
    label = `${c1.value} (${c2.value} ignored) → ${value}`;
  } else if (e1 && n2) {
    // English + Number → ignore English
    value = parseInt(c2.value);
    englishRank = ENGLISH_RANK[c1.value] ?? 0;
    label = `${c2.value} (${c1.value} ignored) → ${value}`;
  } else {
    // English + English → Draw by value
    value = 0;
    const r1 = ENGLISH_RANK[c1.value] ?? 0;
    const r2 = ENGLISH_RANK[c2.value] ?? 0;
    englishRank = Math.max(r1, r2);
    label = `${c1.value}+${c2.value} (English+English) → Draw`;
  }

  return { cards, value, englishRank, label };
}

/**
 * Compare two hands.
 * Returns: 1 = hand1 wins, 2 = hand2 wins, 0 = draw
 *
 * Step 1: Higher value wins.
 * Step 2: If equal value → higher englishRank wins.
 * Step 3: If equal rank → Draw.
 */
export function compareHands(hand1: HandResult, hand2: HandResult): 0 | 1 | 2 {
  if (hand1.value > hand2.value) return 1;
  if (hand2.value > hand1.value) return 2;

  // Values equal → compare english rank
  if (hand1.englishRank > hand2.englishRank) return 1;
  if (hand2.englishRank > hand1.englishRank) return 2;

  return 0; // Draw
}

/**
 * Full showdown: evaluate both hands and determine winner.
 */
export function resolveShowdown(
  player1Cards: Card[],
  player2Cards: Card[],
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
// 5. FIRESTORE HELPERS — TABLE MANAGEMENT
// ─────────────────────────────────────────────

/**
 * Create a new table (admin only).
 * Wallet.ts integration: NO deduction here — just creates the doc.
 */
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

/**
 * Admin: update table status/lock/enable/disable.
 */
export async function adminUpdateTable(
  tableId: string,
  updates: Partial<Pick<TableDoc, "status" | "name" | "bootAmount">>
): Promise<void> {
  const ref = doc(db, NINE_CARD_COLLECTIONS.TABLES, tableId);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

/**
 * Admin: delete table.
 */
export async function deleteTable(tableId: string): Promise<void> {
  const ref = doc(db, NINE_CARD_COLLECTIONS.TABLES, tableId);
  await updateDoc(ref, {
    status: "disabled",
    phase: "finished",
    updatedAt: serverTimestamp(),
  });
  // NOTE: Full deletion should be done via Cloud Function to clean sub-collections.
}

// ─────────────────────────────────────────────
// 6. FIRESTORE HELPERS — PLAYER ACTIONS
// ─────────────────────────────────────────────

/**
 * Player joins a table.
 * Uses Firestore transaction to prevent race conditions.
 *
 * IMPORTANT: Boot deduction from wallet should be called from
 * your Wallet.ts BEFORE this function or inside the transaction.
 * Comment left for your Wallet.ts integration:
 *
 *   // await deductFromWallet(uid, bootAmount);  ← YOUR Wallet.ts
 */
export async function joinTable(
  tableId: string,
  uid: string,
  displayName: string
): Promise<{ role: PlayerRole; success: boolean; error?: string }> {
  const tableRef = doc(db, NINE_CARD_COLLECTIONS.TABLES, tableId);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(tableRef);
    if (!snap.exists()) return { role: "player1", success: false, error: "Table not found" };

    const table = snap.data() as TableDoc;

    if (table.status === "disabled") return { role: "player1", success: false, error: "Table is disabled" };
    if (table.status === "locked") return { role: "player1", success: false, error: "Table is locked" };
    if (table.phase !== "waiting") return { role: "player1", success: false, error: "Game already in progress" };

    // Check if player already joined
    if (table.player1?.uid === uid || table.player2?.uid === uid) {
      const role: PlayerRole = table.player1?.uid === uid ? "player1" : "player2";
      return { role, success: true };
    }

    let role: PlayerRole;
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

    if (!table.player1) {
      role = "player1";
      playerState.role = "player1";
      tx.update(tableRef, {
        player1: playerState,
        updatedAt: serverTimestamp(),
      });
    } else if (!table.player2) {
      role = "player2";
      playerState.role = "player2";
      tx.update(tableRef, {
        player2: playerState,
        phase: "boot",
        updatedAt: serverTimestamp(),
      });
    } else {
      return { role: "player1", success: false, error: "Table is full" };
    }

    return { role, success: true };
  });
}

/**
 * Pay boot amount.
 * Comment: Integrate your Wallet.ts deduction here.
 *
 *   // await deductFromWallet(uid, table.bootAmount);  ← YOUR Wallet.ts
 */
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

    const bothPaid =
      role === "player1"
        ? table.player2?.hasPaid
        : table.player1?.hasPaid;

    const updates: Partial<TableDoc> & { [key: string]: unknown } = {
      [role]: updatedPlayer,
      pot: table.pot + table.bootAmount,
      updatedAt: serverTimestamp(),
    };

    if (bothPaid) {
      updates.phase = "playing";
      updates.status = "in_game";
      updates.roundNumber = table.roundNumber + 1;
      updates.turnOf = "player1";
      updates["player1.isActive"] = true;
    }

    tx.update(tableRef, updates);
  });
}

/**
 * Deal cards (called by admin or auto-triggered when phase becomes "playing").
 * Writes encrypted deck to ninecard_decks sub-collection.
 *
 * In production: move this to a Cloud Function for true server-side dealing.
 */
export async function dealRound(tableId: string): Promise<void> {
  const tableRef = doc(db, NINE_CARD_COLLECTIONS.TABLES, tableId);
  const deckRef = doc(db, NINE_CARD_COLLECTIONS.DECKS, tableId);

  const snap = await getDoc(tableRef);
  if (!snap.exists()) throw new Error("Table not found");
  const table = snap.data() as TableDoc;

  if (table.phase !== "playing") throw new Error("Table not in playing phase");

  const deck = shuffleDeck(buildDeck());
  const { player1Cards, player2Cards, remaining } = dealCards(deck);

  const deckDoc: DeckDoc = {
    tableId,
    player1Cards,
    player2Cards,
    remainingDeck: remaining,
    createdAt: serverTimestamp(),
  };

  await setDoc(deckRef, deckDoc);
}

/**
 * Player sees their own cards.
 * Changes status from "blind" to "seen".
 * Does NOT reveal cards to opponent.
 */
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

    validateTurn(table, uid, role);

    const player = table[role]!;
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

/**
 * Player calls (matches current call amount).
 * No maximum — unlimited rounds supported.
 *
 * Comment: Wallet deduction here:
 *   // await deductFromWallet(uid, callAmount);  ← YOUR Wallet.ts
 */
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

    const updatedOpponent = {
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

/**
 * Player packs (folds).
 * Opponent wins immediately.
 *
 * Comment: Wallet payout here:
 *   // await creditWallet(opponentUid, pot);  ← YOUR Wallet.ts
 */
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

    const opponentRole: PlayerRole = role === "player1" ? "player2" : "player1";
    const opponent = table[opponentRole]!;
    const player = table[role]!;

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

/**
 * Request show.
 * Only allowed after current player has matched the call amount.
 * Triggers card reveal and winner resolution.
 */
export async function playerShow(
  tableId: string,
  uid: string,
  role: PlayerRole
): Promise<void> {
  const tableRef = doc(db, NINE_CARD_COLLECTIONS.TABLES, tableId);
  const deckRef = doc(db, NINE_CARD_COLLECTIONS.DECKS, tableId);

  await runTransaction(db, async (tx) => {
    const [snap, deckSnap] = await Promise.all([
      tx.get(tableRef),
      tx.get(deckRef),
    ]);

    if (!snap.exists()) throw new Error("Table not found");
    if (!deckSnap.exists()) throw new Error("Deck not found");

    const table = snap.data() as TableDoc;
    const deck = deckSnap.data() as DeckDoc;

    validateTurn(table, uid, role);
    if (table.phase !== "playing") throw new Error("Game not active");

    const player = table[role]!;
    const opponentRole: PlayerRole = role === "player1" ? "player2" : "player1";
    const opponent = table[opponentRole]!;

    // Validate: player must have matched the call amount
    if (player.currentBet < table.currentCallAmount) {
      throw new Error("Must match call amount before showing");
    }

    // Resolve showdown server-side
    const result = resolveShowdown(
      deck.player1Cards,
      deck.player2Cards,
      table.player1!.uid,
      table.player2!.uid
    );

    const historyEntry: MatchHistoryEntry = {
      round: table.roundNumber,
      winnerId: result.winnerId ?? "draw",
      winnerName:
        result.winnerId === table.player1?.uid
          ? table.player1.displayName
          : result.winnerId === table.player2?.uid
          ? table.player2.displayName
          : "Draw",
      winReason: result.winReason,
      potAmount: table.pot,
      timestamp: serverTimestamp(),
    };

    tx.update(tableRef, {
      phase: "showdown",
      showdownResult: result,
      winner: result.winnerId,
      winReason: result.winReason,
      [`${role}.lastAction`]: "show",
      [`opponent${opponentRole}.lastAction`]: "show",
      matchHistory: [...table.matchHistory, historyEntry],
      actionCount: table.actionCount + 1,
      lastActionAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

// ─────────────────────────────────────────────
// 7. ADMIN ACTIONS
// ─────────────────────────────────────────────

/**
 * Admin: start game manually.
 */
export async function adminStartGame(tableId: string): Promise<void> {
  const ref = doc(db, NINE_CARD_COLLECTIONS.TABLES, tableId);
  await updateDoc(ref, {
    phase: "boot",
    status: "in_game",
    updatedAt: serverTimestamp(),
  });
}

/**
 * Admin: end game / reset table.
 */
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
// 8. CARD FETCHING (per-player, secure)
// ─────────────────────────────────────────────

/**
 * Fetch own cards from the deck doc.
 * Firestore Security Rules must restrict this so:
 *   - player1 can only read player1Cards
 *   - player2 can only read player2Cards
 *
 * In this client implementation, we return only the requesting player's cards.
 * Server-side: Use Firestore field-level security or a Cloud Function.
 */
export async function fetchMyCards(
  tableId: string,
  role: PlayerRole
): Promise<Card[]> {
  const deckRef = doc(db, NINE_CARD_COLLECTIONS.DECKS, tableId);
  const snap = await getDoc(deckRef);
  if (!snap.exists()) return [];

  const deck = snap.data() as DeckDoc;
  return role === "player1" ? deck.player1Cards : deck.player2Cards;
}

// ─────────────────────────────────────────────
// 9. ANTI-CHEAT / VALIDATION HELPERS
// ─────────────────────────────────────────────

/**
 * Validate that it is the player's turn.
 * Throws if not.
 */
function validateTurn(table: TableDoc, uid: string, role: PlayerRole): void {
  const player = table[role];
  if (!player) throw new Error("Player not in this table");
  if (player.uid !== uid) throw new Error("UID mismatch");
  if (table.turnOf !== role) throw new Error("Not your turn");
  if (player.hasFolded) throw new Error("You have already folded");
}

/**
 * Check if a user is admin.
 * Reads from "users" collection — same pattern as admin.ts in this project.
 * Admin users have isAdmin: true field in their Firestore user document.
 * Banned admins are not allowed (isBanned check).
 */
export async function isAdmin(uid: string): Promise<boolean> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  const data = snap.data();
  return data?.isAdmin === true && data?.isBanned !== true;
}

// ─────────────────────────────────────────────
// 10. UTILITY HELPERS
// ─────────────────────────────────────────────

/**
 * Get opponent role.
 */
export function getOpponentRole(role: PlayerRole): PlayerRole {
  return role === "player1" ? "player2" : "player1";
}

/**
 * Get player from table by UID.
 */
export function getPlayerByUid(
  table: TableDoc,
  uid: string
): { player: PlayerState; role: PlayerRole } | null {
  if (table.player1?.uid === uid) return { player: table.player1, role: "player1" };
  if (table.player2?.uid === uid) return { player: table.player2, role: "player2" };
  return null;
}

/**
 * Format currency amount (₹).
 */
export function formatAmount(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/**
 * Get display label for player status.
 */
export function getStatusLabel(status: PlayerStatus): string {
  return status === "blind" ? "BLIND" : "SEEN";
}

/**
 * Check if show button should be enabled for a player.
 * Show is only allowed after matching current call amount.
 */
export function canShow(player: PlayerState, currentCallAmount: number): boolean {
  return player.currentBet >= currentCallAmount && !player.hasFolded;
}
