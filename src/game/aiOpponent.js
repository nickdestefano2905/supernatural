import {
  canPlayCard,
  isCreatureType,
  canCreatureAttack,
  getValidAttackTargets,
  getEffectiveAttack,
  getEffectiveHealth,
  hasKeyword,
} from './gameUtils.js';
import { ACTIONS } from './gameActions.js';
import { KEYWORDS } from './constants.js';

const AI_PLAYER = 2;

/**
 * Returns the next action the AI should dispatch, given the current game state.
 * The AI hook calls this repeatedly with delays between actions until the AI ends its turn.
 */
export function getNextAIAction(state) {
  const player = state.players[AI_PLAYER];

  // Handle targeting mode first (spell/battlecry/weapon/attack targets)
  if (state.targetMode) {
    return handleTargetingMode(state);
  }

  // Dismiss revealed card (from Ash's battlecry)
  if (state.revealedCard) {
    return { type: ACTIONS.DISMISS_REVEALED_CARD };
  }

  // Play cards from hand (most impactful first)
  const playable = player.hand
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => canPlayCard(card, player));

  if (playable.length > 0) {
    const best = chooseBestCardToPlay(playable, state);
    return { type: ACTIONS.PLAY_CARD, payload: { handIndex: best.index, playerId: AI_PLAYER } };
  }

  // Attack with creatures
  const attacker = findNextAttacker(state);
  if (attacker) {
    return { type: ACTIONS.SELECT_ATTACKER, payload: { instanceId: attacker.instanceId, playerId: AI_PLAYER } };
  }

  // Nothing left to do — end turn
  return { type: ACTIONS.END_TURN };
}

// ---------------------------------------------------------------------------
// Card play ordering
// ---------------------------------------------------------------------------

function chooseBestCardToPlay(playable, state) {
  const opponentId = 1;
  const opponent = state.players[opponentId];
  const hasEnemyCreatures = opponent.battlefield.some((c) => isCreatureType(c.type));

  // Prioritize removal spells when the opponent has creatures on board
  if (hasEnemyCreatures) {
    const removalSpells = playable.filter(({ card }) =>
      card.type === 'spell' && ['hex-bag', 'smite', 'holy-fire', 'witchs-brew'].includes(card.id)
    );
    if (removalSpells.length > 0) {
      return removalSpells.sort((a, b) => b.card.cost - a.card.cost)[0];
    }
  }

  // Otherwise play the most expensive card (greedy mana usage)
  return playable.sort((a, b) => b.card.cost - a.card.cost)[0];
}

// ---------------------------------------------------------------------------
// Attacker selection
// ---------------------------------------------------------------------------

