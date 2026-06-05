export type PlayerColor = 'red' | 'green';
export type TokenState = 'home' | 'active' | 'finished';
export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface Token {
  id: string;
  color: PlayerColor;
  position: number;
  state: TokenState;
  tokenIndex: number;
}

export interface PlayerLife {
  playerId: string;
  color: PlayerColor;
  lives: number; // 3 max
  lastActionTime: number;
}

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  tokens: Token[];
  isOnline: boolean;
  finishedTokens: number;
  lives: number;
  lastRollTime: number;
}

export interface DiceState {
  value: number;
  isRolling: boolean;
  hasRolled: boolean;
  rolledBy: PlayerColor | null;
}

export interface TurnTimer {
  startTime: number;
  duration: number; // 10 seconds
  currentTurn: PlayerColor;
}

export interface GameState {
  gameId: string;
  tableId: string;
  players: Player[];
  currentTurn: PlayerColor;
  dice: DiceState;
  status: GameStatus;
  winner: PlayerColor | null;
  winnerPlayerId: string | null;
  turnTimer: TurnTimer;
  createdAt: number;
  updatedAt: number;
  moveHistory: MoveRecord[];
  prizePool: number;
  winnerPrize: number;
  platformCut: number;
}

export interface MoveRecord {
  player: PlayerColor;
  tokenId: string;
  from: number;
  to: number;
  diceValue: number;
  timestamp: number;
  captured?: string;
}
