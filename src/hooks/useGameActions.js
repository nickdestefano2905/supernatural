import { useCallback } from 'react';
import { useGameDispatch, useGameState } from '../game/GameContext.jsx';
import * as actions from '../game/gameActions.js';

export function useGameActions() {
  const dispatch = useGameDispatch();
  const state = useGameState();

  const startGame = useCallback(() => {
    dispatch(actions.startGame());
  }, [dispatch]);

  const playCard = useCallback(
    (handIndex) => {
      dispatch(actions.playCard(handIndex, state.activePlayer));
    },
    [dispatch, state.activePlayer]
  );

  const selectAttacker = useCallback(
    (instanceId) => {
      dispatch(actions.selectAttacker(instanceId, state.activePlayer));
    },
    [dispatch, state.activePlayer]
  );

  const selectTarget = useCallback(
    (targetInfo) => {
      dispatch(actions.selectTarget(targetInfo));
    },
    [dispatch]
  );

  const endTurn = useCallback(() => {
    dispatch(actions.endTurn());
  }, [dispatch]);

  const cancelSelection = useCallback(() => {
    dispatch(actions.cancelSelection());
  }, [dispatch]);

  const dismissRevealedCard = useCallback(() => {
    dispatch(actions.dismissRevealedCard());
  }, [dispatch]);

  const playAgain = useCallback(() => {
    dispatch(actions.playAgain());
  }, [dispatch]);

  const clearAnimation = useCallback(() => {
    dispatch(actions.clearAnimation());
  }, [dispatch]);

  return {
    startGame,
    playCard,
    selectAttacker,
    selectTarget,
    endTurn,
    cancelSelection,
    dismissRevealedCard,
    playAgain,
    clearAnimation,
  };
}
