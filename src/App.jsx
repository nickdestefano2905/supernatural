import { GameProvider, useGameState } from './game/GameContext.jsx';
import { PHASES } from './game/constants.js';
import TitleScreen from './components/screens/TitleScreen.jsx';
import GameScreen from './components/screens/GameScreen.jsx';
import GameOverScreen from './components/screens/GameOverScreen.jsx';

function GameRouter() {
  const state = useGameState();

  return (
    <>
      {state.phase === PHASES.TITLE && <TitleScreen />}
      {state.phase === PHASES.PLAYING && <GameScreen />}
      {state.phase === PHASES.GAME_OVER && (
        <>
          <GameScreen />
          <GameOverScreen />
        </>
      )}
    </>
  );
}

export default function App() {
  return (
    <GameProvider>
      <GameRouter />
    </GameProvider>
  );
}
