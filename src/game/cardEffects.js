import {
  createTokenInstance,
  drawCards,
  addLogEntry,
  getOpponentId,
  isCreatureType,
  hasKeyword,
  getEffectiveAttack,
} from './gameUtils.js';
import { KEYWORDS, MAX_BOARD_SIZE } from './constants.js';

/**
 * Returns true if the card's battlecry needs a target.
 */
export function battlecryNeedsTarget(card) {
  const needsTarget = [
    'jody-mills',
    'meg-masters',
    'ruby',
    'crowley',
    'gabriel',
    'shapeshifter',
    'rubys-knife',
  ];
  return needsTarget.includes(card.id);
}

/**
 * Returns valid battlecry targets for a card.
 */
export function getBattlecryTargets(card, state, playerId) {
  const opponentId = getOpponentId(playerId);
  const player = state.players[playerId];
  const opponent = state.players[opponentId];

  switch (card.id) {
    case 'jody-mills': {
      return player.battlefield
        .filter((c) => isCreatureType(c.type) && c.type === 'hunter')
        .map((c) => ({ type: 'creature', instanceId: c.instanceId, playerId }));
    }
    case 'meg-masters': {
      const targets = [];
      for (const c of player.battlefield) {
        if (isCreatureType(c.type)) targets.push({ type: 'creature', instanceId: c.instanceId, playerId });
      }
      for (const c of opponent.battlefield) {
        if (isCreatureType(c.type)) targets.push({ type: 'creature', instanceId: c.instanceId, playerId: opponentId });
      }
      return targets;
    }
    case 'ruby': {
      return player.battlefield
        .filter((c) => isCreatureType(c.type))
        .map((c) => ({ type: 'creature', instanceId: c.instanceId, playerId }));
    }
    case 'crowley': {
      return opponent.battlefield
        .filter((c) => isCreatureType(c.type) && c.currentAttack <= 2)
        .map((c) => ({ type: 'creature', instanceId: c.instanceId, playerId: opponentId }));
    }
    case 'gabriel': {
      return opponent.battlefield
        .filter((c) => isCreatureType(c.type))
        .map((c) => ({ type: 'creature', instanceId: c.instanceId, playerId: opponentId }));
    }
    case 'shapeshifter': {
      return player.battlefield
        .filter((c) => isCreatureType(c.type) && c.instanceId !== card.instanceId)
        .map((c) => ({ type: 'creature', instanceId: c.instanceId, playerId }));
    }
    case 'rubys-knife': {
      const targets = [];
      for (const c of player.battlefield) {
        if (isCreatureType(c.type) && c.currentAttack <= 3) targets.push({ type: 'creature', instanceId: c.instanceId, playerId });
      }
      for (const c of opponent.battlefield) {
        if (isCreatureType(c.type) && c.currentAttack <= 3) targets.push({ type: 'creature', instanceId: c.instanceId, playerId: opponentId });
      }
      return targets;
    }
    default:
      return [];
  }
}

/**
 * Resolve a battlecry effect.
 */
