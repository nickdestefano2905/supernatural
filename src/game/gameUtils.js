import cardsData from '../data/cards.json';
import { MAX_HAND_SIZE, MAX_BOARD_SIZE, CARD_TYPES, KEYWORDS } from './constants.js';

let nextInstanceId = 1;

export function generateInstanceId() {
  return `inst_${nextInstanceId++}`;
}

export function resetInstanceIdCounter() {
  nextInstanceId = 1;
}

export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getCardById(cardId) {
  return cardsData.find((c) => c.id === cardId);
}

export function createCardInstance(cardData, owner) {
  return {
    ...cardData,
    instanceId: generateInstanceId(),
    owner,
    currentAttack: cardData.attack,
    currentHealth: cardData.health,
    maxHealth: cardData.health,
    baseAttack: cardData.attack,
    baseHealth: cardData.health,
    canAttack: false,
    hasAttackedThisTurn: false,
    attachedWeapons: [],
    frozen: false,
    isToken: cardData.isToken || false,
    tempBuffs: [],
    markedForDeath: false,
  };
}

export function createTokenInstance(tokenId, owner) {
  const tokenData = cardsData.find((c) => c.id === tokenId);
  if (!tokenData) return null;
  const inst = createCardInstance(tokenData, owner);
  inst.isToken = true;
  return inst;
}

export function buildDeck(cardIds, owner) {
  const deck = cardIds.map((id) => {
    const data = getCardById(id);
    if (!data) {
      console.warn(`Card not found: ${id}`);
      return null;
    }
    return createCardInstance(data, owner);
  }).filter(Boolean);
  return shuffleArray(deck);
}

export function drawCards(playerState, count) {
  const newHand = [...playerState.hand];
  const newDeck = [...playerState.deck];
  const burned = [];
  let fatigueDamage = 0;
  let fatigueCount = playerState.fatigueCounter || 0;

  for (let i = 0; i < count; i++) {
    if (newDeck.length === 0) {
      fatigueCount++;
      fatigueDamage += fatigueCount;
    } else {
      const drawn = newDeck.shift();
      if (newHand.length >= MAX_HAND_SIZE) {
        burned.push(drawn);
      } else {
        newHand.push(drawn);
      }
    }
  }

  return {
    hand: newHand,
    deck: newDeck,
    burned,
    fatigueDamage,
    fatigueCounter: fatigueCount,
  };
}

export function canPlayCard(card, playerState) {
  if (playerState.loreCurrent < card.cost) return false;
  if (isCreatureType(card.type) && playerState.battlefield.filter(c => isCreatureType(c.type)).length >= MAX_BOARD_SIZE) return false;
  if (card.type === CARD_TYPES.WEAPON) {
    const friendlyCreatures = playerState.battlefield.filter(c => isCreatureType(c.type));
    if (friendlyCreatures.length === 0) return false;
    const hasValidTarget = friendlyCreatures.some(c => {
      const maxWeapons = c.keywords?.includes(KEYWORDS.VESSEL) ? 2 : 1;
      return c.attachedWeapons.length < maxWeapons;
    });
    if (!hasValidTarget) return false;
  }
  return true;
}

export function isCreatureType(type) {
  return type === CARD_TYPES.HUNTER || type === CARD_TYPES.MONSTER;
}

export function hasKeyword(creature, keyword) {
  if (!creature) return false;
  const baseHas = creature.keywords?.includes(keyword) || false;
  const weaponHas = creature.attachedWeapons?.some(w => w.keywords?.includes(keyword)) || false;
  return baseHas || weaponHas;
}

