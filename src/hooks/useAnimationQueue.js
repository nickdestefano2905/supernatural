import { useEffect, useRef } from 'react';
import { useGameState } from '../game/GameContext.jsx';
import { useGameActions } from './useGameActions.js';

export function useAnimationQueue() {
  const state = useGameState();
  const { clearAnimation } = useGameActions();
  const timerRef = useRef(null);

  useEffect(() => {
    if (state.animations.length > 0 && !timerRef.current) {
      timerRef.current = setTimeout(() => {
        clearAnimation();
        timerRef.current = null;
      }, 600);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.animations, clearAnimation]);

  return {
    currentAnimation: state.animations[0] || null,
    isAnimating: state.animations.length > 0,
  };
}
