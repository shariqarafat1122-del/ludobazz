import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LeaveModalProps {
  show: boolean;
  pot: number;
  onConfirm: () => void;
  onCancel: () => void;
}

const LeaveModal: React.FC<LeaveModalProps> = memo(({
  show, pot, onConfirm, onCancel,
}) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(14px)',
        }}
      >
        <motion.div
          initial={{ scale: 0.82, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 260 }}
          className="w-full max-w-xs rounded-3xl p-6 text-center"
          style={{
            background: 'linear-gradient(135deg, #1a0a2e, #2d1b4e)',
            border: '1px solid rgba(239,68,68,0.35)',
            boxShadow: '0 24px 60px rgba(239,68,68,0.2)',
          }}
        >
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-black text-white mb-2">
            Leave Game?
          </h2>
          <p className="text-white/55 text-sm leading-relaxed mb-5">
            Your opponent will be declared the winner and receive the
            prize pool.
          </p>

          {pot > 0 && (
            <div
              className="rounded-2xl py-3 px-4 mb-5"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              <p className="text-red-400 font-black text-lg">
                Forfeit ₹{Math.floor(pot * 0.9)}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={onCancel}
              className="flex-1 py-3.5 rounded-2xl font-bold text-white/70"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              Stay
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={onConfirm}
              className="flex-1 py-3.5 rounded-2xl font-black text-white"
              style={{
                background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                boxShadow: '0 4px 18px rgba(239,68,68,0.4)',
              }}
            >
              Leave
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
));

LeaveModal.displayName = 'LeaveModal';
export default LeaveModal;
