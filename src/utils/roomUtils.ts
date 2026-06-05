import { PLATFORM_CUT_PERCENT } from '../constants/board';

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function generateTableId(): string {
  return `table_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
}

export function generateGameId(): string {
  return `game_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
}

export function calculatePrize(entryAmount: number, playerCount: number = 2) {
  const totalPool = entryAmount * playerCount;
  const platformCut = Math.floor((totalPool * PLATFORM_CUT_PERCENT) / 100);
  const winnerPrize = totalPool - platformCut;
  return { totalPool, platformCut, winnerPrize };
}

export function formatAmount(amount: number): string {
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
}

export function getTimeLeft(startTime: number, duration: number): number {
  const elapsed = (Date.now() - startTime) / 1000;
  return Math.max(0, duration - elapsed);
}
