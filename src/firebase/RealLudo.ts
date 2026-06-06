import {
  doc, getDoc, setDoc, updateDoc, onSnapshot,
  serverTimestamp, query, where, orderBy, limit,
  runTransaction, collection, getDocs,
} from 'firebase/firestore';
import { db } from './config';
import { deductFunds, addFunds } from './wallet';

// ─── Types ────────────────────────────────────────────────────────────────────
export type LudoColor = 'red' | 'green';
export type GamePhase = 'waiting' | 'playing' | 'finished';
export type PlayerSlot = 'player1' | 'player2';

export interface LudoToken {
  id: number;
  position: number; // -1=base, 0-51=track, 52-57=home-col, 57=finished
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
  entryFee: number;
  pot: number;
  player1: LudoPlayerState | null;  // creator = RED
  player2: LudoPlayerState | null;  // joiner  = GREEN
  activePlayer: PlayerSlot | null;
  diceValue: number | null;
  diceRolled: boolean;
  lastDiceRollBy: PlayerSlot | null;
  consecutiveSixes: number;
  winnerId: string | null;
  winnerName: string | null;
  createdBy: string;
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
    id,
    position: TOKEN_BASE_POSITION,
    isHome: false,
    color,
  }));

export const getTrackStart = (color: LudoColor): number =>
  color === 'red' ? RED_START_TRACK : GREEN_START_TRACK;

export const getAbsolutePosition = (
  trackPos: number,
  color: LudoColor
): number => {
  if (trackPos < 0) return -1;
  if (trackPos >= 52) return trackPos;
  return (getTrackStart(color) + trackPos) % 52;
};

export const getMovableTokens = (
  tokens: LudoToken[],
  diceValue: number
): number[] =>
  tokens
    .filter((token) => {
      if (token.isHome) return false;
      if (token.position === TOKEN_BASE_POSITION) return diceValue === 6;
      if (token.position >= 52)
        return token.position + diceValue <= TOKEN_HOME_POSITION;
      return true;
    })
    .map((t) => t.id);

export const moveToken = (
  token: LudoToken,
  diceValue: number
): LudoToken => {
  let newPosition: number;
  if (token.position === TOKEN_BASE_POSITION) {
    newPosition = 0;
  } else {
    newPosition = token.position + diceValue;
  }
  const isHome = newPosition >= TOKEN_HOME_POSITION;
  return {
    ...token,
    position: isHome ? TOKEN_HOME_POSITION : newPosition,
    isHome,
  };
};

export const checkCapture = (
  movedToken: LudoToken,
  opponentTokens: LudoToken[]
): { captured: boolean; capturedTokenId: number | null } => {
  if (movedToken.position < 0 || movedToken.position >= 52)
    return { captured: false, capturedTokenId: null };

  const absPos = getAbsolutePosition(movedToken.position, movedToken.color);
  if (SAFE_POSITIONS.has(absPos))
    return { captured: false, capturedTokenId: null };

  for (const opp of opponentTokens) {
    if (opp.position < 0 || opp.position >= 52 || opp.isHome) continue;
    if (getAbsolutePosition(opp.position, opp.color) === absPos)
      return { captured: true, capturedTokenId: opp.id };
  }
  return { captured: false, capturedTokenId: null };
};

export const checkWin = (tokens: LudoToken[]): boolean =>
  tokens.every((t) => t.isHome);

// ─── Firestore Operations ─────────────────────────────────────────────────────

// Create game — uses existing deductFunds from wallet.ts
export const createLudoGame = async (
  gameId: string,
  player1: { uid: string; name: string; photoURL: string },
  entryFee: number
): Promise<void> => {
  const player1State: LudoPlayerState = {
    uid: player1.uid,
    name: player1.name,
    photoURL: player1.photoURL || '',
    color: 'red',  // creator = RED
    tokens: createInitialTokens('red'),
    tokensHome: 0,
    isOnline: true,
    lastSeen: serverTimestamp(),
  };

  const game: Omit<LudoGame, 'id'> = {
    status: 'waiting',
    entryFee,
    pot: entryFee,
    player1: player1State,
    player2: null,
    activePlayer: null,
    diceValue: null,
    diceRolled: false,
    lastDiceRollBy: null,
    consecutiveSixes: 0,
    winnerId: null,
    winnerName: null,
    createdBy: player1.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastActionAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'ludoGames', gameId), game);

  // Deduct entry fee using existing wallet function
  if (entryFee > 0) {
    await deductFunds(
      player1.uid,
      entryFee,
      'GAME_LOSS',
      `Ludo entry fee - Game ${gameId}`
    );
  }
};

