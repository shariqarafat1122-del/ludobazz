import React from 'react';
import { motion } from 'framer-motion';
import { PlayerColor } from '../../types';

const colors = { red: '#ef4444', green: '#22c55e' };

export default function LudoToken({ color, movable, onClick }: { color: PlayerColor, movable: boolean, onClick: () => void }) {
  return (
    <motion.div 
      onClick={onClick}
      className="w-6 h-6 rounded-full border-2 border-white shadow-md cursor-pointer flex items-center justify-center"
      style={{ background: colors[color] }}
      animate={movable ? { scale: [1, 1.2, 1], boxShadow: ['0 0 0px rgba(255,255,255,0)', '0 0 15px rgba(255,255,255,0.8)', '0 0 0px rgba(255,255,255,0)'] } : {}}
      transition={{ duration: 0.8, repeat: Infinity }}
      whileTap={{ scale: 0.9 }}
    >
      <div className="w-2 h-2 rounded-full bg-white/40" />
    </motion.div>
  );
}
