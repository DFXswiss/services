import { PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';
import { Holder, PageInfo, PriceHistoryEntry, TokenInfo } from 'src/dto/realunit.dto';

interface RealunitContextData {
  holders: Holder[];
  totalCount?: number;
  pageInfo: PageInfo;
  tokenInfo?: TokenInfo;
  priceHistory?: PriceHistoryEntry[];
}

interface RealunitContextInterface {
  cachedData?: RealunitContextData;
  setCachedData: (data: RealunitContextData) => void;
  clearCache: () => void;
}

const RealunitContext = createContext<RealunitContextInterface>(undefined as any);

export function useRealunitContext(): RealunitContextInterface {
  return useContext(RealunitContext);
}

export function RealunitContextProvider({ children }: PropsWithChildren): JSX.Element {
  const [cachedData, setCachedData] = useState<RealunitContextData | undefined>();

  const clearCache = () => setCachedData(undefined);

  const context = useMemo(
    () => ({
      cachedData,
      setCachedData,
      clearCache,
    }),
    [cachedData],
  );

  return <RealunitContext.Provider value={context}>{children}</RealunitContext.Provider>;
}
