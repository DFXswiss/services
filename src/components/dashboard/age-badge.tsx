import { useEffect, useState } from 'react';

function formatAge(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s ago`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ago`;
}

interface AgeBadgeProps {
  timestamp?: string;
}

export function AgeBadge({ timestamp }: AgeBadgeProps): JSX.Element {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!timestamp) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timestamp]);

  if (!timestamp) return <>-</>;
  const parsed = new Date(timestamp).getTime();
  if (Number.isNaN(parsed)) return <>-</>;
  return <>{formatAge(now - parsed)}</>;
}
