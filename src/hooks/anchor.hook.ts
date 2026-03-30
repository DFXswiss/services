import { RefObject, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useAnchor(anchorName: string, ref: RefObject<HTMLElement>, isReady = true): void {
  const [searchParams, setSearchParams] = useSearchParams();
  const anchor = searchParams.get('a');

  useEffect(() => {
    if (anchor === anchorName && ref.current && isReady) {
      setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        searchParams.delete('a');
        setSearchParams(searchParams, { replace: true });
      }, 100);
    }
  }, [anchor, anchorName, isReady]);
}
