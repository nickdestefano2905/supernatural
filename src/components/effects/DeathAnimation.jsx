import { motion } from 'framer-motion';

export default function DeathAnimation() {
  return (
    <motion.div
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 bg-gray-900/40 pointer-events-none z-40"
    />
  );
}