export function resolveBattlecry(card, state, playerId, targetInfo) {
  let newState = { ...state };
  const opponentId = getOpponentId(playerId);

  switch (card.id) {
    case 'castiel': {
      newState = {
        ...newState,
        players: {
          ...newState.players,
          [playerId]: {
            ...newState.players[playerId],
            life: Math.min(25, newState.players[playerId].life + 3),
          },
        },
        log: addLogEntry(newState.log, `${card.name} heals ${newState.players[playerId].name} for 3.`),
      };
      break;
    }

    case 'jody-mills': {
      if (targetInfo) {
        newState = buffCreature(newState, targetInfo.playerId, targetInfo.instanceId, 1, 1);
        const target = findCreature(newState, targetInfo.playerId, targetInfo.instanceId);
        newState = { ...newState, log: addLogEntry(newState.log, `${card.name} gives ${target?.name || 'creature'} +1/+1.`) };
      }
      break;
    }

    case 'meg-masters': {
      if (targetInfo) {
        newState = dealDamageToCreature(newState, targetInfo.playerId, targetInfo.instanceId, 2);
        const target = findCreature(newState, targetInfo.playerId, targetInfo.instanceId);
        newState = { ...newState, log: addLogEntry(newState.log, `${card.name} deals 2 damage to ${target?.name || 'creature'}.`) };
      }
      break;
    }

    case 'ruby': {
      if (targetInfo) {
        newState = buffCreature(newState, targetInfo.playerId, targetInfo.instanceId, 2, 0, true);
        const target = findCreature(newState, targetInfo.playerId, targetInfo.instanceId);
        newState = { ...newState, log: addLogEntry(newState.log, `${card.name} gives ${target?.name || 'creature'} +2 Attack this turn.`) };
      }
      break;
    }

    case 'crowley': {
      if (targetInfo) {
        const target = findCreature(newState, targetInfo.playerId, targetInfo.instanceId);
        if (target && target.currentAttack <= 2) {
          // Remove from opponent
          newState = removeCreatureFromBattlefield(newState, targetInfo.playerId, targetInfo.instanceId);
          // Add to our side
          const stolen = { ...target, owner: playerId, canAttack: false, hasAttackedThisTurn: true };
          newState = {
            ...newState,
            players: {
              ...newState.players,
              [playerId]: {
                ...newState.players[playerId],
                battlefield: [...newState.players[playerId].battlefield, stolen],
              },
            },
            log: addLogEntry(newState.log, `${card.name} takes control of ${target.name}!`),
          };
        }
      }
      break;
    }

    case 'gabriel': {
      if (targetInfo) {
        const target = findCreature(newState, targetInfo.playerId, targetInfo.instanceId);
        if (target) {
          newState = removeCreatureFromBattlefield(newState, targetInfo.playerId, targetInfo.instanceId);
          // Return to hand (as a fresh card)
          const returnedCard = { ...target, currentAttack: target.baseAttack, currentHealth: target.baseHealth, maxHealth: target.baseHealth, attachedWeapons: [], canAttack: false, hasAttackedThisTurn: false, frozen: false, tempBuffs: [] };
          newState = {
            ...newState,
            players: {
              ...newState.players,
              [targetInfo.playerId]: {
                ...newState.players[targetInfo.playerId],
                hand: [...newState.players[targetInfo.playerId].hand, returnedCard],
              },
            },
            log: addLogEntry(newState.log, `${card.name} returns ${target.name} to hand!`),
          };
        }
      }
      break;
    }

    case 'shapeshifter': {
      if (targetInfo) {
        const target = findCreature(newState, targetInfo.playerId, targetInfo.instanceId);
        if (target) {
          newState = {
            ...newState,
            players: {
              ...newState.players,
              [playerId]: {
                ...newState.players[playerId],
                battlefield: newState.players[playerId].battlefield.map((c) =>
                  c.instanceId === card.instanceId
                    ? { ...c, currentAttack: target.currentAttack, currentHealth: target.currentHealth, maxHealth: target.currentHealth, baseAttack: target.currentAttack, baseHealth: target.currentHealth }
                    : c
                ),
              },
            },
            log: addLogEntry(newState.log, `${card.name} copies ${target.name}'s stats!`),
          };
        }
      }
      break;
    }

    case 'crossroads-demon': {
      const drawResult = drawCards(newState.players[playerId], 1);
      newState = {
        ...newState,
        players: {
          ...newState.players,
          [playerId]: {
            ...newState.players[playerId],
            hand: drawResult.hand,
            deck: drawResult.deck,
            life: newState.players[playerId].life - 1,
            fatigueCounter: drawResult.fatigueCounter,
          },
        },
        log: addLogEntry(newState.log, `${card.name}: Draw a card, lose 1 life.`),
      };
      break;
    }

    case 'demon-horde': {
      const boardSpace = MAX_BOARD_SIZE - newState.players[playerId].battlefield.filter(c => isCreatureType(c.type)).length;
      const tokensToSummon = Math.min(2, boardSpace);
      const tokens = [];
      for (let i = 0; i < tokensToSummon; i++) {
        const token = createTokenInstance('demon-token', playerId);
        if (token) {
          token.canAttack = false;
          tokens.push(token);
        }
      }
      newState = {
        ...newState,
        players: {
          ...newState.players,
          [playerId]: {
            ...newState.players[playerId],
            battlefield: [...newState.players[playerId].battlefield, ...tokens],
          },
        },
        log: addLogEntry(newState.log, `${card.name} summons ${tokensToSummon} Demon token(s).`),
      };
      break;
    }

    case 'host-of-heaven': {
      const boardSpace2 = MAX_BOARD_SIZE - newState.players[playerId].battlefield.filter(c => isCreatureType(c.type)).length;
      const tokensToSummon2 = Math.min(2, boardSpace2);
      const tokens2 = [];
      for (let i = 0; i < tokensToSummon2; i++) {
        const token = createTokenInstance('angel-token-2-2', playerId);
        if (token) {
          token.canAttack = false;
          tokens2.push(token);
        }
      }
      newState = {
        ...newState,
        players: {
          ...newState.players,
          [playerId]: {
            ...newState.players[playerId],
            battlefield: [...newState.players[playerId].battlefield, ...tokens2],
          },
        },
        log: addLogEntry(newState.log, `${card.name} summons ${tokensToSummon2} Angel token(s).`),
      };
      break;
    }

    case 'vampire-nest': {
      const boardSpace3 = MAX_BOARD_SIZE - newState.players[playerId].battlefield.filter(c => isCreatureType(c.type)).length;
      const tokensToSummon3 = Math.min(2, boardSpace3);
      const tokens3 = [];
      for (let i = 0; i < tokensToSummon3; i++) {
        const token = createTokenInstance('vampire-token', playerId);
        if (token) {
          token.canAttack = false;
          tokens3.push(token);
        }
      }
      newState = {
        ...newState,
        players: {
          ...newState.players,
          [playerId]: {
            ...newState.players[playerId],
            battlefield: [...newState.players[playerId].battlefield, ...tokens3],
          },
        },
        log: addLogEntry(newState.log, `${card.name} summons ${tokensToSummon3} Vampire token(s).`),
      };
      break;
    }

    case 'jack-kline': {
      // Deal 3 damage to all enemy creatures
      const enemyBattlefield = [...newState.players[opponentId].battlefield];
      const updatedEnemies = enemyBattlefield.map((c) => {
        if (isCreatureType(c.type)) {
          return { ...c, currentHealth: c.currentHealth - 3 };
        }
        return c;
      });
      newState = {
        ...newState,
        players: {
          ...newState.players,
          [opponentId]: {
            ...newState.players[opponentId],
            battlefield: updatedEnemies,
          },
        },
        log: addLogEntry(newState.log, `${card.name} deals 3 damage to all enemy creatures!`),
      };
      newState = processDeaths(newState);
      break;
    }

    case 'michael': {
      const enemyBf = [...newState.players[opponentId].battlefield];
      const updatedEnemies2 = enemyBf.map((c) => {
        if (isCreatureType(c.type)) {
          return { ...c, currentHealth: c.currentHealth - 4 };
        }
        return c;
      });
      newState = {
        ...newState,
        players: {
          ...newState.players,
          [opponentId]: {
            ...newState.players[opponentId],
            battlefield: updatedEnemies2,
          },
        },
        log: addLogEntry(newState.log, `${card.name} deals 4 damage to all enemy creatures!`),
      };
      newState = processDeaths(newState);
      break;
    }

    case 'ash': {
      const deck = newState.players[playerId].deck;
      if (deck.length > 0) {
        const topCard = deck[0];
        newState = {
          ...newState,
          log: addLogEntry(newState.log, `${card.name} reveals the top card: ${topCard.name}.`),
          revealedCard: { card: topCard, playerId },
        };
      }
      break;
    }

    case 'cupid': {
      newState = {
        ...newState,
        players: {
          ...newState.players,
          [playerId]: {
            ...newState.players[playerId],
            life: Math.min(25, newState.players[playerId].life + 2),
          },
        },
        log: addLogEntry(newState.log, `${card.name} heals ${newState.players[playerId].name} for 2.`),
      };
      break;
    }

    case 'rubys-knife': {
      // This is handled when the weapon is attached with a battlecry target
      // The exorcise effect destroys a creature with 3 or less attack
      if (targetInfo) {
        const target = findCreature(newState, targetInfo.playerId, targetInfo.instanceId);
        if (target && target.currentAttack <= 3) {
          newState = destroyCreature(newState, targetInfo.playerId, targetInfo.instanceId);
          newState = { ...newState, log: addLogEntry(newState.log, `Ruby's Knife destroys ${target.name}!`) };
        }
      }
      break;
    }

    default:
      break;
  }

  return newState;
}

