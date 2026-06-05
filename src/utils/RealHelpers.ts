import { LudoToken, PlayerColor, LudoPlayer, LudoGameState } from '../types';

export const PLATFORM_CUT_PERCENT = 10;
export const MAX_LIVES = 3;
export const TURN_DURATION = 10; // 10 seconds

export const START_POSITIONS: Record<PlayerColor, number> = { red: 0, green: 13 };
export const SAFE_POSITIONS = [0, 8, 13, 21, 26, 34, 39, 47];
export const HOME_POSITION = 57;

export const AMOUNT_OPTIONS = [10, 50, 100, 500, 1000];

export function calculatePrize(entry: number) {
  const pool = entry * 2;
  const cut = Math.floor(pool * (PLATFORM_CUT_PERCENT / 100));
  return { totalPool: pool, platformCut: cut, winnerPrize: pool - cut };
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function createInitialTokens(color: PlayerColor): LudoToken[] {
  return Array.from({ length: 4 }, (_, i) => ({
    id: `${color}-${i}`, color, position: -1, state: 'home' as const, index: i
  }));
}

export function getMovableTokens(player: LudoPlayer, dice: number): string[] {
  return player.tokens.filter(t => {
    if (t.state === 'finished') return false;
    if (t.state === 'home') return dice === 6;
    const newPos = getNewPosition(t, dice, player.color);
    return newPos !== null;
  }).map(t => t.id);
}

export function getNewPosition(token: LudoToken, dice: number, color: PlayerColor): number | null {
  if (token.state === 'home') return dice === 6 ? START_POSITIONS[color] : null;
  if (token.state === 'finished') return null;

  const start = START_POSITIONS[color];
  let rel = token.position >= 52 ? token.position : (token.position - start + 52) % 52;
  const newRel = rel + dice;

  if (newRel > HOME_POSITION) return null;
  if (newRel === HOME_POSITION) return HOME_POSITION;
  if (rel < 52 && newRel >= 52) return newRel;
  return (start + newRel) % 52;
}

export function checkCapture(movingToken: LudoToken, newPos: number, players: LudoPlayer[], myColor: PlayerColor): LudoToken | null {
  if (newPos < 0 || newPos >= 52) return null;
  if (SAFE_POSITIONS.includes(newPos) || newPos === START_POSITIONS[myColor]) return null;

  for (const p of players) {
    if (p.color === myColor) continue;
    const target = p.tokens.find(t => t.state === 'active' && t.position === newPos);
    if (target) return target;
  }
  return null;
}

export function processMove(state: LudoGameState, playerId: string, tokenId: string, dice: number): LudoGameState {
  const newState = JSON.parse(JSON.stringify(state)) as LudoGameState;
  const player = newState.players.find(p => p.id === playerId)!;
  const token = player.tokens.find(t => t.id === tokenId)!;

  if (token.state === 'home' && dice === 6) {
    token.position = START_POSITIONS[player.color];
    token.state = 'active';
  } else {
    const newPos = getNewPosition(token, dice, player.color)!;
    const captured = checkCapture(token, newPos, newState.players, player.color);
    
    if (captured) {
      const opp = newState.players.find(p => p.color !== player.color)!;
      const ct = opp.tokens.find(t => t.id === captured.id)!;
      ct.position = -1; ct.state = 'home';
    }

    token.position = newPos;
    if (newPos === HOME_POSITION) { token.state = 'finished'; player.finishedTokens++; }
  }

  if (player.finishedTokens === 4) {
    newState.status = 'finished';
    newState.winnerId = player.id;
  } else {
    const extraTurn = dice === 6;
    if (!extraTurn) {
      newState.currentTurn = player.color === 'red' ? 'green' : 'red';
    }
    newState.turnStartTime = Date.now();
  }

  newState.hasRolled = false;
  newState.diceValue = dice;
  newState.lastMoveTime = Date.now();
  return newState;
}
