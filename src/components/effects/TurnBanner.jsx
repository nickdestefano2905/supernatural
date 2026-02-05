import { motion } from 'framer-motion';
import { useGameState } from '../../game/GameContext.jsx';

export default function TurnBanner({ playerId }) {
  const state = useGameState();
  const playerName = state.players[playerId]?.name;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
    >
      <div className="bg-[#0a0a0f]/90 border-y-2 border-amber-600/60 px-16 py-6 text-center">
        <div className="text-3xl font-bold text-amber-200" style={{ fontFamily: 'Cinzel, serif' }}>
          {playerName}&apos;s Turn
        </div>
      </div>
    </motion.div>
  );
}