/**
 * Resolve a spell card effect.
 */
export function resolveSpell(card, state, playerId, targetInfo) {
  let newState = { ...state };
  const opponentId = getOpponentId(playerId);

  switch (card.id) {
    case 'dead-mans-blood': {
      if (targetInfo) {
        const target = findCreature(newState, targetInfo.playerId, targetInfo.instanceId);
        if (target && !hasKeyword(target, KEYWORDS.WARD)) {
          newState = {
            ...newState,
            players: {
              ...newState.players,
              [targetInfo.playerId]: {
                ...newState.players[targetInfo.playerId],
                battlefield: newState.players[targetInfo.playerId].battlefield.map((c) =>
                  c.instanceId === targetInfo.instanceId
                    ? { ...c, currentAttack: 0, tempBuffs: [...(c.tempBuffs || []), { type: 'deadmansblood', originalAttack: c.currentAttack, expiresOnTurn: newState.turn + 1, expiresForPlayer: playerId }] }
                    : c
                ),
              },
            },
            log: addLogEntry(newState.log, `Dead Man's Blood reduces ${target.name}'s Attack to 0!`),
          };
        }
      }
      break;
    }

    case 'soul-deal': {
      const drawResult = drawCards(newState.players[playerId], 2);
      newState = {
        ...newState,
        players: {
          ...newState.players,
          [playerId]: {
            ...newState.players[playerId],
            hand: drawResult.hand,
            deck: drawResult.deck,
            life: newState.players[playerId].life - 3,
            fatigueCounter: drawResult.fatigueCounter,
          },
        },
        log: addLogEntry(newState.log, 'Soul Deal: Draw 2 cards, lose 3 life.'),
      };
      break;
    }

    case 'hex-bag': {
      if (targetInfo) {
        const target = findCreature(newState, targetInfo.playerId, targetInfo.instanceId);
        if (target && !hasKeyword(target, KEYWORDS.WARD)) {
          newState = dealDamageToCreature(newState, targetInfo.playerId, targetInfo.instanceId, 3);
          newState = { ...newState, log: addLogEntry(newState.log, `Hex Bag deals 3 damage to ${target.name}.`) };
          newState = processDeaths(newState);
        }
      }
      break;
    }

    case 'demonic-possession': {
      if (targetInfo) {
        const target = findCreature(newState, targetInfo.playerId, targetInfo.instanceId);
        if (target && target.currentHealth <= 3 && !hasKeyword(target, KEYWORDS.WARD)) {
          newState = removeCreatureFromBattlefield(newState, targetInfo.playerId, targetInfo.instanceId);
          const possessed = { ...target, owner: playerId, canAttack: true, hasAttackedThisTurn: false, tempBuffs: [...(target.tempBuffs || []), { type: 'possession', returnTo: targetInfo.playerId, expiresEndOfTurn: true }] };
          newState = {
            ...newState,
            players: {
              ...newState.players,
              [playerId]: {
                ...newState.players[playerId],
                battlefield: [...newState.players[playerId].battlefield, possessed],
              },
            },
            log: addLogEntry(newState.log, `Demonic Possession takes control of ${target.name}!`),
          };
        }
      }
      break;
    }

    case 'crossroads-pact': {
      if (targetInfo) {
        newState = buffCreature(newState, targetInfo.playerId, targetInfo.instanceId, 3, 3);
        const target = findCreature(newState, targetInfo.playerId, targetInfo.instanceId);
        // Mark for death next turn
        newState = {
          ...newState,
          players: {
            ...newState.players,
            [targetInfo.playerId]: {
              ...newState.players[targetInfo.playerId],
              battlefield: newState.players[targetInfo.playerId].battlefield.map((c) =>
                c.instanceId === targetInfo.instanceId
                  ? { ...c, tempBuffs: [...(c.tempBuffs || []), { type: 'pact_death', diesOnTurn: newState.turn + 2 }] }
                  : c
              ),
            },
          },
          log: addLogEntry(newState.log, `Crossroads Pact gives ${target?.name || 'creature'} +3/+3, but it will die!`),
        };
      }
      break;
    }

    case 'smite': {
      if (targetInfo) {
        const target = findCreature(newState, targetInfo.playerId, targetInfo.instanceId);
        if (target && !hasKeyword(target, KEYWORDS.WARD)) {
          newState = dealDamageToCreature(newState, targetInfo.playerId, targetInfo.instanceId, 5);
          newState = { ...newState, log: addLogEntry(newState.log, `Smite deals 5 damage to ${target.name}!`) };
          newState = processDeaths(newState);
        }
      }
      break;
    }

    case 'divine-shield': {
      if (targetInfo) {
        const target = findCreature(newState, targetInfo.playerId, targetInfo.instanceId);
        if (target) {
          newState = {
            ...newState,
            players: {
              ...newState.players,
              [targetInfo.playerId]: {
                ...newState.players[targetInfo.playerId],
                battlefield: newState.players[targetInfo.playerId].battlefield.map((c) =>
                  c.instanceId === targetInfo.instanceId
                    ? {
                        ...c,
                        currentHealth: c.currentHealth + 3,
                        maxHealth: c.maxHealth + 3,
                        keywords: c.keywords.includes(KEYWORDS.WARD) ? c.keywords : [...c.keywords, KEYWORDS.WARD],
                      }
                    : c
                ),
              },
            },
            log: addLogEntry(newState.log, `Divine Shield gives ${target.name} +0/+3 and Ward.`),
          };
        }
      }
      break;
    }

    case 'angels-grace': {
      newState = {
        ...newState,
        players: {
          ...newState.players,
          [playerId]: {
            ...newState.players[playerId],
            life: Math.min(25, newState.players[playerId].life + 4),
          },
        },
        log: addLogEntry(newState.log, `Angel's Grace heals ${newState.players[playerId].name} for 4.`),
      };
      break;
    }

    case 'holy-fire': {
      // Deal 3 damage to ALL creatures
      const newPlayers = { ...newState.players };
      for (const pid of [1, 2]) {
        newPlayers[pid] = {
          ...newPlayers[pid],
          battlefield: newPlayers[pid].battlefield.map((c) => {
            if (isCreatureType(c.type)) {
              return { ...c, currentHealth: c.currentHealth - 3 };
            }
            return c;
          }),
        };
      }
      newState = { ...newState, players: newPlayers, log: addLogEntry(newState.log, 'Holy Fire deals 3 damage to all creatures!') };
      newState = processDeaths(newState);
      break;
    }

    case 'witchs-brew': {
      if (targetInfo) {
        const target = findCreature(newState, targetInfo.playerId, targetInfo.instanceId);
        if (target && !hasKeyword(target, KEYWORDS.WARD)) {
          newState = dealDamageToCreature(newState, targetInfo.playerId, targetInfo.instanceId, 2);
          newState = { ...newState, log: addLogEntry(newState.log, `Witch's Brew deals 2 damage to ${target.name}.`) };
          newState = processDeaths(newState);
        }
      }
      // Also draw a card
      const drawResult = drawCards(newState.players[playerId], 1);
      newState = {
        ...newState,
        players: {
          ...newState.players,
          [playerId]: {
            ...newState.players[playerId],
            hand: drawResult.hand,
            deck: drawResult.deck,
            fatigueCounter: drawResult.fatigueCounter,
          },
        },
      };
      if (drawResult.fatigueDamage > 0) {
        newState.players[playerId].life -= drawResult.fatigueDamage;
      }
      newState = { ...newState, log: addLogEntry(newState.log, "Witch's Brew: Draw a card.") };
      break;
    }

    case 'devils-trap': {
      if (targetInfo) {
        const target = findCreature(newState, targetInfo.playerId, targetInfo.instanceId);
        if (target && !hasKeyword(target, KEYWORDS.WARD)) {
          newState = {
            ...newState,
            players: {
              ...newState.players,
              [targetInfo.playerId]: {
                ...newState.players[targetInfo.playerId],
                battlefield: newState.players[targetInfo.playerId].battlefield.map((c) =>
                  c.instanceId === targetInfo.instanceId ? { ...c, frozen: true } : c
                ),
              },
            },
            log: addLogEntry(newState.log, `Devil's Trap freezes ${target.name}!`),
          };
        }
      }
      break;
    }

    case 'the-coin': {
      newState = {
        ...newState,
        players: {
          ...newState.players,
          [playerId]: {
            ...newState.players[playerId],
            loreCurrent: newState.players[playerId].loreCurrent + 1,
          },
        },
        log: addLogEntry(newState.log, 'The Coin grants 1 extra Lore.'),
      };
      break;
    }

    default:
      break;
  }

  // Sam Winchester passive: when you play a spell, draw a card
  const playerBattlefield = newState.players[playerId].battlefield;
  const hasSam = playerBattlefield.some((c) => c.id === 'sam-winchester');
  if (hasSam) {
    const drawResult = drawCards(newState.players[playerId], 1);
    newState = {
      ...newState,
      players: {
        ...newState.players,
        [playerId]: {
          ...newState.players[playerId],
          hand: drawResult.hand,
          deck: drawResult.deck,
          fatigueCounter: drawResult.fatigueCounter,
        },
      },
      log: addLogEntry(newState.log, "Sam Winchester's ability: Draw a card."),
    };
    if (drawResult.fatigueDamage > 0) {
      newState.players[playerId] = {
        ...newState.players[playerId],
        life: newState.players[playerId].life - drawResult.fatigueDamage,
      };
    }
  }

  return newState;
}

