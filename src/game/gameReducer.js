import { ACTIONS } from './gameActions.js';
import {
  STARTING_HP,
  MAX_HAND_SIZE,
  MAX_BOARD_SIZE,
  MAX_LORE,
  STARTING_HAND_P1,
  STARTING_HAND_P2,
  PHASES,
  TURN_PHASES,
  TARGET_MODES,
  CARD_TYPES,
  KEYWORDS,
} from './constants.js';
import {
  buildDeck,
  drawCards,
  canPlayCard,
  isCreatureType,
  hasKeyword,
  getEffectiveAttack,
  getEffectiveHealth,
  getValidAttackTargets,
  canCreatureAttack,
  addLogEntry,
  getOpponentId,
  createCardInstance,
  computeLuciferCost,
  createTokenInstance,
  resetInstanceIdCounter,
} from './gameUtils.js';
import {
  resolveBattlecry,
  resolveSpell,
  resolveLastStand,
  processDeaths,
  dealDamageToCreature,
  destroyCreature,
  battlecryNeedsTarget,
  getBattlecryTargets,
  spellNeedsTarget,
  getSpellTargets,
} from './cardEffects.js';
import decksData from '../data/decks.json';

export function createInitialState() {
  return {
    phase: PHASES.TITLE,
    mode: 'pvp',
    turn: 0,
    activePlayer: 1,
    turnPhase: null,
    winner: null,
    selectedCard: null,
    targetMode: null,
    validTargets: [],
    pendingCard: null,
    animations: [],
    log: [],
    fatigue: { 1: 0, 2: 0 },
    deathCount: 0,
    revealedCard: null,
    players: {
      1: createPlayerState(1, 'Player 1'),
      2: createPlayerState(2, 'Player 2'),
    },
  };
}

function createPlayerState(id, name) {
  return {
    id,
    name,
    life: STARTING_HP,
    loreMax: 0,
    loreCurrent: 0,
    deck: [],
    hand: [],
    battlefield: [],
    empty: [],
    fatigueCounter: 0,
  };
}

export function gameReducer(state, action) {
  switch (action.type) {
    case ACTIONS.START_GAME:
      return handleStartGame(state, action.payload?.mode || 'pvp');
    case ACTIONS.PLAY_CARD:
      return handlePlayCard(state, action.payload);
    case ACTIONS.SELECT_ATTACKER:
      return handleSelectAttacker(state, action.payload);
    case ACTIONS.SELECT_TARGET:
      return handleSelectTarget(state, action.payload);
    case ACTIONS.END_TURN:
      return handleEndTurn(state);
    case ACTIONS.CANCEL_SELECTION:
      return handleCancelSelection(state);
    case ACTIONS.DISMISS_REVEALED_CARD:
      return { ...state, revealedCard: null };
    case ACTIONS.PLAY_AGAIN:
      return handleStartGame(createInitialState(), state.mode || 'pvp');
    case ACTIONS.CLEAR_ANIMATION:
      return { ...state, animations: state.animations.slice(1) };
    default:
      return state;
  }
}

function handleStartGame(state, mode = 'pvp') {
  resetInstanceIdCounter();

  const deck1 = buildDeck(decksData.teamFreeWill.cards, 1);
  const deck2 = buildDeck(decksData.hellsArmy.cards, 2);

  let player1 = { ...createPlayerState(1, 'Team Free Will'), deck: deck1 };
  let player2 = { ...createPlayerState(2, "Hell's Army"), deck: deck2 };

  // Draw starting hands
  const draw1 = drawCards(player1, STARTING_HAND_P1);
  player1 = { ...player1, hand: draw1.hand, deck: draw1.deck, fatigueCounter: draw1.fatigueCounter };

  const draw2 = drawCards(player2, STARTING_HAND_P2);
  player2 = { ...player2, hand: draw2.hand, deck: draw2.deck, fatigueCounter: draw2.fatigueCounter };

  // Give Player 2 The Coin
  const coinData = { id: 'the-coin', name: 'The Coin', type: CARD_TYPES.SPELL, cost: 0, attack: 0, health: 0, keywords: [], effect: 'Gain 1 Lore this turn only.', effectType: 'instant', flavor: '"A bit of extra power."', art: '🪙', faction: 'neutral', rarity: 'common' };
  const coinInstance = createCardInstance(coinData, 2);
  player2.hand.push(coinInstance);

  // Player 1 starts: increase lore to 1, draw a card
  player1.loreMax = 1;
  player1.loreCurrent = 1;
  const firstDraw = drawCards(player1, 1);
  player1 = { ...player1, hand: firstDraw.hand, deck: firstDraw.deck, fatigueCounter: firstDraw.fatigueCounter };

  return {
    ...state,
    phase: PHASES.PLAYING,
    mode,
    turn: 1,
    activePlayer: 1,
    turnPhase: TURN_PHASES.MAIN,
    winner: null,
    selectedCard: null,
    targetMode: null,
    validTargets: [],
    pendingCard: null,
    animations: [],
    log: [{ message: 'Game started! Player 1 goes first.', timestamp: Date.now() }],
    fatigue: { 1: 0, 2: 0 },
    deathCount: 0,
    revealedCard: null,
    players: { 1: player1, 2: player2 },
  };
}

