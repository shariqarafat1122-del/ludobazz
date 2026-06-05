export type TableType = 'public' | 'private';
export type TableStatus = 'waiting' | 'playing' | 'finished';

export interface GameTable {
  tableId: string;
  tableName: string;
  type: TableType;
  entryAmount: number;
  prizePool: number;
  platformCut: number; // 10%
  winnerPrize: number; // 90%
  creatorId: string;
  creatorName: string;
  player1Id: string | null;
  player2Id: string | null;
  player1Name: string | null;
  player2Name: string | null;
  player1Ready: boolean;
  player2Ready: boolean;
  status: TableStatus;
  roomCode: string; // Private room code
  createdAt: number;
  updatedAt: number;
  gameStartedAt: number | null;
}

export interface LobbyState {
  tables: GameTable[];
  myTable: GameTable | null;
  isLoading: boolean;
  error: string | null;
}
