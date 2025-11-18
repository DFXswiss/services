import { PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';
import { RealunitContextData, RealunitContextInterface } from 'src/dto/realunit.dto';

const RealunitContext = createContext<RealunitContextInterface>(undefined as any);

export function useRealunitContext(): RealunitContextInterface {
  return useContext(RealunitContext);
}

export function RealunitContextProvider({ children }: PropsWithChildren): JSX.Element {
  const [cachedData, setCachedData] = useState<RealunitContextData>({});

  const context = useMemo(() => ({ cachedData, setCachedData }), [cachedData]);

  return <RealunitContext.Provider value={context}>{children}</RealunitContext.Provider>;
}
