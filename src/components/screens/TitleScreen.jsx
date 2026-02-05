import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameActions } from '../../hooks/useGameActions.js';
import HowToPlay from '../ui/HowToPlay.jsx';

export default function TitleScreen() {
  const { startGame } = useGameActions();
  const [showRules, setShowRules] = useState(false);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0a0a0f] relative overflow-hidden">
      {/* Background anti-possession symbol watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
        <div className="text-[400px] text-amber-500">⛤</div>
      </div>

      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-600/5 rounded-full blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="relative z-10 text-center"
      >
        {/* Title */}
        <h1
          className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-amber-500 to-amber-800 mb-2 tracking-wider"
          style={{ fontFamily: 'Cinzel, serif', textShadow: '0 0 60px rgba(212, 160, 74, 0.3)' }}
        >
          SUPERNATURAL
        </h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xl text-amber-600/80 mb-12 tracking-widest"
          style={{ fontFamily: 'Crimson Text, serif' }}
        >
          The Card Game
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex gap-4">
            <motion.button
              onClick={() => startGame('ai')}
              className="px-8 py-4 bg-gradient-to-b from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-amber-100 font-bold text-lg rounded-lg border border-amber-600/50 shadow-xl shadow-amber-900/40 transition-all"
              style={{ fontFamily: 'Cinzel, serif' }}
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(212, 160, 74, 0.3)' }}
              whileTap={{ scale: 0.95 }}
            >
              1 Player
            </motion.button>

            <motion.button
              onClick={() => startGame('pvp')}
              className="px-8 py-4 bg-gradient-to-b from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-amber-100 font-bold text-lg rounded-lg border border-amber-600/50 shadow-xl shadow-amber-900/40 transition-all"
              style={{ fontFamily: 'Cinzel, serif' }}
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(212, 160, 74, 0.3)' }}
              whileTap={{ scale: 0.95 }}
            >
              2 Players
            </motion.button>
          </div>

          <motion.button
            onClick={() => setShowRules(true)}
            className="px-6 py-2 text-amber-400/70 hover:text-amber-300 text-sm transition-colors"
            style={{ fontFamily: 'Cinzel, serif' }}
            whileHover={{ scale: 1.05 }}
          >
            How to Play
          </motion.button>
        </motion.div>

        {/* Deck info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-12 flex gap-8 text-center"
        >
          <div className="text-gray-500">
            <div className="text-sm font-bold text-amber-200/50" style={{ fontFamily: 'Cinzel, serif' }}>Player 1</div>
            <div className="text-xs">Team Free Will</div>
          </div>
          <div className="text-gray-600 self-center">vs</div>
          <div className="text-gray-500">
            <div className="text-sm font-bold text-red-300/50" style={{ fontFamily: 'Cinzel, serif' }}>Player 2</div>
            <div className="text-xs">Hell&apos;s Army</div>
          </div>
        </motion.div>
      </motion.div>

      {/* Rules modal */}
      <AnimatePresence>
        {showRules && <HowToPlay onClose={() => setShowRules(false)} />}
      </AnimatePresence>
    </div>
  );
}
