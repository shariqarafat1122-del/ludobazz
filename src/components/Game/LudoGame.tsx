import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PlayerColor } from '../../types/ludo';
import type { GameTable } from '../../types/lobby';
import { useOnlineGame } from '../../hooks/useOnlineGame';
import { useSound } from '../../hooks/useSound';
import { getMovableTokens } from '../../utils/gameLogic';
import { formatAmount } from '../../utils/roomUtils';
import { COLOR_STYLES } from '../../constants/board';
import LudoBoard from '../Board/LudoBoard';
import Dice from '../Dice/Dice';
import PlayerCard from '../UI/PlayerCard';
import WinnerModal from '../UI/WinnerModal';
import LifeIndicator from '../UI/LifeIndicator';

interface LudoGameProps {
  table: GameTable;
  playerId: string;
  playerColor: PlayerColor;
  onGameEnd: (winnerId: string, prize: number) => void;
  onExit: () => void;
}

export default function LudoGame({
  table,
  playerId,
  playerColor,
  onGameEnd,
  onExit,
}: LudoGameProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { play } = useSound(soundEnabled);

  const {
    gameState,
    isDiceRolling,
    timeLeft,
    selectedToken,
    hasRolled,
    localDiceValue,
    isConnected,
    isMyTurn,
    myPlayer,
    opponent,
    handleRollDice,
    handleTokenMove,
    setSelectedToken,
  } = useOnlineGame({
    table,
    playerId,
    playerColor,
    onGameEnd,
  });

  const movableTokens = useMemo(() => {
    if (!gameState || !myPlayer || !hasRolled) return [];
    return getMovableTokens(myPlayer, localDiceValue);
  }, [gameState, myPlayer, hasRolled, localDiceValue]);

  // Sound effects
  useEffect(() => {
    if (isDiceRolling) play('dice_roll');
  }, [isDiceRolling]);

  const handleTokenClick = useCallback((tokenId: string) => {
    if (!isMyTurn || !hasRolled) return;
    if (!movableTokens.includes(tokenId)) return;
    play('token_move');
    handleTokenMove(tokenId);
  }, [isMyTurn, hasRolled, movableTokens, handleTokenMove, play]);

  const myColors = COLOR_STYLES[playerColor];
  const opponentColor: PlayerColor = playerColor === 'red' ? 'green' : 'red';
  const opponentColors = COLOR_STYLES[opponentColor];

  const gameMessage = !gameState
    ? 'Loading game...'
    : !isConnected
    ? '⚠️ Reconnecting...'
    : gameState.status === 'finished'
    ? gameState.winner === playerColor ? '🏆 You won!' : '😔 You lost'
    : !isMyTurn
    ? `⏳ ${opponent?.name}'s turn...`
    : !hasRolled
    ? '🎲 Roll the dice!'
    : movableTokens.length === 0
    ? '⏭️ No moves! Skipping...'
    : '♟️ Select a token to move';

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0a0a1a, #141432)' }}>
        <div className="text-center">
          <motion.div
            className="text-5xl mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >🎲</motion.div>
          <p className="text-white/60 text-sm">Setting up game...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #060610 0%, #0d1020 50%, #060610 100%)' }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-80 h-80 rounded-full opacity-15"
          style={{
            background: `radial-gradient(circle, ${myColors.primary}, transparent)`,
            top: '5%', left: '5%', filter: 'blur(80px)',
          }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-80 h-80 rounded-full opacity-15"
          style={{
            background: `radial-gradient(circle, ${opponentColors.primary}, transparent)`,
            bottom: '5%', right: '5%', filter: 'blur(80px)',
          }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 6, repeat: Infinity, delay: 3 }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto px-3 py-3 flex flex-col gap-2.5">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-gray-400 text-sm"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            ← Exit
          </button>

          {/* Prize pool */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)' }}
          >
            <span className="text-yellow-400 text-sm">🏆</span>
            <span className="text-yellow-400 font-bold text-sm">
              {formatAmount(gameState.winnerPrize)}
            </span>
          </div>

          {/* Connection & Sound */}
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: isConnected ? '#22c55e' : '#ef4444' }}
            />
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="px-2 py-1.5 rounded-xl text-base"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
          </div>
        </div>

        {/* Opponent card */}
        {opponent && (
          <div
            className="p-3 rounded-2xl flex items-center justify-between"
            style={{
              background: gameState.currentTurn === opponentColor
                ? `rgba(${opponentColors.rgb},0.12)`
                : 'rgba(15,15,35,0.85)',
              border: gameState.currentTurn === opponentColor
                ? `1px solid ${opponentColors.primary}40`
                : '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm"
                style={{ background: `linear-gradient(135deg, ${opponentColors.primary}, ${opponentColors.dark})` }}
              >
                {opponent.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{opponent.name}</p>
                <p className="text-xs" style={{ color: opponentColors.primary }}>
                  {opponentColor === 'red' ? 'Red' : 'Green'} Player
                </p>
              </div>
            </div>
            <LifeIndicator
              lives={opponent.lives}
              timeLeft={gameState.currentTurn === opponentColor ? timeLeft : 10}
              isActive={gameState.currentTurn === opponentColor}
              color={opponentColors.primary}
            />
          </div>
        )}

        {/* Board */}
        <div className="w-full">
          <LudoBoard
            gameState={gameState}
            myColor={playerColor}
            selectedToken={selectedToken}
            onTokenClick={handleTokenClick}
            movableTokens={movableTokens}
          />
        </div>

        {/* My player card */}
        {myPlayer && (
          <div
            className="p-3 rounded-2xl flex items-center justify-between"
            style={{
              background: isMyTurn
                ? `rgba(${myColors.rgb},0.12)`
                : 'rgba(15,15,35,0.85)',
              border: isMyTurn
                ? `1px solid ${myColors.primary}40`
                : '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm"
                style={{ background: `linear-gradient(135deg, ${myColors.primary}, ${myColors.dark})` }}
              >
                {myPlayer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-white font-semibold text-sm">{myPlayer.name}</p>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                    style={{ background: `${myColors.primary}20`, color: myColors.primary }}
                  >
                    You
                  </span>
                </div>
                <p className="text-xs" style={{ color: myColors.primary }}>
                  {playerColor === 'red' ? 'Red' : 'Green'} Player
                </p>
              </div>
            </div>
            <LifeIndicator
              lives={myPlayer.lives}
              timeLeft={isMyTurn ? timeLeft : 10}
              isActive={isMyTurn}
              color={myColors.primary}
            />
          </div>
        )}

        {/* Controls */}
        <div
          className="p-3 rounded-2xl flex items-center gap-4"
          style={{
            background: 'rgba(10,10,25,0.9)',
            border: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Dice */}
          <div className="flex-shrink-0">
            <Dice
              value={localDiceValue}
              isRolling={isDiceRolling}
              canRoll={isMyTurn && !hasRolled && !isDiceRolling && gameState.status === 'playing'}
              onRoll={handleRollDice}
            />
          </div>

          {/* Message + Roll Button */}
          <div className="flex-1 flex flex-col gap-2">
            {/* Game message */}
            <div
              className="px-3 py-2 rounded-xl text-xs font-medium"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: isMyTurn ? 'white' : '#6b7280',
              }}
            >
              {gameMessage}
            </div>

            {/* Roll button */}
            <motion.button
              onClick={handleRollDice}
              disabled={!isMyTurn || hasRolled || isDiceRolling || gameState.status !== 'playing'}
              className="w-full py-3 rounded-xl font-bold text-sm relative overflow-hidden"
              style={{
                background: isMyTurn && !hasRolled && !isDiceRolling && gameState.status === 'playing'
                  ? `linear-gradient(135deg, ${myColors.primary}, ${myColors.dark})`
                  : 'rgba(60,60,80,0.5)',
                color: isMyTurn && !hasRolled ? 'white' : '#6b7280',
                boxShadow: isMyTurn && !hasRolled ? `0 4px 16px ${myColors.primary}40` : 'none',
                cursor: isMyTurn && !hasRolled && !isDiceRolling ? 'pointer' : 'not-allowed',
              }}
              whileHover={isMyTurn && !hasRolled && !isDiceRolling ? { scale: 1.03 } : {}}
              whileTap={isMyTurn && !hasRolled && !isDiceRolling ? { scale: 0.97 } : {}}
              animate={isMyTurn && !hasRolled && !isDiceRolling ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 1.5, repeat: isMyTurn && !hasRolled ? Infinity : 0 }}
            >
              {isMyTurn && !hasRolled && !isDiceRolling && (
                <motion.div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              )}
              <span className="relative z-10">
                {isDiceRolling
                  ? '🎲 Rolling...'
                  : !isMyTurn
                  ? '⏳ Waiting...'
                  : hasRolled
                  ? '♟️ Move a Token'
                  : '🎲 Roll Dice'}
              </span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Winner modal */}
      <WinnerModal
        winner={gameState.winner}
        myColor={playerColor}
        onPlayAgain={onExit}
        winnerPrize={gameState.winnerPrize}
        platformCut={gameState.platformCut}
      />
    </div>
  );
}
