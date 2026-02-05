export default function HealthBar({ current, max }) {
  const percentage = Math.max(0, (current / max) * 100);
  const color = percentage > 50 ? 'bg-green-600' : percentage > 25 ? 'bg-yellow-600' : 'bg-red-600';

  return (
    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} transition-all duration-500 rounded-full`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
