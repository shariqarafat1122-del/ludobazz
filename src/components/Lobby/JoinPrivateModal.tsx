import React, { useState, useRef, memo } from 'react';
import { motion } from 'framer-motion';

interface JoinPrivateModalProps {
  onClose: () => void;
  onJoin: (code: string) => void;
  isLoading: boolean;
  error: string | null;
}

const JoinPrivateModal = memo(function JoinPrivateModal({
  onClose,
  onJoin,
  isLoading,
  error,
}: JoinPrivateModalProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleInput = (index: number, value: string) => {
    const char = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = char;
    setCode(newCode);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const fullCode = code.join('');
  const isComplete = fullCode.length === 6;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
        onClick={onClose}
      />

      <motion.div
        className="relative z-10 w-full max-w-xs mx-4"
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0f0f23, #1a1a3e)',
            border: '1px solid rgba(59,130,246,0.3)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(59,130,246,0.1)',
          }}
        >
          {/* Header */}
          <div
            className="px-5 pt-5 pb-4 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.15), transparent)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl text-gray-400"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >✕</button>
            <div className="text-3xl mb-2">🔑</div>
            <h2 className="text-white font-black text-lg">Join Private Table</h2>
            <p className="text-gray-400 text-xs mt-1">Enter the 6-digit room code</p>
          </div>

          <div className="p-5">
            {/* Code input */}
            <div className="flex gap-2 justify-center mb-5">
              {code.map((char, i) => (
                <motion.input
                  key={i}
                  ref={el => inputRefs.current[i] = el}
                  type="text"
                  maxLength={1}
                  value={char}
                  onChange={e => handleInput(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className="w-11 h-14 text-center text-lg font-black rounded-xl outline-none"
                  style={{
                    background: char
                      ? 'rgba(59,130,246,0.2)'
                      : 'rgba(255,255,255,0.06)',
                    border: char
                      ? '1px solid rgba(59,130,246,0.6)'
                      : '1px solid rgba(255,255,255,0.1)',
                    color: char ? '#93c5fd' : '#4b5563',
                    caretColor: '#3b82f6',
                  }}
                  animate={char ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                  transition={{ duration: 0.2 }}
                />
              ))}
            </div>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-xs text-center mb-3"
              >
                ⚠️ {error}
              </motion.p>
            )}

            {/* Join button */}
            <motion.button
              onClick={() => isComplete && onJoin(fullCode)}
              disabled={!isComplete || isLoading}
              className="w-full py-4 rounded-2xl font-black text-sm"
              style={{
                background: isComplete
                  ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                  : 'rgba(100,100,100,0.2)',
                color: isComplete ? 'white' : '#6b7280',
                boxShadow: isComplete ? '0 4px 20px rgba(59,130,246,0.4)' : 'none',
                cursor: !isComplete || isLoading ? 'not-allowed' : 'pointer',
              }}
              whileHover={isComplete ? { scale: 1.02 } : {}}
              whileTap={isComplete ? { scale: 0.98 } : {}}
            >
              {isLoading ? '⏳ Joining...' : `🎮 Join Table`}
            </motion.button>

            {/* Paste option */}
            <motion.button
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
                  if (cleaned.length === 6) {
                    setCode(cleaned.split(''));
                  }
                } catch (_) { /* ignore */ }
              }}
              className="w-full mt-2 py-2.5 rounded-xl text-gray-500 text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              whileTap={{ scale: 0.98 }}
            >
              📋 Paste Code
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

export default JoinPrivateModal;