function handlePlayCard(state, { handIndex, playerId }) {
  if (state.phase !== PHASES.PLAYING) return state;
  if (state.activePlayer !== playerId) return state;
  if (state.turnPhase !== TURN_PHASES.MAIN) return state;

  const player = state.players[playerId];
  const card = player.hand[handIndex];
  if (!card) return state;

  // Compute cost (Lucifer discount)
  const actualCost = computeLuciferCost(card, state);

  // Check if player has enough Lore
  if (player.loreCurrent < actualCost) return state;

  // Handle different card types
  if (isCreatureType(card.type)) {
    return handlePlayCreature(state, card, handIndex, playerId, actualCost);
  } else if (card.type === CARD_TYPES.SPELL) {
    return handlePlaySpell(state, card, handIndex, playerId, actualCost);
  } else if (card.type === CARD_TYPES.WEAPON) {
    return handlePlayWeapon(state, card, handIndex, playerId, actualCost);
  } else if (card.type === CARD_TYPES.LORE) {
    return handlePlayLore(state, card, handIndex, playerId, actualCost);
  }

  return state;
}

function handlePlayCreature(state, card, handIndex, playerId, cost) {
  const player = state.players[playerId];
  const creatureCount = player.battlefield.filter((c) => isCreatureType(c.type)).length;
  if (creatureCount >= MAX_BOARD_SIZE) return state;

  // Check if this creature's battlecry needs a target
  if (battlecryNeedsTarget(card)) {
    const targets = getBattlecryTargets(card, state, playerId);
    if (targets.length > 0) {
      // Enter targeting mode
      return {
        ...state,
        targetMode: TARGET_MODES.BATTLECRY_TARGET,
        validTargets: targets,
        pendingCard: { card, handIndex, playerId, cost, type: 'creature' },
      };
    }
    // If no valid targets, play without battlecry
  }

  return finishPlayCreature(state, card, handIndex, playerId, cost, null);
}

function finishPlayCreature(state, card, handIndex, playerId, cost, targetInfo) {
  const player = state.players[playerId];
  const newHand = [...player.hand];
  newHand.splice(handIndex, 1);

  const creature = {
    ...card,
    owner: playerId,
    canAttack: hasKeyword(card, KEYWORDS.RUSH),
    hasAttackedThisTurn: false,
  };

  let newState = {
    ...state,
    selectedCard: null,
    targetMode: null,
    validTargets: [],
    pendingCard: null,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        hand: newHand,
        loreCurrent: player.loreCurrent - cost,
        battlefield: [...player.battlefield, creature],
      },
    },
    log: addLogEntry(state.log, `${player.name} plays ${card.name} (${cost} Lore).`),
    animations: [...state.animations, { type: 'play_card', card, playerId }],
  };

  // Resolve battlecry
  if (card.effectType === 'battlecry') {
    newState = resolveBattlecry(card, newState, playerId, targetInfo);
  }

  newState = processDeaths(newState);
  newState = checkWinCondition(newState);

  return newState;
}

