export const ACTIONS = {
  START_GAME: 'START_GAME',
  PLAY_CARD: 'PLAY_CARD',
  SELECT_CARD: 'SELECT_CARD',
  SELECT_ATTACKER: 'SELECT_ATTACKER',
  SELECT_TARGET: 'SELECT_TARGET',
  ATTACK: 'ATTACK',
  END_TURN: 'END_TURN',
  CANCEL_SELECTION: 'CANCEL_SELECTION',
  DISMISS_REVEALED_CARD: 'DISMISS_REVEALED_CARD',
  PLAY_AGAIN: 'PLAY_AGAIN',
  CLEAR_ANIMATION: 'CLEAR_ANIMATION',
};

export function startGame() {
  return { type: ACTIONS.START_GAME };
}

export function playCard(handIndex, playerId) {
  return { type: ACTIONS.PLAY_CARD, payload: { handIndex, playerId } };
}

export function selectCard(zone, index, playerId) {
  return { type: ACTIONS.SELECT_CARD, payload: { zone, index, playerId } };
}

export function selectAttacker(instanceId, playerId) {
  return { type: ACTIONS.SELECT_ATTACKER, payload: { instanceId, playerId } };
}

export function selectTarget(targetInfo) {
  return { type: ACTIONS.SELECT_TARGET, payload: targetInfo };
}

export function attack(attackerInstanceId, attackerPlayerId, targetInfo) {
  return {
    type: ACTIONS.ATTACK,
    payload: { attackerInstanceId, attackerPlayerId, targetInfo },
  };
}

export function endTurn() {
  return { type: ACTIONS.END_TURN };
}

export function cancelSelection() {
  return { type: ACTIONS.CANCEL_SELECTION };
}

export function dismissRevealedCard() {
  return { type: ACTIONS.DISMISS_REVEALED_CARD };
}

export function playAgain() {
  return { type: ACTIONS.PLAY_AGAIN };
}

export function clearAnimation() {
  return { type: ACTIONS.CLEAR_ANIMATION };
}
