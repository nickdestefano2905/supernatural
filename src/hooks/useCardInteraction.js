import { useCallback } from 'react';
import { useGameState } from '../game/GameContext.jsx';
import { useGameActions } from './useGameActions.js';
import { canPlayCard, isCreatureType, canCreatureAttack } from '../game/gameUtils.js';
import { TARGET_MODES } from '../game/constants.js';

export function useCardInteraction() {
  const state = useGameState();
  const { playCard, selectAttacker, selectTarget, cancelSelection } = useGameActions();

  const handleHandCardClick = useCallback(
    (handIndex, playerId) => {
      if (state.activePlayer !== playerId) return;
      if (state.targetMode) {
        cancelSelection();
        return;
      }
      const card = state.players[playerId].hand[handIndex];
      if (!card) return;
      if (!canPlayCard(card, state.players[playerId])) return;
      playCard(handIndex);
    },
    [state, playCard, cancelSelection]
  );

  const handleBattlefieldCardClick = useCallback(
    (instanceId, playerId) => {
      // Check if we're in targeting mode
      if (state.targetMode) {
        const isValidTarget = state.validTargets.some(
          (t) => t.type === 'creature' && t.instanceId === instanceId && t.playerId === playerId
        );
        if (isValidTarget) {
          selectTarget({ type: 'creature', instanceId, playerId });
          return;
        }
        // If clicking own creature while in attack mode, try to select it as a new attacker
        if (state.targetMode === TARGET_MODES.ATTACK && playerId === state.activePlayer) {
          const creature = state.players[playerId].battlefield.find(c => c.instanceId === instanceId);
          if (creature && canCreatureAttack(creature, state, playerId)) {
            selectAttacker(instanceId);
            return;
          }
        }
        cancelSelection();
        return;
      }

      // Select as attacker if it's our creature
      if (playerId === state.activePlayer) {
        const creature = state.players[playerId].battlefield.find(
          (c) => c.instanceId === instanceId
        );
        if (creature && isCreatureType(creature.type) && canCreatureAttack(creature, state, playerId)) {
          selectAttacker(instanceId);
        }
      }
    },
    [state, selectAttacker, selectTarget, cancelSelection]
  );

  const handleHeroClick = useCallback(
    (playerId) => {
      if (!state.targetMode) return;
      if (state.targetMode === TARGET_MODES.ATTACK) {
        const isValidTarget = state.validTargets.some(
          (t) => t.type === 'hero' && t.playerId === playerId
        );
        if (isValidTarget) {
          selectTarget({ type: 'hero', playerId });
        }
      }
    },
    [state, selectTarget]
  );

  const handleEmptyClick = useCallback(() => {
    if (state.targetMode) {
      cancelSelection();
    }
  }, [state, cancelSelection]);

  return {
    handleHandCardClick,
    handleBattlefieldCardClick,
    handleHeroClick,
    handleEmptyClick,
  };
}
