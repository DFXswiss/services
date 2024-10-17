import { useEffect, useMemo, useRef, useState } from 'react';

interface Timer {
  minutes: number;
  seconds: number;
}

interface CountdownInterface {
  timer: Timer;
  remainingSeconds: number;
  startTimer: (expiration: Date) => void;
}

export function useCountdown(): CountdownInterface {
  const [timer, setTimer] = useState<Timer>({ minutes: 0, seconds: 0 });
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  function startTimer(expiration: Date): void {
    if (intervalRef.current) clearInterval(intervalRef.current);

    let timeInSeconds = Math.floor((expiration.getTime() - Date.now()) / 1000);
    intervalRef.current = setInterval(() => {
      const minutes = Math.floor(timeInSeconds / 60);
      const seconds = timeInSeconds % 60;

      setTimer({ minutes, seconds });
      setRemainingSeconds(timeInSeconds);

      if (--timeInSeconds < 0) {
        clearInterval(intervalRef.current);
      }
    }, 1000);
  }

  return useMemo(() => ({ timer, remainingSeconds, startTimer }), [timer, remainingSeconds]);
}
