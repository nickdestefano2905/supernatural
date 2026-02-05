import { motion } from 'framer-motion';

export default function HowToPlay({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-[#12121a] border-2 border-amber-800/50 rounded-xl p-6 max-w-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-amber-200 mb-4 text-center" style={{ fontFamily: 'Cinzel, serif' }}>
          How to Play
        </h2>

        <div className="space-y-4 text-sm text-gray-300" style={{ fontFamily: 'Crimson Text, serif' }}>
          <section>
            <h3 className="text-amber-400 font-bold mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Goal</h3>
            <p>Reduce your opponent&apos;s Life Points from 25 to 0.</p>
          </section>

          <section>
            <h3 className="text-amber-400 font-bold mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Lore (Resources)</h3>
            <p>Each turn, your maximum Lore increases by 1 (up to 10) and refills. You spend Lore to play cards.</p>
          </section>

          <section>
            <h3 className="text-amber-400 font-bold mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Card Types</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Hunters & Monsters</strong> — Creatures with Attack and Health. They can attack once per turn.</li>
              <li><strong>Weapons</strong> — Attach to a friendly creature for stat bonuses.</li>
              <li><strong>Spells</strong> — One-time effects that resolve immediately.</li>
              <li><strong>Lore Cards</strong> — Ongoing effects that persist on the battlefield.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-amber-400 font-bold mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Turn Structure</h3>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Lore refills and increases by 1.</li>
              <li>Draw 1 card.</li>
              <li>Play cards and attack with creatures (in any order).</li>
              <li>Click &quot;End Turn&quot; to pass to your opponent.</li>
            </ol>
          </section>

          <section>
            <h3 className="text-amber-400 font-bold mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Combat</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Click a creature to select it as an attacker.</li>
              <li>Click an enemy creature or the enemy hero to attack.</li>
              <li>Creatures deal damage to each other simultaneously.</li>
              <li>Creatures with <strong>Taunt</strong> must be attacked first.</li>
              <li>New creatures have summoning sickness (can&apos;t attack) unless they have <strong>Rush</strong>.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-amber-400 font-bold mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Keywords</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Rush</strong> — Can attack immediately.</li>
              <li><strong>Ward</strong> — Cannot be targeted by enemy spells.</li>
              <li><strong>Taunt</strong> — Enemies must attack this first.</li>
              <li><strong>Lifesteal</strong> — Damage dealt heals your hero.</li>
              <li><strong>Banish</strong> — Destroyed creatures are removed from game.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-amber-400 font-bold mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Tips</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Playable cards glow in your hand. Dimmed cards cost too much Lore.</li>
              <li>Hover over any card to see its full details.</li>
              <li>Player 2 starts with an extra card and The Coin (0-cost spell for +1 Lore).</li>
            </ul>
          </section>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-amber-700 hover:bg-amber-600 text-amber-100 rounded-lg font-bold transition-colors"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Got It
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
