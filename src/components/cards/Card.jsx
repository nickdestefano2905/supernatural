import { useState } from 'react';
import { motion } from 'framer-motion';
import { isCreatureType, hasKeyword, getEffectiveAttack, getEffectiveHealth } from '../../game/gameUtils.js';
import { useGameState } from '../../game/GameContext.jsx';
import CardPreview from './CardPreview.jsx';

const factionAccent = {
  hunter: '#b8860b',
  hell: '#8b1a1a',
  heaven: '#4a7ab5',
  neutral: '#8a7a6a',
  purgatory: '#4a6a3a',
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
  const [imgError, setImgError] = useState(false);
  const state = useGameState();

  if (!card) return null;

  const isCreature = isCreatureType(card.type);
  const effectiveAttack = isCreature && isOnBattlefield ? getEffectiveAttack(card, state, playerId) : card.currentAttack ?? card.attack;
  const effectiveHealth = isCreature && isOnBattlefield ? getEffectiveHealth(card, state, playerId) : card.currentHealth ?? card.health;
  const isDamaged = isCreature && card.currentHealth < card.maxHealth;

  const w = small ? 110 : 140;
  const h = small ? 154 : 200;

  const hasImage = card.image && !imgError;
  const typeLabel = card.type === 'hunter' ? 'HUNTER' : card.type === 'monster' ? 'MONSTER' : card.type === 'weapon' ? 'WEAPON' : card.type === 'spell' ? 'SPELL' : card.type === 'lore' ? 'LORE' : card.type.toUpperCase();

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
    >
      <motion.div
        className="cursor-pointer select-none relative"
        style={{ width: w, height: h }}
        onClick={onClick}
        whileHover={isPlayable ? { y: -6, scale: 1.03 } : {}}
        whileTap={isPlayable ? { scale: 0.97 } : {}}
        layout
      >
        {/* Outer card shape */}
        <div
          className={`
            absolute inset-0 rounded-lg overflow-hidden
            transition-all duration-150
            ${!isPlayable && !isOnBattlefield ? 'brightness-50 saturate-50' : ''}
            ${isPlayable && !isOnBattlefield ? 'brightness-100' : ''}
            ${isOnBattlefield && isPlayable ? 'brightness-100' : ''}
            ${isOnBattlefield && !isPlayable && !isValidTarget ? 'brightness-75 saturate-75' : ''}
            ${isSelected ? 'scale-105' : ''}
          `}
          style={{
            background: 'linear-gradient(145deg, #d4b896 0%, #c4a67a 30%, #b89868 60%, #a88a58 100%)',
            boxShadow: isSelected
              ? '0 0 16px rgba(234,179,8,0.7), 0 0 4px rgba(234,179,8,0.5)'
              : isValidTarget
              ? '0 0 14px rgba(74,222,128,0.6), 0 0 4px rgba(74,222,128,0.4)'
              : '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          {/* Inner border frame */}
          <div
            className="absolute rounded-md"
            style={{
              inset: small ? 3 : 4,
              border: '2px solid #2a2218',
            }}
          >
            {/* Card name */}
            <div
              className="text-center px-1 flex items-center justify-center"
              style={{
                height: small ? 20 : 26,
                fontFamily: 'Cinzel, serif',
                fontSize: small ? 8 : 11,
                fontWeight: 800,
                color: '#1a1408',
                letterSpacing: '0.02em',
                lineHeight: 1.1,
              }}
            >
              <span className="truncate block w-full">{card.name.toUpperCase()}</span>
            </div>

            {/* Image area */}
            <div
              className="relative mx-auto overflow-hidden"
              style={{
                marginLeft: small ? 4 : 6,
                marginRight: small ? 4 : 6,
                height: small ? 68 : 90,
                border: '1.5px solid #2a2218',
                background: '#1a1408',
              }}
            >
              {hasImage ? (
                <img
                  src={card.image}
                  alt={card.name}
                  className="w-full h-full object-cover object-top"
                  onError={() => setImgError(true)}
                  loading="lazy"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(180deg, ${factionAccent[card.faction]}40 0%, ${factionAccent[card.faction]}80 100%)`,
                  }}
                >
                  <span style={{ fontSize: small ? 28 : 36 }}>{card.art}</span>
                </div>
              )}

              {/* Cost badge - overlaid on image top-left */}
              <div
                className="absolute flex items-center justify-center font-mono font-bold"
                style={{
                  top: 2,
                  left: 2,
                  width: small ? 16 : 20,
                  height: small ? 16 : 20,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #d4a04a 0%, #b8860b 100%)',
                  border: '1.5px solid #1a1408',
                  fontSize: small ? 9 : 11,
                  color: '#1a1408',
                }}
              >
                {card.id === 'lucifer' ? computeLuciferDisplay(card, state) : card.cost}
              </div>

              {/* Weapon indicator on image top-right */}
              {isOnBattlefield && card.attachedWeapons?.length > 0 && (
                <div className="absolute top-0.5 right-0.5 flex gap-0.5">
                  {card.attachedWeapons.map((wp, i) => (
                    <span
                      key={i}
                      className="rounded-sm"
                      style={{
                        fontSize: small ? 10 : 12,
                        background: 'rgba(26,20,8,0.7)',
                        padding: '0 2px',
                      }}
                      title={wp.name}
                    >
                      {wp.art}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Type bar */}
            <div
              className="text-center flex items-center justify-center"
              style={{
                marginLeft: small ? 4 : 6,
                marginRight: small ? 4 : 6,
                marginTop: small ? 2 : 3,
                height: small ? 14 : 18,
                borderTop: '1.5px solid #2a2218',
                borderBottom: '1.5px solid #2a2218',
                fontFamily: 'Cinzel, serif',
                fontSize: small ? 7 : 9,
                fontWeight: 700,
                color: '#1a1408',
                letterSpacing: '0.1em',
              }}
            >
              {typeLabel}
              {card.rarity === 'legendary' && ' ★'}
            </div>

            {/* Effect / info area */}
            <div
              className="flex flex-col justify-between"
              style={{
                marginLeft: small ? 4 : 6,
                marginRight: small ? 4 : 6,
                marginTop: small ? 1 : 2,
                height: small ? 34 : 44,
              }}
            >
              {/* Effect text or keywords */}
              <div
                className="flex-1 overflow-hidden"
                style={{
                  fontFamily: 'Crimson Text, serif',
                  fontSize: small ? 7 : 9,
                  color: '#2a2218',
                  lineHeight: 1.3,
                  textAlign: 'center',
                  padding: '2px 0',
                }}
              >
                {card.effect ? (
                  <span>{card.effect}</span>
                ) : card.keywords?.length > 0 ? (
                  <span className="italic capitalize">{card.keywords.join(', ')}</span>
                ) : card.type === 'weapon' ? (
                  <span>+{card.attack} Attack{card.health > 0 ? `, +${card.health} Health` : ''}</span>
                ) : null}
              </div>

              {/* Stats row at bottom-right */}
              {isCreature && showStats && (
                <div
                  className="flex items-center justify-end"
                  style={{
                    fontFamily: 'Cinzel, serif',
                    fontWeight: 800,
                    fontSize: small ? 9 : 12,
                    color: '#1a1408',
                    paddingBottom: 1,
                  }}
                >
                  <span style={{ color: isDamaged ? '#cc3333' : '#1a1408' }}>HP: {effectiveHealth}</span>
                </div>
              )}

              {card.type === 'weapon' && (
                <div
                  className="flex items-center justify-end"
                  style={{
                    fontFamily: 'Cinzel, serif',
                    fontWeight: 800,
                    fontSize: small ? 9 : 12,
                    color: '#1a1408',
                    paddingBottom: 1,
                  }}
                >
                  +{card.attack}⚔{card.health > 0 && ` +${card.health}♥`}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Frozen overlay */}
        {card.frozen && (
          <div className="absolute inset-0 bg-blue-300/30 rounded-lg flex items-center justify-center pointer-events-none">
            <span className="text-2xl drop-shadow-lg">❄️</span>
          </div>
        )}

        {/* Playable glow for hand cards */}
        {isPlayable && !isOnBattlefield && (
          <div
            className="absolute inset-0 rounded-lg pointer-events-none animate-pulse-subtle"
            style={{
              boxShadow: `0 0 12px ${factionAccent[card.faction] || '#d4a04a'}55`,
            }}
          />
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
