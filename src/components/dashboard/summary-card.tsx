import { ReactNode } from 'react';

interface SummaryCardProps {
  label: string;
  value: ReactNode;
  color?: string;
  dark?: boolean;
}

export function SummaryCard({ label, value, color, dark }: SummaryCardProps): JSX.Element {
  const cardBg = dark ? 'bg-dfxBlue-700' : 'bg-white';
  const labelColor = dark ? '#9AA5B8' : '#6b7280';
  const defaultValueColor = dark ? '#ffffff' : '#111827';
  return (
    <div className={`${cardBg} rounded-lg shadow p-4`}>
      <div className="text-xs font-medium" style={{ color: labelColor }}>
        {label}
      </div>
      <div className="text-xl font-bold mt-1" style={{ color: color ?? defaultValueColor }}>
        {value}
      </div>
    </div>
  );
}
