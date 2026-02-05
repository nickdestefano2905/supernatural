import { isCreatureType, getEffectiveAttack, getEffectiveHealth } from '../../game/gameUtils.js';
import { useGameState } from '../../game/GameContext.jsx';

const factionBg = {
  hunter: 'from-amber-900/90 to-[#1a1a2e]',
  hell: 'from-red-900/90 to-[#1a1a2e]',
  heaven: 'from-blue-900/90 to-[#1a1a2e]',
  neutral: 'from-gray-800/90 to-[#1a1a2e]',
};

export default function CardPreview({ card, playerId, isOnBattlefield }) {
  const state = useGameState();
  if (!card) return null;

  const isCreature = isCreatureType(card.type);
  const effectiveAttack = isCreature && isOnBattlefield ? getEffectiveAttack(card, state, playerId) : card.currentAttack ?? card.attack;
  const effectiveHealth = isCreature && isOnBattlefield ? getEffectiveHealth(card, state, playerId) : card.currentHealth ?? card.health;

  return (
    <div className={`w-[240px] rounded-xl border-2 border-amber-700/60 bg-gradient-to-b ${factionBg[card.faction] || factionBg.neutral} p-3 shadow-2xl`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-black font-bold text-sm font-mono shadow">
          {card.cost}
        </div>
        <h3 className="text-sm font-bold text-amber-100 text-center flex-1 mx-2" style={{ fontFamily: 'Cinzel, serif' }}>
          {card.name}
        </h3>
      </div>

      {/* Art */}
      <div className="text-5xl text-center my-3">{card.art}</div>

      {/* Type line */}
      <div className="text-xs text-center text-gray-400 capitalize mb-2 border-b border-gray-700 pb-1">
        {card.type} — {card.faction} {card.rarity === 'legendary' && '★ Legendary'}
        {card.rarity === 'rare' && '• Rare'}
        {card.rarity === 'uncommon' && '• Uncommon'}
      </div>

      {/* Keywords */}
      {card.keywords?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2 justify-center">
          {card.keywords.map((kw) => (
            <span key={kw} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-800/60 text-amber-200 capitalize font-semibold">
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* Effect */}
      {card.effect && (
        <p className="text-xs text-gray-200 text-center mb-2 leading-relaxed">{card.effect}</p>
      )}

      {/* Flavor text */}
      {card.flavor && (
        <p className="text-[10px] text-gray-500 italic text-center mb-2" style={{ fontFamily: 'Crimson Text, serif' }}>
          {card.flavor}
        </p>
      )}

      {/* Weapons */}
      {isOnBattlefield && card.attachedWeapons?.length > 0 && (
        <div className="border-t border-gray-700 pt-1 mt-1">
          <p className="text-[10px] text-gray-400 mb-1">Equipped:</p>
          {card.attachedWeapons.map((w, i) => (
            <div key={i} className="text-[10px] text-amber-300">
              {w.art} {w.name} (+{w.attack}⚔ {w.health > 0 ? `+${w.health}♥` : ''})
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {isCreature && (
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-700">
          <div className="flex items-center gap-1">
            <span className="text-red-400">⚔</span>
            <span className="font-bold font-mono text-red-300 text-lg">{effectiveAttack}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-bold font-mono text-green-300 text-lg">{effectiveHealth}</span>
            <span className="text-green-400">♥</span>
          </div>
        </div>
      )}

      {card.type === 'weapon' && (
        <div className="text-center mt-2 pt-2 border-t border-gray-700">
          <span className="text-red-300 font-mono">+{card.attack}⚔</span>
          {card.health > 0 && <span className="text-green-300 font-mono ml-2">+{card.health}♥</span>}
        </div>
      )}
    </div>
  );
}
