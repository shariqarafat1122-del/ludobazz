import { useState, useEffect, useCallback, useRef } from 'react';
import {
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { GameState, PlayerColor } from '../types/ludo';
import type { GameTable } from '../types/lobby';
import {
  createTokens,
  moveToken,
  rollDice,
  getMovableTokens,
  PLAYER_COLORS,
  TURN_DURATION,
  MAX_LIVES,
} from '../utils/gameLogic';
import { generateGameId } from '../utils/roomUtils';

interface UseOnlineGameOptions {
  table: GameTable;
  playerId: string;
  playerColor: PlayerColor;
  onGameEnd: (winnerId: string, winnerPrize: number) => void;
}

export function useOnlineGame({
  table,
  playerId,
  playerColor,
  onGameEnd,
}: UseOnlineGameOptions) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameId, setGameId] = useState<string>('');
  const [isDiceRolling, setIsDiceRolling] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TURN_DURATION);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [hasRolled, setHasRolled] = useState(false);
  const [localDiceValue, setLocalDiceValue] = useState(1);
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const unsubRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameIdRef = useRef<string>('');

  const isMyTurn = gameState?.currentTurn === playerColor;
  const myPlayer = gameState?.players.find(p => p.color === playerColor);
  const opponent = gameState?.players.find(p => p.color !== playerColor);

  // Initialize game in Firestore
  const initGame = useCallback(async () => {
    // Check if game already exists for this table
    const existingGameId = `game_${table.tableId}`;
    const gameRef = doc(db, 'games', existingGameId);
    const snap = await getDoc(gameRef);

    if (snap.exists()) {
      setGameId(existingGameId);
      gameIdRef.current = existingGameId;
      subscribeToGame(existingGameId);
      return;
    }

    // Create new game
    const newGameId = existingGameId;
    const now = Date.now();

    const p1Color: PlayerColor = 'red';
    const p2Color: PlayerColor = 'green';

    const initialState: GameState = {
      gameId: newGameId,
      tableId: table.tableId,
      players: [
        {
          id: table.player1Id!,
          name: table.player1Name!,
          color: p1Color,
          tokens: createTokens(p1Color),
          isOnline: true,
          finishedTokens: 0,
          lives: MAX_LIVES,
          lastRollTime: now,
        },
        {
          id: table.player2Id!,
          name: table.player2Name!,
          color: p2Color,
          tokens: createTokens(p2Color),
          isOnline: true,
          finishedTokens: 0,
          lives: MAX_LIVES,
          lastRollTime: now,
        },
      ],
      currentTurn: p1Color,
      dice: { value: 1, isRolling: false, hasRolled: false, rolledBy: null },
      status: 'playing',
      winner: null,
      winnerPlayerId: null,
      turnTimer: {
        startTime: now,
        duration: TURN_DURATION,
        currentTurn: p1Color,
      },
      createdAt: now,
      updatedAt: now,
      moveHistory: [],
      prizePool: table.prizePool,
      winnerPrize: table.winnerPrize,
      platformCut: table.platformCut,
    };

    await setDoc(gameRef, initialState);
    setGameId(newGameId);
    gameIdRef.current = newGameId;
    subscribeToGame(newGameId);
  }, [table]);

  // Subscribe to game state
  const subscribeToGame = useCallback((gId: string) => {
    if (unsubRef.current) unsubRef.current();

    const ref = doc(db, 'games', gId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as GameState;
        setGameState(data);
        setIsConnected(true);

        // Update local UI state from server
        if (data.dice.hasRolled && data.dice.rolledBy === (playerColor === 'red' ? 'green' : 'red')) {
          // Opponent rolled
          setLocalDiceValue(data.dice.value);
        }

        // Sync timer
        if (data.turnTimer) {
          const elapsed = (Date.now() - data.turnTimer.startTime) / 1000;
          setTimeLeft(Math.max(0, TURN_DURATION - elapsed));
        }

        // Game ended
        if (data.status === 'finished' && data.winnerPlayerId) {
          onGameEnd(data.winnerPlayerId, data.winnerPrize);
        }
      }
    }, (err) => {
      console.error('Game sync error:', err);
      setIsConnected(false);
      // Reconnect
      setTimeout(() => subscribeToGame(gId), 3000);
    });

    unsubRef.current = unsub;
  }, [playerColor, onGameEnd]);

  // Timer countdown
  useEffect(() => {
    if (!gameState || gameState.status !== 'playing') return;

    timerRef.current = setInterval(() => {
      if (!gameState.turnTimer) return;
      const elapsed = (Date.now() - gameState.turnTimer.startTime) / 1000;
      const remaining = Math.max(0, TURN_DURATION - elapsed);
      setTimeLeft(remaining);

      // Time expired - lose a life
      if (remaining <= 0 && isMyTurn && !hasRolled) {
        handleTimerExpired();
      }
    }, 200);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState?.turnTimer?.startTime, isMyTurn, hasRolled]);

  // Handle timer expiry - lose a life
  const handleTimerExpired = useCallback(async () => {
    if (!gameState || !gameId || !isMyTurn || hasRolled) return;

    const myPlayerData = gameState.players.find(p => p.color === playerColor);
    if (!myPlayerData) return;

    const newLives = myPlayerData.lives - 1;

    if (newLives <= 0) {
      // Game over - opponent wins
      const opponent = gameState.players.find(p => p.color !== playerColor);
      if (!opponent) return;

      await updateDoc(doc(db, 'games', gameId), {
        status: 'finished',
        winner: opponent.color,
        winnerPlayerId: opponent.id,
        updatedAt: Date.now(),
        players: gameState.players.map(p =>
          p.color === playerColor
            ? { ...p, lives: 0 }
            : p
        ),
      });
    } else {
      // Deduct life and skip turn
      const currentIndex = PLAYER_COLORS.indexOf(playerColor);
      const nextColor = PLAYER_COLORS[(currentIndex + 1) % PLAYER_COLORS.length];
      const now = Date.now();

      await updateDoc(doc(db, 'games', gameId), {
        currentTurn: nextColor,
        'dice.hasRolled': false,
        'dice.rolledBy': null,
        turnTimer: {
          startTime: now,
          duration: TURN_DURATION,
          currentTurn: nextColor,
        },
        players: gameState.players.map(p =>
          p.color === playerColor
            ? { ...p, lives: newLives }
            : p
        ),
        updatedAt: now,
      });

      setHasRolled(false);
      setSelectedToken(null);
    }
  }, [gameState, gameId, isMyTurn, hasRolled, playerColor]);

  // Roll dice
  const handleRollDice = useCallback(async () => {
    if (!gameState || !gameId || !isMyTurn || hasRolled || isDiceRolling) return;

    setIsDiceRolling(true);

    // Show rolling animation
    await new Promise(r => setTimeout(r, 1200));

    const result = rollDice();
    setLocalDiceValue(result);
    setIsDiceRolling(false);
    setHasRolled(true);

    // Sync to Firebase
    try {
      await updateDoc(doc(db, 'games', gameId), {
        'dice.value': result,
        'dice.isRolling': false,
        'dice.hasRolled': true,
        'dice.rolledBy': playerColor,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error('Roll sync failed:', err);
    }

    // Check if any moves available
    const myP = gameState.players.find(p => p.color === playerColor);
    if (myP) {
      const movable = getMovableTokens(myP, result);
      if (movable.length === 0) {
        // No moves - auto skip after 1.5s
        setTimeout(() => handleSkipTurn(result), 1500);
      }
    }
  }, [gameState, gameId, isMyTurn, hasRolled, isDiceRolling, playerColor]);

  // Skip turn (no moves)
  const handleSkipTurn = useCallback(async (diceVal?: number) => {
    if (!gameState || !gameId) return;

    const currentIndex = PLAYER_COLORS.indexOf(gameState.currentTurn);
    const nextColor = PLAYER_COLORS[(currentIndex + 1) % PLAYER_COLORS.length];
    const now = Date.now();

    try {
      await updateDoc(doc(db, 'games', gameId), {
        currentTurn: nextColor,
        'dice.hasRolled': false,
        'dice.rolledBy': null,
        turnTimer: {
          startTime: now,
          duration: TURN_DURATION,
          currentTurn: nextColor,
        },
        updatedAt: now,
      });
    } catch (err) {
      console.error('Skip turn failed:', err);
    }

    setHasRolled(false);
    setSelectedToken(null);
  }, [gameState, gameId]);

  // Move token
  const handleTokenMove = useCallback(async (tokenId: string) => {
    if (!gameState || !gameId || !isMyTurn || !hasRolled) return;

    const myP = gameState.players.find(p => p.color === playerColor);
    if (!myP) return;

    const newState = moveToken(gameState, myP.id, tokenId, localDiceValue);

    try {
      await updateDoc(doc(db, 'games', gameId), {
        players: newState.players,
        currentTurn: newState.currentTurn,
        'dice.hasRolled': false,
        'dice.rolledBy': null,
        winner: newState.winner,
        winnerPlayerId: newState.winnerPlayerId,
        status: newState.status,
        moveHistory: newState.moveHistory,
        turnTimer: newState.turnTimer,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error('Move failed:', err);
    }

    setHasRolled(false);
    setSelectedToken(null);
  }, [gameState, gameId, isMyTurn, hasRolled, playerColor, localDiceValue]);

  // Init on mount
  useEffect(() => {
    if (table.player1Id && table.player2Id) {
      initGame();
    }

    return () => {
      unsubRef.current?.();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    gameState,
    gameId,
    isDiceRolling,
    timeLeft,
    selectedToken,
    hasRolled,
    localDiceValue,
    message,
    isConnected,
    isMyTurn,
    myPlayer,
    opponent,
    handleRollDice,
    handleTokenMove,
    setSelectedToken,
    handleSkipTurn,
  };
}