/**
 * Returns true if a spell needs a target.
 */
export function spellNeedsTarget(card) {
  const targeted = [
    'dead-mans-blood',
    'hex-bag',
    'demonic-possession',
    'crossroads-pact',
    'smite',
    'divine-shield',
    'witchs-brew',
    'devils-trap',
  ];
  return targeted.includes(card.id);
}

/**
 * Get valid spell targets.
 */
export function getSpellTargets(card, state, playerId) {
  const opponentId = getOpponentId(playerId);
  const player = state.players[playerId];
  const opponent = state.players[opponentId];

  switch (card.id) {
    case 'dead-mans-blood': {
      return opponent.battlefield
        .filter((c) => isCreatureType(c.type) && !hasKeyword(c, KEYWORDS.WARD))
        .map((c) => ({ type: 'creature', instanceId: c.instanceId, playerId: opponentId }));
    }
    case 'hex-bag': {
      const targets = [];
      for (const c of player.battlefield) {
        if (isCreatureType(c.type)) targets.push({ type: 'creature', instanceId: c.instanceId, playerId });
      }
      for (const c of opponent.battlefield) {
        if (isCreatureType(c.type) && !hasKeyword(c, KEYWORDS.WARD)) targets.push({ type: 'creature', instanceId: c.instanceId, playerId: opponentId });
      }
      return targets;
    }
    case 'demonic-possession': {
      return opponent.battlefield
        .filter((c) => isCreatureType(c.type) && c.currentHealth <= 3 && !hasKeyword(c, KEYWORDS.WARD))
        .map((c) => ({ type: 'creature', instanceId: c.instanceId, playerId: opponentId }));
    }
    case 'crossroads-pact': {
      return player.battlefield
        .filter((c) => isCreatureType(c.type))
        .map((c) => ({ type: 'creature', instanceId: c.instanceId, playerId }));
    }
    case 'smite': {
      const targets = [];
      for (const c of player.battlefield) {
        if (isCreatureType(c.type)) targets.push({ type: 'creature', instanceId: c.instanceId, playerId });
      }
      for (const c of opponent.battlefield) {
        if (isCreatureType(c.type) && !hasKeyword(c, KEYWORDS.WARD)) targets.push({ type: 'creature', instanceId: c.instanceId, playerId: opponentId });
      }
      return targets;
    }
    case 'divine-shield': {
      const targets = [];
      for (const c of player.battlefield) {
        if (isCreatureType(c.type)) targets.push({ type: 'creature', instanceId: c.instanceId, playerId });
      }
      for (const c of opponent.battlefield) {
        if (isCreatureType(c.type)) targets.push({ type: 'creature', instanceId: c.instanceId, playerId: opponentId });
      }
      return targets;
    }
    case 'witchs-brew': {
      const targets = [];
      for (const c of player.battlefield) {
        if (isCreatureType(c.type)) targets.push({ type: 'creature', instanceId: c.instanceId, playerId });
      }
      for (const c of opponent.battlefield) {
        if (isCreatureType(c.type) && !hasKeyword(c, KEYWORDS.WARD)) targets.push({ type: 'creature', instanceId: c.instanceId, playerId: opponentId });
      }
      return targets;
    }
    case 'devils-trap': {
      return opponent.battlefield
        .filter((c) => isCreatureType(c.type) && !hasKeyword(c, KEYWORDS.WARD))
        .map((c) => ({ type: 'creature', instanceId: c.instanceId, playerId: opponentId }));
    }
    default:
      return [];
  }
}

