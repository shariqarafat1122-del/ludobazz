export type PlayerColor = 'green' | 'blue';
export type PieceId = 0 | 1 | 2 | 3;
export type CellIndex = number; // -1 = home, 0-56 = board, 57 = finished

export interface Piece {
  id: PieceId;
  color: PlayerColor;
  position: number;   // -1 home, 0-56 path, 57 won
  isHome: boolean;
  isFinished: boolean;
}

export interface Player {
  uid: string;
  displayName: string;
  color: PlayerColor;
  pieces: Piece[];
  isCreator: boolean;
}

export interface GameState {
  gameId: string;
  players: Record<string, Player>;
  currentTurn: string;       // uid
  diceValue: number | null;
  diceRolled: boolean;
  status: 'waiting' | 'playing' | 'finished';
  winner: string | null;     // uid
  prizePool: number;
  entryFee: number;
  createdAt: number;
  lastActivity: number;
}

export interface MoveablePiece {
  pieceId: PieceId;
  from: number;
  to: number;
}
