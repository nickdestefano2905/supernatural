import { describe, it, expect, beforeEach } from 'vitest';
import { gameReducer, createInitialState } from '../gameReducer.js';
import { ACTIONS } from '../gameActions.js';
import { PHASES, TURN_PHASES, MAX_LORE, MAX_BOARD_SIZE, MAX_HAND_SIZE } from '../constants.js';
import { createCardInstance, resetInstanceIdCounter, isCreatureType } from '../gameUtils.js';

function startGame(state) {
  return gameReducer(state, { type: ACTIONS.START_GAME });
}

function endTurn(state) {
  return gameReducer(state, { type: ACTIONS.END_TURN });
}

function playCard(state, handIndex, playerId) {
  return gameReducer(state, { type: ACTIONS.PLAY_CARD, payload: { handIndex, playerId } });
}

function selectAttacker(state, instanceId, playerId) {
  return gameReducer(state, { type: ACTIONS.SELECT_ATTACKER, payload: { instanceId, playerId } });
}

function selectTarget(state, targetInfo) {
  return gameReducer(state, { type: ACTIONS.SELECT_TARGET, payload: targetInfo });
}

// Helper to create a game state ready for testing
function createTestState() {
  resetInstanceIdCounter();
  let state = createInitialState();
  state = startGame(state);
  return state;
}

// Helper to create a custom mid-game state
function createCustomState(overrides = {}) {
  resetInstanceIdCounter();
  const { players: playersOverride, ...restOverrides } = overrides;
  const defaultPlayer1 = {
    id: 1,
    name: 'Player 1',
    life: 25,
    loreMax: 5,
    loreCurrent: 5,
    deck: [],
    hand: [],
    battlefield: [],
    empty: [],
    fatigueCounter: 0,
  };
  const defaultPlayer2 = {
    id: 2,
    name: 'Player 2',
    life: 25,
    loreMax: 4,
    loreCurrent: 4,
    deck: [],
    hand: [],
    battlefield: [],
    empty: [],
    fatigueCounter: 0,
  };
  return {
    phase: PHASES.PLAYING,
    turn: 5,
    activePlayer: 1,
    turnPhase: TURN_PHASES.MAIN,
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
    ...restOverrides,
    players: {
      1: { ...defaultPlayer1, ...(playersOverride?.[1] || {}) },
      2: { ...defaultPlayer2, ...(playersOverride?.[2] || {}) },
    },
  };
}

function makeCreature(id, name, cost, attack, health, owner, extra = {}) {
  return createCardInstance(
    { id, name, type: 'hunter', cost, attack, health, keywords: [], effect: null, effectType: null, flavor: '', art: '🃏', faction: 'hunter', rarity: 'common', ...extra },
    owner
  );
}

describe('Game Initialization', () => {
  it('starts in title phase', () => {
    const state = createInitialState();
    expect(state.phase).toBe(PHASES.TITLE);
  });

  it('transitions to playing phase on START_GAME', () => {
    const state = createTestState();
    expect(state.phase).toBe(PHASES.PLAYING);
    expect(state.turn).toBe(1);
    expect(state.activePlayer).toBe(1);
  });

  it('Player 1 starts with 5 cards (4 drawn + 1 turn draw) and 1 Lore', () => {
    const state = createTestState();
    expect(state.players[1].hand.length).toBe(5);
    expect(state.players[1].loreMax).toBe(1);
    expect(state.players[1].loreCurrent).toBe(1);
  });

  it('Player 2 starts with 6 cards (5 drawn + The Coin) and 0 Lore', () => {
    const state = createTestState();
    expect(state.players[2].hand.length).toBe(6);
    expect(state.players[2].loreMax).toBe(0);
    expect(state.players[2].loreCurrent).toBe(0);
    // Should have The Coin
    const hasCoin = state.players[2].hand.some((c) => c.id === 'the-coin');
    expect(hasCoin).toBe(true);
  });
});

describe('Playing Cards', () => {
  it('deducts Lore when playing a card', () => {
    resetInstanceIdCounter();
    const creature = makeCreature('test-creature', 'Test', 2, 2, 2, 1);
    const state = createCustomState({
      players: {
        1: { hand: [creature], loreCurrent: 5, loreMax: 5 },
      },
    });

    const newState = playCard(state, 0, 1);
    expect(newState.players[1].loreCurrent).toBe(3);
  });

  it('moves creature from hand to battlefield', () => {
    resetInstanceIdCounter();
    const creature = makeCreature('test-creature', 'Test', 2, 2, 2, 1);
    const state = createCustomState({
      players: {
        1: { hand: [creature], loreCurrent: 5, loreMax: 5 },
      },
    });

    const newState = playCard(state, 0, 1);
    expect(newState.players[1].hand.length).toBe(0);
    expect(newState.players[1].battlefield.length).toBe(1);
    expect(newState.players[1].battlefield[0].name).toBe('Test');
  });

  it('prevents playing card with insufficient Lore', () => {
    resetInstanceIdCounter();
    const creature = makeCreature('expensive', 'Expensive', 6, 5, 5, 1);
    const state = createCustomState({
      players: {
        1: { hand: [creature], loreCurrent: 3, loreMax: 3 },
      },
    });

    const newState = playCard(state, 0, 1);
    // Card should still be in hand
    expect(newState.players[1].hand.length).toBe(1);
    expect(newState.players[1].battlefield.length).toBe(0);
  });

  it('prevents playing a 7th creature (board size limit)', () => {
    resetInstanceIdCounter();
    const creatures = Array.from({ length: 6 }, (_, i) =>
      makeCreature(`c${i}`, `C${i}`, 1, 1, 1, 1)
    );
    // Set them on battlefield, already "played"
    creatures.forEach((c) => { c.canAttack = true; });

    const newCreature = makeCreature('c7', 'C7', 1, 1, 1, 1);

    const state = createCustomState({
      players: {
        1: { battlefield: creatures, hand: [newCreature], loreCurrent: 5, loreMax: 5 },
      },
    });

    const newState = playCard(state, 0, 1);
    expect(newState.players[1].battlefield.length).toBe(6);
    expect(newState.players[1].hand.length).toBe(1);
  });
});

