import React, { useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface WinModalProps {
  show: boolean;
  won: boolean;
  winnerName: string;
  prize: number;
  entryFee: number;
}

const WinModal: React.FC<WinModalProps> = memo(({
  show, won, winnerName, prize, entryFee,
}) => {
  const navigate = useNavigate();

  // CSS confetti (no external package)
  useEffect(() => {
    if (!show || !won) return;

    const container = document.createElement('div');
    container.id = 'ludo-confetti';
    container.style.cssText = `
      position:fixed;inset:0;pointer-events:none;
      z-index:9998;overflow:hidden;
    `;

    const colors = ['#ef4444','#22c55e','#ffd700','#a855f7','#3b82f6','#f97316'];
    for (let i = 0; i < 80; i++) {
      const p = document.createElement('div');
      const c = colors[Math.floor(Math.random() * colors.length)];
      const s = Math.random() * 10 + 5;
      const isCircle = Math.random() > 0.4;
      p.style.cssText = `
        position:absolute;
        top:-20px;left:${Math.random()*100}%;
        width:${s}px;height:${isCircle ? s : s * 0.4}px;
        background:${c};
        border-radius:${isCircle ? '50%' : '2px'};
        animation:cf_fall ${Math.random()*2+2.5}s ${Math.random()*1.5}s
          cubic-bezier(0.25,0.46,0.45,0.94) forwards;
        transform:rotate(${Math.random()*360}deg);
      `;
      container.appendChild(p);
    }

    const style = document.createElement('style');
    style.textContent = `
      @keyframes cf_fall {
        0%  { transform: translateY(-20px) rotate(0deg); opacity:1; }
        80% { opacity:1; }
        100%{ transform: translateY(105vh) rotate(${Math.random()*720}deg); opacity:0; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(container);

    const timer = setTimeout(() => {
      document.getElementById('ludo-confetti')?.remove();
      style.remove();
    }, 5500);

    return () => {
      clearTimeout(timer);
      document.getElementById('ludo-confetti')?.remove();
    };
  }, [show, won]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: 'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.4, opacity: 0, y: 60 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 14, stiffness: 220 }}
            className="w-full max-w-xs rounded-3xl overflow-hidden"
            style={{
              background: won
                ? 'linear-gradient(160deg, #14532d 0%, #166534 50%, #15803d 100%)'
                : 'linear-gradient(160deg, #1e1b4b 0%, #312e81 100%)',
              border: `2px solid ${won ? 'rgba(34,197,94,0.5)' : 'rgba(99,102,241,0.4)'}`,
              boxShadow: won
                ? '0 30px 80px rgba(34,197,94,0.35), 0 0 0 1px rgba(34,197,94,0.2)'
                : '0 30px 80px rgba(99,102,241,0.25)',
            }}
          >
            {/* Top glow line */}
            <div style={{
              height: 3,
              background: won
                ? 'linear-gradient(90deg, #22c55e, #86efac, #22c55e)'
                : 'linear-gradient(90deg, #6366f1, #a78bfa, #6366f1)',
            }} />

            <div className="p-6 text-center">
              {/* Trophy / Skull */}
              <motion.div
                animate={won
                  ? { rotate: [-8,8,-8], scale:[1,1.1,1] }
                  : { scale:[1,0.95,1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-6xl mb-3"
              >
                {won ? '🏆' : '😔'}
              </motion.div>

              <h1
                className="text-3xl font-black mb-1"
                style={{
                  color: won ? '#86efac' : '#a5b4fc',
                  textShadow: `0 0 40px ${won
                    ? 'rgba(34,197,94,0.6)'
                    : 'rgba(99,102,241,0.6)'}`,
                }}
              >
                {won ? 'YOU WIN! 🎉' : 'YOU LOSE'}
              </h1>

              <p className="text-white/50 text-sm mb-5">
                {won
                  ? 'Amazing game!'
                  : `${winnerName} wins this round`}
              </p>

              {/* Prize card */}
              <div
                className="rounded-2xl p-4 mb-5"
                style={{
                  background: 'rgba(0,0,0,0.35)',
                  border: `1px solid ${won
                    ? 'rgba(251,191,36,0.3)'
                    : 'rgba(239,68,68,0.2)'}`,
                }}
              >
                {won ? (
                  <>
                    <p className="text-white/40 text-xs mb-1">
                      Prize Credited 🎁
                    </p>
                    <p className="text-amber-400 font-black text-4xl">
                      +₹{prize}
                    </p>
                    <p className="text-green-400 text-xs mt-1">
                      ✓ Added to winning balance
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-white/40 text-xs mb-1">Entry Fee</p>
                    <p className="text-red-400 font-black text-3xl">
                      -₹{entryFee}
                    </p>
                    <p className="text-white/30 text-xs mt-1">
                      Try again!
                    </p>
                  </>
                )}
              </div>

              {/* Buttons */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/games/RealLudoLobby')}
                className="w-full py-4 rounded-2xl font-black text-white text-base mb-2.5"
                style={{
                  background: won
                    ? 'linear-gradient(135deg, #22c55e, #15803d)'
                    : 'linear-gradient(135deg, #6366f1, #4338ca)',
                  boxShadow: won
                    ? '0 8px 30px rgba(34,197,94,0.45)'
                    : '0 8px 30px rgba(99,102,241,0.35)',
                }}
              >
                🎲 Play Again
              </motion.button>

              <button
                onClick={() => navigate('/dashboard')}
                className="w-full py-3 rounded-2xl font-semibold text-white/50 text-sm"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                🏠 Go to Lobby
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

WinModal.displayName = 'WinModal';
export default WinModal;
