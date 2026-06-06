// ─── RealLudo.ts — Complete Firestore Service Layer ───────────────────────────
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot,
  serverTimestamp, query, where, orderBy, limit,
  runTransaction, collection, addDoc,
} from 'firebase/firestore';
import { db } from './config';
import { deductFunds, addFunds } from './wallet';

// ─── Types ────────────────────────────────────────────────────────────────────
export type LudoColor = 'red' | 'green';
export type GamePhase = 'waiting' | 'playing' | 'finished';
export type PlayerSlot = 'player1' | 'player2';
export type TableType = 'public' | 'private' | 'admin';

export interface LudoToken {
  id: number;
  position: number; // -1=base, 0-51=track, 52-56=home-col, 57=finished
  isHome: boolean;
  color: LudoColor;
}

export interface LudoPlayerState {
  uid: string;
  name: string;
  photoURL: string;
  color: LudoColor;
  tokens: LudoToken[];
  tokensHome: number;
  isOnline: boolean;
  lastSeen: any;
}

export interface LudoGame {
  id: string;
  status: GamePhase;
  tableType: TableType;
  entryFee: number;
  pot: number;
  player1: LudoPlayerState | null;
  player2: LudoPlayerState | null;
  activePlayer: PlayerSlot | null;
  diceValue: number | null;
  diceRolled: boolean;
  lastDiceRollBy: PlayerSlot | null;
  consecutiveSixes: number;
  winnerId: string | null;
  winnerName: string | null;
  privateCode: string | null; // for private tables
  createdBy: string | null;   // uid of creator
  isAdminTable: boolean;
  createdAt: any;
  updatedAt: any;
  lastActionAt: any;
}

// ─── Board Constants ──────────────────────────────────────────────────────────
export const TOKEN_BASE_POSITION = -1;
export const TOKEN_HOME_POSITION = 57;
export const RED_START_TRACK = 0;
export const GREEN_START_TRACK = 26;
export const SAFE_POSITIONS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const createInitialTokens = (color: LudoColor): LudoToken[] =>
  [0, 1, 2, 3].map((id) => ({
    id, position: TOKEN_BASE_POSITION, isHome: false, color,
  }));

export const getTrackStart = (color: LudoColor): number =>
  color === 'red' ? RED_START_TRACK : GREEN_START_TRACK;

export const getAbsolutePosition = (trackPos: number, color: LudoColor): number => {
  if (trackPos < 0) return -1;
  if (trackPos >= 52) return trackPos;
  return (getTrackStart(color) + trackPos) % 52;
};

export const getMovableTokens = (tokens: LudoToken[], diceValue: number): number[] =>
  tokens.filter((token) => {
    if (token.isHome) return false;
    if (token.position === TOKEN_BASE_POSITION) return diceValue === 6;
    if (token.position >= 52) return token.position + diceValue <= TOKEN_HOME_POSITION;
    return true;
  }).map((t) => t.id);

export const moveToken = (token: LudoToken, diceValue: number): LudoToken => {
  let newPosition: number;
  if (token.position === TOKEN_BASE_POSITION) {
    newPosition = 0;
  } else if (token.position >= 52) {
    newPosition = token.position + diceValue;
  } else {
    newPosition = token.position + diceValue;
  }
  const isHome = newPosition >= TOKEN_HOME_POSITION;
  return { ...token, position: isHome ? TOKEN_HOME_POSITION : newPosition, isHome };
};

export const checkCapture = (
  movedToken: LudoToken,
  opponentTokens: LudoToken[]
): { captured: boolean; capturedTokenId: number | null } => {
  if (movedToken.position < 0 || movedToken.position >= 52)
    return { captured: false, capturedTokenId: null };
  const absPos = getAbsolutePosition(movedToken.position, movedToken.color);
  if (SAFE_POSITIONS.has(absPos)) return { captured: false, capturedTokenId: null };
  for (const opp of opponentTokens) {
    if (opp.position < 0 || opp.position >= 52 || opp.isHome) continue;
    if (getAbsolutePosition(opp.position, opp.color) === absPos)
      return { captured: true, capturedTokenId: opp.id };
  }
  return { captured: false, capturedTokenId: null };
};

export const checkWin = (tokens: LudoToken[]): boolean => tokens.every((t) => t.isHome);

const generatePrivateCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// ─── Firestore Operations ─────────────────────────────────────────────────────
export const createLudoGame = async (
  gameId: string,
  player1: { uid: string; name: string; photoURL: string },
  entryFee: number,
  tableType: TableType = 'public'
): Promise<{ privateCode: string | null }> => {
  const privateCode = tableType === 'private' ? generatePrivateCode() : null;

  const player1State: LudoPlayerState = {
    uid: player1.uid, name: player1.name, photoURL: player1.photoURL,
    color: 'red', tokens: createInitialTokens('red'),
    tokensHome: 0, isOnline: true, lastSeen: serverTimestamp(),
  };

  const game: Omit<LudoGame, 'id'> = {
    status: 'waiting', tableType, entryFee, pot: entryFee,
    player1: player1State, player2: null, activePlayer: null,
    diceValue: null, diceRolled: false, lastDiceRollBy: null,
    consecutiveSixes: 0, winnerId: null, winnerName: null,
    privateCode, createdBy: player1.uid, isAdminTable: false,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(), lastActionAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'ludoGames', gameId), game);
  if (entryFee > 0)
    await deductFunds(player1.uid, entryFee, 'GAME_LOSS', `Ludo entry fee - Game ${gameId}`);

  return { privateCode };
};

export const joinLudoGame = async (
  gameId: string,
  player2: { uid: string; name: string; photoURL: string },
  privateCode?: string
): Promise<void> => {
  const gameSnap = await getDoc(doc(db, 'ludoGames', gameId));
  if (!gameSnap.exists()) throw new Error('Game not found');
  const game = gameSnap.data() as LudoGame;
  if (game.status !== 'waiting') throw new Error('Game already started');
  if (game.player2 !== null) throw new Error('Game is full');
  if (game.player1?.uid === player2.uid) throw new Error('Cannot join your own game');
  if (game.tableType === 'private' && game.privateCode !== privateCode)
    throw new Error('Invalid private code');

  if (game.entryFee > 0)
    await deductFunds(player2.uid, game.entryFee, 'GAME_LOSS', `Ludo entry fee - Game ${gameId}`);

  const player2State: LudoPlayerState = {
    uid: player2.uid, name: player2.name, photoURL: player2.photoURL,
    color: 'green', tokens: createInitialTokens('green'),
    tokensHome: 0, isOnline: true, lastSeen: serverTimestamp(),
  };

  await updateDoc(doc(db, 'ludoGames', gameId), {
    player2: player2State, status: 'playing', activePlayer: 'player1',
    diceRolled: false, pot: game.entryFee * 2,
    updatedAt: serverTimestamp(), lastActionAt: serverTimestamp(),
  });
};

export const joinPrivateGame = async (
  privateCode: string,
  player2: { uid: string; name: string; photoURL: string }
): Promise<string> => {
  const q = query(
    collection(db, 'ludoGames'),
    where('privateCode', '==', privateCode),
    where('status', '==', 'waiting'),
    limit(1)
  );
  const { getDocs } = await import('firebase/firestore');
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('No game found with this code');
  const gameId = snap.docs[0].id;
  await joinLudoGame(gameId, player2, privateCode);
  return gameId;
};

export const rollDice = async (
  gameId: string, playerSlot: PlayerSlot, uid: string
): Promise<number> => {
  const diceValue = Math.floor(Math.random() * 6) + 1;
  await runTransaction(db, async (tx) => {
    const gameRef = doc(db, 'ludoGames', gameId);
    const snap = await tx.get(gameRef);
    if (!snap.exists()) throw new Error('Game not found');
    const game = snap.data() as LudoGame;
    if (game.activePlayer !== playerSlot) throw new Error('Not your turn');
    if (game.diceRolled) throw new Error('Dice already rolled');
    if (game.status !== 'playing') throw new Error('Game not active');
    const playerState = game[playerSlot] as LudoPlayerState;
    if (playerState.uid !== uid) throw new Error('Unauthorized');
    tx.update(gameRef, {
      diceValue, diceRolled: true, lastDiceRollBy: playerSlot,
      consecutiveSixes: diceValue === 6 ? game.consecutiveSixes + 1 : 0,
      updatedAt: serverTimestamp(), lastActionAt: serverTimestamp(),
    });
  });
  return diceValue;
};