function handlePlaySpell(state, card, handIndex, playerId, cost) {
  // Check if spell needs a target
  if (spellNeedsTarget(card)) {
    const targets = getSpellTargets(card, state, playerId);
    if (targets.length === 0) return state; // No valid targets
    return {
      ...state,
      targetMode: TARGET_MODES.SPELL_TARGET,
      validTargets: targets,
      pendingCard: { card, handIndex, playerId, cost, type: 'spell' },
    };
  }

  return finishPlaySpell(state, card, handIndex, playerId, cost, null);
}

function finishPlaySpell(state, card, handIndex, playerId, cost, targetInfo) {
  const player = state.players[playerId];
  const newHand = [...player.hand];
  newHand.splice(handIndex, 1);

  let newState = {
    ...state,
    selectedCard: null,
    targetMode: null,
    validTargets: [],
    pendingCard: null,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        hand: newHand,
        loreCurrent: player.loreCurrent - cost,
        empty: [...player.empty, card],
      },
    },
    log: addLogEntry(state.log, `${player.name} casts ${card.name} (${cost} Lore).`),
    animations: [...state.animations, { type: 'spell_cast', card, playerId }],
  };

  newState = resolveSpell(card, newState, playerId, targetInfo);
  newState = processDeaths(newState);
  newState = checkWinCondition(newState);

  return newState;
}

function handlePlayWeapon(state, card, handIndex, playerId, cost) {
  const player = state.players[playerId];
  const friendlyCreatures = player.battlefield.filter((c) => {
    if (!isCreatureType(c.type)) return false;
    const maxWeapons = hasKeyword(c, KEYWORDS.VESSEL) ? 2 : 1;
    return c.attachedWeapons.length < maxWeapons;
  });

  if (friendlyCreatures.length === 0) return state;

  if (friendlyCreatures.length === 1 && !battlecryNeedsTarget(card)) {
    // Auto-attach to only valid target
    return finishPlayWeapon(state, card, handIndex, playerId, cost, {
      type: 'creature',
      instanceId: friendlyCreatures[0].instanceId,
      playerId,
    }, null);
  }

  const weaponTargets = friendlyCreatures.map((c) => ({
    type: 'creature',
    instanceId: c.instanceId,
    playerId,
  }));

  return {
    ...state,
    targetMode: TARGET_MODES.WEAPON_TARGET,
    validTargets: weaponTargets,
    pendingCard: { card, handIndex, playerId, cost, type: 'weapon' },
  };
}

function finishPlayWeapon(state, card, handIndex, playerId, cost, weaponTargetInfo, battlecryTarget) {
  const player = state.players[playerId];
  const newHand = [...player.hand];
  newHand.splice(handIndex, 1);

  const weaponData = { ...card };

  let newState = {
    ...state,
    selectedCard: null,
    targetMode: null,
    validTargets: [],
    pendingCard: null,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        hand: newHand,
        loreCurrent: player.loreCurrent - cost,
        battlefield: player.battlefield.map((c) =>
          c.instanceId === weaponTargetInfo.instanceId
            ? { ...c, attachedWeapons: [...c.attachedWeapons, weaponData] }
            : c
        ),
      },
    },
    log: addLogEntry(
      state.log,
      `${player.name} equips ${card.name} on ${player.battlefield.find((c) => c.instanceId === weaponTargetInfo.instanceId)?.name || 'creature'} (${cost} Lore).`
    ),
    animations: [...state.animations, { type: 'play_card', card, playerId }],
  };

  // Resolve weapon battlecry if it has one (e.g., Ruby's Knife)
  if (card.effectType === 'battlecry' && battlecryTarget) {
    newState = resolveBattlecry(card, newState, playerId, battlecryTarget);
    newState = processDeaths(newState);
  }

  newState = checkWinCondition(newState);

  return newState;
}

function handlePlayLore(state, card, handIndex, playerId, cost) {
  const player = state.players[playerId];
  const newHand = [...player.hand];
  newHand.splice(handIndex, 1);

  const loreCard = {
    ...card,
    owner: playerId,
    instanceId: card.instanceId,
  };

  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        hand: newHand,
        loreCurrent: player.loreCurrent - cost,
        battlefield: [...player.battlefield, loreCard],
      },
    },
    log: addLogEntry(state.log, `${player.name} plays ${card.name} (${cost} Lore).`),
    animations: [...state.animations, { type: 'play_card', card, playerId }],
  };
}