export function getEffectiveAttack(creature, gameState, playerId) {
  if (!creature) return 0;
  let attack = creature.currentAttack;

  // Add weapon bonuses
  if (creature.attachedWeapons) {
    for (const weapon of creature.attachedWeapons) {
      attack += weapon.attack;
    }
  }

  // Aura effects
  const playerState = gameState.players[playerId];
  if (playerState) {
    // Bobby Singer aura: friendly hunters +1 attack
    for (const c of playerState.battlefield) {
      if (c.id === 'bobby-singer' && c.instanceId !== creature.instanceId && isCreatureType(creature.type) && (creature.type === CARD_TYPES.HUNTER || creature.faction === 'hunter')) {
        attack += 1;
      }
      if (c.id === 'naomi' && c.instanceId !== creature.instanceId && hasKeyword(creature, KEYWORDS.WARD)) {
        attack += 2;
      }
    }

    // King of Hell aura: demons +1/+1
    for (const c of playerState.battlefield) {
      if (c.id === 'king-of-hell' && creature.faction === 'hell' && isCreatureType(creature.type)) {
        attack += 1;
      }
    }
  }

  return attack;
}

export function getEffectiveHealth(creature, gameState, playerId) {
  if (!creature) return 0;
  let health = creature.currentHealth;

  // Add weapon health bonuses
  if (creature.attachedWeapons) {
    for (const weapon of creature.attachedWeapons) {
      health += weapon.health;
    }
  }

  const playerState = gameState.players[playerId];
  if (playerState) {
    // Impala aura: hunters +1 health
    for (const c of playerState.battlefield) {
      if (c.id === 'impala' && (creature.type === CARD_TYPES.HUNTER || creature.faction === 'hunter') && isCreatureType(creature.type)) {
        health += 1;
      }
    }
    // King of Hell aura
    for (const c of playerState.battlefield) {
      if (c.id === 'king-of-hell' && creature.faction === 'hell' && isCreatureType(creature.type)) {
        health += 1;
      }
    }
  }

  return health;
}

export function hasTaunt(opponentState) {
  return opponentState.battlefield.some(
    (c) => isCreatureType(c.type) && hasKeyword(c, KEYWORDS.TAUNT)
  );
}

export function getTauntCreatures(opponentState) {
  return opponentState.battlefield.filter(
    (c) => isCreatureType(c.type) && hasKeyword(c, KEYWORDS.TAUNT)
  );
}

export function getValidAttackTargets(gameState, attackerPlayerId) {
  const opponentId = attackerPlayerId === 1 ? 2 : 1;
  const opponentState = gameState.players[opponentId];
  const targets = [];

  if (hasTaunt(opponentState)) {
    const tauntCreatures = getTauntCreatures(opponentState);
    for (const c of tauntCreatures) {
      targets.push({ type: 'creature', instanceId: c.instanceId, playerId: opponentId });
    }
  } else {
    targets.push({ type: 'hero', playerId: opponentId });
    for (const c of opponentState.battlefield) {
      if (isCreatureType(c.type)) {
        targets.push({ type: 'creature', instanceId: c.instanceId, playerId: opponentId });
      }
    }
  }

  return targets;
}

export function canCreatureAttack(creature, gameState, playerId) {
  if (!creature || !isCreatureType(creature.type)) return false;
  if (creature.hasAttackedThisTurn) return false;
  if (creature.frozen) return false;
  if (!creature.canAttack && !hasKeyword(creature, KEYWORDS.RUSH)) return false;

  // Salt line check: enemy salt line prevents creatures with <=2 attack from attacking
  const opponentId = playerId === 1 ? 2 : 1;
  const opponentState = gameState.players[opponentId];
  const hasSaltLine = opponentState?.battlefield?.some(c => c.id === 'salt-line') || false;
  if (hasSaltLine) {
    const effectiveAttack = getEffectiveAttack(creature, gameState, playerId);
    if (effectiveAttack <= 2) return false;
  }

  return true;
}

export function addLogEntry(log, message) {
  return [...log, { message, timestamp: Date.now() }];
}

export function getOpponentId(playerId) {
  return playerId === 1 ? 2 : 1;
}

export function computeLuciferCost(card, gameState) {
  if (card.id !== 'lucifer') return card.cost;
  const totalDeaths = (gameState.deathCount || 0);
  return Math.max(0, card.cost - totalDeaths);
}
