// src/games/ninecard/engine.ts

import { NineCard, NineCardRank, HandResult, ShowdownResult } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const ENGLISH_RANKS: NineCardRank[] = ['A', 'K', 'Q', 'J'];

const ENGLISH_RANK_ORDER: Record<string, number> = {
  A: 4,
  K: 3,
  Q: 2,
  J: 1,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const isEnglishCard = (rank: NineCardRank): boolean =>
  ENGLISH_RANKS.includes(rank);

export const getRankNumericValue = (rank: NineCardRank): number => {
  if (isEnglishCard(rank)) return 0;
  return parseInt(rank, 10);
};

// ─── Hand Value Calculator ────────────────────────────────────────────────────

/**
 * Calculate hand value for exactly 2 cards.
 *
 * Rules:
 *   Number + Number  → (a + b) % 10
 *   Number + English → only number card value
 *   English + English → special draw hand (value = -1)
 */
export function calculateHandValue(cards: NineCard[]): HandResult {
  if (cards.length !== 2) {
    throw new Error(`Hand must have exactly 2 cards, got ${cards.length}`);
  }

  const [c1, c2] = cards;
  const c1IsEnglish = isEnglishCard(c1.rank);
  const c2IsEnglish = isEnglishCard(c2.rank);

  // ── English + English ────────────────────────────────────────────────────
  if (c1IsEnglish && c2IsEnglish) {
    const tiebreaker = Math.max(
      ENGLISH_RANK_ORDER[c1.rank] ?? 0,
      ENGLISH_RANK_ORDER[c2.rank] ?? 0
    );
    return {
      value: -1,
      tiebreaker,
      description: `${c1.rank} + ${c2.rank} (English Draw Hand)`,
      isEnglishHand: true,
    };
  }

  // ── Number + English ─────────────────────────────────────────────────────
  if (!c1IsEnglish && c2IsEnglish) {
    const value = getRankNumericValue(c1.rank);
    const tiebreaker = ENGLISH_RANK_ORDER[c2.rank] ?? 0;
    return {
      value,
      tiebreaker,
      description: `${c1.rank} (+ ${c2.rank} ignored) = ${value}`,
      isEnglishHand: false,
    };
  }

  if (c1IsEnglish && !c2IsEnglish) {
    const value = getRankNumericValue(c2.rank);
    const tiebreaker = ENGLISH_RANK_ORDER[c1.rank] ?? 0;
    return {
      value,
      tiebreaker,
      description: `${c2.rank} (+ ${c1.rank} ignored) = ${value}`,
      isEnglishHand: false,
    };
  }

  // ── Number + Number ──────────────────────────────────────────────────────
  const v1 = getRankNumericValue(c1.rank);
  const v2 = getRankNumericValue(c2.rank);
  const sum = v1 + v2;
  const value = sum % 10;

  return {
    value,
    tiebreaker: 0,
    description: `${c1.rank}(${v1}) + ${c2.rank}(${v2}) = ${sum} → ${value}`,
    isEnglishHand: false,
  };
}

// ─── Hand Comparison ──────────────────────────────────────────────────────────

/**
 * Compare two hands.
 * Returns:
 *    1  → hand1 wins
 *   -1  → hand2 wins
 *    0  → draw
 */
export function compareHands(h1: HandResult, h2: HandResult): number {
  // Both English hands — compare by best English card
  if (h1.isEnglishHand && h2.isEnglishHand) {
    if (h1.tiebreaker > h2.tiebreaker) return 1;
    if (h1.tiebreaker < h2.tiebreaker) return -1;
    return 0;
  }

  // English hand loses to any number hand
  if (h1.isEnglishHand && !h2.isEnglishHand) return -1;
  if (!h1.isEnglishHand && h2.isEnglishHand) return 1;

  // Both number hands — compare value
  if (h1.value > h2.value) return 1;
  if (h1.value < h2.value) return -1;

  // Equal values — compare English tiebreaker
  // (9 + A beats 9 + K, because A tiebreaker = 4 > K tiebreaker = 3)
  if (h1.tiebreaker > h2.tiebreaker) return 1;
  if (h1.tiebreaker < h2.tiebreaker) return -1;

  // True draw
  return 0;
}

// ─── Showdown ─────────────────────────────────────────────────────────────────

/**
 * Determine the winner from a showdown.
 * Returns winnerUid = null for a draw.
 */
export function determineWinner(
  player1: { uid: string; cards: NineCard[] },
  player2: { uid: string; cards: NineCard[] }
): ShowdownResult {
  const hand1 = calculateHandValue(player1.cards);
  const hand2 = calculateHandValue(player2.cards);
  const cmp = compareHands(hand1, hand2);

  if (cmp === 1) {
    return {
      winnerUid: player1.uid,
      reason: `${hand1.description}  beats  ${hand2.description}`,
      hand1,
      hand2,
      player1Uid: player1.uid,
      player2Uid: player2.uid,
    };
  }

  if (cmp === -1) {
    return {
      winnerUid: player2.uid,
      reason: `${hand2.description}  beats  ${hand1.description}`,
      hand1,
      hand2,
      player1Uid: player1.uid,
      player2Uid: player2.uid,
    };
  }

  return {
    winnerUid: null,
    reason: `Draw! Both hands are equal`,
    hand1,
    hand2,
    player1Uid: player1.uid,
    player2Uid: player2.uid,
  };
}