function handleSelectAttacker(state, { instanceId, playerId }) {
  if (state.phase !== PHASES.PLAYING) return state;
  if (state.activePlayer !== playerId) return state;
  if (state.turnPhase !== TURN_PHASES.MAIN) return state;
  if (state.targetMode && state.targetMode !== TARGET_MODES.ATTACK) return state;

  const creature = state.players[playerId].battlefield.find(
    (c) => c.instanceId === instanceId
  );
  if (!creature || !canCreatureAttack(creature, state, playerId)) return state;

  const validTargets = getValidAttackTargets(state, playerId);

  return {
    ...state,
    selectedCard: { zone: 'battlefield', instanceId, playerId },
    targetMode: TARGET_MODES.ATTACK,
    validTargets,
  };
}

function handleSelectTarget(state, targetInfo) {
  if (!state.targetMode) return state;

  switch (state.targetMode) {
    case TARGET_MODES.ATTACK:
      return resolveAttack(state, targetInfo);
    case TARGET_MODES.SPELL_TARGET:
      return resolveSpellTarget(state, targetInfo);
    case TARGET_MODES.BATTLECRY_TARGET:
      return resolveBattlecryTarget(state, targetInfo);
    case TARGET_MODES.WEAPON_TARGET:
      return resolveWeaponTarget(state, targetInfo);
    default:
      return state;
  }
}

function resolveAttack(state, targetInfo) {
  const { instanceId: attackerInstanceId, playerId: attackerPlayerId } = state.selectedCard;
  const attacker = state.players[attackerPlayerId].battlefield.find(
    (c) => c.instanceId === attackerInstanceId
  );

  if (!attacker) return handleCancelSelection(state);

  const opponentId = getOpponentId(attackerPlayerId);
  const attackerEffectiveAttack = getEffectiveAttack(attacker, state, attackerPlayerId);

  // Dean Winchester passive: when Dean attacks alone
  let bonusDamage = 0;
  if (attacker.id === 'dean-winchester') {
    const otherAttackers = state.players[attackerPlayerId].battlefield.filter(
      (c) => isCreatureType(c.type) && c.instanceId !== attacker.instanceId
    );
    if (otherAttackers.length === 0) {
      bonusDamage = 2;
    }
  }

  let newState = { ...state };

  if (targetInfo.type === 'hero') {
    // Attack hero
    const totalDamage = attackerEffectiveAttack + bonusDamage;
    newState = {
      ...newState,
      players: {
        ...newState.players,
        [opponentId]: {
          ...newState.players[opponentId],
          life: newState.players[opponentId].life - totalDamage,
        },
        [attackerPlayerId]: {
          ...newState.players[attackerPlayerId],
          battlefield: newState.players[attackerPlayerId].battlefield.map((c) =>
            c.instanceId === attackerInstanceId ? { ...c, hasAttackedThisTurn: true, canAttack: true } : c
          ),
        },
      },
      log: addLogEntry(newState.log, `${attacker.name} attacks ${newState.players[opponentId].name} for ${totalDamage} damage.`),
      animations: [...newState.animations, { type: 'attack_hero', attacker, playerId: attackerPlayerId, damage: totalDamage }],
    };

    // Lifesteal
    if (hasKeyword(attacker, KEYWORDS.LIFESTEAL)) {
      newState = {
        ...newState,
        players: {
          ...newState.players,
          [attackerPlayerId]: {
            ...newState.players[attackerPlayerId],
            life: Math.min(25, newState.players[attackerPlayerId].life + totalDamage),
          },
        },
        log: addLogEntry(newState.log, `${attacker.name} heals ${newState.players[attackerPlayerId].name} for ${totalDamage} (Lifesteal).`),
      };
    }
  } else {
    // Attack creature
    const defender = newState.players[targetInfo.playerId].battlefield.find(
      (c) => c.instanceId === targetInfo.instanceId
    );
    if (!defender) return handleCancelSelection(state);

    const defenderEffectiveAttack = getEffectiveAttack(defender, newState, targetInfo.playerId);
    const totalAttackerDamage = attackerEffectiveAttack + bonusDamage;

    // Simultaneous damage
    newState = {
      ...newState,
      players: {
        ...newState.players,
        [attackerPlayerId]: {
          ...newState.players[attackerPlayerId],
          battlefield: newState.players[attackerPlayerId].battlefield.map((c) =>
            c.instanceId === attackerInstanceId
              ? { ...c, currentHealth: c.currentHealth - defenderEffectiveAttack, hasAttackedThisTurn: true, canAttack: true }
              : c
          ),
        },
        [targetInfo.playerId]: {
          ...newState.players[targetInfo.playerId],
          battlefield: newState.players[targetInfo.playerId].battlefield.map((c) =>
            c.instanceId === targetInfo.instanceId
              ? { ...c, currentHealth: c.currentHealth - totalAttackerDamage }
              : c
          ),
        },
      },
      log: addLogEntry(
        newState.log,
        `${attacker.name} attacks ${defender.name} — ${totalAttackerDamage} vs ${defenderEffectiveAttack} damage.`
      ),
      animations: [
        ...newState.animations,
        { type: 'attack_creature', attacker, defender, attackerPlayerId, defenderPlayerId: targetInfo.playerId },
      ],
    };

    // Lifesteal on creature combat
    if (hasKeyword(attacker, KEYWORDS.LIFESTEAL)) {
      newState = {
        ...newState,
        players: {
          ...newState.players,
          [attackerPlayerId]: {
            ...newState.players[attackerPlayerId],
            life: Math.min(25, newState.players[attackerPlayerId].life + totalAttackerDamage),
          },
        },
      };
    }

    // Process deaths & banish
    const updatedAttacker = newState.players[attackerPlayerId].battlefield.find(c => c.instanceId === attackerInstanceId);
    const updatedDefender = newState.players[targetInfo.playerId].battlefield.find(c => c.instanceId === targetInfo.instanceId);

    if (updatedDefender && updatedDefender.currentHealth <= 0 && hasKeyword(attacker, KEYWORDS.BANISH)) {
      // Banish: remove from game, don't go to empty
      newState = {
        ...newState,
        players: {
          ...newState.players,
          [targetInfo.playerId]: {
            ...newState.players[targetInfo.playerId],
            battlefield: newState.players[targetInfo.playerId].battlefield.filter(c => c.instanceId !== targetInfo.instanceId),
          },
        },
        deathCount: (newState.deathCount || 0) + 1,
        log: addLogEntry(newState.log, `${defender.name} is banished from the game!`),
      };
    }

    newState = processDeaths(newState);
  }

  newState = {
    ...newState,
    selectedCard: null,
    targetMode: null,
    validTargets: [],
  };

  newState = checkWinCondition(newState);

  return newState;
}

