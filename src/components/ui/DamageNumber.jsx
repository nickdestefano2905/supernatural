import { motion } from 'framer-motion';

export default function DamageNumber({ amount, x = 0, y = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 1.5 }}
      animate={{ opacity: 0, y: -40, scale: 0.8 }}
      transition={{ duration: 0.8 }}
      className="absolute pointer-events-none z-50 font-bold text-2xl text-red-400 font-mono"
      style={{ left: x, top: y }}
    >
      -{amount}
    </motion.div>
  );
}
