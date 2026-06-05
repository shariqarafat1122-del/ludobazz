import React from 'react';
import { motion } from 'framer-motion';

interface Props { value: number; rolling: boolean; onClick: () => void; disabled: boolean; }

const dots: Record<number, [number, number][]> = {
  1: [[50,50]], 2: [[25,25],[75,75]], 3: [[25,25],[50,50],[75,75]],
  4: [[25,25],[75,25],[25,75],[75,75]], 5: [[25,25],[75,25],[50,50],[25,75],[75,75]],
  6: [[25,20],[75,20],[25,50],[75,50],[25,80],[75,80]]
};

export default function LudoDice({ value, rolling, onClick, disabled }: Props) {
  return (
    <motion.div 
      onClick={disabled ? undefined : onClick}
      animate={rolling ? { rotateX: [0, 360, 720], rotateY: [0, 360, 720], scale: [1, 1.2, 1] } : { scale: disabled ? 0.9 : 1 }}
      transition={{ duration: 1 }}
      className={`w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center cursor-pointer ${disabled ? 'opacity-50' : 'hover:scale-105 active:scale-95'}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <svg viewBox="0 0 100 100" className="w-12 h-12">
        {dots[value]?.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="8" fill="#111" />
        ))}
      </svg>
    </motion.div>
  );
}
