import { useAuthContext } from '@dfx.swiss/react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useSift(): void {
  const { session } = useAuthContext();
  const { pathname } = useLocation();

  const sift = (window._sift ??= []);
  const beaconKey = process.env.REACT_APP_SIFT_BEACON_KEY;

  useEffect(() => {
    if (!beaconKey) return;

    sift.push(['_setAccount', beaconKey]);
    sift.push(['_setUserId', session?.address ?? '']);
    sift.push(['_trackPageview']);
  }, [session?.address]);

  useEffect(() => {
    if (!beaconKey) return;

    sift.push(['_trackPageview']);
  }, [pathname]);
}
