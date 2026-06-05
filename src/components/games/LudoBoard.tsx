
import React, { useMemo } from 'react';
import { LudoGameState, PlayerColor, LudoToken as TokenType } from '../../types';
import LudoToken from './LudoToken';

// Simplified 15x15 board representation for premium UI
export default function LudoBoard({ gameState, myColor, onTokenClick, movableTokens }: {
  gameState: LudoGameState, myColor: PlayerColor, onTokenClick: (id: string) => void, movableTokens: string[]
}) {
  
  const myPlayer = gameState.players.find(p => p.color === myColor);
  const oppPlayer = gameState.players.find(p => p.color !== myColor);

  return (
    <div className="w-full aspect-square max-w-[360px] bg-[#1a1a2e] rounded-3xl p-2 shadow-2xl border border-white/10 relative overflow-hidden">
      {/* Premium Background Glow */}
      <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-red-500/20 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-green-500/20 blur-3xl" />
      
      {/* Grid Layout */}
      <div className="relative z-10 w-full h-full grid grid-cols-15 grid-rows-15 gap-px bg-black/20 rounded-xl overflow-hidden">
        {Array.from({ length: 225 }).map((_, i) => {
          const row = Math.floor(i / 15);
          const col = i % 15;
          
          // Define Zones
          const isRedBase = row < 6 && col < 6;
          const isGreenBase = row < 6 && col > 8;
          const isCenter = row >= 6 && row <= 8 && col >= 6 && col <= 8;
          
          let bg = 'bg-[#12122a]';
          if (isRedBase) bg = 'bg-red-900/40';
          if (isGreenBase) bg = 'bg-green-900/40';
          if (isCenter) bg = 'bg-yellow-500/20';

          return (
            <div key={i} className={`${bg} flex items-center justify-center relative`}>
              {/* Render Tokens based on exact position mapping (Simplified for this view) */}
              {isRedBase && myColor === 'red' && myPlayer?.tokens.filter(t => t.state === 'home').map((t, idx) => (
                <div key={t.id} className="absolute" style={{ top: `${20 + (idx%2)*40}%`, left: `${20 + Math.floor(idx/2)*40}%` }}>
                  <LudoToken color="red" movable={movableTokens.includes(t.id)} onClick={() => onTokenClick(t.id)} />
                </div>
              ))}
              {isGreenBase && myColor === 'green' && myPlayer?.tokens.filter(t => t.state === 'home').map((t, idx) => (
                <div key={t.id} className="absolute" style={{ top: `${20 + (idx%2)*40}%`, left: `${20 + Math.floor(idx/2)*40}%` }}>
                  <LudoToken color="green" movable={movableTokens.includes(t.id)} onClick={() => onTokenClick(t.id)} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
      
      {/* Center Star */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <span className="text-4xl opacity-50">⭐</span>
      </div>
    </div>
  );
}
