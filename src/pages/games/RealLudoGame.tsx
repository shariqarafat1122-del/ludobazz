import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { subscribeToTable, subscribeToGame, initGame, updateGameState } from '../../firebase/RealLudo';
import { addWinningAmount } from '../../firebase/wallet';
import { LudoGameState, GameTable, PlayerColor } from '../../types';
import { getMovableTokens, processMove, TURN_DURATION } from '../../utils/RealHelpers';
import { LudoBoard } from '../../components/games/LudoBoard';
import { LudoDice } from '../../components/games/LudoDice';
import { GlassCard } from '../../components/ui/GlassCard';

export default function LudoGame() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { user } = useStore();
  
  const [table, setTable] = useState<GameTable | null>(null);
  const [game, setGame] = useState<LudoGameState | null>(null);
  const [rolling, setRolling] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TURN_DURATION);

  const myColor: PlayerColor | null = useMemo(() => {
    if (!table || !user) return null;
    return table.player1Id === user.uid ? 'red' : 'green';
  }, [table, user]);

  const isMyTurn = game?.currentTurn === myColor;
  const myPlayer = game?.players.find(p => p.color === myColor);
  const opponent = game?.players.find(p => p.color !== myColor);

  // 1. Sync Table & Init Game
  useEffect(() => {
    if (!tableId) return;
    const unsubTable = subscribeToTable(tableId, async (t) => {
      if (t) {
        setTable(t);
        if (t.status === 'playing' && !game) {
          const gId = await initGame(t);
        }
      }
    });
    return () => unsubTable();
  }, [tableId]);

  // 2. Sync Game State
  useEffect(() => {
    if (!tableId) return;
    const gId = `game_${tableId}`;
    const unsubGame = subscribeToGame(gId, (g) => {
      if (g) setGame(g);
    });
    return () => unsubGame();
  }, [tableId]);

  // 3. 10-Second Timer & Lives Logic
  useEffect(() => {
    if (!game || game.status === 'finished') return;
    
    const interval = setInterval(() => {
      const elapsed = (Date.now() - game.turnStartTime) / 1000;
      const remaining = Math.max(0, TURN_DURATION - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0 && isMyTurn && !game.hasRolled) {
        handleTimeExpired();
      }
    }, 200);
    return () => clearInterval(interval);
  }, [game?.turnStartTime, isMyTurn, game?.hasRolled]);

  const handleTimeExpired = async () => {
    if (!game || !myPlayer || !tableId) return;
    const gId = `game_${tableId}`;
    const newLives = myPlayer.lives - 1;

    if (newLives <= 0) {
      // Lost all lives -> Opponent wins
      await updateGameState(gId, {
        status: 'finished',
        winnerId: opponent?.id || null,
        players: game.players.map(p => p.color === myColor ? { ...p, lives: 0 } : p)
      });
    } else {
      // Lose 1 life, skip turn
      const nextTurn = myColor === 'red' ? 'green' : 'red';
      await updateGameState(gId, {
        currentTurn: nextTurn,
        hasRolled: false,
        turnStartTime: Date.now(),
        players: game.players.map(p => p.color === myColor ? { ...p, lives: newLives } : p)
      });
    }
  };

  // 4. Handle Dice Roll
  const handleRoll = async () => {
    if (!isMyTurn || rolling || game?.hasRolled || !game || !tableId) return;
    setRolling(true);
    await new Promise(r => setTimeout(r, 1000)); // Animation time
    const val = Math.floor(Math.random() * 6) + 1;
    await updateGameState(`game_${tableId}`, { diceValue: val, hasRolled: true });
    setRolling(false);

    // Auto skip if no moves
    const movable = getMovableTokens(myPlayer!, val);
    if (movable.length === 0) {
      setTimeout(async () => {
        const nextTurn = myColor === 'red' ? 'green' : 'red';
        await updateGameState(`game_${tableId}`, { currentTurn: nextTurn, hasRolled: false, turnStartTime: Date.now() });
      }, 1500);
    }
  };

  // 5. Handle Token Move
  const handleMove = async (tokenId: string) => {
    if (!isMyTurn || !game?.hasRolled || !game || !tableId || !user) return;
    const newState = processMove(game, user.uid, tokenId, game.diceValue);
    await updateGameState(`game_${tableId}`, newState);
  };

  // 6. Handle Game End & Wallet Payout
  useEffect(() => {
    if (game?.status === 'finished' && game.winnerId === user?.uid && table) {
      addWinningAmount(user.uid, table.winnerPrize);
    }
  }, [game?.status]);

  if (!table || !game || !myColor) return <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center text-white">Loading Game...</div>;

  const timerPercent = (timeLeft / TURN_DURATION) * 100;

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white flex flex-col max-w-md mx-auto p-2">
      
      {/* Top: Opponent Info */}
      <GlassCard className="p-3 mb-2 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center font-bold">{opponent?.name[0]}</div>
          <div>
            <p className="text-sm font-bold">{opponent?.name}</p>
            <div className="flex gap-1">{Array.from({length: 3}).map((_, i) => <span key={i} className={`text-xs ${i < (opponent?.lives || 0) ? 'text-red-500' : 'text-gray-700'}`}>❤️</span>)}</div>
          </div>
        </div>
        {game.currentTurn !== myColor && (
          <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div className="h-full bg-red-500" initial={{ width: '100%' }} animate={{ width: `${timerPercent}%` }} transition={{ duration: 0.2 }} />
          </div>
        )}
      </GlassCard>

      {/* Center: Ludo Board */}
      <div className="flex-1 flex items-center justify-center">
        <LudoBoard 
          gameState={game} 
          myColor={myColor} 
          onTokenClick={handleMove} 
          movableTokens={game.hasRolled && isMyTurn ? getMovableTokens(myPlayer!, game.diceValue) : []} 
        />
      </div>

      {/* Bottom: My Info & Controls */}
      <GlassCard className="p-3 mt-2 space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold">{myPlayer?.name[0]}</div>
            <div>
              <p className="text-sm font-bold">{myPlayer?.name} (You)</p>
              <div className="flex gap-1">{Array.from({length: 3}).map((_, i) => <span key={i} className={`text-xs ${i < (myPlayer?.lives || 0) ? 'text-red-500' : 'text-gray-700'}`}>❤️</span>)}</div>
            </div>
          </div>
          <div className="text-yellow-400 font-bold text-sm">Prize: ₹{table.winnerPrize}</div>
        </div>

        {isMyTurn && (
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div className={`h-full ${timeLeft <= 3 ? 'bg-red-600' : 'bg-green-500'}`} initial={{ width: '100%' }} animate={{ width: `${timerPercent}%` }} transition={{ duration: 0.2 }} />
          </div>
        )}

        <div className="flex items-center justify-center gap-6">
          <LudoDice value={game.diceValue} rolling={rolling} onClick={handleRoll} disabled={!isMyTurn || game.hasRolled} />
          <p className="text-sm text-gray-400">
            {!isMyTurn ? "Opponent's Turn..." : game.hasRolled ? `Rolled ${game.diceValue}! Move Token` : 'Tap Dice to Roll'}
          </p>
        </div>
      </GlassCard>

      {/* Game Over Modal */}
      {game.status === 'finished' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <GlassCard className="w-full p-6 text-center space-y-4">
            <h2 className="text-3xl font-black text-yellow-400">{game.winnerId === user?.uid ? '🏆 YOU WON!' : '😔 YOU LOST'}</h2>
            <p className="text-xl font-bold text-green-400">{game.winnerId === user?.uid ? `+₹${table.winnerPrize}` : 'Better luck next time'}</p>
            <button onClick={() => navigate('/games/ludo')} className="w-full bg-blue-600 py-3 rounded-xl font-bold">Back to Lobby</button>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
