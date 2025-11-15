import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { PaginationDirection } from 'src/hooks/realunit.hook';

interface RealunitPaginationState {
  cursor: string;
  direction: PaginationDirection;
}

interface RealunitContextInterface {
  paginationState?: RealunitPaginationState;
  savePaginationState: (cursor: string, direction: PaginationDirection) => void;
  clearPaginationState: () => void;
}

const RealunitContext = createContext<RealunitContextInterface>(undefined as any);

export function useRealunitContext(): RealunitContextInterface {
  return useContext(RealunitContext);
}

const STORAGE_KEY = 'realunit_pagination';

export function RealunitContextProvider({ children }: PropsWithChildren): JSX.Element {
  const { sessionStorage } = window;
  const [paginationState, setPaginationState] = useState<RealunitPaginationState | undefined>(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : undefined;
  });

  useEffect(() => {
    if (paginationState) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(paginationState));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [paginationState]);

  function savePaginationState(cursor: string, direction: PaginationDirection) {
    setPaginationState({ cursor, direction });
  }

  function clearPaginationState() {
    setPaginationState(undefined);
  }

  const context = useMemo(
    () => ({
      paginationState,
      savePaginationState,
      clearPaginationState,
    }),
    [paginationState],
  );

  return <RealunitContext.Provider value={context}>{children}</RealunitContext.Provider>;
}
