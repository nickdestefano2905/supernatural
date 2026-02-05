import PlayerInfoBar from './PlayerInfoBar.jsx';
import HandZone from './HandZone.jsx';
import Battlefield from './Battlefield.jsx';
import { useGameState } from '../../game/GameContext.jsx';
import { TARGET_MODES } from '../../game/constants.js';

export default function PlayerArea({ playerId, isOpponent, onHandCardClick, onBattlefieldCardClick, onHeroClick }) {
  const state = useGameState();
  const player = state.players[playerId];
  const isActive = state.activePlayer === playerId;

  const isHeroTargetable =
    state.targetMode === TARGET_MODES.ATTACK &&
    state.validTargets?.some((t) => t.type === 'hero' && t.playerId === playerId);

  return (
    <div className={`flex flex-col ${isOpponent ? '' : ''}`}>
      {isOpponent ? (
        <>
          <PlayerInfoBar player={player} isActive={isActive} isTargetable={isHeroTargetable} onHeroClick={() => onHeroClick(playerId)} />
          <HandZone player={player} isOpponent onCardClick={onHandCardClick} />
          <Battlefield player={player} onCardClick={onBattlefieldCardClick} />
        </>
      ) : (
        <>
          <Battlefield player={player} onCardClick={onBattlefieldCardClick} />
          <HandZone player={player} isOpponent={false} onCardClick={onHandCardClick} />
          <PlayerInfoBar player={player} isActive={isActive} isTargetable={isHeroTargetable} onHeroClick={() => onHeroClick(playerId)} />
        </>
      )}
    </div>
  );
}
