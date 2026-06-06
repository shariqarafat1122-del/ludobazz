// RealLudo.ts — Firestore service layer for Real-Time 2-Player Ludo
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  collection,
} from 'firebase/firestore';
import { db } from './config';
import { deductFunds, addFunds } from './wallet';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LudoColor = 'red' | 'green';
export type GamePhase = 'waiting' | 'playing' | 'finished';
export type PlayerSlot = 'player1' | 'player2';

export interface LudoToken {
  id: number;        // 0,1,2,3
  position: number;  // -1 = base, 0-56 = track, 57 = home (finished)
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
  player1: LudoPlayerState | null;
  player2: LudoPlayerState | null;
  activePlayer: PlayerSlot | null;  // whose turn
  diceValue: number | null;
  diceRolled: boolean;              // has current player rolled?
  lastDiceRollBy: PlayerSlot | null;
  consecutiveSixes: number;
  winnerId: string | null;
  winnerName: string | null;
  createdAt: any;
  updatedAt: any;
  lastActionAt: any;
}

// ─── Board Layout Constants ───────────────────────────────────────────────────

// Standard Ludo board path positions (0-51) for 2-player (Red & Green)
// Red starts at position 0 (track index), home column: 52-56
// Green starts at position 26, home column: 52-56 (offset by 26)

export const RED_START_TRACK = 0;
export const GREEN_START_TRACK = 26;

// Safe squares on the main track (0-51)
export const SAFE_POSITIONS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// How many steps in home column before "home" (finished)
export const HOME_COLUMN_STEPS = 6; // positions 52-57, 57 = finished

// Token starting positions in base (pre-game)
export const TOKEN_BASE_POSITION = -1;
export const TOKEN_HOME_POSITION = 57;

// ─── Helper: Create Initial Tokens ───────────────────────────────────────────

export const createInitialTokens = (color: LudoColor): LudoToken[] =>
  [0, 1, 2, 3].map((id) => ({
    id,
    position: TOKEN_BASE_POSITION,
    isHome: false,
    color,
  }));

// ─── Helper: Get Player Track Start ──────────────────────────────────────────

export const getTrackStart = (color: LudoColor): number =>
  color === 'red' ? RED_START_TRACK : GREEN_START_TRACK;

// ─── Helper: Convert track position to absolute board position ───────────────
// Each color has its own start on the shared 52-step track
// trackPos: 0-51 (main loop), 52-56 (home column), 57 (finished)

export const getAbsolutePosition = (
  trackPos: number,
  color: LudoColor
): number => {
  if (trackPos < 0) return -1; // in base
  if (trackPos >= 52) return trackPos; // home column or finished

  const start = getTrackStart(color);
  return (start + trackPos) % 52;
};

// ─── Helper: Get Movable Tokens ───────────────────────────────────────────────

export const getMovableTokens = (
  tokens: LudoToken[],
  diceValue: number
): number[] => {
  return tokens
    .filter((token) => {
      if (token.isHome) return false;

      // Token in base: only 6 can open it
      if (token.position === TOKEN_BASE_POSITION) {
        return diceValue === 6;
      }

      // Token on home column (52-56): must not overshoot
      if (token.position >= 52) {
        const newPos = token.position + diceValue;
        return newPos <= TOKEN_HOME_POSITION;
      }

      // Token on main track
      return true;
    })
    .map((t) => t.id);
};

// ─── Helper: Move Token ───────────────────────────────────────────────────────

export const moveToken = (
  token: LudoToken,
  diceValue: number
): LudoToken => {
  let newPosition: number;

  if (token.position === TOKEN_BASE_POSITION) {
    // Open from base — place at track start (position 0)
    newPosition = 0;
  } else if (token.position >= 52) {
    // In home column
    newPosition = token.position + diceValue;
  } else {
    // On main track
    const afterMove = token.position + diceValue;

    if (afterMove >= 52) {
      // Entering home column
      newPosition = afterMove; // 52-57
    } else {
      newPosition = afterMove;
    }
  }

  const isHome = newPosition >= TOKEN_HOME_POSITION;

  return {
    ...token,
    position: isHome ? TOKEN_HOME_POSITION : newPosition,
    isHome,
  };
};

