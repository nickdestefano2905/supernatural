import { useEffect, useRef } from 'react';
import { useGameState, useGameDispatch } from '../game/GameContext.jsx';
import { getNextAIAction } from '../game/aiOpponent.js';
import { PHASES } from '../game/constants.js';

const AI_PLAYER = 2;
const AI_ACTION_DELAY = 800; // ms between AI actions

/**
 * Hook that automatically plays for Player 2 when the game is in AI mode.
 * It watches for state changes and dispatches the next AI action after a delay.
 */
export function useAIOpponent() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Clear any pending timeout when state changes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Only act when in AI mode and the game is active
    if (state.mode !== 'ai') return;
    if (state.phase !== PHASES.PLAYING) return;
    if (state.activePlayer !== AI_PLAYER) return;

    // Schedule the next AI action
    timeoutRef.current = setTimeout(() => {
      const action = getNextAIAction(state);
      if (action) {
        dispatch(action);
      }
    }, AI_ACTION_DELAY);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [state, dispatch]);
}