/**
 * Resolve Last Stand (deathrattle) effects.
 */
export function resolveLastStand(creature, state, playerId) {
  let newState = { ...state };
  const opponentId = getOpponentId(playerId);

  switch (creature.id) {
    case 'garth-fitzgerald': {
      const drawResult = drawCards(newState.players[playerId], 1);
      newState = {
        ...newState,
        players: {
          ...newState.players,
          [playerId]: {
            ...newState.players[playerId],
            hand: drawResult.hand,
            deck: drawResult.deck,
            fatigueCounter: drawResult.fatigueCounter,
          },
        },
        log: addLogEntry(newState.log, `${creature.name}'s Last Stand: Draw a card.`),
      };
      if (drawResult.fatigueDamage > 0) {
        newState.players[playerId].life -= drawResult.fatigueDamage;
      }
      break;
    }

    case 'lilith': {
      // Destroy all creatures
      const destroyedNames = [];
      for (const pid of [1, 2]) {
        for (const c of newState.players[pid].battlefield) {
          if (isCreatureType(c.type)) {
            destroyedNames.push(c.name);
          }
        }
        newState = {
          ...newState,
          players: {
            ...newState.players,
            [pid]: {
              ...newState.players[pid],
              battlefield: newState.players[pid].battlefield.filter((c) => !isCreatureType(c.type)),
              empty: [...newState.players[pid].empty, ...newState.players[pid].battlefield.filter((c) => isCreatureType(c.type))],
            },
          },
        };
      }
      newState = {
        ...newState,
        log: addLogEntry(newState.log, `${creature.name}'s Last Stand: All creatures destroyed!`),
        deathCount: (newState.deathCount || 0) + destroyedNames.length,
      };
      break;
    }

    case 'ghost': {
      newState = {
        ...newState,
        players: {
          ...newState.players,
          [opponentId]: {
            ...newState.players[opponentId],
            life: newState.players[opponentId].life - 2,
          },
        },
        log: addLogEntry(newState.log, `${creature.name}'s Last Stand: Deal 2 damage to enemy hero.`),
      };
      break;
    }

    default:
      break;
  }

  return newState;
}