// Join game — joiner = GREEN
export const joinLudoGame = async (
  gameId: string,
  player2: { uid: string; name: string; photoURL: string }
): Promise<void> => {
  const gameSnap = await getDoc(doc(db, 'ludoGames', gameId));
  if (!gameSnap.exists()) throw new Error('Game not found');

  const game = gameSnap.data() as LudoGame;
  if (game.status !== 'waiting') throw new Error('Game already started');
  if (game.player2 !== null) throw new Error('Game is full');
  if (game.player1?.uid === player2.uid)
    throw new Error('Cannot join your own game');

  // Deduct entry fee first
  if (game.entryFee > 0) {
    await deductFunds(
      player2.uid,
      game.entryFee,
      'GAME_LOSS',
      `Ludo entry fee - Game ${gameId}`
    );
  }

  const player2State: LudoPlayerState = {
    uid: player2.uid,
    name: player2.name,
    photoURL: player2.photoURL || '',
    color: 'green',  // joiner = GREEN
    tokens: createInitialTokens('green'),
    tokensHome: 0,
    isOnline: true,
    lastSeen: serverTimestamp(),
  };

  await updateDoc(doc(db, 'ludoGames', gameId), {
    player2: player2State,
    status: 'playing',
    activePlayer: 'player1',  // RED (creator) goes first
    diceRolled: false,
    pot: game.entryFee * 2,
    updatedAt: serverTimestamp(),
    lastActionAt: serverTimestamp(),
  });
};

// Roll dice
export const rollDice = async (
  gameId: string,
  playerSlot: PlayerSlot,
  uid: string
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
      diceValue,
      diceRolled: true,
      lastDiceRollBy: playerSlot,
      consecutiveSixes:
        diceValue === 6 ? game.consecutiveSixes + 1 : 0,
      updatedAt: serverTimestamp(),
      lastActionAt: serverTimestamp(),
    });
  });

  return diceValue;
};

// Move token + handle capture + handle win + award prize
export const moveTokenOnBoard = async (
  gameId: string,
  playerSlot: PlayerSlot,
  uid: string,
  tokenId: number
): Promise<{ captured: boolean; won: boolean }> => {
  let captured = false;
  let won = false;
  let potAmount = 0;

  await runTransaction(db, async (tx) => {
    const gameRef = doc(db, 'ludoGames', gameId);
    const snap = await tx.get(gameRef);
    if (!snap.exists()) throw new Error('Game not found');

    const game = snap.data() as LudoGame;
    if (game.activePlayer !== playerSlot) throw new Error('Not your turn');
    if (!game.diceRolled) throw new Error('Roll dice first');
    if (game.diceValue === null) throw new Error('No dice value');
    if (game.status !== 'playing') throw new Error('Game not active');

    const playerState = {
      ...(game[playerSlot] as LudoPlayerState),
    };
    if (playerState.uid !== uid) throw new Error('Unauthorized');

    const opponentSlot: PlayerSlot =
      playerSlot === 'player1' ? 'player2' : 'player1';
    const opponentState = {
      ...(game[opponentSlot] as LudoPlayerState),
    };

    // Move the token
    const tokenIndex = playerState.tokens.findIndex((t) => t.id === tokenId);
    if (tokenIndex === -1) throw new Error('Token not found');

    const updatedToken = moveToken(
      playerState.tokens[tokenIndex],
      game.diceValue
    );
    const updatedTokens = [...playerState.tokens];
    updatedTokens[tokenIndex] = updatedToken;

    // Check capture
    const captureResult = checkCapture(updatedToken, opponentState.tokens);
    captured = captureResult.captured;
    let updatedOpponentTokens = [...opponentState.tokens];

    if (captured && captureResult.capturedTokenId !== null) {
      const captIdx = updatedOpponentTokens.findIndex(
        (t) => t.id === captureResult.capturedTokenId
      );
      if (captIdx !== -1) {
        updatedOpponentTokens[captIdx] = {
          ...updatedOpponentTokens[captIdx],
          position: TOKEN_BASE_POSITION,
          isHome: false,
        };
      }
    }

    const tokensHome = updatedTokens.filter((t) => t.isHome).length;
    won = checkWin(updatedTokens);
    potAmount = game.pot;

    const getsExtraTurn = game.diceValue === 6 || captured;
    const newConsecSixes =
      game.diceValue === 6 ? game.consecutiveSixes : 0;
    const nextPlayer =
      getsExtraTurn && newConsecSixes < 3 ? playerSlot : opponentSlot;

    const updates: Record<string, any> = {
      [`${playerSlot}.tokens`]: updatedTokens,
      [`${playerSlot}.tokensHome`]: tokensHome,
      [`${opponentSlot}.tokens`]: updatedOpponentTokens,
      diceRolled: false,
      diceValue: null,
      consecutiveSixes: newConsecSixes,
      activePlayer: won ? playerSlot : nextPlayer,
      updatedAt: serverTimestamp(),
      lastActionAt: serverTimestamp(),
    };

    if (won) {
      updates.status = 'finished';
      updates.winnerId = uid;
      updates.winnerName = playerState.name;
    }

    tx.update(gameRef, updates);
  });

  // Award prize OUTSIDE transaction using existing addFunds
  if (won && potAmount > 0) {
    const prize = Math.floor(potAmount * 0.9); // 10% platform fee
    await addFunds(
      uid,
      prize,
      'winningBalance',
      `Ludo Win - Game ${gameId}`,
      'GAME_WIN'
    );
  }

  return { captured, won };
};

