import { useCallback, useEffect, useState } from 'react';

export const useServiceWorker = () => {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showReload, setShowReload] = useState(false);

  const onSWUpdate = useCallback((registration: ServiceWorkerRegistration) => {
    setShowReload(true);
    setWaitingWorker(registration.waiting);
  }, []);

  const reloadPage = useCallback(() => {
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
    setShowReload(false);
    window.location.reload();
    console.log('Service worker updated');
  }, [waitingWorker]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register(`${window.location.origin}/custom-service-worker.js`)
        .then((registration) => {
          registration.onupdatefound = () => {
            onSWUpdate(registration);
          };

          const intervalId = setInterval(() => registration.update(), 60000);
          return () => clearInterval(intervalId);
        })
        .catch((error) => console.error('Service worker registration failed:', error));
    }
  }, [onSWUpdate]);

  return { showReload, reloadPage };
};