// ─── Helper: Check Capture ───────────────────────────────────────────────────

export const checkCapture = (
  movedToken: LudoToken,
  opponentTokens: LudoToken[]
): { captured: boolean; capturedTokenId: number | null } => {
  if (movedToken.position < 0 || movedToken.position >= 52) {
    return { captured: false, capturedTokenId: null };
  }

  // Absolute position of moved token
  const absPos = getAbsolutePosition(movedToken.position, movedToken.color);

  // Safe squares cannot have captures
  if (SAFE_POSITIONS.has(absPos)) {
    return { captured: false, capturedTokenId: null };
  }

  // Check if any opponent token is on the same absolute position
  for (const opp of opponentTokens) {
    if (opp.position < 0 || opp.position >= 52 || opp.isHome) continue;
    const oppAbs = getAbsolutePosition(
      opp.position,
      opp.color
    );
    if (oppAbs === absPos) {
      return { captured: true, capturedTokenId: opp.id };
    }
  }

  return { captured: false, capturedTokenId: null };
};

// ─── Helper: Check Win ────────────────────────────────────────────────────────

export const checkWin = (tokens: LudoToken[]): boolean =>
  tokens.every((t) => t.isHome);

// ─── Firestore Operations ─────────────────────────────────────────────────────

export const createLudoGame = async (
  gameId: string,
  player1: { uid: string; name: string; photoURL: string },
  entryFee: number
): Promise<void> => {
  const gameRef = doc(db, 'ludoGames', gameId);

  const player1State: LudoPlayerState = {
    uid: player1.uid,
    name: player1.name,
    photoURL: player1.photoURL,
    color: 'red',
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastActionAt: serverTimestamp(),
  };

  await setDoc(gameRef, game);

  // Deduct entry fee from player1
  if (entryFee > 0) {
    await deductFunds(player1.uid, entryFee, 'GAME_LOSS', `Ludo entry fee - Game ${gameId}`);
  }
};

export const joinLudoGame = async (
  gameId: string,
  player2: { uid: string; name: string; photoURL: string }
): Promise<void> => {
  await runTransaction(db, async (tx) => {
    const gameRef = doc(db, 'ludoGames', gameId);
    const snap = await tx.get(gameRef);

    if (!snap.exists()) throw new Error('Game not found');

    const game = snap.data() as LudoGame;
    if (game.status !== 'waiting') throw new Error('Game already started');
    if (game.player2 !== null) throw new Error('Game is full');
    if (game.player1?.uid === player2.uid) throw new Error('Cannot join your own game');

    const player2State: LudoPlayerState = {
      uid: player2.uid,
      name: player2.name,
      photoURL: player2.photoURL,
      color: 'green',
      tokens: createInitialTokens('green'),
      tokensHome: 0,
      isOnline: true,
      lastSeen: serverTimestamp(),
    };

    tx.update(gameRef, {
      player2: player2State,
      status: 'playing',
      activePlayer: 'player1', // Red goes first
      diceRolled: false,
      pot: game.entryFee * 2,
      updatedAt: serverTimestamp(),
      lastActionAt: serverTimestamp(),
    });
  });

  // Deduct entry fee from player2
  const gameSnap = await getDoc(doc(db, 'ludoGames', gameId));
  const game = gameSnap.data() as LudoGame;
  if (game.entryFee > 0) {
    await deductFunds(player2.uid, game.entryFee, 'GAME_LOSS', `Ludo entry fee - Game ${gameId}`);
  }
};

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

    const movable = getMovableTokens(playerState.tokens, diceValue);

    // Auto skip turn if no movable tokens and not a 6
    let shouldSkip = movable.length === 0;

    tx.update(gameRef, {
      diceValue,
      diceRolled: true,
      lastDiceRollBy: playerSlot,
      consecutiveSixes: diceValue === 6 ? game.consecutiveSixes + 1 : 0,
      // If no moves possible, skip will be handled client-side after showing dice
      updatedAt: serverTimestamp(),
      lastActionAt: serverTimestamp(),
    });
  });

  return diceValue;
};