describe('Summoning Sickness', () => {
  it('newly played creature cannot attack (no Rush)', () => {
    resetInstanceIdCounter();
    const creature = makeCreature('basic', 'Basic', 1, 2, 2, 1);
    const state = createCustomState({
      players: {
        1: { hand: [creature], loreCurrent: 5, loreMax: 5 },
      },
    });

    const newState = playCard(state, 0, 1);
    const played = newState.players[1].battlefield[0];
    expect(played.canAttack).toBe(false);
  });

  it('Rush creature can attack the turn it is played', () => {
    resetInstanceIdCounter();
    const rushCreature = makeCreature('rush-guy', 'Rush Guy', 2, 3, 2, 1, { keywords: ['rush'] });
    const state = createCustomState({
      players: {
        1: { hand: [rushCreature], loreCurrent: 5, loreMax: 5 },
      },
    });

    const newState = playCard(state, 0, 1);
    const played = newState.players[1].battlefield[0];
    expect(played.canAttack).toBe(true);
  });
});

describe('Combat', () => {
  it('deals damage to enemy hero when attacking face', () => {
    resetInstanceIdCounter();
    const attacker = makeCreature('atk', 'Attacker', 1, 4, 3, 1);
    attacker.canAttack = true;
    attacker.hasAttackedThisTurn = false;

    const state = createCustomState({
      players: {
        1: { battlefield: [attacker] },
        2: { life: 25 },
      },
    });

    const s1 = selectAttacker(state, attacker.instanceId, 1);
    expect(s1.targetMode).toBe('attack');

    const s2 = selectTarget(s1, { type: 'hero', playerId: 2 });
    expect(s2.players[2].life).toBe(21); // 25 - 4
  });

  it('applies simultaneous damage in creature combat', () => {
    resetInstanceIdCounter();
    const attacker = makeCreature('atk', 'Attacker', 1, 3, 4, 1);
    attacker.canAttack = true;

    const defender = makeCreature('def', 'Defender', 1, 2, 5, 2);
    defender.canAttack = true;

    const state = createCustomState({
      players: {
        1: { battlefield: [attacker] },
        2: { battlefield: [defender] },
      },
    });

    const s1 = selectAttacker(state, attacker.instanceId, 1);
    const s2 = selectTarget(s1, { type: 'creature', instanceId: defender.instanceId, playerId: 2 });

    // Attacker took 2 damage, defender took 3 damage
    const updatedAttacker = s2.players[1].battlefield.find((c) => c.instanceId === attacker.instanceId);
    const updatedDefender = s2.players[2].battlefield.find((c) => c.instanceId === defender.instanceId);

    expect(updatedAttacker.currentHealth).toBe(2); // 4 - 2
    expect(updatedDefender.currentHealth).toBe(2); // 5 - 3
  });

  it('destroys creature when health reaches 0', () => {
    resetInstanceIdCounter();
    const attacker = makeCreature('atk', 'Attacker', 1, 5, 4, 1);
    attacker.canAttack = true;

    const defender = makeCreature('def', 'Defender', 1, 2, 3, 2);
    defender.canAttack = true;

    const state = createCustomState({
      players: {
        1: { battlefield: [attacker] },
        2: { battlefield: [defender] },
      },
    });

    const s1 = selectAttacker(state, attacker.instanceId, 1);
    const s2 = selectTarget(s1, { type: 'creature', instanceId: defender.instanceId, playerId: 2 });

    // Defender should be dead (3 - 5 = -2)
    expect(s2.players[2].battlefield.length).toBe(0);
    expect(s2.players[2].empty.length).toBe(1);
  });
});

