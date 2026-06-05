import type { GameState, Player, PlayerColor, Token } from '../types/ludo';
import { SAFE_POSITIONS, START_POSITIONS, HOME_POSITION } from '../constants/board';

export const PLAYER_COLORS: PlayerColor[] = ['red', 'green'];
export const MAX_LIVES = 3;
export const TURN_DURATION = 10; // seconds

export function createTokens(color: PlayerColor): Token[] {
  return Array.from({ length: 4 }, (_, i) => ({
    id: `${color}-${i}`,
    color,
    position: -1,
    state: 'home' as const,
    tokenIndex: i,
  }));
}

export function getMovableTokens(player: Player, diceValue: number): string[] {
  const movable: string[] = [];
  for (const token of player.tokens) {
    if (token.state === 'finished') continue;
    if (token.state === 'home') {
      if (diceValue === 6) movable.push(token.id);
    } else {
      const newPos = getNewPosition(token, diceValue, player.color);
      if (newPos !== null) movable.push(token.id);
    }
  }
  return movable;
}

export function getNewPosition(token: Token, diceValue: number, color: PlayerColor): number | null {
  if (token.state === 'home') {
    return diceValue === 6 ? START_POSITIONS[color] : null;
  }
  if (token.state === 'finished') return null;

  const startPos = START_POSITIONS[color];
  let relativePos: number;

  if (token.position >= 52) {
    relativePos = token.position;
  } else {
    relativePos = (token.position - startPos + 52) % 52;
  }

  const newRelativePos = relativePos + diceValue;
  if (newRelativePos > HOME_POSITION) return null;
  if (newRelativePos === HOME_POSITION) return HOME_POSITION;

  if (relativePos < 52 && newRelativePos >= 52) {
    return newRelativePos;
  }

  return (startPos + newRelativePos) % 52;
}

export function isSafePosition(position: number, color: PlayerColor): boolean {
  if (position >= 52) return true;
  if (SAFE_POSITIONS.includes(position)) return true;
  if (position === START_POSITIONS[color]) return true;
  return false;
}

export function checkCapture(
  movingToken: Token,
  newPosition: number,
  allPlayers: Player[],
  movingColor: PlayerColor
): Token | null {
  if (newPosition < 0 || newPosition >= 52) return null;
  if (isSafePosition(newPosition, movingColor)) return null;

  for (const player of allPlayers) {
    if (player.color === movingColor) continue;
    for (const token of player.tokens) {
      if (token.state === 'active' && token.position === newPosition) {
        return token;
      }
    }
  }
  return null;
}

export function moveToken(
  gameState: GameState,
  playerId: string,
  tokenId: string,
  diceValue: number
): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(gameState));
  const playerIndex = newState.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return gameState;

  const player = newState.players[playerIndex];
  const tokenIndex = player.tokens.findIndex(t => t.id === tokenId);
  if (tokenIndex === -1) return gameState;

  const token = player.tokens[tokenIndex];
  const oldPosition = token.position;
  let captured: string | undefined;

  if (token.state === 'home' && diceValue === 6) {
    token.position = START_POSITIONS[player.color];
    token.state = 'active';
  } else {
    const newPos = getNewPosition(token, diceValue, player.color);
    if (newPos === null) return gameState;

    const capturedToken = checkCapture(token, newPos, newState.players, player.color);
    if (capturedToken) {
      for (const p of newState.players) {
        const ct = p.tokens.find(t => t.id === capturedToken.id);
        if (ct) {
          ct.position = -1;
          ct.state = 'home';
          captured = capturedToken.id;
          break;
        }
      }
    }

    token.position = newPos;
    if (newPos === HOME_POSITION) {
      token.state = 'finished';
      player.finishedTokens += 1;
    }
  }

  newState.moveHistory.push({
    player: player.color,
    tokenId,
    from: oldPosition,
    to: token.position,
    diceValue,
    timestamp: Date.now(),
    captured,
  });

  // Check winner
  if (player.finishedTokens === 4) {
    newState.winner = player.color;
    newState.winnerPlayerId = player.id;
    newState.status = 'finished';
  }

  // Next turn
  const extraTurn = diceValue === 6;
  if (!extraTurn && newState.status === 'playing') {
    const currentIndex = PLAYER_COLORS.indexOf(player.color);
    const nextColor = PLAYER_COLORS[(currentIndex + 1) % PLAYER_COLORS.length];
    newState.currentTurn = nextColor;
    newState.turnTimer = {
      startTime: Date.now(),
      duration: TURN_DURATION,
      currentTurn: nextColor,
    };
  } else {
    newState.turnTimer = {
      startTime: Date.now(),
      duration: TURN_DURATION,
      currentTurn: player.color,
    };
  }

  newState.dice = { value: diceValue, isRolling: false, hasRolled: false, rolledBy: null };
  newState.updatedAt = Date.now();
  player.lastRollTime = Date.now();

  return newState;
}

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function canPlayerMove(player: Player, diceValue: number): boolean {
  return getMovableTokens(player, diceValue).length > 0;
}