// Helper functions

function findCreature(state, playerId, instanceId) {
  return state.players[playerId]?.battlefield.find((c) => c.instanceId === instanceId);
}

function buffCreature(state, playerId, instanceId, attackBuff, healthBuff, temporary = false) {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        battlefield: state.players[playerId].battlefield.map((c) =>
          c.instanceId === instanceId
            ? {
                ...c,
                currentAttack: c.currentAttack + attackBuff,
                currentHealth: c.currentHealth + healthBuff,
                maxHealth: temporary ? c.maxHealth : c.maxHealth + healthBuff,
                tempBuffs: temporary
                  ? [...(c.tempBuffs || []), { type: 'buff', attack: attackBuff, health: healthBuff, expiresEndOfTurn: true }]
                  : c.tempBuffs || [],
              }
            : c
        ),
      },
    },
  };
}

export function dealDamageToCreature(state, playerId, instanceId, damage) {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        battlefield: state.players[playerId].battlefield.map((c) =>
          c.instanceId === instanceId ? { ...c, currentHealth: c.currentHealth - damage } : c
        ),
      },
    },
  };
}

function removeCreatureFromBattlefield(state, playerId, instanceId) {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        battlefield: state.players[playerId].battlefield.filter((c) => c.instanceId !== instanceId),
      },
    },
  };
}

export function destroyCreature(state, playerId, instanceId) {
  const creature = findCreature(state, playerId, instanceId);
  if (!creature) return state;

  let newState = removeCreatureFromBattlefield(state, playerId, instanceId);
  newState = {
    ...newState,
    players: {
      ...newState.players,
      [playerId]: {
        ...newState.players[playerId],
        empty: [...newState.players[playerId].empty, creature],
      },
    },
    deathCount: (newState.deathCount || 0) + 1,
  };

  // Resolve last stand
  if (creature.effectType === 'deathrattle') {
    newState = resolveLastStand(creature, newState, playerId);
  }

  return newState;
}

export function processDeaths(state) {
  let newState = { ...state };
  let hasDeaths = true;

  while (hasDeaths) {
    hasDeaths = false;
    for (const pid of [1, 2]) {
      const dying = newState.players[pid].battlefield.filter(
        (c) => isCreatureType(c.type) && c.currentHealth <= 0
      );
      if (dying.length > 0) {
        hasDeaths = true;
        for (const creature of dying) {
          newState = destroyCreature(newState, pid, creature.instanceId);
        }
      }
    }
  }

  return newState;
}
