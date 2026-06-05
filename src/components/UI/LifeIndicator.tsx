import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LifeIndicatorProps {
  lives: number;
  maxLives?: number;
  color?: string;
  timeLeft?: number;
  isActive?: boolean;
}

const LifeIndicator = memo(function LifeIndicator({
  lives,
  maxLives = 3,
  color = '#ef4444',
  timeLeft = 10,
  isActive = false,
}: LifeIndicatorProps) {
  const timerPercent = (timeLeft / 10) * 100;
  const isUrgent = timeLeft <= 3 && isActive;

  return (
    <div className="flex flex-col gap-1.5">
      {/* Lives */}
      <div className="flex items-center gap-1">
        {Array.from({ length: maxLives }, (_, i) => (
          <motion.div
            key={i}
            className="relative"
            animate={i >= lives ? { scale: [1, 0.8, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <AnimatePresence>
              {i < lives ? (
                <motion.span
                  className="text-base"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  ❤️
                </motion.span>
              ) : (
                <motion.span
                  className="text-base opacity-30"
                  initial={{ scale: 1 }}
                  animate={{ scale: 1 }}
                >
                  🖤
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
        <span className="text-xs text-gray-500 ml-1">{lives}/{maxLives}</span>
      </div>

      {/* Timer bar */}
      {isActive && (
        <div className="w-full">
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: isUrgent
                  ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                  : timerPercent > 50
                  ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                  : 'linear-gradient(90deg, #eab308, #ca8a04)',
                width: `${timerPercent}%`,
              }}
              animate={isUrgent ? {
                boxShadow: ['0 0 8px #ef4444', '0 0 16px #ef4444', '0 0 8px #ef4444'],
              } : {}}
              transition={{ duration: 0.5, repeat: isUrgent ? Infinity : 0 }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-xs" style={{ color: isUrgent ? '#ef4444' : '#6b7280' }}>
              {isUrgent && '⚠️ '}{Math.ceil(timeLeft)}s
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

export default LifeIndicator;
