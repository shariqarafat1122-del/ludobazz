import React, { useState, useCallback, lazy, Suspense } from 'react';
import type { PlayerColor } from './types/ludo';
import type { GameTable } from './types/lobby';

const LobbyPage = lazy(() => import('./components/Lobby/LobbyPage'));
const LudoGame = lazy(() => import('./components/Game/LudoGame'));

// =============================================
// IMPORTANT: Connect your wallet.ts here
// =============================================
// Import your existing wallet functions
// import { useWallet } from './wallet';

type AppView = 'lobby' | 'game';

interface GameSession {
  table: GameTable;
  playerColor: PlayerColor;
}

function LoadingScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #060610, #0d1020)' }}
    >
      <div className="text-center">
        <motion_div_placeholder />
        <div className="text-5xl mb-4">🎲</div>
        <div className="text-white/50 text-sm font-medium tracking-widest">
          LUDO PRO
        </div>
      </div>
    </div>
  );
}

// Temporary wallet simulation - REPLACE with your wallet.ts
function useWalletTemp() {
  const [balance, setBalance] = useState(1000); // ₹1000 default

  const deductBalance = async (amount: number): Promise<boolean> => {
    if (balance < amount) return false;
    setBalance(prev => prev - amount);
    return true;
  };

  const addBalance = async (amount: number): Promise<void> => {
    setBalance(prev => prev + amount);
  };

  return { balance, deductBalance, addBalance };
}

function getPlayerId(): string {
  let id = localStorage.getItem('ludo_pid');
  if (!id) {
    id = `p_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    localStorage.setItem('ludo_pid', id);
  }
  return id;
}

function getPlayerName(): string {
  return localStorage.getItem('ludo_name') || `Player_${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
}

export default function App() {
  const [view, setView] = useState<AppView>('lobby');
  const [gameSession, setGameSession] = useState<GameSession | null>(null);

  const playerId = getPlayerId();
  const playerName = getPlayerName();

  // ⚠️ REPLACE THIS with your actual wallet from wallet.ts
  const { balance, deductBalance, addBalance } = useWalletTemp();

  const handleStartGame = useCallback((table: GameTable, playerColor: PlayerColor) => {
    setGameSession({ table, playerColor });
    setView('game');
  }, []);

  const handleGameEnd = useCallback(async (winnerId: string, prize: number) => {
    // If this player won, add prize to wallet
    if (winnerId === playerId) {
      await addBalance(prize);
    }
    // Go back to lobby after delay
    setTimeout(() => {
      setView('lobby');
      setGameSession(null);
    }, 3000);
  }, [playerId, addBalance]);

  const handleExit = useCallback(() => {
    setView('lobby');
    setGameSession(null);
  }, []);

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"
      style={{ background: '#060610' }}>
      <div className="text-4xl animate-spin">🎲</div>
    </div>}>
      {view === 'lobby' ? (
        <LobbyPage
          playerId={playerId}
          playerName={playerName}
          walletBalance={balance}
          onDeductBalance={deductBalance}
          onAddBalance={addBalance}
          onStartGame={handleStartGame}
        />
      ) : gameSession ? (
        <LudoGame
          table={gameSession.table}
          playerId={playerId}
          playerColor={gameSession.playerColor}
          onGameEnd={handleGameEnd}
          onExit={handleExit}
        />
      ) : null}
    </Suspense>
  );
}
