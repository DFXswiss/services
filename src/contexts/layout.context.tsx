import { createContext, MutableRefObject, PropsWithChildren, useContext } from 'react';

interface LayoutContextInterface {
  modalRootRef: MutableRefObject<HTMLDivElement | null>;
  scrollRef: MutableRefObject<HTMLDivElement | null>;
  rootRef: MutableRefObject<HTMLDivElement | null>;
  scrollToTop: () => void;
}

const LayoutContext = createContext<LayoutContextInterface>(undefined as any);

export function useLayoutContext(): LayoutContextInterface {
  return useContext(LayoutContext);
}

interface LayoutContextProviderProps extends PropsWithChildren {
  modalRootRef: MutableRefObject<HTMLDivElement | null>;
  scrollRef: MutableRefObject<HTMLDivElement | null>;
  rootRef: MutableRefObject<HTMLDivElement | null>;
}

export function LayoutContextProvider({
  children,
  modalRootRef,
  scrollRef,
  rootRef,
}: LayoutContextProviderProps): JSX.Element {
  const scrollToTop = () => {
    scrollRef.current?.scrollTo(0, 0);
  };

  return (
    <LayoutContext.Provider value={{ modalRootRef, scrollRef, rootRef, scrollToTop }}>
      {children}
    </LayoutContext.Provider>
  );
}
