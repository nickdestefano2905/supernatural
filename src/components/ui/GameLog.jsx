import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState } from '../../game/GameContext.jsx';

export default function GameLog() {
  const state = useGameState();
  const [isOpen, setIsOpen] = useState(false);
  const logEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.log.length, isOpen]);

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#12121a] border border-amber-800/40 rounded-l-lg px-2 py-4 text-amber-400 hover:text-amber-300 transition-colors text-xs"
        style={{ right: isOpen ? '280px' : '0' }}
      >
        {isOpen ? '▶' : '◀'} Log
      </button>

      {/* Log panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 280 }}
            animate={{ x: 0 }}
            exit={{ x: 280 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-[280px] h-[400px] bg-[#0e0e16]/95 border-l border-amber-800/30 overflow-hidden flex flex-col"
          >
            <div className="px-3 py-2 border-b border-amber-800/30 text-amber-200 text-xs font-bold" style={{ fontFamily: 'Cinzel, serif' }}>
              Game Log
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
              {state.log.map((entry, i) => (
                <div
                  key={i}
                  className={`text-[10px] leading-relaxed ${
                    entry.message.startsWith('---') ? 'text-amber-400 font-bold mt-2 border-t border-amber-800/20 pt-1' : 'text-gray-400'
                  }`}
                >
                  {entry.message}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
