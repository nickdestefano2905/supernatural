import { useState } from 'react';
import { motion } from 'framer-motion';
import { isCreatureType, hasKeyword, getEffectiveAttack, getEffectiveHealth } from '../../game/gameUtils.js';
import { useGameState } from '../../game/GameContext.jsx';
import CardPreview from './CardPreview.jsx';

const factionColors = {
  hunter: 'border-amber-600/70',
  hell: 'border-red-800/70',
  heaven: 'border-blue-500/70',
  neutral: 'border-gray-500/70',
  purgatory: 'border-green-700/70',
};

const factionGlows = {
  hunter: 'shadow-amber-600/30',
  hell: 'shadow-red-700/30',
  heaven: 'shadow-blue-500/30',
  neutral: 'shadow-gray-500/20',
  purgatory: 'shadow-green-600/30',
};

const rarityBorders = {
  common: '',
  uncommon: 'ring-1 ring-gray-400/50',
  rare: 'ring-1 ring-yellow-500/60',
  legendary: 'ring-2 ring-yellow-400 animate-pulse-subtle',
};

export default function Card({
  card,
  onClick,
  isPlayable = false,
  isSelected = false,
  isValidTarget = false,
  isOnBattlefield = false,
  playerId,
  showStats = true,
  small = false,
}) {
  const [showPreview, setShowPreview] = useState(false);
  const state = useGameState();

  if (!card) return null;

  const isCreature = isCreatureType(card.type);
  const effectiveAttack = isCreature && isOnBattlefield ? getEffectiveAttack(card, state, playerId) : card.currentAttack ?? card.attack;
  const effectiveHealth = isCreature && isOnBattlefield ? getEffectiveHealth(card, state, playerId) : card.currentHealth ?? card.health;
  const isDamaged = isCreature && card.currentHealth < card.maxHealth;

  const sizeClasses = small
    ? 'w-[100px] h-[140px] text-[9px]'
    : 'w-[120px] h-[170px] text-[10px]';

  return (
    <div className="relative" onMouseEnter={() => setShowPreview(true)} onMouseLeave={() => setShowPreview(false)}>
      <motion.div
        className={`
          ${sizeClasses} rounded-lg border-2 cursor-pointer select-none
          flex flex-col overflow-hidden relative
          bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a]
          ${factionColors[card.faction] || 'border-gray-600'}
          ${rarityBorders[card.rarity] || ''}
          ${isPlayable ? `shadow-lg ${factionGlows[card.faction] || ''} brightness-110` : 'brightness-75 opacity-70'}
          ${isSelected ? 'ring-2 ring-yellow-400 shadow-xl shadow-yellow-400/40 brightness-125 scale-105' : ''}
          ${isValidTarget ? 'ring-2 ring-green-400 shadow-lg shadow-green-400/40 brightness-110' : ''}
          ${isOnBattlefield && isPlayable ? 'brightness-100 opacity-100' : ''}
          transition-all duration-150
        `}
        onClick={onClick}
        whileHover={isPlayable ? { y: -4, scale: 1.02 } : {}}
        whileTap={isPlayable ? { scale: 0.98 } : {}}
        layout
      >
        {/* Cost badge */}
        <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-black font-bold text-[11px] shadow-md z-10 font-mono">
          {card.id === 'lucifer' ? computeLuciferDisplay(card, state) : card.cost}
        </div>

        {/* Card name */}
        <div className="pt-1 px-1 text-center truncate text-[9px] font-semibold text-amber-100 mt-4" style={{ fontFamily: 'Cinzel, serif' }}>
          {card.name}
        </div>

        {/* Art area */}
        <div className="flex-1 flex items-center justify-center text-3xl min-h-0">
          {card.art}
        </div>

        {/* Type line */}
        <div className="text-center text-[8px] text-gray-400 px-1 truncate capitalize">
          {card.type}{card.rarity === 'legendary' ? ' ★' : ''}
        </div>

        {/* Effect text */}
        {card.effect && (
          <div className="px-1 text-center text-[7px] text-gray-300 leading-tight line-clamp-2 min-h-[18px]">
            {card.effect}
          </div>
        )}

        {/* Keywords */}
        {card.keywords && card.keywords.length > 0 && (
          <div className="flex justify-center gap-0.5 px-1 pb-0.5">
            {card.keywords.map((kw) => (
              <span key={kw} className="text-[7px] px-1 py-0 rounded bg-gray-700/80 text-amber-200 capitalize">
                {kw}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        {isCreature && showStats && (
          <div className="flex justify-between items-center px-1 pb-1">
            <div className="flex items-center gap-0.5">
              <span className="text-red-400 text-[10px]">⚔</span>
              <span className={`font-bold font-mono text-[11px] ${effectiveAttack > (card.baseAttack || card.attack) ? 'text-green-400' : 'text-red-300'}`}>
                {effectiveAttack}
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <span className={`font-bold font-mono text-[11px] ${isDamaged ? 'text-red-400' : effectiveHealth > (card.baseHealth || card.health) ? 'text-green-400' : 'text-green-300'}`}>
                {effectiveHealth}
              </span>
              <span className="text-green-400 text-[10px]">♥</span>
            </div>
          </div>
        )}

        {/* Weapon stats */}
        {card.type === 'weapon' && (
          <div className="flex justify-center items-center gap-1 pb-1">
            <span className="text-red-300 font-mono text-[10px]">+{card.attack}⚔</span>
            {card.health > 0 && <span className="text-green-300 font-mono text-[10px]">+{card.health}♥</span>}
          </div>
        )}

        {/* Weapon attachment indicator */}
        {isOnBattlefield && card.attachedWeapons?.length > 0 && (
          <div className="absolute top-0.5 right-0.5 flex gap-0.5">
            {card.attachedWeapons.map((w, i) => (
              <span key={i} className="text-[10px] bg-amber-800/80 rounded px-0.5" title={w.name}>
                {w.art}
              </span>
            ))}
          </div>
        )}

        {/* Frozen indicator */}
        {card.frozen && (
          <div className="absolute inset-0 bg-blue-400/20 rounded-lg flex items-center justify-center">
            <span className="text-2xl">❄️</span>
          </div>
        )}
      </motion.div>

      {/* Preview on hover */}
      {showPreview && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
          <CardPreview card={card} playerId={playerId} isOnBattlefield={isOnBattlefield} />
        </div>
      )}
    </div>
  );
}

function computeLuciferDisplay(card, state) {
  const totalDeaths = state.deathCount || 0;
  return Math.max(0, card.cost - totalDeaths);
}