describe('Taunt Enforcement', () => {
  it('forces attacks to target Taunt creatures', () => {
    resetInstanceIdCounter();
    const attacker = makeCreature('atk', 'Attacker', 1, 3, 3, 1);
    attacker.canAttack = true;

    const tauntCreature = makeCreature('taunt', 'Taunter', 2, 2, 4, 2, { keywords: ['taunt'] });
    tauntCreature.canAttack = true;

    const nonTaunt = makeCreature('nontaunt', 'Regular', 1, 1, 1, 2);
    nonTaunt.canAttack = true;

    const state = createCustomState({
      players: {
        1: { battlefield: [attacker] },
        2: { battlefield: [tauntCreature, nonTaunt] },
      },
    });

    const s1 = selectAttacker(state, attacker.instanceId, 1);
    // Valid targets should only include the taunt creature
    expect(s1.validTargets.length).toBe(1);
    expect(s1.validTargets[0].instanceId).toBe(tauntCreature.instanceId);
  });
});

describe('Lore Progression', () => {
  it('increases Lore max by 1 each turn', () => {
    const state = createTestState();
    // Player 1 starts with loreMax 1
    expect(state.players[1].loreMax).toBe(1);

    // End turn, Player 2 gets loreMax 1
    const s1 = endTurn(state);
    expect(s1.players[2].loreMax).toBe(1);
    expect(s1.players[2].loreCurrent).toBe(1);

    // End turn again, Player 1 gets loreMax 2
    const s2 = endTurn(s1);
    expect(s2.players[1].loreMax).toBe(2);
    expect(s2.players[1].loreCurrent).toBe(2);
  });

  it('caps Lore at 10', () => {
    resetInstanceIdCounter();
    const state = createCustomState({
      players: {
        1: { loreMax: 10, loreCurrent: 10 },
        2: { loreMax: 9, loreCurrent: 0, deck: [makeCreature('d', 'D', 1, 1, 1, 2)] },
      },
    });

    // End turn, player 2's lore should go to 10 max
    const s1 = endTurn(state);
    expect(s1.players[2].loreMax).toBe(10);
    expect(s1.players[2].loreCurrent).toBe(10);
  });
});

describe('Fatigue', () => {
  it('deals incremental fatigue damage when deck is empty', () => {
    resetInstanceIdCounter();
    const state = createCustomState({
      players: {
        1: { deck: [], life: 25, fatigueCounter: 0 },
        2: { deck: [], life: 25, fatigueCounter: 0 },
      },
    });

    // End turn - Player 2 tries to draw but deck is empty
    const s1 = endTurn(state);
    expect(s1.players[2].life).toBe(24); // 1 fatigue damage
    expect(s1.players[2].fatigueCounter).toBe(1);

    // End turn again - Player 1 tries to draw but deck is empty
    const s2 = endTurn(s1);
    expect(s2.players[1].life).toBe(24); // 1 fatigue damage
  });
});

describe('Hand Size Limit', () => {
  it('burns card when drawing with full hand', () => {
    resetInstanceIdCounter();
    const deckCard = makeCreature('draw', 'DrawnCard', 1, 1, 1, 2);
    const handCards = Array.from({ length: MAX_HAND_SIZE }, (_, i) =>
      makeCreature(`h${i}`, `H${i}`, 1, 1, 1, 2)
    );

    const state = createCustomState({
      players: {
        1: { loreMax: 5, loreCurrent: 5 },
        2: { hand: handCards, deck: [deckCard], loreMax: 4, loreCurrent: 0 },
      },
    });

    // End turn - Player 2 tries to draw but hand is full
    const s1 = endTurn(state);
    expect(s1.players[2].hand.length).toBe(MAX_HAND_SIZE);
    expect(s1.players[2].deck.length).toBe(0);
  });
});

describe('Win Condition', () => {
  it('detects win when opponent reaches 0 HP', () => {
    resetInstanceIdCounter();
    const attacker = makeCreature('atk', 'Attacker', 1, 25, 10, 1);
    attacker.canAttack = true;

    const state = createCustomState({
      players: {
        1: { battlefield: [attacker] },
        2: { life: 5 },
      },
    });

    const s1 = selectAttacker(state, attacker.instanceId, 1);
    const s2 = selectTarget(s1, { type: 'hero', playerId: 2 });

    expect(s2.phase).toBe(PHASES.GAME_OVER);
    expect(s2.winner).toBe(1);
  });
});

describe('End Turn', () => {
  it('switches active player', () => {
    const state = createTestState();
    expect(state.activePlayer).toBe(1);

    const s1 = endTurn(state);
    expect(s1.activePlayer).toBe(2);

    const s2 = endTurn(s1);
    expect(s2.activePlayer).toBe(1);
  });

  it('resets creature attack status for new player', () => {
    resetInstanceIdCounter();
    const c1 = makeCreature('c1', 'C1', 1, 2, 2, 2);
    c1.canAttack = true;
    c1.hasAttackedThisTurn = true;

    const state = createCustomState({
      activePlayer: 1,
      players: {
        2: { battlefield: [c1], deck: [makeCreature('d', 'D', 1, 1, 1, 2)] },
      },
    });

    const s1 = endTurn(state);
    const creature = s1.players[2].battlefield.find((c) => c.instanceId === c1.instanceId);
    expect(creature.hasAttackedThisTurn).toBe(false);
    expect(creature.canAttack).toBe(true);
  });
});
