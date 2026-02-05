import { motion } from 'framer-motion';
import { useGameState } from '../../game/GameContext.jsx';
import { useGameActions } from '../../hooks/useGameActions.js';

const winMessages = [
  'The hunt is over.',
  'Victory from the darkness.',
  'Evil has been vanquished.',
  'The battle is won.',
];

const loseMessages = [
  'The darkness prevails.',
  'Another soul claimed.',
  'Even hunters fall.',
  'The End is nigh.',
];

export default function GameOverScreen() {
  const state = useGameState();
  const { playAgain } = useGameActions();

  const winner = state.players[state.winner];
  const loser = state.players[state.winner === 1 ? 2 : 1];
  const isAI = state.mode === 'ai';
  const playerWon = isAI && state.winner === 1;
  const playerLost = isAI && state.winner === 2;
  const message = (playerLost ? loseMessages : winMessages)[Math.floor(Math.random() * (playerLost ? loseMessages : winMessages).length)];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.8, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="text-center"
      >
        {/* Glow effect */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[400px] h-[400px] bg-amber-600/10 rounded-full blur-[80px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative z-10"
        >
          <div className="text-6xl mb-6">
            {state.winner === 1 ? '👼' : '😈'}
          </div>

          <h1
            className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-amber-300 to-amber-600 mb-4"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            {playerWon ? 'You Win!' : playerLost ? 'You Lose!' : `${winner.name} Wins!`}
          </h1>

          <p className="text-amber-600/60 text-lg mb-2 italic" style={{ fontFamily: 'Crimson Text, serif' }}>
            {message}
          </p>

          <div className="flex justify-center gap-8 mb-8 mt-6">
            <div className="text-center">
              <div className="text-amber-200 text-sm" style={{ fontFamily: 'Cinzel, serif' }}>{winner.name}</div>
              <div className="text-green-400 font-mono text-2xl">{winner.life} HP</div>
            </div>
            <div className="text-gray-600 self-center">vs</div>
            <div className="text-center">
              <div className="text-gray-400 text-sm" style={{ fontFamily: 'Cinzel, serif' }}>{loser.name}</div>
              <div className="text-red-400 font-mono text-2xl">{loser.life} HP</div>
            </div>
          </div>

          <div className="text-gray-500 text-xs mb-6">
            Game ended on turn {state.turn}
          </div>

          <motion.button
            onClick={playAgain}
            className="px-10 py-4 bg-gradient-to-b from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-amber-100 font-bold text-lg rounded-lg border border-amber-600/50 shadow-xl shadow-amber-900/40 transition-all"
            style={{ fontFamily: 'Cinzel, serif' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Play Again
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
