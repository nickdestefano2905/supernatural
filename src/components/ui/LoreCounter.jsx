export default function LoreCounter({ current, max }) {
  const gems = [];
  for (let i = 0; i < 10; i++) {
    const isFilled = i < current;
    const isMax = i < max;
    gems.push(
      <div
        key={i}
        className={`w-3 h-3 rounded-full border transition-all duration-300 ${
          isFilled
            ? 'bg-blue-500 border-blue-400 shadow-sm shadow-blue-400/50'
            : isMax
            ? 'bg-blue-900/50 border-blue-700/50'
            : 'bg-gray-900 border-gray-800'
        }`}
      />
    );
  }

  return <div className="flex gap-0.5">{gems}</div>;
}