export const moveTokenOnBoard = async (
  gameId: string,
  playerSlot: PlayerSlot,
  uid: string,
  tokenId: number
): Promise<{ captured: boolean; won: boolean }> => {
  let captured = false;
  let won = false;

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

    // Find and move token
    const tokenIndex = playerState.tokens.findIndex((t) => t.id === tokenId);
    if (tokenIndex === -1) throw new Error('Token not found');

    const updatedToken = moveToken(playerState.tokens[tokenIndex], game.diceValue);
    const updatedTokens = [...playerState.tokens];
    updatedTokens[tokenIndex] = updatedToken;

    // Check capture
    const captureResult = checkCapture(updatedToken, opponentState.tokens);
    captured = captureResult.captured;

    let updatedOpponentTokens = [...opponentState.tokens];
    if (captured && captureResult.capturedTokenId !== null) {
      // Send captured token back to base
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

    // Determine next turn
    // Extra turn if: rolled 6 OR captured (some variants)
    const getsExtraTurn = game.diceValue === 6 || captured;
    const nextPlayer = getsExtraTurn ? playerSlot : opponentSlot;

    // Three consecutive sixes = lose turn (forfeit)
    const newSixes = game.diceValue === 6 ? game.consecutiveSixes : 0;
    const actualNextPlayer =
      newSixes >= 3 ? opponentSlot : nextPlayer;

    const updates: Partial<LudoGame> & Record<string, any> = {
      [`${playerSlot}.tokens`]: updatedTokens,
      [`${playerSlot}.tokensHome`]: tokensHome,
      [`${opponentSlot}.tokens`]: updatedOpponentTokens,
      diceRolled: false,
      diceValue: null,
      consecutiveSixes: game.diceValue === 6 ? game.consecutiveSixes + 1 : 0,
      activePlayer: won ? playerSlot : actualNextPlayer,
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

  // If won, credit prize
  if (won) {
    const gameSnap = await getDoc(doc(db, 'ludoGames', gameId));
    const game = gameSnap.data() as LudoGame;
    if (game.pot > 0) {
      const prize = Math.floor(game.pot * 0.9); // 10% platform fee
      await addFunds(uid, prize, 'winningBalance', `Ludo Win - Game ${gameId}`, 'GAME_WIN');
    }
  }

  return { captured, won };
};

export const skipTurn = async (
  gameId: string,
  playerSlot: PlayerSlot
): Promise<void> => {
  const opponentSlot: PlayerSlot = playerSlot === 'player1' ? 'player2' : 'player1';

  await updateDoc(doc(db, 'ludoGames', gameId), {
    diceRolled: false,
    diceValue: null,
    consecutiveSixes: 0,
    activePlayer: opponentSlot,
    updatedAt: serverTimestamp(),
    lastActionAt: serverTimestamp(),
  });
};

export const updatePlayerOnline = async (
  gameId: string,
  playerSlot: PlayerSlot,
  isOnline: boolean
): Promise<void> => {
  await updateDoc(doc(db, 'ludoGames', gameId), {
    [`${playerSlot}.isOnline`]: isOnline,
    [`${playerSlot}.lastSeen`]: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const subscribeLudoGame = (
  gameId: string,
  callback: (game: LudoGame | null) => void
): (() => void) => {
  return onSnapshot(doc(db, 'ludoGames', gameId), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback({ id: snap.id, ...snap.data() } as LudoGame);
  });
};

// ─── Lobby: Get Open Games ────────────────────────────────────────────────────

export const getOpenLudoGames = async (): Promise<LudoGame[]> => {
  const { getDocs, query, where, orderBy, limit } = await import('firebase/firestore');
  const q = query(
    collection(db, 'ludoGames'),
    where('status', '==', 'waiting'),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as LudoGame));
};

export const subscribeOpenLudoGames = (
  callback: (games: LudoGame[]) => void
): (() => void) => {
  // We'll do a simple polling approach via onSnapshot with a query
  // Import dynamically to keep top-level imports clean
  const { query, where, orderBy, limit } = require('firebase/firestore');
  const q = query(
    collection(db, 'ludoGames'),
    where('status', '==', 'waiting'),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  return onSnapshot(q, (snap: any) => {
    const games = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as LudoGame));
    callback(games);
  });
};
