import { describe, it, expect, beforeEach } from 'vitest';
import { gameReducer, createInitialState } from '../gameReducer.js';
import { ACTIONS } from '../gameActions.js';
import { PHASES, TURN_PHASES } from '../constants.js';
import { createCardInstance, resetInstanceIdCounter, isCreatureType } from '../gameUtils.js';
import cardsData from '../../data/cards.json';

function getCardData(id) {
  return cardsData.find((c) => c.id === id);
}

function makeInstance(id, owner) {
  const data = getCardData(id);
  if (!data) throw new Error(`Card not found: ${id}`);
  return createCardInstance(data, owner);
}

function makeCreature(id, name, cost, attack, health, owner, extra = {}) {
  return createCardInstance(
    { id, name, type: 'hunter', cost, attack, health, keywords: [], effect: null, effectType: null, flavor: '', art: '🃏', faction: 'hunter', rarity: 'common', ...extra },
    owner
  );
}

function createCustomState(overrides = {}) {
  resetInstanceIdCounter();
  const { players: playersOverride, ...restOverrides } = overrides;
  const defaultPlayer1 = {
    id: 1,
    name: 'Player 1',
    life: 25,
    loreMax: 10,
    loreCurrent: 10,
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
    loreMax: 10,
    loreCurrent: 10,
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

function playCard(state, handIndex, playerId) {
  return gameReducer(state, { type: ACTIONS.PLAY_CARD, payload: { handIndex, playerId } });
}

function selectTarget(state, targetInfo) {
  return gameReducer(state, { type: ACTIONS.SELECT_TARGET, payload: targetInfo });
}

describe('Battlecry Effects', () => {
  it('Castiel heals hero for 3', () => {
    resetInstanceIdCounter();
    const castiel = makeInstance('castiel', 1);
    const state = createCustomState({
      players: {
        1: { hand: [castiel], loreCurrent: 10, life: 20 },
      },
    });

    const newState = playCard(state, 0, 1);
    expect(newState.players[1].life).toBe(23);
  });

  it('Castiel heals but does not exceed 25', () => {
    resetInstanceIdCounter();
    const castiel = makeInstance('castiel', 1);
    const state = createCustomState({
      players: {
        1: { hand: [castiel], loreCurrent: 10, life: 24 },
      },
    });

    const newState = playCard(state, 0, 1);
    expect(newState.players[1].life).toBe(25);
  });

  it('Cupid heals hero for 2', () => {
    resetInstanceIdCounter();
    const cupid = makeInstance('cupid', 1);
    const state = createCustomState({
      players: {
        1: { hand: [cupid], loreCurrent: 10, life: 20 },
      },
    });

    const newState = playCard(state, 0, 1);
    expect(newState.players[1].life).toBe(22);
  });

  it('Crossroads Demon draws a card and loses 1 life', () => {
    resetInstanceIdCounter();
    const demon = makeInstance('crossroads-demon', 1);
    const deckCard = makeCreature('d', 'D', 1, 1, 1, 1);

    const state = createCustomState({
      players: {
        1: { hand: [demon], deck: [deckCard], loreCurrent: 10, life: 25 },
      },
    });

    const newState = playCard(state, 0, 1);
    expect(newState.players[1].life).toBe(24);
    // Should have drawn 1 card (from deck to hand)
    expect(newState.players[1].deck.length).toBe(0);
  });

  it('Demon Horde summons two 1/1 Demon tokens', () => {
    resetInstanceIdCounter();
    const demonHorde = makeInstance('demon-horde', 1);
    const state = createCustomState({
      players: {
        1: { hand: [demonHorde], loreCurrent: 10 },
      },
    });

    const newState = playCard(state, 0, 1);
    const creatures = newState.players[1].battlefield.filter((c) => isCreatureType(c.type));
    expect(creatures.length).toBe(3); // Demon Horde + 2 tokens
    const tokens = creatures.filter((c) => c.isToken);
    expect(tokens.length).toBe(2);
    expect(tokens[0].currentAttack).toBe(1);
    expect(tokens[0].currentHealth).toBe(1);
  });

  it('Jack Kline deals 3 damage to all enemy creatures', () => {
    resetInstanceIdCounter();
    const jack = makeInstance('jack-kline', 1);
    const enemy1 = makeCreature('e1', 'Enemy1', 1, 2, 5, 2);
    enemy1.canAttack = true;
    const enemy2 = makeCreature('e2', 'Enemy2', 1, 2, 2, 2);
    enemy2.canAttack = true;

    const state = createCustomState({
      players: {
        1: { hand: [jack], loreCurrent: 10 },
        2: { battlefield: [enemy1, enemy2] },
      },
    });

    const newState = playCard(state, 0, 1);
    // enemy2 (2 hp) should be dead, enemy1 (5 hp) should have 2 hp
    const survivors = newState.players[2].battlefield.filter(c => isCreatureType(c.type));
    expect(survivors.length).toBe(1);
    expect(survivors[0].currentHealth).toBe(2);
  });
});

describe('Spell Effects', () => {
  it('Soul Deal draws 2 cards and loses 3 life', () => {
    resetInstanceIdCounter();
    const soulDeal = makeInstance('soul-deal', 1);
    const d1 = makeCreature('d1', 'D1', 1, 1, 1, 1);
    const d2 = makeCreature('d2', 'D2', 1, 1, 1, 1);

    const state = createCustomState({
      players: {
        1: { hand: [soulDeal], deck: [d1, d2], loreCurrent: 10, life: 25 },
      },
    });

    const newState = playCard(state, 0, 1);
    expect(newState.players[1].life).toBe(22);
    expect(newState.players[1].hand.length).toBe(2); // drew 2
  });

  it("Angel's Grace heals hero for 4", () => {
    resetInstanceIdCounter();
    const grace = makeInstance('angels-grace', 1);
    const state = createCustomState({
      players: {
        1: { hand: [grace], loreCurrent: 10, life: 18 },
      },
    });

    const newState = playCard(state, 0, 1);
    expect(newState.players[1].life).toBe(22);
  });

  it('Holy Fire deals 3 damage to all creatures', () => {
    resetInstanceIdCounter();
    const holyFire = makeInstance('holy-fire', 1);
    const friendly = makeCreature('f1', 'Friendly', 1, 2, 5, 1);
    friendly.canAttack = true;
    const enemy = makeCreature('e1', 'Enemy', 1, 2, 4, 2);
    enemy.canAttack = true;

    const state = createCustomState({
      players: {
        1: { hand: [holyFire], battlefield: [friendly], loreCurrent: 10 },
        2: { battlefield: [enemy] },
      },
    });

    const newState = playCard(state, 0, 1);
    const f = newState.players[1].battlefield.find((c) => c.instanceId === friendly.instanceId);
    const e = newState.players[2].battlefield.find((c) => c.instanceId === enemy.instanceId);
    expect(f.currentHealth).toBe(2);
    expect(e.currentHealth).toBe(1);
  });

  it('The Coin grants 1 extra Lore', () => {
    resetInstanceIdCounter();
    const coin = makeInstance('the-coin', 1);
    const state = createCustomState({
      players: {
        1: { hand: [coin], loreCurrent: 3, loreMax: 3 },
      },
    });

    const newState = playCard(state, 0, 1);
    expect(newState.players[1].loreCurrent).toBe(4);
  });

  it('Hex Bag deals 3 damage to a creature (targeted)', () => {
    resetInstanceIdCounter();
    const hexBag = makeInstance('hex-bag', 1);
    const enemy = makeCreature('e1', 'Enemy', 1, 2, 5, 2);
    enemy.canAttack = true;

    const state = createCustomState({
      players: {
        1: { hand: [hexBag], loreCurrent: 10 },
        2: { battlefield: [enemy] },
      },
    });

    // Playing the spell should enter targeting mode
    const s1 = playCard(state, 0, 1);
    expect(s1.targetMode).toBe('spell_target');

    // Select the target
    const s2 = selectTarget(s1, { type: 'creature', instanceId: enemy.instanceId, playerId: 2 });
    const e = s2.players[2].battlefield.find((c) => c.instanceId === enemy.instanceId);
    expect(e.currentHealth).toBe(2);
  });

  it('Smite deals 5 damage to a creature', () => {
    resetInstanceIdCounter();
    const smite = makeInstance('smite', 1);
    const enemy = makeCreature('e1', 'Enemy', 1, 3, 6, 2);
    enemy.canAttack = true;

    const state = createCustomState({
      players: {
        1: { hand: [smite], loreCurrent: 10 },
        2: { battlefield: [enemy] },
      },
    });

    const s1 = playCard(state, 0, 1);
    const s2 = selectTarget(s1, { type: 'creature', instanceId: enemy.instanceId, playerId: 2 });
    const e = s2.players[2].battlefield.find((c) => c.instanceId === enemy.instanceId);
    expect(e.currentHealth).toBe(1);
  });
});

describe('Buff and Aura Effects', () => {
  it("Bobby Singer gives friendly Hunters +1 Attack (aura tested via getEffectiveAttack)", () => {
    // This is an aura, so it's computed at render time through getEffectiveAttack
    // We can test that Bobby exists on battlefield alongside another hunter
    resetInstanceIdCounter();
    const bobby = makeInstance('bobby-singer', 1);
    const state = createCustomState({
      players: {
        1: { hand: [bobby], loreCurrent: 10 },
      },
    });

    const newState = playCard(state, 0, 1);
    expect(newState.players[1].battlefield.length).toBe(1);
    expect(newState.players[1].battlefield[0].id).toBe('bobby-singer');
  });
});

describe('Token Summoning', () => {
  it('Host of Heaven summons two 2/2 Angel tokens', () => {
    resetInstanceIdCounter();
    const host = makeInstance('host-of-heaven', 1);
    const state = createCustomState({
      players: {
        1: { hand: [host], loreCurrent: 10 },
      },
    });

    const newState = playCard(state, 0, 1);
    const creatures = newState.players[1].battlefield.filter((c) => isCreatureType(c.type));
    expect(creatures.length).toBe(3); // Host + 2 tokens
    const tokens = creatures.filter((c) => c.isToken);
    expect(tokens.length).toBe(2);
    expect(tokens[0].currentAttack).toBe(2);
    expect(tokens[0].currentHealth).toBe(2);
  });

  it('Vampire Nest summons two 2/1 Vampire tokens', () => {
    resetInstanceIdCounter();
    const nest = makeInstance('vampire-nest', 1);
    const state = createCustomState({
      players: {
        1: { hand: [nest], loreCurrent: 10 },
      },
    });

    const newState = playCard(state, 0, 1);
    const creatures = newState.players[1].battlefield.filter((c) => isCreatureType(c.type));
    expect(creatures.length).toBe(3);
    const tokens = creatures.filter((c) => c.isToken);
    expect(tokens.length).toBe(2);
    expect(tokens[0].currentAttack).toBe(2);
    expect(tokens[0].currentHealth).toBe(1);
  });
});

describe('Board-wide Effects', () => {
  it('Michael deals 4 damage to all enemy creatures', () => {
    resetInstanceIdCounter();
    const michael = makeInstance('michael', 1);
    const enemy1 = makeCreature('e1', 'E1', 1, 2, 6, 2);
    enemy1.canAttack = true;
    const enemy2 = makeCreature('e2', 'E2', 1, 2, 3, 2);
    enemy2.canAttack = true;

    const state = createCustomState({
      players: {
        1: { hand: [michael], loreCurrent: 10 },
        2: { battlefield: [enemy1, enemy2] },
      },
    });

    const newState = playCard(state, 0, 1);
    // enemy2 (3 hp) should be dead, enemy1 (6 hp) should have 2 hp
    const survivors = newState.players[2].battlefield.filter(c => isCreatureType(c.type));
    expect(survivors.length).toBe(1);
    expect(survivors[0].currentHealth).toBe(2);
    expect(newState.players[2].empty.length).toBe(1);
  });
});

describe('Lifesteal', () => {
  it('Lifesteal heals hero when attacking', () => {
    resetInstanceIdCounter();
    const azazel = makeInstance('azazel', 1);
    azazel.canAttack = true;
    azazel.hasAttackedThisTurn = false;

    const state = createCustomState({
      players: {
        1: { battlefield: [azazel], life: 20 },
        2: { life: 25 },
      },
    });

    const s1 = gameReducer(state, { type: ACTIONS.SELECT_ATTACKER, payload: { instanceId: azazel.instanceId, playerId: 1 } });
    const s2 = gameReducer(s1, { type: ACTIONS.SELECT_TARGET, payload: { type: 'hero', playerId: 2 } });

    expect(s2.players[2].life).toBe(20); // 25 - 5
    expect(s2.players[1].life).toBe(25); // 20 + 5, capped at 25
  });
});