function resolveSpellTarget(state, targetInfo) {
  if (!state.pendingCard) return handleCancelSelection(state);
  const { card, handIndex, playerId, cost } = state.pendingCard;
  return finishPlaySpell(state, card, handIndex, playerId, cost, targetInfo);
}

function resolveBattlecryTarget(state, targetInfo) {
  if (!state.pendingCard) return handleCancelSelection(state);
  const { card, handIndex, playerId, cost, type } = state.pendingCard;

  if (type === 'creature') {
    return finishPlayCreature(state, card, handIndex, playerId, cost, targetInfo);
  }
  return state;
}

function resolveWeaponTarget(state, targetInfo) {
  if (!state.pendingCard) return handleCancelSelection(state);
  const { card, handIndex, playerId, cost } = state.pendingCard;

  // If weapon has a battlecry that needs a target (e.g., Ruby's Knife)
  if (battlecryNeedsTarget(card)) {
    const targets = getBattlecryTargets(card, state, playerId);
    if (targets.length > 0) {
      return {
        ...state,
        targetMode: TARGET_MODES.BATTLECRY_TARGET,
        validTargets: targets,
        pendingCard: { ...state.pendingCard, weaponTarget: targetInfo, type: 'weapon_battlecry' },
      };
    }
  }

  return finishPlayWeapon(state, card, handIndex, playerId, cost, targetInfo, null);
}

