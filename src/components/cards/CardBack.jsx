export default function CardBack({ small = false }) {
  const sizeClasses = small
    ? 'w-[60px] h-[85px]'
    : 'w-[80px] h-[110px]';

  return (
    <div
      className={`${sizeClasses} rounded-lg border-2 border-amber-800/50 bg-gradient-to-br from-[#1a1208] to-[#0d0a05] flex items-center justify-center shadow-md`}
    >
      <div className="text-amber-700/60 text-2xl">⛤</div>
    </div>
  );
}
