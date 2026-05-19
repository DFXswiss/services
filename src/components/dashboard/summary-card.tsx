import { ReactNode } from 'react';

interface SummaryCardProps {
  label: string;
  value: ReactNode;
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
