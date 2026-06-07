// src/games/ninecard/types.ts

import { Timestamp } from 'firebase/firestore';

// ─── Card Types ───────────────────────────────────────────────────────────────

export type NineCardSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type NineCardRank =
  | 'A' | 'K' | 'Q' | 'J'
  | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

export interface NineCard {
  rank: NineCardRank;
  suit: NineCardSuit;
  id: string; // e.g. "A-hearts"
}

// ─── Player Types ─────────────────────────────────────────────────────────────

export type NineCardPlayerStatus =
  | 'blind'    // Has NOT seen own cards
  | 'seen'     // Has seen own cards
  | 'packed'   // Folded / packed
  | 'winner'   // Won this round
  | 'waiting'; // Waiting for game to start

export interface NineCardPlayer {
  uid: string;
  name: string;
  photoURL?: string;
  status: NineCardPlayerStatus;
  hasPaid: boolean;
  encryptedCards: string;   // Base64 encoded — server only
  currentBet: number;       // Current round bet
  totalBet: number;         // Total bet this game
  seatPosition: 'bottom' | 'top';
  joinedAt: number;
  lastAction?: NineCardActionType;
  lastActionAt?: number;
  isConnected: boolean;
}

// ─── Game / Table Types ───────────────────────────────────────────────────────

export type NineCardGameStatus =
  | 'waiting'    // Waiting for 2nd player
  | 'active'     // Game in progress
  | 'finished';  // Game over

export type NineCardActionType =
  | 'join'
  | 'boot'
  | 'call'
  | 'pack'
  | 'see'
  | 'show';

export interface NineCardAction {
  id: string;
  uid: string;
  name: string;
  action: NineCardActionType;
  amount: number;
  timestamp: number;
  round: number;
}

export interface NineCardTable {
  id: string;
  name: string;
  bootAmount: number;
  potAmount: number;
  currentCallAmount: number;
  gameStatus: NineCardGameStatus;
  round: number;
  activePlayerUid: string | null;
  players: Record<string, NineCardPlayer>;
  playerOrder: string[];       // [creatorUid, joinerUid]
  winner: string | null;       // uid or 'draw'
  winnerReason: string;
  showdownCards: Record<string, NineCard[]>; // Revealed after show
  actions: NineCardAction[];
  deckHash: string;            // Anti-cheat verification
  createdBy: string;
  createdAt: Timestamp | number;
  updatedAt: Timestamp | number;
}

// ─── Hand Evaluation ──────────────────────────────────────────────────────────

export interface HandResult {
  value: number;        // 0–9, or -1 for English+English
  tiebreaker: number;   // English card rank A=4 K=3 Q=2 J=1
  description: string;
  isEnglishHand: boolean;
}

export interface ShowdownResult {
  winnerUid: string | null; // null = draw
  reason: string;
  hand1: HandResult;
  hand2: HandResult;
  player1Uid: string;
  player2Uid: string;
}

// ─── Lobby ────────────────────────────────────────────────────────────────────

export interface CreateTableForm {
  name: string;
  bootAmount: number;
}
