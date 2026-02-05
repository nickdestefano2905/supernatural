import { motion } from 'framer-motion';

export default function Button({ children, onClick, variant = 'primary', className = '' }) {
  const variants = {
    primary:
      'bg-gradient-to-b from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-amber-100 border-amber-600/50 shadow-amber-900/30',
    secondary:
      'bg-gradient-to-b from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800 text-gray-200 border-gray-600/50 shadow-gray-900/30',
    danger:
      'bg-gradient-to-b from-red-800 to-red-950 hover:from-red-700 hover:to-red-900 text-red-100 border-red-700/50 shadow-red-900/30',
  };

  return (
    <motion.button
      className={`font-bold px-6 py-3 rounded-lg border shadow-lg text-sm transition-all ${variants[variant]} ${className}`}
      style={{ fontFamily: 'Cinzel, serif' }}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.button>
  );
}