function findNextAttacker(state) {
  const player = state.players[AI_PLAYER];
  for (const creature of player.battlefield) {
    if (isCreatureType(creature.type) && canCreatureAttack(creature, state, AI_PLAYER)) {
      return creature;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Target selection (for all targeting modes)
// ---------------------------------------------------------------------------

function handleTargetingMode(state) {
  const targets = state.validTargets;
  if (!targets || targets.length === 0) {
    return { type: ACTIONS.CANCEL_SELECTION };
  }

  switch (state.targetMode) {
    case 'attack':
      return selectAttackTarget(state, targets);
    case 'spell_target':
      return selectSpellTarget(state, targets);
    case 'battlecry_target':
      return selectBattlecryTarget(state, targets);
    case 'weapon_target':
      return selectWeaponTarget(state, targets);
    default:
      return { type: ACTIONS.CANCEL_SELECTION };
  }
}

// --- Attack targeting ---

function selectAttackTarget(state, targets) {
  const attacker = state.players[AI_PLAYER].battlefield.find(
    (c) => c.instanceId === state.selectedCard?.instanceId
  );
  if (!attacker) return { type: ACTIONS.CANCEL_SELECTION };

  const attackerAtk = getEffectiveAttack(attacker, state, AI_PLAYER);
  const attackerHp = attacker.currentHealth;

  const creatureTargets = targets.filter((t) => t.type === 'creature');
  const heroTargets = targets.filter((t) => t.type === 'hero');

  // Look for favorable trades (we kill them, we survive)
  for (const target of creatureTargets) {
    const defender = state.players[target.playerId].battlefield.find(
      (c) => c.instanceId === target.instanceId
    );
    if (!defender) continue;
    const defenderHp = getEffectiveHealth(defender, state, target.playerId);
    const defenderAtk = getEffectiveAttack(defender, state, target.playerId);
    if (attackerAtk >= defenderHp && defenderAtk < attackerHp) {
      return { type: ACTIONS.SELECT_TARGET, payload: target };
    }
  }

  // Go face when possible
  if (heroTargets.length > 0) {
    return { type: ACTIONS.SELECT_TARGET, payload: heroTargets[0] };
  }

  // Must attack taunt creatures — try to pick one we can kill
  for (const target of creatureTargets) {
    const defender = state.players[target.playerId].battlefield.find(
      (c) => c.instanceId === target.instanceId
    );
    if (!defender) continue;
    const defenderHp = getEffectiveHealth(defender, state, target.playerId);
    if (attackerAtk >= defenderHp) {
      return { type: ACTIONS.SELECT_TARGET, payload: target };
    }
  }

  // Fall back to lowest-health creature target
  if (creatureTargets.length > 0) {
    const sorted = [...creatureTargets].sort((a, b) => {
      const ca = state.players[a.playerId].battlefield.find((c) => c.instanceId === a.instanceId);
      const cb = state.players[b.playerId].battlefield.find((c) => c.instanceId === b.instanceId);
      return (ca?.currentHealth ?? 99) - (cb?.currentHealth ?? 99);
    });
    return { type: ACTIONS.SELECT_TARGET, payload: sorted[0] };
  }

  return { type: ACTIONS.SELECT_TARGET, payload: targets[0] };
}

// --- Spell targeting ---

function selectSpellTarget(state, targets) {
  const pendingCard = state.pendingCard?.card;
  if (!pendingCard) return { type: ACTIONS.SELECT_TARGET, payload: targets[0] };

  const opponentId = 1;

  // Damage spells — prefer enemy, prefer killable
  const damageSpells = { 'hex-bag': 3, 'smite': 5, 'witchs-brew': 2 };
  if (pendingCard.id in damageSpells) {
    const dmg = damageSpells[pendingCard.id];
    const enemyTargets = targets.filter((t) => t.playerId === opponentId);
    // Try to find a creature we can kill
    for (const t of enemyTargets) {
      const creature = state.players[t.playerId].battlefield.find((c) => c.instanceId === t.instanceId);
      if (creature && getEffectiveHealth(creature, state, t.playerId) <= dmg) {
        return { type: ACTIONS.SELECT_TARGET, payload: t };
      }
    }
    // Otherwise target the highest-attack enemy
    if (enemyTargets.length > 0) {
      return { type: ACTIONS.SELECT_TARGET, payload: pickHighestAttack(enemyTargets, state) };
    }
  }

  // Debuff spells — target strongest enemy
  if (pendingCard.id === 'dead-mans-blood' || pendingCard.id === 'devils-trap') {
    const enemyTargets = targets.filter((t) => t.playerId === opponentId);
    if (enemyTargets.length > 0) {
      return { type: ACTIONS.SELECT_TARGET, payload: pickHighestAttack(enemyTargets, state) };
    }
  }

  // Buff own creatures
  if (pendingCard.id === 'crossroads-pact' || pendingCard.id === 'divine-shield') {
    const friendlyTargets = targets.filter((t) => t.playerId === AI_PLAYER);
    if (friendlyTargets.length > 0) {
      return { type: ACTIONS.SELECT_TARGET, payload: pickHighestAttack(friendlyTargets, state) };
    }
  }

  // Demonic possession — steal the biggest creature we can
  if (pendingCard.id === 'demonic-possession') {
    return { type: ACTIONS.SELECT_TARGET, payload: pickHighestValue(targets, state) };
  }

  return { type: ACTIONS.SELECT_TARGET, payload: targets[0] };
}

// --- Battlecry targeting ---

function selectBattlecryTarget(state, targets) {
  const pendingCard = state.pendingCard?.card;
  if (!pendingCard) return { type: ACTIONS.SELECT_TARGET, payload: targets[0] };

  const opponentId = 1;

  // Damage battlecries — target enemy
  if (pendingCard.id === 'meg-masters') {
    const enemyTargets = targets.filter((t) => t.playerId === opponentId);
    if (enemyTargets.length > 0) return { type: ACTIONS.SELECT_TARGET, payload: enemyTargets[0] };
  }

  // Buff battlecries — target own strongest
  if (pendingCard.id === 'jody-mills' || pendingCard.id === 'ruby') {
    const friendlyTargets = targets.filter((t) => t.playerId === AI_PLAYER);
    if (friendlyTargets.length > 0) {
      return { type: ACTIONS.SELECT_TARGET, payload: pickHighestAttack(friendlyTargets, state) };
    }
  }

  // Crowley — steal the best available creature
  if (pendingCard.id === 'crowley') {
    return { type: ACTIONS.SELECT_TARGET, payload: pickHighestValue(targets, state) };
  }

  // Gabriel — bounce the most expensive enemy creature
  if (pendingCard.id === 'gabriel') {
    let best = targets[0];
    let bestCost = 0;
    for (const t of targets) {
      const creature = state.players[t.playerId].battlefield.find((c) => c.instanceId === t.instanceId);
      if (creature && creature.cost > bestCost) {
        bestCost = creature.cost;
        best = t;
      }
    }
    return { type: ACTIONS.SELECT_TARGET, payload: best };
  }

  // Shapeshifter — copy the strongest creature
  if (pendingCard.id === 'shapeshifter') {
    return { type: ACTIONS.SELECT_TARGET, payload: pickHighestValue(targets, state) };
  }

  // Ruby's Knife — destroy an enemy creature if possible
  if (pendingCard.id === 'rubys-knife') {
    const enemyTargets = targets.filter((t) => t.playerId === opponentId);
    if (enemyTargets.length > 0) {
      return { type: ACTIONS.SELECT_TARGET, payload: pickHighestAttack(enemyTargets, state) };
    }
  }

  return { type: ACTIONS.SELECT_TARGET, payload: targets[0] };
}

// --- Weapon targeting ---

function selectWeaponTarget(state, targets) {
  // Attach weapon to the strongest friendly creature
  return { type: ACTIONS.SELECT_TARGET, payload: pickHighestAttack(targets, state) };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickHighestAttack(targets, state) {
  let best = targets[0];
  let bestAtk = -1;
  for (const t of targets) {
    const creature = state.players[t.playerId]?.battlefield.find((c) => c.instanceId === t.instanceId);
    if (creature) {
      const atk = getEffectiveAttack(creature, state, t.playerId);
      if (atk > bestAtk) {
        bestAtk = atk;
        best = t;
      }
    }
  }
  return best;
}

function pickHighestValue(targets, state) {
  let best = targets[0];
  let bestValue = -1;
  for (const t of targets) {
    const creature = state.players[t.playerId]?.battlefield.find((c) => c.instanceId === t.instanceId);
    if (creature) {
      const value =
        getEffectiveAttack(creature, state, t.playerId) +
        getEffectiveHealth(creature, state, t.playerId);
      if (value > bestValue) {
        bestValue = value;
        best = t;
      }
    }
  }
  return best;
}
