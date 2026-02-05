import { motion } from 'framer-motion';

export default function AttackAnimation({ type }) {
  if (type === 'attack_hero' || type === 'attack_creature') {
    return (
      <motion.div
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="absolute inset-0 bg-red-500/10 pointer-events-none z-40"
      />
    );
  }
  return null;
}
