// src/games/ninecard/deck.ts

import { NineCard, NineCardRank, NineCardSuit } from './types';

// ─── Deck Definition ──────────────────────────────────────────────────────────

const SUITS: NineCardSuit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

/** 9 Card Table uses only A K Q J 2–9 (no 10) */
const RANKS: NineCardRank[] = [
  'A', 'K', 'Q', 'J',
  '2', '3', '4', '5', '6', '7', '8', '9',
];

// ─── Generation ───────────────────────────────────────────────────────────────

/** Generate a complete 48-card deck (4 suits × 12 ranks) */
export function buildDeck(): NineCard[] {
  const deck: NineCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, id: `${rank}-${suit}` });
    }
  }
  return deck;
}

/** Fisher-Yates shuffle */
export function shuffleDeck(deck: NineCard[]): NineCard[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/** Build + shuffle in one call */
export function generateShuffledDeck(): NineCard[] {
  return shuffleDeck(buildDeck());
}

// ─── Encoding / Decoding ─────────────────────────────────────────────────────

/** Encode cards to Base64 string (for Firestore storage) */
export function encodeCards(cards: NineCard[]): string {
  return btoa(JSON.stringify(cards));
}

/** Decode cards from Base64 string */
export function decodeCards(encoded: string): NineCard[] {
  if (!encoded) return [];
  try {
    return JSON.parse(atob(encoded)) as NineCard[];
  } catch {
    return [];
  }
}

/** Fingerprint of a deck for anti-cheat verification */
export function generateDeckHash(deck: NineCard[]): string {
  return deck.map((c) => c.id).join('|');
}
