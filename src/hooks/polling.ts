import { useEffect, useRef, useState } from 'react';
import { fetchJson } from 'src/util/utils';

export function usePolling({ timeInterval = 3 * 1000 }: { timeInterval?: number } = {}) {
  const [isPolling, setIsPolling] = useState(false);
  const url = useRef<string | URL>();
  const internalId = useRef<NodeJS.Timeout>();
  const fetchPromise = useRef<Promise<void>>();

  const init = (
    newUrl: string | URL,
    callback: (response: any) => void,
    errorCallback: (error: any) => void = () => {
      /* default */
    },
  ) => {
    if (isPolling) return;
    if (url.current === newUrl) return;

    if (internalId.current) clearInterval(internalId.current);
    url.current = newUrl;
    setIsPolling(true);

    fetchPromise.current = fetchJson(newUrl)
      .then(callback)
      .catch(errorCallback)
      .finally(() => {
        fetchPromise.current = undefined;
      });

    internalId.current = setInterval(() => {
      if (fetchPromise.current) return;
      fetchPromise.current = fetchJson(newUrl)
        .then(callback)
        .catch(errorCallback)
        .finally(() => {
          fetchPromise.current = undefined;
        });
    }, timeInterval);
  };

  const stop = () => {
    if (internalId.current) clearInterval(internalId.current);
    setIsPolling(false);
  };

  useEffect(() => {
    return () => {
      internalId.current && clearInterval(internalId.current);
    };
  }, []);

  return {
    init,
    stop,
    isPolling,
  };
}