// ─── Leave/Forfeit — opponent wins ───────────────────────────────────────────
export const forfeitGame = async (
  gameId: string,
  leavingUid: string
): Promise<void> => {
  const gameSnap = await getDoc(doc(db, 'ludoGames', gameId));
  if (!gameSnap.exists()) return;

  const game = gameSnap.data() as LudoGame;
  if (game.status === 'finished') return;

  // Find opponent
  let opponentUid: string | null = null;
  let opponentName: string | null = null;

  if (game.player1?.uid === leavingUid) {
    opponentUid = game.player2?.uid || null;
    opponentName = game.player2?.name || null;
  } else if (game.player2?.uid === leavingUid) {
    opponentUid = game.player1?.uid || null;
    opponentName = game.player1?.name || null;
  }

  // If game was playing and opponent exists → opponent wins
  if (game.status === 'playing' && opponentUid && game.pot > 0) {
    const prize = Math.floor(game.pot * 0.9);
    await addFunds(
      opponentUid,
      prize,
      'winningBalance',
      `Ludo Win (opponent forfeited) - Game ${gameId}`,
      'GAME_WIN'
    );
  }

  // If game was waiting → refund creator
  if (game.status === 'waiting' && game.entryFee > 0) {
    await addFunds(
      leavingUid,
      game.entryFee,
      'depositBalance',
      `Ludo refund - Game ${gameId}`,
      'REFUND'
    );
  }

  await updateDoc(doc(db, 'ludoGames', gameId), {
    status: 'finished',
    winnerId: opponentUid,
    winnerName: opponentName,
    updatedAt: serverTimestamp(),
  });
};

// Skip turn
export const skipTurn = async (
  gameId: string,
  playerSlot: PlayerSlot
): Promise<void> => {
  const opponentSlot: PlayerSlot =
    playerSlot === 'player1' ? 'player2' : 'player1';
  await updateDoc(doc(db, 'ludoGames', gameId), {
    diceRolled: false,
    diceValue: null,
    consecutiveSixes: 0,
    activePlayer: opponentSlot,
    updatedAt: serverTimestamp(),
    lastActionAt: serverTimestamp(),
  });
};

// Online status
export const updatePlayerOnline = async (
  gameId: string,
  playerSlot: PlayerSlot,
  isOnline: boolean
): Promise<void> => {
  await updateDoc(doc(db, 'ludoGames', gameId), {
    [`${playerSlot}.isOnline`]: isOnline,
    [`${playerSlot}.lastSeen`]: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }).catch(() => {}); // Silently fail if game deleted
};

// Subscribe single game
export const subscribeLudoGame = (
  gameId: string,
  callback: (game: LudoGame | null) => void
): (() => void) =>
  onSnapshot(doc(db, 'ludoGames', gameId), (snap) =>
    callback(
      snap.exists() ? ({ id: snap.id, ...snap.data() } as LudoGame) : null
    )
  );

// Subscribe open games lobby
export const subscribeOpenLudoGames = (
  callback: (games: LudoGame[]) => void
): (() => void) => {
  const q = query(
    collection(db, 'ludoGames'),
    where('status', '==', 'waiting'),
    orderBy('createdAt', 'desc'),
    limit(30)
  );
  return onSnapshot(q, (snap) =>
    callback(
      snap.docs.map((d) => ({ id: d.id, ...d.data() } as LudoGame))
    )
  );
};
