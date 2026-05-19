import { useEffect, useState } from 'react';

interface SummaryCardProps {
  label: string;
  value: React.ReactNode;
  color?: string;
}

export function SummaryCard({ label, value, color }: SummaryCardProps): JSX.Element {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-xs font-medium" style={{ color: '#6b7280' }}>
        {label}
      </div>
      <div className="text-xl font-bold mt-1" style={{ color: color ?? '#111827' }}>
        {value}
      </div>
    </div>
  );
}

function formatAge(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s ago`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ago`;
}

export function AgeBadge({ timestamp }: { timestamp?: string }): JSX.Element {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <>{timestamp ? formatAge(now - new Date(timestamp).getTime()) : '-'}</>;
}
