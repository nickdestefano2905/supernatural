import { motion } from 'framer-motion';

export default function PlayerInfoBar({ player, isActive, isTargetable, onHeroClick }) {
  const lowHealth = player.life <= 5;

  return (
    <motion.div
      className={`
        flex items-center justify-between px-4 py-2 rounded-lg
        ${isActive ? 'bg-gradient-to-r from-amber-900/40 to-transparent border border-amber-700/40' : 'bg-[#0e0e16]/80 border border-gray-800/40'}
        ${isTargetable ? 'ring-2 ring-red-500 cursor-pointer shadow-lg shadow-red-500/30' : ''}
        transition-all duration-300
      `}
      onClick={isTargetable ? onHeroClick : undefined}
      animate={lowHealth ? { boxShadow: ['0 0 10px rgba(220,38,38,0.3)', '0 0 20px rgba(220,38,38,0.6)', '0 0 10px rgba(220,38,38,0.3)'] } : {}}
      transition={lowHealth ? { duration: 1.5, repeat: Infinity } : {}}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-amber-100" style={{ fontFamily: 'Cinzel, serif' }}>
          {player.name}
        </span>
        {isActive && (
          <span className="text-[10px] px-2 py-0.5 bg-amber-600/30 text-amber-300 rounded-full">
            Active
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Life */}
        <div className="flex items-center gap-1">
          <span className={`font-bold font-mono text-lg ${lowHealth ? 'text-red-400' : 'text-red-300'}`}>
            {player.life}
          </span>
          <span className="text-red-400">❤️</span>
        </div>

        {/* Lore */}
        <div className="flex items-center gap-1">
          <span className="font-bold font-mono text-lg text-blue-300">
            {player.loreCurrent}
          </span>
          <span className="text-gray-500">/</span>
          <span className="font-mono text-sm text-blue-400">{player.loreMax}</span>
          <span className="text-blue-400">✦</span>
        </div>

        {/* Deck count */}
        <div className="flex items-center gap-1">
          <span className="font-mono text-sm text-gray-400">{player.deck.length}</span>
          <span className="text-gray-500">🂠</span>
        </div>
      </div>
    </motion.div>
  );
}
