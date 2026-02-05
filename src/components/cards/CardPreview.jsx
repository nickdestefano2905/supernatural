import { useState } from 'react';
import { isCreatureType, getEffectiveAttack, getEffectiveHealth } from '../../game/gameUtils.js';
import { useGameState } from '../../game/GameContext.jsx';

const factionAccent = {
  hunter: '#b8860b',
  hell: '#8b1a1a',
  heaven: '#4a7ab5',
  neutral: '#8a7a6a',
};

export default function CardPreview({ card, playerId, isOnBattlefield }) {
  const state = useGameState();
  const [imgError, setImgError] = useState(false);
  if (!card) return null;

  const isCreature = isCreatureType(card.type);
  const effectiveAttack = isCreature && isOnBattlefield ? getEffectiveAttack(card, state, playerId) : card.currentAttack ?? card.attack;
  const effectiveHealth = isCreature && isOnBattlefield ? getEffectiveHealth(card, state, playerId) : card.currentHealth ?? card.health;
  const isDamaged = isCreature && card.currentHealth < card.maxHealth;
  const hasImage = card.image && !imgError;

  const typeLabel = card.type === 'hunter' ? 'HUNTER' : card.type === 'monster' ? 'MONSTER' : card.type === 'weapon' ? 'WEAPON' : card.type === 'spell' ? 'SPELL' : card.type === 'lore' ? 'LORE' : card.type.toUpperCase();

  return (
    <div
      className="shadow-2xl"
      style={{
        width: 260,
        borderRadius: 10,
        background: 'linear-gradient(145deg, #d4b896 0%, #c4a67a 30%, #b89868 60%, #a88a58 100%)',
        padding: 6,
      }}
    >
      {/* Inner border frame */}
      <div
        style={{
          border: '2.5px solid #2a2218',
          borderRadius: 7,
          overflow: 'hidden',
        }}
      >
        {/* Card name */}
        <div
          style={{
            textAlign: 'center',
            padding: '10px 8px 6px',
            fontFamily: 'Cinzel, serif',
            fontSize: 16,
            fontWeight: 800,
            color: '#1a1408',
            letterSpacing: '0.03em',
          }}
        >
          {card.name.toUpperCase()}
        </div>

        {/* Image area */}
        <div
          style={{
            margin: '0 10px',
            height: 180,
            border: '2px solid #2a2218',
            background: '#1a1408',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {hasImage ? (
            <img
              src={card.image}
              alt={card.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(180deg, ${factionAccent[card.faction]}40 0%, ${factionAccent[card.faction]}80 100%)`,
              }}
            >
              <span style={{ fontSize: 64 }}>{card.art}</span>
            </div>
          )}

          {/* Cost badge */}
          <div
            style={{
              position: 'absolute',
              top: 4,
              left: 4,
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #d4a04a 0%, #b8860b 100%)',
              border: '2px solid #1a1408',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'monospace',
              fontWeight: 'bold',
              fontSize: 14,
              color: '#1a1408',
            }}
          >
            {card.cost}
          </div>
        </div>

        {/* Type bar */}
        <div
          style={{
            margin: '6px 10px 0',
            padding: '4px 0',
            borderTop: '2px solid #2a2218',
            borderBottom: '2px solid #2a2218',
            textAlign: 'center',
            fontFamily: 'Cinzel, serif',
            fontSize: 12,
            fontWeight: 700,
            color: '#1a1408',
            letterSpacing: '0.12em',
          }}
        >
          {typeLabel}
          {card.rarity === 'legendary' && ' ★ LEGENDARY'}
          {card.rarity === 'rare' && ' — RARE'}
          {card.rarity === 'uncommon' && ' — UNCOMMON'}
        </div>

        {/* Effect text box */}
        <div
          style={{
            margin: '6px 10px',
            padding: '6px 6px',
            borderTop: '1px solid #2a221844',
            fontFamily: 'Crimson Text, serif',
            fontSize: 13,
            color: '#2a2218',
            lineHeight: 1.4,
            textAlign: 'center',
            minHeight: 40,
          }}
        >
          {card.effect && <div>{card.effect}</div>}
          {card.keywords?.length > 0 && (
            <div style={{ marginTop: card.effect ? 4 : 0, fontStyle: 'italic', textTransform: 'capitalize' }}>
              {card.keywords.join(', ')}
            </div>
          )}
          {!card.effect && (!card.keywords || card.keywords.length === 0) && card.type === 'weapon' && (
            <div>+{card.attack} Attack{card.health > 0 ? `, +${card.health} Health` : ''}</div>
          )}
        </div>

        {/* Flavor text */}
        {card.flavor && (
          <div
            style={{
              margin: '0 10px 4px',
              fontFamily: 'Crimson Text, serif',
              fontSize: 11,
              color: '#6a5a4a',
              fontStyle: 'italic',
              textAlign: 'center',
              lineHeight: 1.3,
            }}
          >
            {card.flavor}
          </div>
        )}

        {/* Stats */}
        {isCreature && (
          <div
            style={{
              margin: '4px 10px 8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontFamily: 'Cinzel, serif',
              fontWeight: 800,
              fontSize: 15,
              color: '#1a1408',
            }}
          >
            <span>ATK: {effectiveAttack}</span>
            <span style={{ color: isDamaged ? '#cc3333' : '#1a1408' }}>HP: {effectiveHealth}</span>
          </div>
        )}

        {card.type === 'weapon' && (
          <div
            style={{
              margin: '4px 10px 8px',
              textAlign: 'right',
              fontFamily: 'Cinzel, serif',
              fontWeight: 800,
              fontSize: 15,
              color: '#1a1408',
            }}
          >
            +{card.attack}⚔{card.health > 0 && ` +${card.health}♥`}
          </div>
        )}

        {/* Weapon attachments when on battlefield */}
        {isOnBattlefield && card.attachedWeapons?.length > 0 && (
          <div style={{ margin: '0 10px 6px', borderTop: '1px solid #2a221844', paddingTop: 4 }}>
            <div style={{ fontSize: 10, color: '#6a5a4a', marginBottom: 2 }}>Equipped:</div>
            {card.attachedWeapons.map((w, i) => (
              <div key={i} style={{ fontSize: 11, color: '#2a2218' }}>
                {w.art} {w.name} (+{w.attack}⚔{w.health > 0 ? ` +${w.health}♥` : ''})
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