export const moveTokenOnBoard = async (
  gameId: string, playerSlot: PlayerSlot, uid: string, tokenId: number
): Promise<{ captured: boolean; won: boolean }> => {
  let captured = false; let won = false;
  await runTransaction(db, async (tx) => {
    const gameRef = doc(db, 'ludoGames', gameId);
    const snap = await tx.get(gameRef);
    if (!snap.exists()) throw new Error('Game not found');
    const game = snap.data() as LudoGame;
    if (game.activePlayer !== playerSlot) throw new Error('Not your turn');
    if (!game.diceRolled) throw new Error('Roll dice first');
    if (game.diceValue === null) throw new Error('No dice value');
    if (game.status !== 'playing') throw new Error('Game not active');
    const playerState = { ...(game[playerSlot] as LudoPlayerState) };
    if (playerState.uid !== uid) throw new Error('Unauthorized');
    const opponentSlot: PlayerSlot = playerSlot === 'player1' ? 'player2' : 'player1';
    const opponentState = { ...(game[opponentSlot] as LudoPlayerState) };
    const tokenIndex = playerState.tokens.findIndex((t) => t.id === tokenId);
    if (tokenIndex === -1) throw new Error('Token not found');
    const updatedToken = moveToken(playerState.tokens[tokenIndex], game.diceValue);
    const updatedTokens = [...playerState.tokens];
    updatedTokens[tokenIndex] = updatedToken;
    const captureResult = checkCapture(updatedToken, opponentState.tokens);
    captured = captureResult.captured;
    let updatedOpponentTokens = [...opponentState.tokens];
    if (captured && captureResult.capturedTokenId !== null) {
      const captIdx = updatedOpponentTokens.findIndex((t) => t.id === captureResult.capturedTokenId);
      if (captIdx !== -1)
        updatedOpponentTokens[captIdx] = { ...updatedOpponentTokens[captIdx], position: TOKEN_BASE_POSITION, isHome: false };
    }
    const tokensHome = updatedTokens.filter((t) => t.isHome).length;
    won = checkWin(updatedTokens);
    const getsExtraTurn = game.diceValue === 6 || captured;
    const newConsecSixes = game.diceValue === 6 ? game.consecutiveSixes + 1 : 0;
    const nextPlayer = getsExtraTurn && newConsecSixes < 3 ? playerSlot : opponentSlot;
    const updates: any = {
      [`${playerSlot}.tokens`]: updatedTokens,
      [`${playerSlot}.tokensHome`]: tokensHome,
      [`${opponentSlot}.tokens`]: updatedOpponentTokens,
      diceRolled: false, diceValue: null,
      consecutiveSixes: newConsecSixes,
      activePlayer: won ? playerSlot : nextPlayer,
      updatedAt: serverTimestamp(), lastActionAt: serverTimestamp(),
    };
    if (won) {
      updates.status = 'finished';
      updates.winnerId = uid;
      updates.winnerName = playerState.name;
    }
    tx.update(gameRef, updates);
  });
  if (won) {
    const gameSnap = await getDoc(doc(db, 'ludoGames', gameId));
    const game = gameSnap.data() as LudoGame;
    if (game.pot > 0) {
      const prize = Math.floor(game.pot * 0.9);
      await addFunds(uid, prize, 'winningBalance', `Ludo Win - Game ${gameId}`, 'GAME_WIN');
    }
  }
  return { captured, won };
};

export const skipTurn = async (gameId: string, playerSlot: PlayerSlot): Promise<void> => {
  const opponentSlot: PlayerSlot = playerSlot === 'player1' ? 'player2' : 'player1';
  await updateDoc(doc(db, 'ludoGames', gameId), {
    diceRolled: false, diceValue: null, consecutiveSixes: 0,
    activePlayer: opponentSlot, updatedAt: serverTimestamp(), lastActionAt: serverTimestamp(),
  });
};

export const updatePlayerOnline = async (
  gameId: string, playerSlot: PlayerSlot, isOnline: boolean
): Promise<void> => {
  await updateDoc(doc(db, 'ludoGames', gameId), {
    [`${playerSlot}.isOnline`]: isOnline,
    [`${playerSlot}.lastSeen`]: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const subscribeLudoGame = (
  gameId: string, callback: (game: LudoGame | null) => void
): (() => void) =>
  onSnapshot(doc(db, 'ludoGames', gameId), (snap) =>
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as LudoGame) : null));

export const subscribeOpenLudoGames = (
  callback: (games: LudoGame[]) => void
): (() => void) => {
  const q = query(
    collection(db, 'ludoGames'),
    where('status', '==', 'waiting'),
    where('tableType', 'in', ['public', 'admin']),
    orderBy('createdAt', 'desc'),
    limit(30)
  );
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LudoGame))));
};
