import { motion } from 'framer-motion';
import Card from '../cards/Card.jsx';
import CardBack from '../cards/CardBack.jsx';
import { canPlayCard } from '../../game/gameUtils.js';
import { useGameState } from '../../game/GameContext.jsx';

export default function HandZone({ player, isOpponent, onCardClick }) {
  const state = useGameState();
  const isActive = state.activePlayer === player.id;

  if (isOpponent) {
    return (
      <div className="flex justify-center items-center gap-1 py-2 min-h-[80px]">
        {player.hand.map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <CardBack small />
          </motion.div>
        ))}
        <span className="text-gray-500 text-xs ml-2">({player.hand.length})</span>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-end gap-1 py-2 min-h-[190px] px-2">
      {player.hand.map((card, i) => {
        const playable = isActive && canPlayCard(card, player);
        return (
          <motion.div
            key={card.instanceId}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card
              card={card}
              isPlayable={playable}
              onClick={() => onCardClick(i, player.id)}
              playerId={player.id}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
