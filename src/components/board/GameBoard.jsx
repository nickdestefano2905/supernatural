import PlayerArea from './PlayerArea.jsx';
import CenterDivider from './CenterDivider.jsx';
import GameLog from '../ui/GameLog.jsx';
import { useCardInteraction } from '../../hooks/useCardInteraction.js';
import { useAnimationQueue } from '../../hooks/useAnimationQueue.js';
import { useGameState } from '../../game/GameContext.jsx';
import { useGameActions } from '../../hooks/useGameActions.js';
import { useAIOpponent } from '../../hooks/useAIOpponent.js';
import TurnBanner from '../effects/TurnBanner.jsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function GameBoard() {
  const state = useGameState();
  const { handleHandCardClick, handleBattlefieldCardClick, handleHeroClick, handleEmptyClick } = useCardInteraction();
  const { dismissRevealedCard } = useGameActions();
  const { currentAnimation } = useAnimationQueue();
  useAIOpponent();

  return (
    <div className="relative h-screen flex flex-col bg-[#0a0a0f] overflow-hidden" onClick={handleEmptyClick}>
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44IiBudW1PY3RhdmVzPSI0IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjQiLz48L3N2Zz4=')]" />

      {/* Opponent area */}
      <div className="flex-1 flex flex-col min-h-0" onClick={(e) => e.stopPropagation()}>
        <PlayerArea
          playerId={2}
          isOpponent
          onHandCardClick={handleHandCardClick}
          onBattlefieldCardClick={handleBattlefieldCardClick}
          onHeroClick={handleHeroClick}
        />
      </div>

      {/* Center */}
      <div onClick={(e) => e.stopPropagation()}>
        <CenterDivider />
      </div>

      {/* Player area */}
      <div className="flex-1 flex flex-col min-h-0" onClick={(e) => e.stopPropagation()}>
        <PlayerArea
          playerId={1}
          isOpponent={false}
          onHandCardClick={handleHandCardClick}
          onBattlefieldCardClick={handleBattlefieldCardClick}
          onHeroClick={handleHeroClick}
        />
      </div>

      {/* Game Log */}
      <GameLog />

      {/* Turn banner animation */}
      <AnimatePresence>
        {currentAnimation?.type === 'turn_transition' && (
          <TurnBanner playerId={currentAnimation.playerId} />
        )}
      </AnimatePresence>

      {/* Revealed card overlay (Ash) */}
      <AnimatePresence>
        {state.revealedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={dismissRevealedCard}
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.5 }}
              className="bg-[#1a1a2e] border-2 border-amber-600 rounded-xl p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-amber-200 text-sm mb-3">Top of your deck:</p>
              <div className="text-5xl mb-3">{state.revealedCard.card.art}</div>
              <p className="text-amber-100 font-bold" style={{ fontFamily: 'Cinzel, serif' }}>{state.revealedCard.card.name}</p>
              <p className="text-gray-400 text-xs mt-1">{state.revealedCard.card.effect || state.revealedCard.card.type}</p>
              <button
                onClick={dismissRevealedCard}
                className="mt-4 px-4 py-1 bg-amber-700 hover:bg-amber-600 text-amber-100 rounded text-sm transition-colors"
              >
                OK
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
