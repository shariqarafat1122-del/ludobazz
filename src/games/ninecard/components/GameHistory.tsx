// src/games/ninecard/components/GameHistory.tsx

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NineCardAction, NineCardActionType } from '../types';

interface GameHistoryProps {
  actions: NineCardAction[];
}

const ACTION_META: Record<
  NineCardActionType,
  { icon: string; color: string; label: string }
> = {
  join:  { icon: '👋', color: 'text-purple-400', label: 'Joined' },
  boot:  { icon: '💵', color: 'text-orange-400', label: 'Boot Paid' },
  call:  { icon: '💰', color: 'text-green-400',  label: 'Called' },
  pack:  { icon: '🃏', color: 'text-red-400',    label: 'Packed' },
  see:   { icon: '👁', color: 'text-blue-400',   label: 'Saw Cards' },
  show:  { icon: '🎯', color: 'text-yellow-400', label: 'Showed' },
};

export const GameHistory: React.FC<GameHistoryProps> = ({ actions }) => {
  const [open, setOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [actions, open]);

  const shown = open ? [...actions].reverse() : [...actions].reverse().slice(0, 3);

  return (
    <div className="bg-gray-900/70 border border-gray-700/60 rounded-xl overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full px-4 py-2.5 flex items-center justify-between
                   hover:bg-gray-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-300 text-sm font-semibold">Action Log</span>
          <span
            className="px-1.5 py-0.5 bg-gray-700 rounded-full
                          text-gray-400 text-[10px] font-bold"
          >
            {actions.length}
          </span>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          className="text-gray-500 text-sm"
        >
          ▼
        </motion.span>
      </button>

      {/* Actions list */}
      <AnimatePresence initial={false}>
        {actions.length > 0 && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div
              className={`px-3 pb-3 space-y-1 ${
                open ? 'max-h-48 overflow-y-auto' : ''
              }`}
            >
              {shown.map((a, idx) => {
                const meta = ACTION_META[a.action] ?? {
                  icon: '•', color: 'text-gray-400', label: a.action,
                };
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="text-base leading-none">{meta.icon}</span>
                    <span className="text-gray-600 text-[10px] shrink-0">
                      {new Date(a.timestamp).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    <span className="text-gray-300 font-medium truncate">
                      {a.name}
                    </span>
                    <span className={`font-bold ${meta.color} shrink-0`}>
                      {meta.label}
                      {a.amount > 0 && ` ₹${a.amount.toLocaleString('en-IN')}`}
                    </span>
                  </motion.div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
