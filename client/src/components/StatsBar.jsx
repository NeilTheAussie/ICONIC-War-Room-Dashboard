export default function StatsBar({ stats }) {
  const items = [
    { label: 'Booked', value: stats.booked ?? 0 },
    { label: 'Waiting', value: stats.waiting ?? 0, color: stats.waiting > 5 ? 'text-red' : 'text-yel' },
    { label: 'Calls', value: stats.calls ?? 0 },
    { label: 'No Shows', value: stats.no_shows ?? 0, color: 'text-gry' },
    { label: 'Show Rate', value: `${stats.show_rate ?? 0}%`, color: (stats.show_rate ?? 0) >= 40 ? 'text-grn' : 'text-red' },
    { label: 'Closes', value: stats.closes ?? 0, color: 'text-grn' },
    { label: 'Revenue', value: `$${((stats.revenue_cents ?? 0) / 100).toLocaleString()}`, color: 'text-grn' },
    { label: 'Deal Rate', value: `${stats.deal_rate ?? 0}%` },
    { label: 'Promises', value: stats.promises ?? 0, color: 'text-org' },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {items.map(item => (
        <div key={item.label} className="bg-bg2 border border-bdr rounded-lg px-3 py-2 text-center min-w-[70px] flex-1">
          <div className={`font-mono text-lg font-bold ${item.color || 'text-txtb'}`}>{item.value}</div>
          <div className="text-[10px] text-txtd uppercase tracking-wider">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
