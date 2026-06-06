import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import { calculateUsableBalance } from '../../../utils/helpers';
import { Wallet as WalletType } from '../../../types';

interface TopHeaderProps {
  gameId: string;
  wallet: WalletType | null;
  playerName: string;
  isOnline: boolean;
  soundOn: boolean;
  onSoundToggle: () => void;
  prize: number;
}

const TopHeader: React.FC<TopHeaderProps> = memo(({
  gameId, wallet, playerName, isOnline, soundOn, onSoundToggle, prize,
}) => {
  const balance = wallet ? calculateUsableBalance(wallet) : 0;

  return (
    <div
      className="flex items-center justify-between px-3 py-2 flex-shrink-0"
      style={{
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Left: Balance */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
        style={{
          background: 'rgba(34,197,94,0.12)',
          border: '1px solid rgba(34,197,94,0.2)',
        }}
      >
        <Wallet size={12} className="text-green-400" />
        <div>
          <p className="text-green-400 font-black text-xs leading-none">
            ₹{balance.toFixed(0)}
          </p>
          <p className="text-green-400/50 text-[9px] leading-none mt-0.5">
            Balance
          </p>
        </div>
      </div>

      {/* Center: Player + Match ID */}
      <div className="text-center flex-1 px-2">
        <div className="flex items-center justify-center gap-1.5">
          {isOnline ? (
            <Wifi size={10} className="text-green-400" />
          ) : (
            <WifiOff size={10} className="text-red-400" />
          )}
          <p className="text-white font-bold text-xs truncate max-w-[100px]">
            {playerName}
          </p>
        </div>
        <p className="text-slate-600 text-[9px] font-mono mt-0.5">
          #{gameId.slice(0, 8).toUpperCase()}
        </p>
      </div>

      {/* Right: Prize + Sound */}
      <div className="flex items-center gap-2">
        {prize > 0 && (
          <div
            className="px-2.5 py-1.5 rounded-xl"
            style={{
              background: 'rgba(251,191,36,0.12)',
              border: '1px solid rgba(251,191,36,0.2)',
            }}
          >
            <p className="text-amber-400 font-black text-xs leading-none">
              ₹{prize}
            </p>
            <p className="text-amber-400/50 text-[9px] leading-none mt-0.5">
              Prize
            </p>
          </div>
        )}
        <button
          onClick={onSoundToggle}
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {soundOn
            ? <Volume2 size={14} className="text-white/60" />
            : <VolumeX size={14} className="text-white/30" />}
        </button>
      </div>
    </div>
  );
});

TopHeader.displayName = 'TopHeader';
export default TopHeader;