function handleEndTurn(state) {
  if (state.phase !== PHASES.PLAYING) return state;
  if (state.turnPhase !== TURN_PHASES.MAIN) return state;

  const currentPlayer = state.activePlayer;
  const nextPlayer = getOpponentId(currentPlayer);
  let newState = { ...state };

  // End of turn effects

  // Heavenly Host: summon 1/1 angel
  const currentBattlefield = newState.players[currentPlayer].battlefield;
  const hasHeavenlyHost = currentBattlefield.some((c) => c.id === 'heavenly-host');
  if (hasHeavenlyHost) {
    const creatureCount = currentBattlefield.filter(c => isCreatureType(c.type)).length;
    if (creatureCount < MAX_BOARD_SIZE) {
      const token = createTokenInstance('angel-token', currentPlayer);
      if (token) {
        token.canAttack = false;
        newState = {
          ...newState,
          players: {
            ...newState.players,
            [currentPlayer]: {
              ...newState.players[currentPlayer],
              battlefield: [...newState.players[currentPlayer].battlefield, token],
            },
          },
          log: addLogEntry(newState.log, 'Heavenly Host summons a 1/1 Angel.'),
        };
      }
    }
  }

  // First Blade: attached creature takes 1 damage at end of turn
  for (const creature of newState.players[currentPlayer].battlefield) {
    if (creature.attachedWeapons?.some((w) => w.id === 'first-blade')) {
      newState = dealDamageToCreature(newState, currentPlayer, creature.instanceId, 1);
      newState = { ...newState, log: addLogEntry(newState.log, `First Blade deals 1 damage to ${creature.name}.`) };
    }
  }

  // Remove end-of-turn temp buffs and possessed creatures
  for (const pid of [1, 2]) {
    newState = {
      ...newState,
      players: {
        ...newState.players,
        [pid]: {
          ...newState.players[pid],
          battlefield: newState.players[pid].battlefield.map((c) => {
            let updated = { ...c };
            if (updated.tempBuffs) {
              const expiringBuffs = updated.tempBuffs.filter((b) => b.expiresEndOfTurn);
              for (const buff of expiringBuffs) {
                if (buff.type === 'buff') {
                  updated.currentAttack = Math.max(0, updated.currentAttack - (buff.attack || 0));
                }
                if (buff.type === 'deadmansblood' && buff.expiresForPlayer === currentPlayer && buff.expiresOnTurn <= newState.turn + 1) {
                  // Will expire on the player's next turn start instead
                }
              }
              updated.tempBuffs = updated.tempBuffs.filter((b) => !b.expiresEndOfTurn);
            }
            return updated;
          }),
        },
      },
    };
  }

  // Handle possession returns
  for (const pid of [1, 2]) {
    const possessed = newState.players[pid].battlefield.filter(
      (c) => c.tempBuffs?.some((b) => b.type === 'possession')
    );
    for (const creature of possessed) {
      const returnBuff = creature.tempBuffs.find((b) => b.type === 'possession');
      if (returnBuff) {
        // Return to original owner
        newState = {
          ...newState,
          players: {
            ...newState.players,
            [pid]: {
              ...newState.players[pid],
              battlefield: newState.players[pid].battlefield.filter((c) => c.instanceId !== creature.instanceId),
            },
            [returnBuff.returnTo]: {
              ...newState.players[returnBuff.returnTo],
              battlefield: [...newState.players[returnBuff.returnTo].battlefield, { ...creature, owner: returnBuff.returnTo, tempBuffs: creature.tempBuffs.filter(b => b.type !== 'possession') }],
            },
          },
        };
      }
    }
  }

  // Check pact deaths
  for (const pid of [1, 2]) {
    const pactCreatures = newState.players[pid].battlefield.filter(
      (c) => c.tempBuffs?.some((b) => b.type === 'pact_death' && b.diesOnTurn <= newState.turn + 1)
    );
    for (const creature of pactCreatures) {
      newState = destroyCreature(newState, pid, creature.instanceId);
      newState = { ...newState, log: addLogEntry(newState.log, `${creature.name} dies from Crossroads Pact!`) };
    }
  }

  newState = processDeaths(newState);
  newState = checkWinCondition(newState);
  if (newState.winner) return newState;

  // Start next player's turn
  const newTurn = nextPlayer === 1 ? state.turn + 1 : state.turn;

  // Increase lore
  const nextPlayerState = newState.players[nextPlayer];
  const newLoreMax = Math.min(MAX_LORE, nextPlayerState.loreMax + 1);

  // Kevin Tran bonus
  let bonusLore = 0;
  for (const c of nextPlayerState.battlefield) {
    if (c.id === 'kevin-tran') bonusLore += 1;
  }

  let newLoreCurrent = newLoreMax + bonusLore;

  // Draw a card
  const drawResult = drawCards(nextPlayerState, 1);
  let fatigueDmg = drawResult.fatigueDamage;

  // Remove expired dead man's blood debuffs
  let updatedBattlefield = nextPlayerState.battlefield.map((c) => {
    if (c.tempBuffs?.some(b => b.type === 'deadmansblood' && b.expiresOnTurn <= newTurn && b.expiresForPlayer !== nextPlayer)) {
      const buff = c.tempBuffs.find(b => b.type === 'deadmansblood');
      return {
        ...c,
        currentAttack: buff ? buff.originalAttack : c.currentAttack,
        tempBuffs: c.tempBuffs.filter(b => b.type !== 'deadmansblood'),
      };
    }
    return c;
  });

  // Reset attack states for next player's creatures and handle frozen
  updatedBattlefield = updatedBattlefield.map((c) => {
    if (c.frozen) {
      return { ...c, frozen: false, hasAttackedThisTurn: false, canAttack: true };
    }
    return { ...c, hasAttackedThisTurn: false, canAttack: true };
  });

  // Charlie Bradbury: when you draw a card, gain +1 Attack until end of turn
  let charlieBonus = false;
  if (drawResult.hand.length > nextPlayerState.hand.length) {
    // A card was drawn
    const hasCharlie = updatedBattlefield.some(c => c.id === 'charlie-bradbury');
    if (hasCharlie) {
      charlieBonus = true;
      updatedBattlefield = updatedBattlefield.map(c =>
        c.id === 'charlie-bradbury'
          ? { ...c, currentAttack: c.currentAttack + 1, tempBuffs: [...(c.tempBuffs || []), { type: 'buff', attack: 1, health: 0, expiresEndOfTurn: true }] }
          : c
      );
    }
  }

  newState = {
    ...newState,
    turn: newTurn,
    activePlayer: nextPlayer,
    turnPhase: TURN_PHASES.MAIN,
    selectedCard: null,
    targetMode: null,
    validTargets: [],
    pendingCard: null,
    players: {
      ...newState.players,
      [nextPlayer]: {
        ...nextPlayerState,
        loreMax: newLoreMax,
        loreCurrent: newLoreCurrent,
        hand: drawResult.hand,
        deck: drawResult.deck,
        battlefield: updatedBattlefield,
        fatigueCounter: drawResult.fatigueCounter,
        life: nextPlayerState.life - fatigueDmg,
      },
    },
    log: addLogEntry(newState.log, `--- ${newState.players[nextPlayer].name}'s Turn (Turn ${newTurn}) ---`),
    animations: [...newState.animations, { type: 'turn_transition', playerId: nextPlayer }],
  };

  if (charlieBonus) {
    newState = { ...newState, log: addLogEntry(newState.log, 'Charlie Bradbury gains +1 Attack from card draw.') };
  }

  newState = checkWinCondition(newState);

  return newState;
}

function handleCancelSelection(state) {
  return {
    ...state,
    selectedCard: null,
    targetMode: null,
    validTargets: [],
    pendingCard: null,
  };
}

function checkWinCondition(state) {
  if (state.players[1].life <= 0 && state.players[2].life <= 0) {
    // Both dead - active player loses (current attacker)
    return {
      ...state,
      phase: PHASES.GAME_OVER,
      winner: getOpponentId(state.activePlayer),
      log: addLogEntry(state.log, 'Both players are defeated! The non-active player wins!'),
    };
  }
  if (state.players[1].life <= 0) {
    return {
      ...state,
      phase: PHASES.GAME_OVER,
      winner: 2,
      log: addLogEntry(state.log, `${state.players[2].name} wins!`),
    };
  }
  if (state.players[2].life <= 0) {
    return {
      ...state,
      phase: PHASES.GAME_OVER,
      winner: 1,
      log: addLogEntry(state.log, `${state.players[1].name} wins!`),
    };
  }
  return state;
}
