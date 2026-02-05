import { motion, AnimatePresence } from 'framer-motion';
import Card from '../cards/Card.jsx';
import { useGameState } from '../../game/GameContext.jsx';
import { isCreatureType, canCreatureAttack } from '../../game/gameUtils.js';

export default function Battlefield({ player, onCardClick }) {
  const state = useGameState();
  const isActive = state.activePlayer === player.id;

  const creatures = player.battlefield.filter((c) => isCreatureType(c.type));
  const loreCards = player.battlefield.filter((c) => c.type === 'lore');

  return (
    <div className="flex flex-col items-center gap-1 py-2 min-h-[190px]">
      {/* Lore cards (shown smaller above/below creatures) */}
      {loreCards.length > 0 && (
        <div className="flex gap-1 mb-1">
          {loreCards.map((card) => (
            <motion.div
              key={card.instanceId}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-[70px] h-[40px] rounded border border-purple-600/50 bg-purple-900/30 flex items-center justify-center text-[9px] text-purple-200 px-1 text-center"
              title={`${card.name}: ${card.effect}`}
            >
              <span className="mr-1">{card.art}</span>
              <span className="truncate">{card.name}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Creatures */}
      <div className="flex justify-center items-center gap-2">
        <AnimatePresence>
          {creatures.map((card) => {
            const canAttack = isActive && canCreatureAttack(card, state, player.id);
            const isSelected =
              state.selectedCard?.zone === 'battlefield' &&
              state.selectedCard?.instanceId === card.instanceId;
            const isValidTarget = state.validTargets?.some(
              (t) => t.type === 'creature' && t.instanceId === card.instanceId && t.playerId === player.id
            );

            return (
              <motion.div
                key={card.instanceId}
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, rotate: 10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <Card
                  card={card}
                  isOnBattlefield
                  isPlayable={canAttack || isValidTarget}
                  isSelected={isSelected}
                  isValidTarget={isValidTarget}
                  onClick={() => onCardClick(card.instanceId, player.id)}
                  playerId={player.id}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
        {creatures.length === 0 && (
          <div className="text-gray-600 text-sm italic py-8">No creatures</div>
        )}
      </div>
    </div>
  );
}
