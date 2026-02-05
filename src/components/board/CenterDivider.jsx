import { motion, AnimatePresence } from 'framer-motion';
import { useGameState } from '../../game/GameContext.jsx';
import { useGameActions } from '../../hooks/useGameActions.js';
import { TARGET_MODES } from '../../game/constants.js';

export default function CenterDivider() {
  const state = useGameState();
  const { endTurn, cancelSelection } = useGameActions();

  const activePlayerName = state.players[state.activePlayer]?.name;
  const isTargeting = state.targetMode !== null;

  let targetModeLabel = '';
  if (state.targetMode === TARGET_MODES.ATTACK) targetModeLabel = 'Select attack target';
  if (state.targetMode === TARGET_MODES.SPELL_TARGET) targetModeLabel = 'Select spell target';
  if (state.targetMode === TARGET_MODES.BATTLECRY_TARGET) targetModeLabel = 'Select battlecry target';
  if (state.targetMode === TARGET_MODES.WEAPON_TARGET) targetModeLabel = 'Select creature to equip';

  return (
    <div className="relative py-3 flex items-center justify-center">
      {/* Divider line */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-amber-700/50 to-transparent" />

      <div className="relative z-10 flex items-center gap-4">
        {/* Turn info */}
        <div className="bg-[#0a0a0f] border border-amber-800/40 rounded-lg px-4 py-1.5 text-center">
          <div className="text-amber-200 text-xs" style={{ fontFamily: 'Cinzel, serif' }}>
            {activePlayerName}&apos;s Turn
          </div>
          <div className="text-gray-500 text-[10px]">Turn {state.turn}</div>
        </div>

        {/* Target mode indicator */}
        <AnimatePresence>
          {isTargeting && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0a0a0f] border border-green-700/50 rounded-lg px-3 py-1.5 text-center"
            >
              <div className="text-green-300 text-xs">{targetModeLabel}</div>
              <button
                onClick={cancelSelection}
                className="text-[10px] text-gray-400 hover:text-red-400 transition-colors mt-0.5"
              >
                (Cancel)
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* End Turn button */}
        <motion.button
          onClick={endTurn}
          className="bg-gradient-to-b from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-amber-100 font-bold px-5 py-2 rounded-lg border border-amber-600/50 shadow-lg shadow-amber-900/30 text-sm transition-all"
          style={{ fontFamily: 'Cinzel, serif' }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          End Turn
        </motion.button>
      </div>
    </div>
  );
}
