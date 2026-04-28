import { useEffect, useState } from 'react';
import { useCompliance } from './compliance.hook';

export function useCallQueueClerks(): { clerks: string[]; isLoading: boolean } {
  const { getCallQueueClerks } = useCompliance();
  const [clerks, setClerks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCallQueueClerks()
      .then((list) => {
        if (!cancelled) setClerks(list);
      })
      .catch(() => {
        if (!cancelled) setClerks([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { clerks, isLoading };
}
