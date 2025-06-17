import { useEffect, useState } from 'react';

export function CircularCountdown({
  duration = 10,
  size = 80,
  strokeWidth = 6,
  color = '#64748b',
  textColor = '#1e293b',
  onComplete,
}: {
  duration?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  textColor?: string;
  onComplete?: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = timeLeft / duration;

  useEffect(() => {
    if (timeLeft <= 0) {
      if (onComplete) onComplete();
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, onComplete]);

  return (
    <div
      style={{
        width: size,
        height: size,
      }}
      className="relative flex justify-center items-center"
    >
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (progress - 1)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear' }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span
        style={{
          position: 'absolute',
          color: textColor,
          fontWeight: 600,
          fontSize: size * 0.3,
          userSelect: 'none',
        }}
      >
        {timeLeft}
      </span>
    </div>
  );
}
